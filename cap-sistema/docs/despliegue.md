# Despliegue en DigitalOcean

Cómo poner el sistema en internet, en orden. Todo lo que está aquí se probó primero en local con el
mismo `docker-compose.prod.yml` (ver «Ensayo en local»).

## Qué se despliega

```
Internet ──443──▶ gateway (nginx) ──▶ auth :3001
                    │                  usuarios :3002
                    │  red interna     programas :3003
                    │  de Docker       medicamentos :3004
                    │                  trazabilidad :3007
                    │
                    └── sirve el panel (web/dist)

                  Postgres y Redis: contenedores en el mismo droplet (sin puertos)
```

- **Solo el gateway publica puertos** (80 y 443). Los servicios no se alcanzan desde fuera ni aunque el
  firewall estuviera mal: `docker-compose.prod.yml` no les publica ninguno.
- El gateway reenvía `/api/<servicio>/...` quitando el prefijo, igual que el proxy de Vite en
  desarrollo. Por eso el panel no cambia al desplegarse.
- El gateway además: obliga HTTPS, devuelve 404 en cualquier `/docs`, limita por IP las cinco rutas
  de auth que no piden token, solo deja pasar **lecturas** hacia trazabilidad y rechaza multipart.
  Todo está comentado en `infra/nginx/gateway-interno.conf.template`.

Archivos que intervienen:

| Archivo | Qué es |
|---|---|
| `Dockerfile.servicio` | Imagen de un microservicio; `--build-arg SERVICIO=auth` elige cuál |
| `Dockerfile.gateway` | Compila el panel y lo mete en nginx con la configuración de `infra/nginx/` |
| `docker-compose.prod.yml` | Producción: gateway + 5 servicios + migraciones (perfil `migrar`) + certbot (perfil `certificado`) |
| `docker-compose.local.yml` | Se apila sobre el anterior para ensayar en local: añade Postgres y Redis sin puertos |
| `docker-compose.droplet.yml` | Se apila sobre el de producción en el droplet: Postgres y Redis como contenedores sin puertos, con contraseñas reales |
| `infra/scripts/respaldo.sh` | Respaldo diario de la base (cron) |
| `infra/scripts/generar-secretos.mjs` | Crea `secretos/*.env` con llaves nuevas; con `--droplet` también las contraseñas de la base, `init.sql` y `redis.conf` |
| `secretos/` | Los secretos. No se versionan (ver su README) |
| `.env` (junto al compose) | Solo `DOMINIO=` |

## Ensayo en local (antes de tocar la nube)

Desde `cap-sistema/`, con Docker Desktop abierto:

```bash
node infra/scripts/generar-secretos.mjs --local
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --profile migrar build
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml up -d postgres redis
for s in auth usuarios programas medicamentos trazabilidad; do
  docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --profile migrar run --rm migrar-$s
done
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml --profile migrar run --rm \
  -e ADMIN_INICIAL=admin migrar-auth npm run seed -w @cap/auth      # imprime la contraseña UNA vez
docker compose -f docker-compose.prod.yml -f docker-compose.local.yml up -d
```

Abrir `https://localhost` (certificado autofirmado: el navegador avisa, se acepta). Para apagarlo:
`docker compose -f docker-compose.prod.yml -f docker-compose.local.yml down` (con `-v` borra también
la base del ensayo). Los volúmenes son distintos de los del `docker-compose.yml` de desarrollo.

## Producción, paso a paso (todo en el droplet)

Es la forma elegida: Postgres y Redis corren **en el mismo droplet**, como contenedores sin puerto
publicado, con `docker-compose.droplet.yml` apilado sobre el de producción. Cuesta lo del droplet y
nada más; a cambio los respaldos los hacemos nosotros (paso 8). La variante con bases administradas
de DigitalOcean (≈ $30/mes extra) está al final por si algún día hay presupuesto.

Lo que ya existe (20 sep 2026): droplet `cap-purulha2` (Ubuntu 24.04, 2 GB, NYC1, IP `68.183.105.129`),
dominio `sicapguate.com` con `A` y `www` apuntando a esa IP y propagado, UFW con 22/80/443, usuario `cap`
con sudo y llave SSH.

Todos los comandos van **por SSH en el droplet**, salvo que se diga lo contrario. Cada paso se puede
repetir sin romper nada si algo falla a medias.

### 1. Quitar lo que se instaló de más

En el droplet se instalaron nginx y MySQL en el sistema. **Ninguno se usa**: el gateway nginx viene en
un contenedor y ocupa los puertos 80/443 (chocaría con el nginx del sistema), y la base es Postgres.
MySQL además consume ~360 MB de los 2 GB.

```bash
sudo systemctl stop nginx mysql
sudo systemctl disable nginx mysql
sudo apt purge -y nginx nginx-common mysql-server mysql-server-8.0 mysql-client-8.0 mysql-common
sudo apt autoremove -y
sudo rm -rf /var/lib/mysql /etc/mysql /etc/nginx
free -h                                   # la RAM usada debe bajar a ~250 MB
sudo ss -ltnp | grep -E ':80 |:443 '      # no debe imprimir nada
```

