# Diseño: ficha clínica prenatal y/o posparto

Estado: **en construcción.** Rama: `feature/ficha-prenatal`.

Es la cuarta y última de las fichas oficiales del MSPAS, y la única que se
solapa con un módulo ya construido: el embarazo vive desde la Etapa 6 en el
servicio `programas`, con su FUR, su fecha probable de parto y sus alertas.

---

## Lo que cambió al leer el original

Las cuatro páginas se leyeron renderizando el PDF a imagen. Los escaneos no
tienen capa de texto: `pdftotext` no saca nada, y esta máquina no traía con qué
convertirlos —se instaló `pymupdf` para poder leerlos.

`docs/campos-de-fichas.md` tiene bien el inventario de campos, pero el papel
trae siete cosas que el resumen no menciona, y una de ellas cambia el modelo
entero.

**1. No es una ficha de cuatro páginas: son dos hojas distintas.** Las páginas 1
y 2 son la ficha prenatal. La página 3 se titula «EVALUACIÓN DEL POSPARTO»,
**reinicia la numeración de secciones** —vuelve a empezar en «II. Datos
generales de la paciente»— y repite el encabezado de número de expediente y
fecha. No es la continuación de la hoja anterior: es otra hoja que comparte la
grapa. Cada una tiene sus propios signos de peligro, su propia consejería y su
propia conducta.

**2. Los signos de peligro no son los mismos en las dos hojas.** Siete
coinciden. El octavo cambia: en el embarazo es «presentaciones fetales
anormales», en el posparto es «coágulos con mal olor (loquios)». Y el orden
impreso tampoco es el mismo —«fiebre» sube al cuarto puesto en la hoja del
posparto—. El orden importa: el personal recorre la lista de arriba abajo.

**3. Dos secciones de texto libre que el resumen no lista.** «IV. Si refirió a
la paciente, registre manejo y estabilización», que está en las **dos** hojas, y
«VI. Historia de la enfermedad actual», que solo está en la prenatal.

Las dos existen ya en el sistema, y con la misma numeración: `Atencion` guarda
`historiaEnfermedadCifrado` («Sección VI», dice su comentario) y
`manejoEstabilizacionCifrado` («Sección IV. Solo se llena si el paciente fue
referido»). No hay nada que construir aquí — solo que la pantalla las pida—.
Es la ventaja de que las cuatro hojas del MSPAS compartan esqueleto.

**4. La identificación del establecimiento tiene nueve casillas, no seis.** PS,
PSF, C/S «B», CENAPA, C/S «A», CAP, CAIMI, CUM y HOSPITAL, más distrito y área
de salud. El comentario de `SERVICIO_DE_SALUD` en
`web/src/modulos/fichas/servicio-fichas.ts` dice «de las seis casillas del
papel» y las enumera mal: se corrige de camino. El distrito lo pide igual que la
hoja de niñez, y sigue sin confirmar.

**5. El examen general es una sola casilla para cuatro hallazgos.** El papel
imprime «Estado general, palidez palmar, conjuntivas, uñas» en una fila y una
única pregunta «¿Normal? SI / NO». No son cuatro preguntas: es una. Partirla en
cuatro daría una ficha que no se puede comparar con el papel que la enfermera
llenó ayer.

**6. En la tabla del posparto, «Mm/Hg» y «X min» son unidades, no campos.** La
página 4 imprime «P/A» y «Mm/Hg» en dos filas seguidas, y lo mismo «FC» con «X
min». Es un artefacto de imprenta: la unidad no cupo en la fila del rótulo.

**7. El primer control posparto no es uno más de la tabla.** Tiene hoja propia
(la página 3) y pregunta cosas que los demás no vuelven a preguntar: cuántos
días después del parto, dónde fue atendido el parto, quién lo atendió,
diagnóstico, y conducta y tratamiento. La tabla de la página 4 empieza,
literalmente, en «Control 2».

Y una que se resolvió sola: **el DPI manuscrito junto a «Ocupación»** ya no es
una pregunta pendiente. El trabajo del 8 de septiembre hizo obligatorio el CUI
o DPI en toda alta de paciente, así que cuando esta ficha se abra, el número ya
está en el expediente.

---

## Decisiones

### 1. Dos tipos de ficha, no uno

`TipoFicha` gana un quinto valor: `POSPARTO`. Los cuatro catálogos compartidos
—`SignoPeligro`, `TemaConsejeria`, `CatalogoAntecedente`, `ProblemaFicha`— se
consultan **por tipo de ficha**, y ya quedó dicho que el posparto trae otros
signos de peligro y otra consejería. Con un solo valor `PRENATAL` habría que
añadir una columna «hoja» a cuatro tablas compartidas y un filtro extra en cada
consulta, para acabar distinguiendo lo mismo que distingue el enum.

Que sean cinco valores para cuatro fichas oficiales no es una contradicción: la
hoja del posparto es una evaluación propia, con su encabezado y su numeración.
El papel las grapa; el sistema las abre por separado, que es como se llenan.

