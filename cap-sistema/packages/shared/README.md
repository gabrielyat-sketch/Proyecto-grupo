# @cap/shared

Librería compartida por los ocho microservicios (arquitectura §3.2).

## Para qué existe

Para no resolver ocho veces el mismo problema — y sobre todo, **para que un fallo de seguridad se
corrija en un solo lugar**. Si cada servicio implementa su propia validación de JWT, un error en esa
lógica hay que arreglarlo ocho veces y basta olvidar una.

## Módulos

| Carpeta | Qué contiene | Estado |
|---|---|---|
| `auth/` | Guard de JWT, decoradores `@Roles()` / `@Publico()`, RBAC y control de MFA | Listo |
| `crypto/` | AES-256-GCM, índice ciego HMAC-SHA256, hash Argon2id | Listo |
| `errores/` | Filtro global de excepciones y formato único de error | Listo |
| `logging/` | Logger con **redacción de campos sensibles** | Listo |
| `config/` | Validación de variables de entorno con zod, al arrancar | Listo |
| `paginacion/` | Normalización de página y tope duro de 100 registros | Listo |
| `traza/` | Middleware de correlación `X-Traza-Id` | Listo |
| `auditoria/` | Cliente del servicio de trazabilidad | **Pendiente — Etapa 9** |
| `eventos/` | Publicador con outbox transaccional y consumidor idempotente | **Pendiente — Etapa 10** |

Las dos carpetas pendientes están vacías a propósito: `auditoria/` necesita que exista el servicio
de trazabilidad, y `eventos/` necesita el bus de Redis. Implementarlas antes sería escribir contra
un destino que todavía no existe.

## Cuidado especial con `crypto/`

Es el módulo del que depende la confidencialidad de los expedientes. Reglas:

- El índice ciego **debe ser determinista**: el mismo DPI con la misma llave produce siempre el
  mismo HMAC. Si no, la búsqueda de recepción deja de funcionar.
- El cifrado **debe ser no determinista**: el mismo valor cifrado dos veces da resultados distintos.
- Las llaves llegan por variable de entorno. **Nunca se escriben en el código ni se guardan en la
  base de datos** — si la llave está junto a los datos que protege, no protege nada.
- Todo cambio aquí exige pruebas y revisión de otra persona.

## Estado

Se implementa en la **Etapa 2**, junto con el servicio plantilla.
