# secretos/ — lo que lee docker-compose.prod.yml

**Nada de esta carpeta se versiona** salvo este archivo (ver `.gitignore` en la raíz).

Se crea con:

```bash
node infra/scripts/generar-secretos.mjs --local   # ensayo en la máquina de uno
node infra/scripts/generar-secretos.mjs           # producción: luego pegar las URL de DigitalOcean
```

| Archivo | Quién lo lee | Qué trae |
|---|---|---|
| `comun.env` | los cinco servicios | `JWT_SECRET` (el mismo en todos), `LLAVE_DATOS`, `LLAVE_INDICE`, `REDIS_URL`, `LOG_LEVEL` |
| `auth.env` | auth | `DATABASE_URL`, `JWT_SECRET_MFA` |
| `usuarios.env`, `programas.env`, `medicamentos.env` | cada uno | su `DATABASE_URL` |
| `trazabilidad.env` | trazabilidad | `DATABASE_URL`, `LLAVE_RAIZ_TRAZA` |
| `migrador.env` | solo los contenedores `migrar-*` | `DIRECT_URL_<SERVICIO>` con el rol dueño de la base |

**Copia fuera del servidor de `LLAVE_DATOS`, `LLAVE_INDICE` y `LLAVE_RAIZ_TRAZA`.** Un respaldo de la base sin esas llaves no sirve: los datos clínicos están cifrados con ellas.