Las reglas del firewall se quedan como están: `Nginx Full` solo significa «80 y 443», y eso lo va a
usar el gateway.

### 2. Swap de 2 GB

Las seis imágenes juntas rondan 1 GB en memoria y Postgres otros 150–200 MB. Con 2 GB de RAM alcanza,
pero sin swap un pico (una compilación, un respaldo) tira algún contenedor.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf
sudo sysctl -p /etc/sysctl.d/99-swap.conf
free -h                                   # Swap: 2.0Gi
```

### 3. Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker cap
```

Salir de la sesión SSH y volver a entrar **como `cap`** (`ssh cap@68.183.105.129`) para que el grupo
haga efecto. Desde aquí todo se hace como `cap`, sin `sudo`:

```bash
docker compose version                    # Docker Compose version v2.x
```

> Docker abre en el firewall los puertos que publica un contenedor sin pasar por UFW. En este sistema
> solo el gateway publica (80 y 443), así que coincide con las reglas de UFW; ningún otro contenedor
> queda expuesto.

### 4. El código y los secretos

```bash
cd ~
git clone https://github.com/gabrielyat-sketch/Proyecto-grupo.git
cd Proyecto-grupo/cap-sistema
git checkout develop
docker run --rm -v "$PWD:/app" -w /app node:22-alpine node infra/scripts/generar-secretos.mjs --droplet --dominio sicapguate.com
sudo chown -R cap:cap secretos .env       # los creó el contenedor como root
chmod 700 secretos && chmod 600 secretos/*.env && chmod 644 secretos/init.sql secretos/redis.conf
```

(Se corre el script dentro de un contenedor de Node porque en el droplet no hace falta instalar Node.)

`init.sql` y `redis.conf` quedan en `644` a propósito: dentro de sus contenedores Postgres y Redis corren
con otro usuario y con `600` no pueden leerlos (Redis se reinicia en bucle y Postgres arranca sin crear
los roles). La carpeta en `700` es lo que los protege de otros usuarios del servidor.

Eso deja en `secretos/` las llaves y **todas las contraseñas de la base ya generadas**: no hay nada
que pegar a mano. Ahora, **antes de seguir**, copiar fuera del servidor tres valores:

```bash
grep -E '^(LLAVE_DATOS|LLAVE_INDICE)=' secretos/comun.env
grep -E '^LLAVE_RAIZ_TRAZA=' secretos/trazabilidad.env
```

Guardarlos en un gestor de contraseñas (o al menos en un archivo cifrado fuera del droplet). **Sin
ellos, ningún respaldo de la base sirve**: los datos clínicos están cifrados con esas llaves.

### 5. Construir, migrar, sembrar, arrancar

Construir tarda **45–50 minutos** en un droplet de 2 GB la primera vez; es normal (las siguientes reutilizan casi todo).

```bash
C="docker compose -f docker-compose.prod.yml -f docker-compose.droplet.yml"
$C --profile migrar build
$C up -d postgres redis
$C ps                                     # los dos "healthy" antes de seguir
for s in auth usuarios programas medicamentos trazabilidad; do
  $C --profile migrar run --rm migrar-$s
done
$C --profile migrar run --rm -e ADMIN_INICIAL=NOMBRE_NO_ADIVINABLE migrar-auth npm run seed -w @cap/auth
$C up -d
$C ps                                     # los 8 "healthy"
```

El seed imprime la contraseña **una sola vez**; la cuenta nace obligada a cambiarla y, por ser
Administrador, a configurar MFA. No usar `admin` como nombre: es el que probaría cualquiera.

En este punto `https://sicapguate.com` ya responde, con un certificado **autofirmado** (el navegador
avisa). El paso siguiente lo arregla.

### 6. Certificado real (Let's Encrypt)

```bash
$C --profile certificado run --rm certbot certonly --webroot -w /var/www/certbot \
  -d sicapguate.com -d www.sicapguate.com --email umgproyectos79@gmail.com --agree-tos --no-eff-email
$C restart gateway
$C --profile certificado up -d certbot    # renovación automática (revisa dos veces al día)
```

El `--entrypoint certbot` es obligatorio: la entrada normal del servicio es el bucle de renovación, y sin
él `certonly` se ignora y el comando se queda callado para siempre. Si eso pasa, `docker rm -f` al
contenedor `certbot` que quedó colgado antes de repetirlo.

### 7. Comprobar desde fuera

Desde **tu computadora** (PowerShell), no desde el droplet:

```powershell
curl.exe -sI https://sicapguate.com | Select-Object -First 1                    # 200
curl.exe -s https://sicapguate.com/api/auth/v1/salud                            # {"estado":"vivo",...}
curl.exe -sI https://www.sicapguate.com | Select-Object -First 1                # 200
curl.exe -sI https://sicapguate.com/api/auth/docs | Select-Object -First 1      # 404
curl.exe -s -X POST https://sicapguate.com/api/trazabilidad/v1/registros -o NUL -w "%{http_code}"   # 403
curl.exe -sI http://sicapguate.com | Select-Object -First 1                     # 301
Test-NetConnection 68.183.105.129 -Port 3001                                    # TcpTestSucceeded: False
Test-NetConnection 68.183.105.129 -Port 5432                                    # TcpTestSucceeded: False
```

