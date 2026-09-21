#!/bin/sh
# Cada 6 horas vuelve a enlazar el certificado (05-certificado.sh) y recarga
# nginx sin cortar conexiones. Es lo que hace que el certificado renovado por
# certbot —y el primero real, cuando reemplaza al autofirmado— entre en uso
# sin que nadie tenga que reiniciar el gateway.
#
# Queda en segundo plano: los scripts de /docker-entrypoint.d/ corren antes de
# que arranque nginx, y este bucle sobrevive porque el entrypoint termina
# haciendo exec de nginx, no saliendo.
(
  while :; do
    sleep 6h
    /docker-entrypoint.d/05-certificado.sh >/dev/null 2>&1 || true
    nginx -s reload
  done
) &
