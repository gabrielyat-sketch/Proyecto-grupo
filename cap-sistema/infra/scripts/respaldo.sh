#!/bin/sh
# Respaldo diario de la base cuando corre en el droplet (docker-compose.droplet.yml).
#
# Deja un pg_dump comprimido en /var/respaldos/cap y borra los de mas de 14 dias.
# Se programa con cron (docs/despliegue.md):
#
#   0 3 * * * /home/cap/Proyecto-grupo/cap-sistema/infra/scripts/respaldo.sh >> /var/log/respaldo-cap.log 2>&1
#
# Un respaldo en el mismo servidor NO sirve si el servidor se pierde: hay que
# copiarlo fuera (scp desde otra maquina, o activar Backups del droplet en
# DigitalOcean). Y sin LLAVE_DATOS, LLAVE_INDICE y LLAVE_RAIZ_TRAZA (secretos/)
# los datos clinicos del respaldo son ilegibles.
#
# Restaurar (con los servicios apagados):
#   docker compose -f docker-compose.prod.yml -f docker-compose.droplet.yml stop auth usuarios programas medicamentos trazabilidad
#   gunzip -c /var/respaldos/cap/cap-AAAA-MM-DD.dump.gz \
#     | docker compose -f docker-compose.prod.yml -f docker-compose.droplet.yml exec -T postgres pg_restore -U postgres -d cap --clean --if-exists
#   docker compose -f docker-compose.prod.yml -f docker-compose.droplet.yml up -d
set -eu

CARPETA="${CARPETA_RESPALDO:-/var/respaldos/cap}"
DIAS=14
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE="docker compose -f $RAIZ/docker-compose.prod.yml -f $RAIZ/docker-compose.droplet.yml"

mkdir -p "$CARPETA"
chmod 700 "$CARPETA"

ARCHIVO="$CARPETA/cap-$(date +%Y-%m-%d).dump.gz"
# -Fc: formato propio de pg_restore, permite restaurar por partes.
$COMPOSE exec -T postgres pg_dump -U postgres -d cap -Fc | gzip > "$ARCHIVO.parcial"
mv "$ARCHIVO.parcial" "$ARCHIVO"
chmod 600 "$ARCHIVO"

find "$CARPETA" -name 'cap-*.dump.gz' -mtime +"$DIAS" -delete

echo "$(date '+%Y-%m-%d %H:%M') respaldo: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
