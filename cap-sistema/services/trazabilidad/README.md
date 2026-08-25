# trazabilidad — Servicio de Trazabilidad

**Puerto:** 3007 · **Requerimientos:** RF-09

## Responsabilidad

Cadena de hash append-only. Auditoria de cambios, consultas e impresiones

## Origen

Se genera copiando `services/_plantilla`. No se escribe desde cero.

## Base de datos

Esquema `trazabilidad`, usuario `cap_trazabilidad`. **Ningún otro servicio accede a este esquema.**

## Restricción crítica de base de datos

El usuario `cap_trazabilidad` tiene **`SELECT` e `INSERT`, pero NO `UPDATE` ni `DELETE`**.
Es deliberado: ni la propia aplicación puede alterar la traza. Ver `infra/postgres/init.sql`.

La cadena: `hash_n = SHA256(hash_(n-1) || contenido_n)`. Alterar un registro pasado rompe toda la
cadena posterior.

Sin las protecciones que la acompañan (usuario sin UPDATE, hash raíz diario firmado fuera de la base,
copia en respaldos y procedimiento de verificación ejecutable), el mecanismo sería solo decorativo.

## Estado

Pendiente. Ver el orden de construcción en §14 de la arquitectura.
