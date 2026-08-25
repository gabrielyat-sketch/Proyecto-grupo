# usuarios — Servicio de Informacion de Usuarios

**Puerto:** 3002 · **Requerimientos:** RF-01, RF-08

## Responsabilidad

Pacientes, grupos familiares, comunidades, expedientes, atenciones, modo digitalizacion

## Origen

Se genera copiando `services/_plantilla`. No se escribe desde cero.

## Base de datos

Esquema `usuarios`, usuario `cap_usuarios`. **Ningún otro servicio accede a este esquema.**

## Búsqueda sobre campos cifrados

El DPI se guarda en dos columnas: `dpi_cifrado` (AES-256-GCM, solo se descifra para mostrarlo) y
`dpi_indice` (HMAC-SHA256, indexado y consultable). Sin el índice ciego, buscar un paciente exigiría
descifrar todos los expedientes en memoria.

## Camino crítico de rendimiento

La consulta de expediente debe responder en **menos de 2 segundos con 100,000 pacientes**.
Por eso la escritura de auditoría es asíncrona: si fuera síncrona, cada consulta pagaría una segunda
llamada de red.

## Modo de digitalización (RF-08)

El personal del CAP transcribirá miles de expedientes en papel. Si cada campo exige mover el mouse,
la digitalización no se termina nunca. Captura por teclado, orden de tabulación explícito,
`Ctrl+Enter` para guardar y seguir, autoguardado de borrador.

## Estado

Pendiente. Ver el orden de construcción en §14 de la arquitectura.
