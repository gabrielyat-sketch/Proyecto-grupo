# secretos/ — lo que lee docker-compose.prod.yml

**Nada de esta carpeta se versiona** salvo este archivo (ver `.gitignore` en la raíz).

Se crea con:

```bash
node infra/scripts/generar-secretos.mjs --local   # ensayo en la máquina de uno
node infra/scripts/generar-secretos.mjs --droplet --dominio X   # producción en el droplet (docs/despliegue.md)
node infra/scripts/generar-secretos.mjs           # producción con bases administradas: luego pegar las URL
```

| Archivo | Quién lo lee | Qué trae |
|---|---|---|
| `comun.env` | los cinco servicios | `JWT_SECRET` (el mismo en todos), `LLAVE_DATOS`, `LLAVE_INDICE`, `REDIS_URL`, `LOG_LEVEL` |
| `auth.env` | auth | `DATABASE_URL`, `JWT_SECRET_MFA` |
| `usuarios.env`, `programas.env`, `medicamentos.env` | cada uno | su `DATABASE_URL` |
| `trazabilidad.env` | trazabilidad | `DATABASE_URL`, `LLAVE_RAIZ_TRAZA` |
| `migrador.env` | solo los contenedores `migrar-*` | `DIRECT_URL_<SERVICIO>` con el rol dueño de la base |

**Copia fuera del servidor de `LLAVE_DATOS`, `LLAVE_INDICE` y `LLAVE_RAIZ_TRAZA`.** Un respaldo de la base sin esas llaves no sirve: los datos clínicos están cifrados con ellas.

Con `--droplet` se añaden tres archivos que montan los contenedores de `docker-compose.droplet.yml`:

| Archivo | Quién lo lee | Qué trae |
|---|---|---|
| `postgres.env` | el contenedor de Postgres | superusuario `postgres` (solo lo usan él y `respaldo.sh`) |
| `init.sql` | el contenedor de Postgres, solo la primera vez | esquemas y roles con las contraseñas generadas |
| `redis.conf` | el contenedor de Redis | `requirepass` |
