# ml — Servicio de Analisis (ML)

**Puerto:** 3008 · **Requerimientos:** -

## Responsabilidad

COULD. Deteccion de patrones. Desacoplado: su ausencia no impide la entrega

## Origen

Se genera copiando `services/_plantilla`. No se escribe desde cero.

## Base de datos

Esquema `ml`, usuario `cap_ml`. **Ningún otro servicio accede a este esquema.**

## Alcance

Clasificado **COULD**. Su ausencia no impide la entrega del sistema.

Está completamente desacoplado: ningún otro servicio depende de él.

## Excepción de lenguaje

Es el único servicio donde **Python está justificado** en lugar de TypeScript, por el ecosistema de
análisis de datos. Ver `docs/decisiones/ADR-001-lenguaje-y-framework.md`.

## Estado

Pendiente. Ver el orden de construcción en §14 de la arquitectura.
