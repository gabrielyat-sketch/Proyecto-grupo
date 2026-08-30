# trazabilidad — Bitácora append-only del sistema

Puerto `3007` · esquema `trazabilidad` · RF-09 · arquitectura §9.5 y §10.4

Registra **quién consultó y quién modificó cada dato clínico**, en una bitácora que nadie —ni el
propio sistema— puede alterar sin que se note.

## Lo que hay que entender antes de tocar este servicio

El usuario de base de datos `cap_trazabilidad` tiene **`SELECT` e `INSERT`, y NO tiene `UPDATE` ni
`DELETE`**. Está así en `infra/postgres/init.sql` y hay pruebas que lo verifican.

**No es una restricción incómoda: es el mecanismo completo.** Sin ella, quien pueda escribir la
bitácora puede recalcular los hashes y borrar su rastro, y la cadena queda decorativa. Si alguna vez
una prueba falla porque no puede hacer `UPDATE`, la prueba está mal planteada.

Las tablas son propiedad de `cap_migrador`, no del servicio. En PostgreSQL el dueño de una tabla
tiene todos los privilegios sobre ella pase lo que pase con los `GRANT`: si el servicio creara sus
propias tablas, tendría `UPDATE` y `DELETE` sobre ellas aunque nunca se le hubieran otorgado.

## La cadena

```
hash_n = SHA256( hash_(n-1) ‖ contenido_n )
```

El primer registro enlaza con 64 ceros. Alterar un registro pasado rompe todos los hashes
posteriores.

La lógica vive en `src/dominio/cadena.ts`, sin base de datos ni Nest a propósito: es la pieza que
decide si la bitácora vale como evidencia, y tiene que poder leerse y probarse sola. El script de
verificación importa **esas mismas funciones**; si tuviera su propia copia del cálculo, una
divergencia entre las dos pasaría desapercibida justo cuando importa.

### Tres decisiones que no son obvias

**El hash se calcula sobre el texto CIFRADO.** `valorAnterior` y `valorNuevo` son datos clínicos y se
guardan cifrados con `LLAVE_DATOS`. Si el hash cubriera el texto en claro, verificar la cadena
exigiría la llave de descifrado, y el CAP no podría auditar su propia bitácora sin exponer los
expedientes. Hasheando lo que se almacena, la verificación demuestra integridad sin leer un solo dato
de paciente.

**La serialización es un arreglo posicional, no un objeto.** `JSON.stringify` sobre un objeto depende
del orden de inserción de las claves: bastaría reordenar los campos del modelo para que todos los
hashes guardados dejaran de cuadrar y la cadena entera pareciera rota sin que nadie tocara un dato.

**`registradoEn` lo pone la aplicación, no un `DEFAULT now()`.** Así entra en el hash. Con el default,
esa columna sería el único dato almacenado que la cadena no cubre.

## Escrituras simultáneas: `pg_advisory_xact_lock`

Dos inserciones a la vez pueden leer el mismo "último registro" y calcular ambas su hash sobre el
mismo previo — bifurcando la cadena.

Lo natural sería bloquear la última fila con `SELECT ... FOR UPDATE`, **y no se puede**: ese bloqueo
exige privilegio `UPDATE`, precisamente el que este usuario no tiene. La restricción que protege la
bitácora descarta la solución habitual.

El cerrojo consultivo no depende de permisos sobre la tabla, se toma dentro de la transacción y lo
suelta PostgreSQL al terminarla, haya commit o rollback. Nadie puede olvidarse de liberarlo.

Como segunda línea de defensa, **`hash_previo` es `UNIQUE`**. Con solo `INSERT` no se puede alterar
nada, pero sí *apéndar* un registro que apunte a un eslabón antiguo y abrir una rama paralela. Con la
restricción, ese insert lo rechaza PostgreSQL — no un informe posterior.

## Raíz diaria firmada

La cadena detecta que alguien alteró **un** registro. No detecta que alguien con control total de
PostgreSQL borre la tabla y la reescriba entera: la cadena nueva sería coherente consigo misma.

La raíz diaria cierra ese hueco. Se firma con `LLAVE_RAIZ_TRAZA`, que **vive fuera de la base de
datos** y es distinta de `LLAVE_DATOS` a propósito: comprometer el cifrado de los valores no debe
alcanzar para volver a firmar la raíz.

El cierre es un endpoint (`POST /v1/raices/cierre`) y no un temporizador dentro del proceso, porque
el servicio correrá en más de una réplica y cada una intentaría cerrar el mismo día. Lo llama una
tarea programada de madrugada.

**No se cierra el día en curso.** Todavía puede recibir registros, y la firma quedaría invalidada por
el siguiente que entrara — que se lee exactamente igual que una alteración.

### Pendiente de despliegue

