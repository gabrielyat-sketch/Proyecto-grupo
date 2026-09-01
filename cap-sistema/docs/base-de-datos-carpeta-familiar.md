# Base de datos: la carpeta familiar

El CAP no archiva por persona sino por **familia**. Cada una tiene un folder de
carton con un numero escrito en la pestana, rotulado con el apellido y guardado
por el lugar donde vive: «Familia Lopez Ac · Purulha Centro · El Calvario ·
No. 1». El sistema no lo recogia.

## Estado de la base de datos

`grupo_familiar` ya existia, con la idea correcta y sin lo que la hace
utilizable:

| Tenia | Le faltaba |
|---|---|
| `codigo` unico, generado por el sistema (`GF-2026-000045`) | El **numero** que el CAP escribe en la pestana |
| `comunidadId` | El **barrio o caserio** |
| `direccion` de texto libre, `telefono` | El **apellido** con que se rotula |
| Relacion con `Paciente` y con `DatosDelHogar` | Cualquier pantalla que la use |

Ademas: un modulo completo en el servidor (`listar`, `obtener`, `crear`), una
secuencia de Postgres para el codigo, y **cero filas**. La carga de prueba no
crea grupos, y ningun paciente apunta a uno.

## Problemas encontrados

1. **No se puede saber «por cual numero vamos».** `codigo` es `VARCHAR(30)` y
   ordena como texto: el 10 va antes que el 9.
2. **Dos identificadores para la misma carpeta.** El `codigo` del sistema no
   esta escrito en ningun folder del archivero.
3. **La carpeta no se puede encontrar como la busca la gente**, que es por
   apellido y lugar. No hay ni apellido ni lugar.

## Requisitos confirmados

- El numero lo asigna quien registra, y el sistema le dice cual sigue libre.
- **La numeracion es por barrio o caserio.** Hay una carpeta No.1 en El
  Calvario y otra No.1 en San Jose.
- **Dos familias del mismo apellido pueden vivir en el mismo lugar.** El
  apellido no identifica: el numero si. Al marcar «la carpeta ya existe» hay
  que mostrar las coincidencias y dejar elegir.

## Cambios realizados

### `GrupoFamiliar`

| Columna | Cambio | Por que |
|---|---|---|
| `numero` | **nueva**, `INTEGER NOT NULL` | El numero de la pestana. Entero para poder ordenarlo y saber cual sigue |
| `apellidos` | **nueva**, `VARCHAR(120) NOT NULL` | El rotulo. No se deduce del apellido de un paciente: una carpeta puede empezar por la abuela y seguir con nietos de otro apellido |
| `serieId` | **nueva**, `TEXT NOT NULL` | La serie de numeracion (ver abajo) |
| `lugarId` | **nueva**, `TEXT NULL` → `lugar_poblado` | El barrio o caserio |
| `codigo` | **eliminada** | Ver «Riesgos» |

### Por que `serieId` existe

La regla es «un numero por barrio o caserio», y el barrio es opcional —las
aldeas no tienen lugares declarados—. Lo natural seria un indice unico sobre
`(lugar_id, numero)`, y no funciona: **Postgres considera distintos dos NULL**
en un indice unico, asi que dejaria crear dos carpetas No.1 en la misma aldea.

Un indice funcional sobre `COALESCE(lugar_id, comunidad_id)` lo resolveria,
pero Prisma no sabe expresarlo y el siguiente `prisma migrate dev` lo borraria
por considerarlo deriva. `serieId` guarda ese mismo valor —el lugar si lo hay,
la comunidad si no— en una columna que Prisma si entiende.

Es informacion derivada, y eso tiene un costo: hay que mantenerla coherente.
La sostiene `GruposService`, que es el unico sitio que crea carpetas. Se
prefirio eso a perder la garantia de unicidad, que es la que impide que dos
familias distintas acaben con el mismo numero en el mismo barrio.

## Migraciones

`20260901093000_carpeta_familiar` — **no aplicada todavia**.

Las tres columnas entran como `NOT NULL` **sin valor por defecto**, a
proposito: si la tabla tuviera filas, la migracion falla en vez de rellenar
carpetas reales con datos inventados.

```
npm run prisma:migrar -w @cap/usuarios
```

## Indices

| Indice | Para que |
|---|---|
| `UNIQUE (serie_id, numero)` | La regla: dos carpetas no llevan el mismo numero en la misma serie |
| `(serie_id, apellidos)` | La busqueda de «¿existe ya la carpeta?». Sin el, esa consulta recorre la tabla entera, y el CAP va a tener miles |
| `(comunidad_id)` | Ya existia |

## Consultas relevantes

**El siguiente numero libre de una serie** —lo que se le muestra al
recepcionista— sale del indice unico, sin recorrer la tabla:

```sql
SELECT COALESCE(MAX(numero), 0) + 1 FROM grupo_familiar WHERE serie_id = $1;
```

No se reutilizan huecos. Si la carpeta 7 se dio de baja, la siguiente sigue
siendo la mayor + 1, que es lo que hace un archivero de verdad.

**Crear una carpeta y asignarle el paciente** tienen que ser una sola
transaccion. A medias queda una carpeta vacia que ya ocupa un numero, y el
siguiente que registre a esa familia vera el numero tomado sin nadie dentro.

## Riesgos

**Se elimina la columna `codigo` y su secuencia.** Es destructivo.

- La tabla esta **vacia** (cero filas), asi que no se pierde ningun dato.
- Lo generaba el sistema y el CAP nunca lo escribio en ningun folder.
- Reversible solo volviendo a crear la columna; los codigos que se hubieran
  generado no se recuperan.
- Rompe el codigo que lo usa: `GruposService.crear`, `siguienteCodigo`, los
  tres DTO de respuesta y `CarnetService`, que crea un grupo al vuelo al
  guardar los datos del hogar. Todo eso hay que actualizarlo en el mismo
  cambio.

## Validaciones realizadas

- Migracion **aplicada** sobre la base de desarrollo. Prisma no detecto deriva:
  el SQL escrito a mano y el esquema producen el mismo estado.
- Que la tabla estuviera vacia quedo comprobado por la propia migracion: las
  tres columnas `NOT NULL` sin valor por defecto habrian fallado con una sola
  fila dentro.
- Semillas ejecutadas: 46 caserios movidos a su propia comunidad, los 46
  anteriores desactivados sin borrar.
- `usuarios`: 9 pruebas en verde, `tsc --noEmit` limpio.
- Panel: 398 pruebas en verde, `tsc --noEmit` limpio.

## Pendientes

- **La pantalla de carpetas**: ver los folders y, dentro de cada uno, las
  fichas de la familia. Es lo siguiente.
- **Los pacientes ya registrados no tienen carpeta.** El padron de prueba son
  300 personas sueltas. Hace falta decidir si se les asigna una a mano segun se
  vayan atendiendo, o si se hace una pasada.
- **`CarnetService` ya no crea la carpeta al vuelo.** Guardar el agua y las
  excretas de un paciente sin carpeta ahora avisa en vez de fabricar un numero
  que no existe en ningun archivero. Los 300 pacientes de prueba caen en ese
  caso hasta que se les asigne una.
- **Para preguntarle al CAP**: cuando una familia se muda de barrio, ¿la
  carpeta conserva su numero y cambia de lugar, o se abre una nueva en la serie
  del barrio nuevo? Con el modelo actual lo primero es un `UPDATE` que puede
  chocar con un numero ya usado alla.
- **Para preguntarle al CAP**: a que aldea pertenece cada uno de los 46
  caserios. Mientras no se sepa, cuelgan de la entrada «Caserios», que no lo
  afirma.
