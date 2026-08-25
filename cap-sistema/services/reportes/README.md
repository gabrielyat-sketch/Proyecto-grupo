# reportes — Servicio de Reportes y DSS

**Puerto:** 3005 · **Requerimientos:** RF-04, RF-07

## Responsabilidad

Modelo de lectura por eventos, panel de indicadores, generacion de PDF

## Origen

Se genera copiando `services/_plantilla`. No se escribe desde cero.

## Base de datos

Esquema `reportes`, usuario `cap_reportes`. **Ningún otro servicio accede a este esquema.**

## Dos contenedores, un solo código

| Proceso | Función |
|---|---|
| `reportes-api` | Atiende HTTP y consume eventos del bus |
| `reportes-worker` | Genera PDF con Chromium headless |

Se separan porque Chromium es **el mayor consumidor de RAM del sistema** y el Droplet tiene 4 GB.
El worker corre con `mem_limit: 512m` y concurrencia máxima 2. Si tumbara el proceso principal,
caería también el panel de indicadores.

## Modelo de lectura

Este servicio **no consulta a los otros servicios**. Mantiene su propia tabla de indicadores ya
calculados, alimentada por eventos, más un recálculo nocturno de reconciliación.

## Debe incluir las cifras que el CAP reporta al MSPAS

No hay integración con SIGSA (P-1), así que el personal las transcribe a mano. Si además tuviera que
recontarlas, el sistema le estaría agregando trabajo en vez de quitárselo.

## Estado

Pendiente. Ver el orden de construcción en §14 de la arquitectura.
