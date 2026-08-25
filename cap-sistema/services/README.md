# services — Los microservicios

## Qué hay aquí

**Solo los servicios que existen.** Los cinco que faltan no tienen carpeta todavía: se crean
copiando `_plantilla` cuando llega su etapa. Su diseño ya decidido está en
[`../docs/servicios-pendientes.md`](../docs/servicios-pendientes.md).

| Carpeta | Puerto | Responsabilidad | RF |
|---|---|---|---|
| `_plantilla` | — | Molde. **No se despliega** | — |
| `auth` | 3001 | Cuentas, roles, JWT, refresh, MFA TOTP | RF-06 |
| `usuarios` | 3002 | Pacientes, expedientes, atenciones, digitalización | RF-01, RF-08 |
| `programas` | 3003 | Hipertensión y embarazo | RF-03 |

## La regla

**Ningún servicio se escribe desde cero.** Todos se generan copiando `_plantilla`.

Es lo que hace viable que tres personas mantengan ocho servicios: si los ocho comparten estructura,
quien entiende uno entiende los ocho, y una corrección de seguridad se aplica igual en todos.

Ver el procedimiento completo en [`_plantilla/README.md`](_plantilla/README.md).

## Reglas entre servicios

1. **Un servicio nunca consulta la base de datos de otro.** Solo su API o los eventos.
2. Las llamadas HTTP internas llevan timeout corto (2 s) y **no encadenan más de un salto**.
3. Toda llamada entre servicios **propaga el token del usuario**: sin eso, un servicio se convierte
   en puerta trasera a los datos de otro.
4. Todo lo que alimenta indicadores va por **eventos**, no por HTTP.
5. Todos exponen `GET /v1/salud` y `GET /v1/salud/listo`.
6. Todos versionan sus rutas con prefijo `/v1` desde el primer día.

## Dónde está la lógica

Dentro de cada servicio, en `src/<dominio>/`. Todo lo demás —`config`, `prisma`, `salud`, `comun`,
`eventos`— es andamiaje idéntico entre servicios.

| Servicio | Dónde mirar primero |
|---|---|
| `auth` | `src/autenticacion/`, `src/tokens/`, `src/mfa/` |
| `usuarios` | `src/pacientes/`, `src/atenciones/` |
| `programas` | `src/dominio/clinico.ts` ← toda la lógica clínica, en funciones puras |