§9.5 pide además **copiar la raíz al almacenamiento de respaldos** (Spaces). No hay credenciales de
Spaces en desarrollo, así que el punto de extensión está pero la copia no se hace. Si la raíz vive
solo aquí, quien borre la bitácora borra también la prueba: **hay que resolverlo antes de
producción.**

## Endpoints

| Método | Ruta | Quién |
|---|---|---|
| `POST` | `/v1/registros` | Cualquier rol autenticado |
| `GET` | `/v1/registros` | Administrador, Director |
| `GET` | `/v1/registros/verificacion` | Administrador, Director |
| `POST` | `/v1/raices/cierre` | Administrador |
| `GET` | `/v1/raices` | Administrador, Director |

**Registrar no exige rol privilegiado.** Lo llama cualquier servicio en nombre del usuario que
originó la acción, y ese usuario puede tener cualquiera de los seis roles: un médico que corrige un
diagnóstico tiene que poder dejar su propio rastro. Si registrar exigiera ser Administrador, la
acción más común del sistema quedaría sin auditar.

**Leer sí es privilegio.** La bitácora dice quién atendió a quién y cuándo.

**El `usuarioId` sale del token, nunca del cuerpo.** Si el llamador pudiera decir en nombre de quién
registra, la bitácora no probaría nada. Hay una prueba e2e que lo fija.

## Cómo se usa desde otro servicio

No se llama a este servicio con `fetch` a mano. Está `ClienteAuditoria` en `@cap/shared`:

```ts
await this.auditoria.registrar(
  {
    servicio: 'usuarios',
    accion: 'MODIFICACION',
    entidad: 'expediente',
    entidadId: expediente.id,
    motivo: dto.motivo,
    valorAnterior: anterior.diagnostico,
    valorNuevo: dto.diagnostico,
  },
  autorizacion,
  trazaId,
);
```

**Llámalo DENTRO de tu transacción.** Si no se pudo auditar, lanza, y al propagarse la excepción el
cambio de negocio se deshace con ella.

### La política de fallo, y por qué no es uniforme

| Acción | Si trazabilidad no responde |
|---|---|
| Creación, modificación, eliminación, impresión, exportación | **La operación se deshace** |
| Consulta | Continúa; se registra el fallo con nivel de error |

Un cambio de expediente guardado sin quedar registrado es un dato clínico modificado sin autor
conocido, y el RF-09 existe para que eso no pueda pasar.

La consulta es distinta: aplicar la misma regla dejaría al CAP **sin poder atender** porque un
servicio secundario está caído — el personal no podría ni abrir el expediente del paciente que tiene
enfrente. Se elige perder trazabilidad de lecturas antes que perder capacidad de atención.

Es una decisión de riesgo, no una preferencia técnica. Si se cambia, que sea a sabiendas.

## Verificación

Para el CAP, sin necesidad de que esté el equipo de desarrollo. Desde `cap-sistema/`:

```bash
npm run verificar-cadena
```

Comprueba dos cosas distintas: que la **cadena** enlace y cuadre, y que las **firmas diarias** sigan
validando. Termina con código `0` si está intacta y `1` si no, para que pueda programarse y avisar
sola. No necesita las llaves de descifrado.

## Puesta en marcha

```bash
cp .env.example .env          # y rellenar las cuatro llaves
npx prisma migrate deploy
npm run build -w @cap/trazabilidad
npm start -w @cap/trazabilidad          # http://localhost:3007/docs
```

`JWT_SECRET`, `LLAVE_DATOS` y `LLAVE_INDICE` deben ser **las mismas que en los demás servicios**.
`LLAVE_RAIZ_TRAZA` es exclusiva de este y debe ser distinta.

```bash
npm test -w @cap/trazabilidad           # 19 unitarias, sin base de datos
npm run test:e2e -w @cap/trazabilidad   # 38 e2e contra PostgreSQL real
```

> **Las pruebas e2e hacen `TRUNCATE` de la bitácora local antes de empezar.** Necesitan una cadena
> con un principio conocido para poder afirmar que el primer registro enlaza con el génesis. Si
> tienes datos en tu base de desarrollo que quieras conservar, sácalos antes. Nunca se ejecutan
> contra otra base que no sea la local (§9.6).

## Criterio de terminado (§15.2)

> «El script de verificación detecta una alteración simulada, y `UPDATE`/`DELETE` fallan por permisos
> de base de datos.»

No es «el servicio compila y responde». Es que la bitácora demuestre, por sí sola, que nadie la tocó.
Está cubierto en `test/bitacora.e2e-spec.ts`, secciones 3 y 4.

## Lo que este servicio NO hace todavía

`auth`, `usuarios`, `programas` y `medicamentos` **siguen sin auditar nada**. Este servicio y su
cliente existen; falta conectarlos, y eso significa tocar los cuatro. Se hace en conjunto para no
resolver conflictos de más.
