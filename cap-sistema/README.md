# cap-sistema — Monorepo del sistema del CAP Purulhá

Sistema web para el personal del CAP: expedientes, programas de salud, medicamentos,
indicadores e impresión de fichas oficiales.

**Arquitectura de referencia:** `../arquitectura-cap-purulha.md` (Estado: DEFINITIVA)

## Stack

| Capa | Tecnología |
|---|---|
| Microservicios | Node.js 22 LTS + TypeScript + NestJS |
| ORM | Prisma (un `schema.prisma` por servicio) |
| Base de datos | PostgreSQL 16 — un esquema y un usuario por servicio |
| Eventos y caché | Redis 7 (Streams) |
| Gateway | Nginx (interno autenticado + público de solo lectura) |
| Panel web | React + TypeScript + Vite + MUI |
| Contenedores | Docker + Docker Compose |

## Arrancar el entorno local

```bash
cp .env.example .env      # y rellenar los valores marcados CAMBIAR
npm install
npm run infra:up          # levanta PostgreSQL y Redis
```

Generar las dos llaves de cifrado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## La regla más importante del repositorio

**Ningún servicio se escribe desde cero.** Todos salen de `services/_plantilla`.

Si necesitas resolver algo que ya está resuelto en la plantilla o en `packages/shared`
(autenticación, auditoría, cifrado, logging, manejo de errores), **úsalo, no lo reimplementes**.
Es lo único que hace sostenibles ocho microservicios con tres personas.

## Estructura

```
cap-sistema/
├── docs/          contratos OpenAPI, esquema de eventos, decisiones (ADR)
├── packages/      librería compartida @cap/shared
├── services/      los 8 microservicios + la plantilla base
├── web/           panel del personal del CAP
└── infra/         Nginx, PostgreSQL, scripts de operación
```

## Estado actual

Estructura creada. **Sin código de aplicación todavía** — corresponde a la Etapa 2
(servicio plantilla + librería compartida + CI), que es la ruta crítica del proyecto.