El valor va **al final** del enum. A diferencia del achi', aquí el orden no
significa nada —nadie ordena fichas por su tipo— y ponerlo al final es lo que
Postgres hace sin pedir permiso.

### 2. Qué hoja se abre: el motivo de la consulta

La sección V de la hoja prenatal pregunta el motivo: embarazo, parto, posparto u
otro. Eso es lo que decide qué hoja se llena, y es lo que va a decidir a qué
pantalla entra el personal.

Las otras tres fichas se eligen por la edad del paciente (`ficha-por-edad.ts`).
Esta no: una mujer de 24 años puede necesitar la prenatal hoy y la del posparto
en tres meses. **La edad elige la ficha de adultos; el motivo elige entre
prenatal y posparto.**

«Parto» no tiene sección propia en el papel. Quien marque esa casilla está
registrando una atención, no llenando una hoja: se le lleva a la ficha de
adultos.

### 3. La ficha manda, Programas escucha

Decisión de Ramiro, 9 de septiembre de 2026.

La ficha se guarda en `usuarios`, igual que las otras tres, colgando de una
`Atencion`. Al guardarla publica un evento en el outbox que `programas` consume
para registrar el control prenatal en `ProgramaEmbarazo`.

Por qué así y no al revés:

- **Nadie captura dos veces.** Hoy, si el personal llena la ficha y además
  inscribe el embarazo, escribe la presión y la altura uterina en dos sitios.
- **Programas conserva lo que sabe hacer y la ficha no:** la fecha probable de
  parto, la clasificación de riesgo, las alertas y el seguimiento entre visitas.
  Esa es su función, y no la pierde.
- **Es el patrón que el sistema ya tiene.** Los dos servicios tienen outbox, y
  `programas` ya llama a `usuarios` (`src/pacientes/cliente-pacientes.ts`). No
  se inventa un camino nuevo.
- **No hay transacción entre dos bases de datos.** Escribir directamente en
  `programas` desde `usuarios` significa que si la segunda escritura falla, la
  primera ya ocurrió y nadie se entera. El outbox existe precisamente para eso.

La consecuencia hay que decirla: **es consistencia eventual.** Entre que se
guarda la ficha y que Programas registra el control pasan segundos. Para un
control prenatal que se revisa en la siguiente visita, semanas después, eso no
tiene ningún efecto clínico.

Si la paciente no está inscrita en el programa de embarazo, la ficha **se guarda
igual**. El evento queda publicado y Programas decide: hoy lo descarta y lo deja
anotado. Inscribir a alguien en un programa por un efecto secundario sería tomar
una decisión clínica que nadie pidió.

### 4. Los controles son N, no cuatro

Las cuatro columnas de la página 2 y las cuatro de la página 4 son lo que cabe
en una hoja. En digital, **cada control es una `Atencion`**, y la ficha cuelga
de ella: es el mismo patrón de `FichaNeonato`, donde `atencionId` es la clave
primaria.

Esto da gratis lo que el papel no puede: el quinto control prenatal, y la
historia completa de una paciente que tuvo dos embarazos.

### 5. La prenatal no tiene matriz de problemas

Las otras tres fichas traen una matriz —problema, signos, diagnósticos— que vive
en `ProblemaFicha`. Esta no. El papel resuelve lo mismo con una fila de la tabla
que dice «Problemas detectados» y una raya para escribir.

Así que **no se siembran filas de `ProblemaFicha` para `PRENATAL` ni para
`POSPARTO`**, y «problemas detectados» se guarda como texto cifrado. Forzar la
matriz aquí sería inventar un catálogo que el MSPAS no imprimió.

### 6. Qué se cifra

Todo el contenido clínico, según §9.3 de la arquitectura. En esta ficha hay tres
categorías que lo exigen sin discusión: **VIH**, violencia intrafamiliar y
violencia basada en género. Los antecedentes médicos de la página 1 ya viven en
`AntecedentePaciente`, que cifra.

De lo nuevo, van cifrados: el examen bucodental, las descripciones del examen
ginecológico, **los ocho resultados de laboratorio**, los problemas detectados,
y el diagnóstico y la conducta del posparto. La historia de la enfermedad
actual y el manejo de la referencia ya viajaban cifrados en `Atencion`.

Los laboratorios se cifran **todos**, no solo el VIH. Un VDRL o un papanicolau
dicen tanto como un diagnóstico, y separar «el sensible» del resto obliga a
acertar esa clasificación una vez por fila.

### 7. Qué se calcula y qué se captura

- **Semanas de gestación**, a partir de la FUR y la fecha de la visita. El papel
  las pide dos veces —en el encabezado de cada columna y en «Clasificación»— y
  las dos veces es la misma cuenta.
