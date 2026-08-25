# ADR-001 — Lenguaje y framework del backend

**Estado:** Aceptada
**Fecha:** 2026-08-25

## Contexto

El plan de desarrollo v2 (§6.1) dejaba la decisión abierta: *"Node.js con Express, o Python con
FastAPI"*. Había que cerrarla antes de construir el servicio plantilla, porque de él salen los otros
siete servicios.

Restricciones reales del proyecto:

- Equipo de **3 personas** para **8 microservicios**.
- Droplet de **2 vCPU / 4 GB RAM** para todos los servicios.
- El sistema debe sobrevivir años sostenido por el CAP, no por el equipo.
- El panel web ya está definido en React + TypeScript.

## Decisión

**Node.js 22 LTS + TypeScript + NestJS.**

## Motivos

1. **Un solo lenguaje principal.** Backend y web comparten TypeScript; el único segundo lenguaje es
   Dart para la app móvil. Con Python serían tres ecosistemas para tres personas.
2. **NestJS impone estructura.** Módulos, controladores, providers y DTOs hacen que ocho servicios
   escritos por tres personas se vean iguales. Express y FastAPI dan libertad total, y sin estructura
   impuesta ocho servicios terminan en ocho estilos distintos que nadie mantiene.
3. **Contratos OpenAPI sin trabajo extra.** `@nestjs/swagger` los genera desde los mismos decoradores
   que validan la entrada.
4. **El cifrado viene en la biblioteca estándar.** `node:crypto` trae AES-256-GCM y HMAC-SHA256
   nativos — justo lo que necesita el índice ciego. Cero dependencias en la parte más sensible.
5. **Cabe en 4 GB.** ~70–90 MB por servicio × 8 ≈ 700 MB, con margen para Nginx, Redis y el worker
   de PDF.

## Alternativas descartadas

| Alternativa | Motivo |
|---|---|
| Python + FastAPI | Segunda opción legítima. Se descarta por la fragmentación en tres lenguajes y la falta de estructura impuesta |
| Java / Spring Boot | 250–400 MB por JVM × 8 **no cabe en 4 GB**. Obligaría a un servidor más caro |
| Express sin framework | Sin estructura, ocho servicios divergen. Habría que construir a mano OpenAPI, validación, DI y errores |

## Excepción prevista

Si algún día se implementa el **Servicio de Análisis (ML, COULD)**, ese servicio sí conviene en
Python. No contradice esta decisión: es exactamente para lo que sirven los microservicios.

## Consecuencias

- El servicio plantilla se construye en NestJS y define el estándar de los demás.
- El equipo asume una curva de aprendizaje inicial en NestJS y Prisma, concentrada en la Etapa 2.
- Actualizar la tabla de stack del `Plan de Desarrollo v2.docx` §6.1 para que no siga ofreciendo
  dos opciones.
