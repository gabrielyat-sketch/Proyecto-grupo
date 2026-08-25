# Índice de endpoints

> Generado con `npm run endpoints` a partir de `docs/openapi/*.yaml`.
> **No editar a mano:** los cambios se pierden en la siguiente ejecución.

Todas las rutas llevan el prefijo `/v1`. La columna *Auth* indica si el
endpoint exige token: los marcados con `—` son públicos (healthchecks y el
gateway público).

## auth

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `POST` | `/v1/auth/cerrar-sesion` | Revoca la sesion indicada | — |
| `POST` | `/v1/auth/contrasena` | Cambia la propia contrasena | Bearer |
| `POST` | `/v1/auth/login` | Inicia sesion | — |
| `POST` | `/v1/auth/mfa/activar` | Confirma con un codigo real y activa el segundo factor | Bearer |
| `POST` | `/v1/auth/mfa/configurar` | Genera el secreto TOTP y los codigos de respaldo | Bearer |
| `POST` | `/v1/auth/mfa/verificar` | Completa el login con el codigo de segundo factor | — |
| `POST` | `/v1/auth/refrescar` | Rota el token de refresco y emite uno de acceso nuevo | — |
| `GET` | `/v1/auth/yo` | Perfil del usuario autenticado | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |
| `GET` | `/v1/usuarios` | Lista paginada de cuentas | Bearer |
| `POST` | `/v1/usuarios` | Crea una cuenta | Bearer |
| `GET` | `/v1/usuarios/{id}` |  | Bearer |
| `PATCH` | `/v1/usuarios/{id}` | Actualiza datos, rol o estado de una cuenta | Bearer |
| `POST` | `/v1/usuarios/{id}/restablecer-contrasena` | Genera una contrasena temporal nueva y cierra las sesiones | Bearer |

## programas

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `GET` | `/v1/programas/embarazo` | Seguimientos, ordenados por fecha probable de parto | Bearer |
| `POST` | `/v1/programas/embarazo` | Inscribe un embarazo | Bearer |
| `GET` | `/v1/programas/embarazo/alto-riesgo` | Embarazos activos clasificados como de alto riesgo | Bearer |
| `GET` | `/v1/programas/embarazo/{id}` |  | Bearer |
| `PATCH` | `/v1/programas/embarazo/{id}/cierre` | Cierra el seguimiento con su resultado | Bearer |
| `GET` | `/v1/programas/embarazo/{id}/controles` |  | Bearer |
| `POST` | `/v1/programas/embarazo/{id}/controles` | Registra un control prenatal | Bearer |
| `GET` | `/v1/programas/hipertension` | Inscripciones, con su ultimo control | Bearer |
| `POST` | `/v1/programas/hipertension` | Inscribe a un paciente en el programa | Bearer |
| `GET` | `/v1/programas/hipertension/atrasados` | Pacientes que ya pasaron su fecha de proximo control | Bearer |
| `GET` | `/v1/programas/hipertension/{id}` |  | Bearer |
| `GET` | `/v1/programas/hipertension/{id}/controles` |  | Bearer |
| `POST` | `/v1/programas/hipertension/{id}/controles` | Registra un control | Bearer |
| `PATCH` | `/v1/programas/hipertension/{id}/egreso` | Cierra la inscripcion en el programa | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |

## usuarios

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `GET` | `/v1/comunidades` | Comunidades que atiende el CAP | Bearer |
| `POST` | `/v1/comunidades` |  | Bearer |
| `GET` | `/v1/digitalizacion/resumen` | Avance de la digitalizacion de expedientes | Bearer |
| `PATCH` | `/v1/digitalizacion/{expedienteId}` |  | Bearer |
| `GET` | `/v1/expedientes/buscar` | Busca un expediente por su numero | Bearer |
| `GET` | `/v1/expedientes/{expedienteId}/atenciones` | Historial del expediente, lo mas reciente primero | Bearer |
| `POST` | `/v1/expedientes/{expedienteId}/atenciones` | Registra una atencion en el expediente | Bearer |
| `GET` | `/v1/grupos-familiares` | Lista paginada de grupos familiares | Bearer |
| `POST` | `/v1/grupos-familiares` |  | Bearer |
| `GET` | `/v1/grupos-familiares/{id}` | Grupo familiar con sus integrantes | Bearer |
| `GET` | `/v1/pacientes` | Busca pacientes por DPI, inicio de nombre o comunidad | Bearer |
| `POST` | `/v1/pacientes` | Registra un paciente y abre su expediente | Bearer |
| `GET` | `/v1/pacientes/{id}` |  | Bearer |
| `PATCH` | `/v1/pacientes/{id}` |  | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |

---

**Total: 47 operaciones en 3 servicios.**
