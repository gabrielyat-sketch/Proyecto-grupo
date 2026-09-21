#!/bin/sh
# Se ejecuta al arrancar el contenedor de nginx (la imagen oficial corre todo
# lo que haya en /docker-entrypoint.d/ antes de levantar el servidor).
#
# Deja en /etc/nginx/certificados/ el certificado que va a usar el gateway:
#   - el de Let's Encrypt para ${DOMINIO}, si certbot ya lo obtuvo (vive en
#     el volumen /etc/letsencrypt);
#   - si no, uno autofirmado que se genera aqui mismo. Sirve para ensayar el
#     despliegue en la maquina de uno sin dominio: el navegador avisa de que
#     no es de confianza y se acepta a mano.
#
# Como corre en cada arranque, basta reiniciar nginx despues de obtener el
# certificado real para que lo tome.
set -eu

: "${DOMINIO:?Falta la variable DOMINIO}"

DESTINO=/etc/nginx/certificados
REAL=/etc/letsencrypt/live/${DOMINIO}
mkdir -p "$DESTINO"

if [ -f "$REAL/fullchain.pem" ] && [ -f "$REAL/privkey.pem" ]; then
  ln -sf "$REAL/fullchain.pem" "$DESTINO/fullchain.pem"
  ln -sf "$REAL/privkey.pem"   "$DESTINO/privkey.pem"
  echo "gateway: usando el certificado de Let's Encrypt para ${DOMINIO}"
else
  rm -f "$DESTINO/fullchain.pem" "$DESTINO/privkey.pem"
  openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
    -subj "/CN=${DOMINIO}" \
    -addext "subjectAltName=DNS:${DOMINIO},DNS:localhost,IP:127.0.0.1" \
    -keyout "$DESTINO/privkey.pem" -out "$DESTINO/fullchain.pem" >/dev/null 2>&1
  echo "gateway: SIN certificado real para ${DOMINIO}; usando uno AUTOFIRMADO (solo para pruebas)"
fi
