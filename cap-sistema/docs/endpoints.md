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
| `POST` | `/v1/auth/mfa/activar-inicial` | Confirma la primera configuracion y abre la sesion | — |
| `POST` | `/v1/auth/mfa/configurar` | Genera el secreto TOTP y los codigos de respaldo | Bearer |
| `POST` | `/v1/auth/mfa/configurar-inicial` | Configura el segundo factor por primera vez, sin sesion previa | — |
| `POST` | `/v1/auth/mfa/verificar` | Completa el login con el codigo de segundo factor | — |
| `POST` | `/v1/auth/refrescar` | Rota el token de refresco y emite uno de acceso nuevo | — |
| `GET` | `/v1/auth/yo` | Perfil del usuario autenticado | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |
| `GET` | `/v1/usuarios` | Lista paginada de cuentas | Bearer |
| `POST` | `/v1/usuarios` | Crea una cuenta | Bearer |
| `GET` | `/v1/usuarios/{id}` | Obtiene una cuenta por su identificador | Bearer |
| `PATCH` | `/v1/usuarios/{id}` | Actualiza datos, rol o estado de una cuenta | Bearer |
| `POST` | `/v1/usuarios/{id}/reiniciar-mfa` | Borra el segundo factor para que la persona lo configure de nuevo | Bearer |
| `POST` | `/v1/usuarios/{id}/restablecer-contrasena` | Genera una contrasena temporal nueva y cierra las sesiones | Bearer |

## medicamentos

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `GET` | `/v1/entregas` | Historial de entregas | Bearer |
| `POST` | `/v1/entregas` | Registra una entrega a un paciente | Bearer |
| `GET` | `/v1/entregas/{id}` | Detalle de una entrega | Bearer |
| `GET` | `/v1/inventario/movimientos` | Movimientos de inventario, lo mas reciente primero | Bearer |
| `GET` | `/v1/lotes/por-vencer` | Lotes que vencen dentro de la ventana de alerta | Bearer |
| `GET` | `/v1/lotes/semaforo/resumen` | Cuantos lotes con existencia hay de cada color del semaforo | Bearer |
| `GET` | `/v1/lotes/semaforo/{color}` | Lotes con existencia de un color del semaforo | Bearer |
| `GET` | `/v1/lotes/vencidos` | Lotes vencidos que aun figuran con existencia | Bearer |
| `PATCH` | `/v1/lotes/{id}/ajuste` | Ajusta la existencia de un lote a lo que se conto en el estante | Bearer |
| `PATCH` | `/v1/lotes/{id}/baja` | Da de baja lo que queda de un lote | Bearer |
| `GET` | `/v1/medicamentos` | Catalogo con la existencia total de cada medicamento | Bearer |
| `POST` | `/v1/medicamentos` | Da de alta un medicamento en el catalogo | Bearer |
| `GET` | `/v1/medicamentos/bajo-minimo` | Medicamentos por debajo de su existencia minima | Bearer |
| `GET` | `/v1/medicamentos/{id}` | Detalle con sus lotes y el estado de vencimiento de cada uno | Bearer |
| `PATCH` | `/v1/medicamentos/{id}` | Ajusta existencia minima, receta obligatoria o estado | Bearer |
| `POST` | `/v1/medicamentos/{medicamentoId}/lotes` | Ingresa un lote al inventario | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |

## programas

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `GET` | `/v1/programas/embarazo` | Seguimientos, ordenados por fecha probable de parto | Bearer |
| `POST` | `/v1/programas/embarazo` | Inscribe un embarazo | Bearer |
| `GET` | `/v1/programas/embarazo/alto-riesgo` | Embarazos activos clasificados como de alto riesgo | Bearer |
| `GET` | `/v1/programas/embarazo/{id}` | Seguimiento por su identificador | Bearer |
| `PATCH` | `/v1/programas/embarazo/{id}/cierre` | Cierra el seguimiento con su resultado | Bearer |
| `GET` | `/v1/programas/embarazo/{id}/controles` | Controles prenatales, lo mas reciente primero | Bearer |
| `POST` | `/v1/programas/embarazo/{id}/controles` | Registra un control prenatal | Bearer |
| `GET` | `/v1/programas/hipertension` | Inscripciones, con su ultimo control | Bearer |
| `POST` | `/v1/programas/hipertension` | Inscribe a un paciente en el programa | Bearer |
| `GET` | `/v1/programas/hipertension/atrasados` | Pacientes que ya pasaron su fecha de proximo control | Bearer |
| `GET` | `/v1/programas/hipertension/{id}` | Inscripcion por su identificador | Bearer |
| `GET` | `/v1/programas/hipertension/{id}/controles` | Controles del programa, lo mas reciente primero | Bearer |
| `POST` | `/v1/programas/hipertension/{id}/controles` | Registra un control | Bearer |
| `PATCH` | `/v1/programas/hipertension/{id}/egreso` | Cierra la inscripcion en el programa | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |

