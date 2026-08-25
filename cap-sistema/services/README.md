# services — Los 8 microservicios

## La regla

**Ningún servicio se escribe desde cero.** Todos se generan copiando `_plantilla`.

Es lo que hace viable que tres personas mantengan ocho servicios: si los ocho comparten estructura,
quien entiende uno entiende los ocho, y una corrección de seguridad se aplica igual en todos.

## Los servicios

| Carpeta | Puerto | Responsabilidad | RF |
|---|---|---|---|
| `_plantilla` | — | Servicio de referencia. No se despliega | — |
| `auth` | 3001 | Cuentas, roles, JWT, refresh, MFA TOTP | RF-06 |
| `usuarios` | 3002 | Pacientes, grupos familiares, expedientes, atenciones | RF-01, RF-08 |
| `programas` | 3003 | Hipertensión, embarazo, desnutrición infantil | RF-03 |
| `medicamentos` | 3004 | Inventario, lotes, vencimientos, entregas | RF-02 |
| `reportes` | 3005 | Indicadores por eventos + generación de PDF | RF-04, RF-07 |
| `cms` | 3006 | Contenido educativo para la app móvil | RF-05 |
| `trazabilidad` | 3007 | Cadena de hash append-only, auditoría | RF-09 |
| `ml` | 3008 | **COULD.** Análisis de patrones. Desacoplado | — |

## Reglas entre servicios

1. **Un servicio nunca consulta la base de datos de otro.** Solo su API o los eventos.
2. Las llamadas HTTP internas llevan timeout corto (2 s) y **no encadenan más de un salto**.
3. Todo lo que alimenta indicadores va por eventos, no por HTTP.
4. Todos exponen `GET /salud` y `GET /salud/listo`.
5. Todos versionan sus rutas con prefijo `/v1` desde el primer día.

## Orden de construcción

`_plantilla` → `auth` → `usuarios` → el resto (ver §14 de la arquitectura).
`auth` primero porque todos los demás dependen de que exista la validación de JWT.