- **Fecha probable de parto**, regla de Naegele: FUR + 280 días. `programas` ya
  la implementa en `src/dominio/clinico.ts`; `usuarios` repite la regla, con una
  prueba que la fija. Son dos servicios distintos y compartir una librería por
  dos líneas de aritmética costaría más de lo que ahorra.
- **La edad**, de la fecha de nacimiento, como en todas.

Se captura, y no se calcula, la fila «Semanas embarazo por FUR y/o AU»: el papel
admite estimarlas por **altura uterina** cuando la paciente no recuerda su FUR,
y esa es una lectura clínica, no una resta de fechas.

### 8. El peso se teclea en libras y se guarda en kilos

El papel dice «Peso en libras», y así lo pedirá la pantalla. Pero se guarda en
`Atencion.pesoKg`, que es lo que ya hacen la ficha de adultos y la del lactante
y niñez, con el `librasAKilos` que ya existe.

**Esta decisión estuvo mal tomada primero, y conviene dejar escrito por qué.**
La primera versión le dio a `FichaPrenatal` su propia columna `peso_libras`,
copiando el criterio de la ficha de neonato. Pero el neonato guarda libras y
onzas por un motivo *impreso*: uno de sus signos de peligro dice literalmente
«pesa menos de 5 libras 8 onzas». Aquí no hay nada semejante.

El precio de la columna propia era real: `Atencion.pesoKg` es la única columna
de peso que alimenta los indicadores del sistema, así que el peso de cada
control prenatal habría quedado invisible para ellos —y fuera del historial de
peso de la propia paciente, que es adulta y ya tiene los suyos en kilos—. Una
embarazada que no gana peso es justo lo que un indicador debería ver.

La columna se retira en la migración `20260909200000_peso_prenatal_en_kilos`,
antes de que exista una sola fila que dependa de ella.

---

## Modelo de datos

Dos tablas nuevas, las dos colgando de `Atencion` por su `atencionId`:

- **`FichaPrenatal`** — encabezado (circunferencia del brazo, solo si el
  embarazo es menor de 12 semanas), signos vitales que `Atencion` no cubre
  (respiraciones, frecuencia cardiaca materna, peso en libras), examen general y
  bucodental, examen obstétrico (altura uterina, movimientos fetales, frecuencia
  cardiaca fetal, presentación por Leopold), examen ginecológico, laboratorios,
  clasificación y conducta.
- **`FichaPosparto`** — con `esPrimerControl`, que es lo que decide si se piden
  los cinco campos que solo la página 3 pregunta.

Presión arterial, temperatura y fecha ya están en `Atencion` y no se duplican.
Los antecedentes gineco-obstétricos de la página 1 ya están en
`AntecedentesObstetricos`, que se creó en su día leyendo esta misma ficha: se
reutiliza entera.

Catálogos a sembrar: 8 signos de peligro para `PRENATAL` y 8 para `POSPARTO`, 9
temas de consejería para `PRENATAL` y 5 para `POSPARTO`.

---

## Etapas

- **A — el backend prenatal.** Enum, migración, `FichaPrenatal`, catálogo,
  endpoints y pruebas. **Construida.**
- **B — el backend del posparto.** `FichaPosparto` y su catálogo. **Construida.**
- **C — las dos pantallas**, y el motivo de consulta que elige entre ellas.
- **D — el evento a Programas**, y su consumo del lado de `programas`.

Los endpoints no son nuevos: `POST /expedientes/:id/fichas` y `GET /fichas/:id`
sirven a las cuatro fichas, y lo que cambia es lo que viaja dentro. El catálogo
se pide con `GET /fichas/catalogo/PRENATAL` y `.../POSPARTO`.

Una nota de la etapa A que vale para toda ficha nueva: `GET /fichas/catalogo`
respondía **404 cuando la ficha no tenía problemas**, porque hasta ahora todas
tenían matriz. Ahora comprueba que el catálogo traiga *algo* —signos, problemas
o consejería—, que es lo que de verdad distingue una ficha sin sembrar.

---

## Información pendiente

Preguntas reales para el CAP. No inventar las respuestas.

- **¿Cuál es el distrito de salud del CAP?** Lo piden esta hoja y la de niñez.
  Sigue sin confirmar desde el 30 de agosto.
- **¿El CAP hace las pruebas de laboratorio de la página 2, o las refiere?**
  VDRL, VIH, glicemia y papanicolau tienen fila propia. Si se refieren, lo que se
  anota es una fecha y un resultado que llega después, no un valor del día.
- **¿Quién llena la hoja del posparto?** El papel pide «nombre y cargo de la
  persona que atiende» en las dos hojas. El sistema lo sabe por la sesión, pero
  conviene confirmar que quien firma es quien atendió.
- **¿Se usa la casilla «Otro» del motivo de consulta?** Si en la práctica nadie
  la marca, la pantalla no tiene por qué ofrecerla.
- **¿Hay una edición más nueva de este formulario?** La misma pregunta que se
  hizo con las otras tres, y que sigue sin respuesta.
