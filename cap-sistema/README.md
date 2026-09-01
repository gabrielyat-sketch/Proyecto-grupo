# cap-sistema — Monorepo del sistema del CAP Purulhá

Sistema web para el personal del CAP: expedientes, programas de salud, medicamentos, indicadores e
impresión de fichas oficiales.

**Arquitectura de referencia:** [`../arquitectura-cap-purulha.md`](../arquitectura-cap-purulha.md)

## Mapa: dónde vive cada cosa

```
cap-sistema/
│
├── packages/shared/       ← @cap/shared: cifrado, guards, errores, logging, paginación
│                             Lo usan TODOS los servicios. Un cambio aquí los afecta a todos.
│
├── services/              ← los microservicios
│   ├── _plantilla/           molde. No se despliega; de aquí salen los demás
│   ├── auth/         :3001   cuentas, login, MFA          ✅ construido
│   ├── usuarios/     :3002   pacientes, expedientes       ✅ construido
│   ├── programas/    :3003   hipertensión, embarazo       ✅ construido
│   └── medicamentos/ :3004   inventario, lotes, entregas  ✅ construido
│
├── web/                   ← panel del personal. Sin código todavía (Etapa 5)
│
├── infra/                 ← lo que NO es código de aplicación
│   ├── postgres/init.sql     esquemas y usuarios de base de datos
│   ├── nginx/                los dos gateways
│   └── scripts/              respaldo, restauración, verificación
│
├── docs/                  ← contratos y decisiones
│   ├── endpoints.md          índice de las 47 operaciones (generado)
│   ├── openapi/              contrato por servicio (generado)
│   ├── decisiones/           ADR: por qué se eligió cada cosa
│   ├── eventos/              contrato de los eventos del bus
│   └── servicios-pendientes.md  diseño de los 5 servicios que faltan
│
├── scripts/               ← utilidades del monorepo
├── docker-compose.yml     ← PostgreSQL + Redis para desarrollo local
├── .env.example           ← plantilla de variables (el .env NUNCA se versiona)
└── tsconfig.base.json     ← configuración de TypeScript compartida
```

### Por dentro, todos los servicios son iguales

```
services/<nombre>/
├── prisma/schema.prisma   modelo de datos SOLO de este servicio
├── prisma/migrations/     historial de cambios de esquema
├── scripts/               exportación del contrato OpenAPI
├── src/
│   ├── main.ts            arranque
│   ├── app.module.ts      qué módulos se cargan
│   ├── config/entorno.ts  variables validadas al arrancar
│   ├── prisma/            conexión a la base
│   ├── salud/             healthchecks
│   └── <dominio>/         controller + service + dto  ← aquí está la lógica
├── test/                  pruebas de extremo a extremo
├── .env.example
└── README.md              decisiones propias de ese servicio
```

**Si buscas dónde se hace algo, está en `src/<dominio>/`.** Todo lo demás es andamiaje.

## Lo que VS Code oculta (y por qué)

Estas carpetas existen en disco pero no son del proyecto: son **~590 MB** que git ignora y que
`.vscode/settings.json` esconde del explorador.

| Carpeta | Qué es | Se regenera con |
|---|---|---|
| `node_modules/` | Dependencias descargadas | `npm install` |
| `*/dist/` | Código compilado | `npm run build` |
| `services/*/generado/` | Cliente que genera Prisma | `npx prisma generate` |

Puedes borrarlas sin miedo. El proyecto real son **265 archivos**.

## Arrancar

```bash
cp .env.example .env      # y rellenar los valores marcados CAMBIAR
npm install
npm run infra:up          # PostgreSQL 16 + Redis 7
```

Cada servicio necesita además su propio `.env`:

```bash
cd services/auth && cp .env.example .env && npx prisma migrate dev && npm run seed
```

Generar las dos llaves de cifrado (deben ser **las mismas en todos los servicios**):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Comandos del monorepo

| Comando | Qué hace |
|---|---|
| `npm run infra:up` / `infra:down` | Levanta o baja PostgreSQL y Redis |
| `npm test` | Pruebas unitarias de todos los paquetes |
| `npm run build` | Compila todo |
| `npm run contratos` | Regenera los contratos OpenAPI |
| `npm run endpoints` | Regenera `docs/endpoints.md` |

Por servicio: `npm run test:e2e -w @cap/auth`, `npm run contrato -w @cap/usuarios`, etc.

## Estado

| Etapa | Qué | Estado |
|---|---|---|
| 2 | Librería compartida + plantilla | ✅ |
| 3 | `auth` | ✅ |
| 4 | `usuarios` | ✅ |
| 6 | `programas` (hipertensión, embarazo) | ✅ |
| 8 | `medicamentos` (inventario, lotes, entregas) | ✅ |
| 9 | `trazabilidad` (bitácora append-only, RF-09) | ✅ |
| 5 | Panel web | ⬜ pendiente |
| 7 | Desnutrición infantil | ⬜ |
| 10–12 | Ver `docs/servicios-pendientes.md` | ⬜ |

**425 pruebas** (234 unitarias, 191 e2e contra PostgreSQL real).

## La regla más importante del repositorio

**Ningún servicio se escribe desde cero.** Todos salen de `services/_plantilla`.

Si necesitas resolver algo que ya está resuelto en la plantilla o en `packages/shared`
—autenticación, cifrado, auditoría, logging, manejo de errores— **úsalo, no lo reimplementes**. Es
lo único que hace sostenibles ocho microservicios con tres personas.
