# @cap/shared

Librería compartida por los ocho microservicios (arquitectura §3.2).

## Para qué existe

Para no resolver ocho veces el mismo problema — y sobre todo, **para que un fallo de seguridad se
corrija en un solo lugar**. Si cada servicio implementa su propia validación de JWT, un error en esa
lógica hay que arreglarlo ocho veces y basta olvidar una.

## Módulos

| Carpeta | Qué contiene |
|---|---|
| `auth/` | Guard de JWT, decorador `@Roles()`, verificación de RBAC |
| `crypto/` | AES-256-GCM, índice ciego HMAC-SHA256, hash Argon2id |
| `auditoria/` | Cliente del servicio de trazabilidad |
| `eventos/` | Publicador con outbox transaccional y consumidor idempotente |
| `logging/` | Logger con **redacción de campos sensibles** |
| `errores/` | Filtro global de excepciones y formato único de error |

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