Y en el droplet, en los logs (`$C logs --tail 50`) **no** debe aparecer «modo de desarrollo», «Sin
URL_TRAZABILIDAD» ni «Sin REDIS_URL». Luego abrir `https://sicapguate.com` en el navegador, entrar con la
cuenta del seed, cambiar la contraseña y configurar MFA.

### 8. Respaldos diarios

`infra/scripts/respaldo.sh` deja un `pg_dump` comprimido en `/var/respaldos/cap` cada día a las 3:00 y
borra los de más de 14 días.

```bash
sudo mkdir -p /var/respaldos/cap && sudo chown cap:cap /var/respaldos/cap
sudo touch /var/log/respaldo-cap.log && sudo chown cap:cap /var/log/respaldo-cap.log
chmod +x infra/scripts/respaldo.sh
./infra/scripts/respaldo.sh               # uno ahora, para ver que funciona
ls -la /var/respaldos/cap
(crontab -l 2>/dev/null; echo '0 3 * * * /home/cap/Proyecto-grupo/cap-sistema/infra/scripts/respaldo.sh >> /var/log/respaldo-cap.log 2>&1') | crontab -
crontab -l
```

Un respaldo en el mismo servidor no sirve si el servidor se pierde. Dos opciones, y conviene la primera
aunque cueste: **activar Backups del droplet** en DigitalOcean (≈ $2.40/mes, copia semanal de todo el
disco), o traerse el archivo de vez en cuando desde tu computadora:

```powershell
scp cap@68.183.105.129:/var/respaldos/cap/cap-2026-09-21.dump.gz .
```

Cómo restaurar está comentado al inicio de `infra/scripts/respaldo.sh`.

### 9. Cerrar el SSH de root

Solo cuando ya se trabajó como `cap` sin problemas. **Abrir una segunda sesión como `cap` y dejarla
abierta** mientras se hace esto; si algo sale mal, por esa sesión se revierte.

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart ssh
```

Probar desde tu computadora que `ssh root@68.183.105.129` **ya no entra** y que `ssh cap@68.183.105.129`
sí. Solo entonces cerrar la segunda sesión.

### Variante: bases administradas de DigitalOcean

Si algún día se paga Managed PostgreSQL 16 y Managed Redis (Valkey), plan básico cada uno: en *Trusted
sources* dejar solo el droplet; generar los secretos **sin** `--droplet` (dejan `CAMBIAR` donde van las
URL de DigitalOcean); cambiar las contraseñas `dev_*` de `infra/postgres/init.sql` y ejecutarlo como
`doadmin` contra la base (`psql "postgresql://doadmin:...@HOST:25060/cap?sslmode=require" -f infra/postgres/init.sql`
tras un `CREATE DATABASE cap;`); y usar solo `-f docker-compose.prod.yml`, sin el de droplet. Los
respaldos diarios los hace DigitalOcean.

## Actualizar a una versión nueva

```bash
cd ~/Proyecto-grupo/cap-sistema
./infra/scripts/respaldo.sh               # por si acaso, antes de tocar la base
git pull
C="docker compose -f docker-compose.prod.yml -f docker-compose.droplet.yml"
$C --profile migrar build
for s in auth usuarios programas medicamentos trazabilidad; do
  $C --profile migrar run --rm migrar-$s
done
$C up -d
docker image prune -f                     # borra las imagenes viejas que ya no se usan
```

Las migraciones son `prisma migrate deploy`: solo aplican las pendientes, nunca borran nada. **Nunca**
`migrate dev` ni `migrate reset` contra producción.

## Operación

- **Respaldos**: `infra/scripts/respaldo.sh` por cron (paso 8). Sirven solo junto con las tres llaves
  de cifrado guardadas fuera. `docker compose down -v` **borra la base**: nunca en producción.
- **Ver cómo va**: `$C ps` (todo «healthy»), `$C logs --tail 100 -f`, `free -h`, `df -h`.
- **Rotar `JWT_SECRET`**: cambiarlo en `secretos/comun.env` y `up -d` (reinicia los cinco). Todas las
  sesiones abiertas se cierran; el refresh sigue válido.
- **Bitácora**: `npm run verificar-cadena` desde una máquina con acceso a la base confirma que nadie
  alteró la auditoría.
- **Datos de prueba**: `npm run carga` y `npm run cuenta -- --demo` **no** se corren contra producción.

## Qué NO se usa en producción

- `docker-compose.yml` (el de desarrollo): publica Postgres y Redis con contraseñas conocidas.
- `docker-compose.local.yml`: es el ensayo en la máquina de uno, con contraseñas de desarrollo. En el
  droplet va `docker-compose.droplet.yml`.
- `.env` de cada servicio: en producción las variables entran por `secretos/`.
- `npm run dev` / `npm start` sueltos: no llevan `NODE_ENV=production` y arrancarían con Swagger abierto.
