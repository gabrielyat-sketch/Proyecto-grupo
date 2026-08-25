# cms — Servicio de CMS

**Puerto:** 3006 · **Requerimientos:** RF-05

## Responsabilidad

Contenido educativo. Unica fuente de la app movil

## Origen

Se genera copiando `services/_plantilla`. No se escribe desde cero.

## Base de datos

Esquema `cms`, usuario `cap_cms`. **Ningún otro servicio accede a este esquema.**

## Único servicio alcanzable desde el gateway público

Es la única puerta entre la comunidad y el sistema. Por el gateway público:

- Solo `GET`, nunca escritura.
- Solo contenido **marcado como publicado**.
- Sin autenticación, con límite de peticiones por IP y caché.

Aunque ese endpoint fuera comprometido, el atacante solo alcanzaría contenido educativo que ya es
público por definición.

## Pertinencia cultural

En Purulhá se habla poqomchi' y q'eqchi'. La estructura de contenido debe admitir pictogramas, audio
y varios idiomas — aunque el contenido multilingüe se cargue después.

## Estado

Pendiente. Ver el orden de construcción en §14 de la arquitectura.
