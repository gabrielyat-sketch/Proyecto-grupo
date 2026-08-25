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

## Estado

Pendiente de inicializar con `npm create vite@latest`.
