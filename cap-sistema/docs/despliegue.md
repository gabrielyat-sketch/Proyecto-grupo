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

                  Postgres y Redis administrados de DigitalOcean (con TLS)
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
| `infra/scripts/generar-secretos.mjs` | Crea `secretos/*.env` con llaves nuevas |
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

## Producción, paso a paso

### 1. Lo que se crea en DigitalOcean

1. **Droplet** Ubuntu 24.04, mínimo 2 GB de RAM (las seis imágenes juntas rondan 1 GB en memoria),
   región `nyc3` o `sfo3`. Instalar Docker con el script oficial (`curl -fsSL https://get.docker.com | sh`).
2. **Managed Database → PostgreSQL 16**, plan básico. En *Settings → Trusted sources* dejar solo el
   droplet. Anotar host, puerto (25060), usuario `doadmin` y contraseña.
3. **Managed Database → Redis (Valkey)**, plan básico. Mismo *Trusted sources*. La URL empieza por
   `rediss://` (con dos «s»: es TLS, y el servicio lo exige).
4. **Cloud Firewall** aplicado al droplet: entrantes solo `22` (desde tu IP), `80` y `443`. Nada más.
   Los puertos 3001–3007, 5432 y 6379 **no** se abren.
5. **DNS**: registro `A` del dominio hacia la IP del droplet. Esperar a que resuelva
   (`nslookup TU_DOMINIO`) antes de pedir el certificado.

### 2. La base de datos

`infra/postgres/init.sql` crea los esquemas y los roles con contraseñas `dev_*`. **En producción se
cambian primero**: reemplazar cada `PASSWORD 'dev_...'` por una contraseña nueva (`openssl rand -base64 24`)
y guardarlas, porque van en `secretos/`. Luego ejecutarlo como `doadmin` contra la base administrada:

```bash
psql "postgresql://doadmin:CONTRASEÑA@HOST:25060/defaultdb?sslmode=require" -c "CREATE DATABASE cap;"
psql "postgresql://doadmin:CONTRASEÑA@HOST:25060/cap?sslmode=require" -f infra/postgres/init.sql
```

### 3. El código y los secretos en el droplet

```bash
git clone https://github.com/gabrielyat-sketch/Proyecto-grupo.git && cd Proyecto-grupo/cap-sistema
node infra/scripts/generar-secretos.mjs          # sin --local
```

Editar `secretos/*.env` reemplazando cada `CAMBIAR`:

- `DATABASE_URL` en `auth.env`, `usuarios.env`, `programas.env`, `medicamentos.env`, `trazabilidad.env`:
  usuario `cap_<servicio>` con la contraseña puesta en el SQL, host y puerto de la base administrada,
  `?schema=<servicio>&sslmode=require`.
- `DIRECT_URL_*` en `migrador.env`: igual pero con `cap_migrador`.
- `REDIS_URL` en `comun.env`: la `rediss://...` de DigitalOcean.
- `DOMINIO=` en `.env`.

Las llaves (`JWT_SECRET`, `JWT_SECRET_MFA`, `LLAVE_DATOS`, `LLAVE_INDICE`, `LLAVE_RAIZ_TRAZA`) ya
vienen generadas. **Copiar `LLAVE_DATOS`, `LLAVE_INDICE` y `LLAVE_RAIZ_TRAZA` a un lugar fuera del
servidor** (gestor de contraseñas). Sin ellas, un respaldo de la base es ilegible.

### 4. Construir, migrar, sembrar, arrancar

```bash
docker compose -f docker-compose.prod.yml --profile migrar build
for s in auth usuarios programas medicamentos trazabilidad; do
  docker compose -f docker-compose.prod.yml --profile migrar run --rm migrar-$s
done
docker compose -f docker-compose.prod.yml --profile migrar run --rm \
  -e ADMIN_INICIAL=NOMBRE_NO_ADIVINABLE migrar-auth npm run seed -w @cap/auth
docker compose -f docker-compose.prod.yml up -d
```

El seed imprime la contraseña **una sola vez**; la cuenta nace obligada a cambiarla y, por ser
Administrador, a configurar MFA. No usar `admin` como nombre: es el que probaría cualquiera.

En este punto el gateway ya atiende en `https://TU_DOMINIO` con un certificado **autofirmado**.

### 5. Certificado real (Let's Encrypt)

Con el DNS ya apuntando al droplet:

```bash
docker compose -f docker-compose.prod.yml --profile certificado run --rm certbot certonly \
  --webroot -w /var/www/certbot -d TU_DOMINIO --email TU_CORREO --agree-tos --no-eff-email
docker compose -f docker-compose.prod.yml --profile certificado up -d certbot   # renovación automática
```

El gateway toma el certificado nuevo solo (revisa cada 6 horas); para no esperar,
`docker compose -f docker-compose.prod.yml restart gateway`.

### 6. Comprobar desde fuera

```bash
curl -sI https://TU_DOMINIO | head -1                                   # 200
curl -s https://TU_DOMINIO/api/auth/v1/salud                            # {"estado":"ok",...}
curl -sI https://TU_DOMINIO/api/auth/docs | head -1                     # 404
curl -s -X POST https://TU_DOMINIO/api/trazabilidad/v1/registros -o /dev/null -w "%{http_code}\n"   # 403
curl -sI http://TU_DOMINIO | head -1                                    # 301 a https
nc -zv IP_DEL_DROPLET 3001                                              # debe FALLAR
```

Y en los logs (`docker compose -f docker-compose.prod.yml logs --tail 50`) **no** debe aparecer
«modo de desarrollo», «Sin URL_TRAZABILIDAD» ni «Sin REDIS_URL». Si aparece, ese servicio arrancó sin
`NODE_ENV=production`.

## Actualizar a una versión nueva

```bash
git pull
docker compose -f docker-compose.prod.yml --profile migrar build
for s in auth usuarios programas medicamentos trazabilidad; do
  docker compose -f docker-compose.prod.yml --profile migrar run --rm migrar-$s
done
docker compose -f docker-compose.prod.yml up -d
```

Las migraciones son `prisma migrate deploy`: solo aplican las pendientes, nunca borran nada. **Nunca**
`migrate dev` ni `migrate reset` contra producción.

## Operación

- **Respaldos**: los diarios de la base administrada los hace DigitalOcean. Sirven solo junto con las
  tres llaves de cifrado guardadas fuera.
- **Rotar `JWT_SECRET`**: cambiarlo en `secretos/comun.env` y `up -d` (reinicia los cinco). Todas las
  sesiones abiertas se cierran; el refresh sigue válido.
- **Bitácora**: `npm run verificar-cadena` desde una máquina con acceso a la base confirma que nadie
  alteró la auditoría.
- **Datos de prueba**: `npm run carga` y `npm run cuenta -- --demo` **no** se corren contra producción.

## Qué NO se usa en producción

- `docker-compose.yml` (el de desarrollo): publica Postgres y Redis con contraseñas conocidas.
- `.env` de cada servicio: en producción las variables entran por `secretos/`.
- `npm run dev` / `npm start` sueltos: no llevan `NODE_ENV=production` y arrancarían con Swagger abierto.
