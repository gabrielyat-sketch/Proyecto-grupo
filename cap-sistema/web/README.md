# web — Panel del personal del CAP

React + TypeScript + Vite + MUI (arquitectura §7).

## Módulos

`recepcion` · `expedientes` · `digitalizacion` · `programas` · `farmacia` · `reportes` ·
`impresion` · `cms` · `administracion` · `auditoria`

## El requisito de usabilidad que no es cosmético

El personal del CAP tiene distinto nivel de alfabetización digital, y con el **modo de digitalización
(RF-08)** va a transcribir miles de expedientes en papel.

**Si cada campo exige mover el mouse, la digitalización no se completa nunca.** Por eso:

- Orden de tabulación explícito y verificado en cada formulario de captura.
- `Ctrl+S` guardar · `Ctrl+Enter` guardar y siguiente · `Ctrl+K` buscar.
- Autoguardado de borrador local: un corte de conexión no puede borrar media hora de trabajo.
- El foco entra solo al primer campo al abrir el formulario.

## Cliente de API

Se genera desde los contratos OpenAPI con `openapi-typescript`. Si cambia un contrato, **el frontend
deja de compilar** en vez de fallar en producción frente a un paciente.

## Trabajo en paralelo

Desde la Etapa 1 se construye contra el mock server de Prism, sin esperar al backend real.

## Puesta en marcha

```bash
npm run dev -w @cap/web        # http://localhost:5173
npm test -w @cap/web           # Vitest + Testing Library
npm run build -w @cap/web      # tsc --noEmit && vite build
```

El servidor de desarrollo **proxea** `/api/auth`, `/api/usuarios`, `/api/programas` y
`/api/medicamentos` hacia los puertos 3001-3004. Asi el navegador ve un solo origen: sin CORS y sin
URLs absolutas regadas por el codigo. En produccion ese papel lo cumple el gateway de nginx, y el
frontend no cambia al desplegarse.

Para trabajar con datos reales hace falta levantar los servicios que use la pantalla en cuestion.

## Estado

**Etapa 5 en curso** (rama `feature/web-recepcion`).

- [x] Cascaron: Vite + React 19 + MUI, tema, enrutador, cache de TanStack Query
- [ ] Cliente de API generado desde los contratos
- [ ] Sesion: login + MFA + refresco rotatorio + cierre por inactividad
- [ ] Layout con menu por rol
- [ ] Modulo de recepcion
- [ ] Modo de digitalizacion (RF-08)

> **`tsconfig.json` no extiende `tsconfig.base.json` a proposito.** La base esta hecha para NestJS:
> CommonJS, decoradores y emision de `.js`. Este paquete necesita modulos ESM, `jsx: react-jsx` y
> `noEmit`, porque quien empaqueta es Vite. Heredar de la base obligaria a sobrescribir casi todo.