## trazabilidad

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `GET` | `/v1/raices` | Raices diarias firmadas | Bearer |
| `POST` | `/v1/raices/cierre` | Cierra un dia y firma su hash raiz | Bearer |
| `GET` | `/v1/registros` | Consulta la bitacora, paginada | Bearer |
| `POST` | `/v1/registros` | Agrega una entrada a la bitacora | Bearer |
| `GET` | `/v1/registros/verificacion` | Recorre la cadena y reporta si esta intacta | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |

## usuarios

| Método | Ruta | Qué hace | Auth |
|---|---|---|---|
| `GET` | `/v1/carnet/catalogo` | El esquema de vacunacion y los micronutrientes del formulario | Bearer |
| `GET` | `/v1/comunidades` | Comunidades que atiende el CAP | Bearer |
| `POST` | `/v1/comunidades` | Registra una comunidad | Bearer |
| `GET` | `/v1/comunidades/{id}/lugares` | Barrios, caserios y aldeas de una comunidad | Bearer |
| `GET` | `/v1/digitalizacion/cola` | Expedientes por transcribir | Bearer |
| `GET` | `/v1/digitalizacion/comunidades` | Avance de la digitalizacion comunidad por comunidad | Bearer |
| `GET` | `/v1/digitalizacion/resumen` | Avance de la digitalizacion de expedientes | Bearer |
| `PATCH` | `/v1/digitalizacion/{expedienteId}` | Cambia el estado de digitalizacion de un expediente | Bearer |
| `GET` | `/v1/expedientes/buscar` | Busca un expediente por su numero | Bearer |
| `GET` | `/v1/expedientes/{expedienteId}/atenciones` | Historial del expediente, lo mas reciente primero | Bearer |
| `POST` | `/v1/expedientes/{expedienteId}/atenciones` | Registra una atencion en el expediente | Bearer |
| `POST` | `/v1/expedientes/{expedienteId}/fichas` | Registra una ficha clinica completa | Bearer |
| `GET` | `/v1/fichas/catalogo/{tipo}` | Estructura de una ficha: signos de peligro, antecedentes y problemas | Bearer |
| `GET` | `/v1/fichas/{id}` | Una ficha registrada, con el texto descifrado y el catalogo resuelto | Bearer |
| `GET` | `/v1/grupos-familiares` | Lista paginada de carpetas familiares | Bearer |
| `POST` | `/v1/grupos-familiares` | Abre una carpeta familiar | Bearer |
| `GET` | `/v1/grupos-familiares/siguiente-numero` | El siguiente numero libre de la serie de ese lugar | Bearer |
| `GET` | `/v1/grupos-familiares/{id}` | Carpeta familiar con sus integrantes | Bearer |
| `GET` | `/v1/pacientes` | Busca pacientes por DPI, inicio de nombre o comunidad | Bearer |
| `POST` | `/v1/pacientes` | Registra un paciente y abre su expediente | Bearer |
| `GET` | `/v1/pacientes/{id}` | Ficha completa del paciente | Bearer |
| `PATCH` | `/v1/pacientes/{id}` | Corrige datos del paciente | Bearer |
| `GET` | `/v1/pacientes/{pacienteId}/antecedentes` | Antecedentes ya registrados de un paciente | Bearer |
| `PATCH` | `/v1/pacientes/{pacienteId}/antecedentes` | Guarda o actualiza las respuestas enviadas | Bearer |
| `GET` | `/v1/pacientes/{pacienteId}/carnet` | El carnet de un nino: dosis puestas, entregas hechas, padres y hogar | Bearer |
| `PATCH` | `/v1/pacientes/{pacienteId}/carnet` | Anota o corrige el carnet | Bearer |
| `GET` | `/v1/pacientes/{pacienteId}/crecimiento` | Los pesos del nino en el tiempo, para la grafica de peso para edad | Bearer |
| `GET` | `/v1/salud` | El proceso esta vivo | — |
| `GET` | `/v1/salud/listo` | El servicio y sus dependencias responden | — |
| `POST` | `/v1/visitas` | Marca que un paciente llego y espera ser atendido | Bearer |
| `GET` | `/v1/visitas/espera` | Quienes esperan ahora, por orden de llegada | Bearer |
| `PATCH` | `/v1/visitas/{id}/retiro` | Saca de la sala a alguien que se fue sin atencion | Bearer |

---

**Total: 91 operaciones en 5 servicios.**
