# ADR-003 — Cifrado de transporte por encima de HTTPS

**Estado:** Aceptada
**Fecha:** 2026-10-18

## Contexto

En el curso de Seguridad y Auditoría el equipo abrió sicapguate.com desde el navegador de Burp Suite
(Kali Linux) y entró con todos los roles. En el historial del proxy se veían en claro el usuario y la
contraseña del login, los tokens de sesión y cada dato que se registró (por ejemplo, los integrantes de
un grupo familiar). En otra prueba, con el sistema de otro grupo, un ingeniero editó peticiones desde el
mismo Burp y el servidor aceptó los cambios.

HTTPS protege el camino entre el navegador y el servidor: alguien en el WiFi del CAP no ve nada. Pero
Burp no está en el camino. Está **dentro del equipo**, con su propio certificado instalado en el
navegador, y recibe el tráfico ya descifrado. El equipo pidió que eso no se viera ni se pudiera editar.

## Decisión

Cifrar el contenido de cada petición y respuesta del panel **en la propia aplicación**, además de HTTPS.

- **Llaves.** Cada pestaña genera un par ECDH P-256 efímero y no exportable (WebCrypto). El servidor
  tiene un par fijo, derivado de `JWT_SECRET` con HKDF. De los dos sale, con HKDF-SHA256, una llave
  AES-256-GCM compartida. El panel la obtiene con `GET /api/auth/v1/transporte/llave`, que devuelve
  también la hora del servidor para corregir relojes mal puestos.
- **Petición.** Viajan la llave pública del navegador (`X-Sicap-Clave`), un sobre cifrado
  (`X-Sicap-Sobre`) con hora, número único, método, ruta, consulta y token, y el cuerpo cifrado
  `{"c": …}`. La URL viaja sin la consulta y sin cabecera `Authorization`.
- **Respuesta.** Sale cifrada y ligada a esa petición por el número único.
- **Integridad.** AES-GCM rechaza cualquier byte cambiado. El sobre se compara con la ruta y el método
  reales, y el número único no se acepta dos veces en la ventana de 2 minutos.
- **Dónde es obligatorio.** En producción, para todo lo que llega por el gateway, que marca cada
  petición con `X-Sicap-Externo`. Las llamadas entre servicios por la red interna, el desarrollo y las
  pruebas siguen en claro.

Código: `packages/shared/src/transporte/` (servidor, montado en el `main.ts` de cada servicio) y
`web/src/api/cifrado.ts` (panel, usado por `clientes.ts`). La prueba de punta a punta es
`web/pruebas/transporte-cruzado.spec.ts`.

## Por qué la llave sale de JWT_SECRET

Los cinco servicios necesitan la misma llave, y `JWT_SECRET` ya es idéntico en los cinco
(`secretos/comun.env`). Un secreto nuevo obligaría a editar el servidor antes de desplegar, y olvidarlo
dejaría el sistema sin arrancar. HKDF es de un solo sentido: la llave de transporte no revela
`JWT_SECRET`. Cambiar `JWT_SECRET` cambia también esta llave, y el panel abre un canal nuevo solo.

## Lo que sigue viéndose y lo que no resuelve

- En Burp siguen viéndose la ruta (sin la consulta), el método, los tamaños y las horas.
- No es una barrera absoluta. Quien controla el navegador puede, con trabajo, interceptar los datos
  antes de que se cifren (depurando el JavaScript del panel). Las llaves son no exportables, así que
  no se pueden copiar de la memoria, pero sí usar desde dentro de la página. Ninguna aplicación web
  puede impedirlo del todo: el navegador es del usuario.
- No reemplaza las validaciones del servidor. Que el servidor revise roles, cantidades y pertenencia
  sigue siendo lo que impide que una petición legítima pero maliciosa haga daño.

## Despliegue

No requiere secretos nuevos. El orden no importa: un panel nuevo frente a servicios viejos no encuentra
la llave y sigue en claro; servicios nuevos frente a un gateway viejo no reciben `X-Sicap-Externo` y
aceptan en claro. El cifrado queda obligatorio cuando están actualizados los dos.
