# Diseño: ficha clínica del lactante y niñez

Estado: **etapa A construida.** Las etapas B y C están diseñadas y sin empezar.

Rama: `feature/ficha-ninez`.

---

## Lo que cambió al leer el original

Las cuatro páginas se leyeron renderizando el PDF a imagen, no del resumen. Los
escaneos no tienen capa de texto: `pdftotext` no saca nada.

`docs/campos-de-fichas.md` acierta esta vez en lo importante —ya dice que el
esquema de vacunación no es una tabla sino una lista de dosis, y que la gráfica
no se captura—, pero el papel trae cinco cosas que el resumen no menciona:

**1. El orden de las secciones no es el de las otras fichas.** Aquí los signos de
peligro son la sección **1**, antes de la identificación del servicio (2) y de
los datos generales (3). En la de neonato el orden es el contrario. Los
numerales de las bandas no se pueden copiar de una ficha a otra.

**2. La identificación del servicio pide cuatro cosas, no dos.** Nombre del
servicio, **distrito**, **comunidad** y área de salud. La de neonato solo pide
nombre y área. La constante `SERVICIO_DE_SALUD` tiene que crecer.

**3. El encabezado lleva la fecha primero y el expediente después**, al revés que
la de neonato. Es una diferencia de la hoja impresa, no un error del escaneo.

**4. Las celdas sombreadas de la tabla de vacunas son información, no adorno.**
Dicen qué dosis aplican a qué vacuna: Hepatitis y BCG solo tienen primera dosis;
DPT **solo** los dos refuerzos, no las tres primeras; Rotavirus y Pentavalente,
tres dosis y ningún refuerzo. Ofrecer las cinco casillas para las diez vacunas
sería ofrecer 50 dosis donde el esquema tiene 27.

**5. El desparasitante no empieza a los 6 meses.** Sus tres primeras celdas están
sombreadas: arranca a los 2 años. La vitamina A sí empieza en el tramo de 6 m a
&lt;1 año, y en ese tramo solo tiene una dosis, no dos.

Y una que el resumen sí trae y conviene repetir porque cambia el modelo de
datos: **los antecedentes médicos de esta ficha no son SI/NO.** Se marcan con un
círculo como **P** (personal) o **F** (familiar), y pueden ser las dos cosas a la
vez o ninguna. El catálogo actual guarda `SI | NO | NO_APLICA`, que no sirve.

---

## El hallazgo que cambia el modelo

**Esta ficha no es una hoja de consulta: es un carnet.**

Las otras dos que ya están construidas se llenan enteras en una visita y se
archivan. Esta no:

| Página | A quién pertenece | Cuándo se llena |
|---|---|---|
| 1 — identificación, padres, casa, **vacunas** | Al **niño** | A lo largo de años |
| 2 — **gráfica de peso**, micronutrientes | Al **niño** | A lo largo de años |
| 3 — motivo, signos vitales, 14 problemas | A **la consulta** | En cada visita |
| 4 — observaciones fechadas | Al **niño** | Se acumulan |

La propia hoja 3 lo dice en su encabezado: *«Si es reconsulta, volver a
investigar signos de peligro — ver hoja 1»*. Está impresa para repetirse; las
dos primeras, no.

**Si esto se modela como las otras** —una tabla `FichaNinez` uno a uno con
`atencion`— pasan tres cosas, y las tres son graves:

- El esquema de vacunación se volvería a capturar en cada visita, o se perdería.
  Un niño de cuatro años tiene dosis puestas en diez visitas distintas.
- La gráfica de peso no se podría dibujar, que es justo lo único que lo digital
  hace aquí y el papel no.
- Los micronutrientes contarían por visita en vez de acumularse por tramo de
  edad, y el CAP no podría saber si a un niño le falta la segunda dosis del año.

El molde de la ficha de neonato **no sirve para las páginas 1 y 2**. Sí sirve
para la 3.

---

## El modelo propuesto

Se parte en dos, igual que ya está partido `AntecedentePaciente`, que pertenece
al paciente y no a la consulta del día.

### Lo que es del niño y vive fuera de la atención

```
CatalogoVacuna          las 10 vacunas del papel, con las dosis que aplican
  ↳ DosisRecomendada    (vacuna, orden, edad recomendada)

VacunaAplicada          UNA fila por dosis puesta
  paciente, vacuna, orden de la dosis, fecha
  @@unique(paciente, vacuna, orden)

CatalogoMicronutriente  vitamina A, desparasitante, sulfato ferroso, acido folico
  ↳ EntregaEsperada     (producto, tramo de edad, numero de entrega)

MicronutrienteEntregado UNA fila por entrega hecha
  paciente, producto, tramo, numero, fecha
  @@unique(paciente, producto, tramo, numero)

DatosDelHogar           agua y excretas — cuelga del GRUPO FAMILIAR, no del nino
PadresDelPaciente       madre y padre: nombre, edad, ocupacion, sabe leer,
                        escolaridad de la madre, hijos (total/vivos/muertos)
```

**La edad de cada dosis no se guarda.** El papel pide fecha *y* edad en cada
casilla porque en papel no se puede restar; aquí la edad sale de la fecha de la
dosis menos la de nacimiento. Guardarla sería guardar dos veces el mismo dato y
darle al sistema la oportunidad de contradecirse.

**Los datos de la casa cuelgan del grupo familiar**, no del niño. Es lo que ya
apunta `campos-de-fichas.md`: el agua y la letrina son del hogar, y repetirlas
en cada hermano garantiza que un día digan cosas distintas.

### Lo que es de la consulta

**Nada nuevo.** Se esperaba una tabla `FichaNinez` uno a uno con `atencion`, como
la de neonato, y al contrastar la página 3 contra el modelo resultó que
`Atencion` ya guarda todo lo que esa hoja pide: motivo, historia del problema
actual, temperatura, peso, talla, pulso, respiraciones, vacuna administrada,
referencia, próxima visita, medicamentos y consejería.

Lo único que faltaba eran las rayas impresas de cuatro de los catorce problemas,
y eso son dos columnas opcionales. Ver la etapa A, más abajo.

Los **14 problemas**, sus signos y sus diagnósticos entran por el catálogo que ya
existe, con `TipoFicha.NINEZ`. La matriz de la página 3 es la misma forma que la
de la ficha de adultos: `MatrizProblemas` se reutiliza sin tocarla.

Los **4 signos de peligro** y los **4 temas de consejería** también van por
catálogo, igual que en neonato. Ahí no hace falta nada nuevo.

### Los antecedentes P/F

`RespuestaAntecedente` tiene hoy `SI | NO | NO_APLICA`. Esta ficha necesita
marcar personal, familiar, las dos o ninguna. Son dos preguntas independientes,
no una con más valores.

La forma limpia es **dos filas de catálogo por antecedente** —`NIN_DIABETES_P` y
`NIN_DIABETES_F`— con la misma respuesta SI/NO de siempre. No toca el enum, no
toca la tabla, y la pantalla las dibuja como una sola línea con dos casillas,
que es como se ven en el papel.

---

## Lo que NO se captura: la gráfica de peso

**La gráfica de peso para edad no es un campo. Se dibuja.**

El sistema ya guarda el peso de cada atención. La gráfica son esos pesos puestos
sobre las bandas del papel, y la clasificación —«crece bien», «no crece bien, no
ganó peso», «no crece bien, perdió peso»— **no depende de dónde cae el punto
sino de cómo se movió desde el control anterior**, que es lo que dice la leyenda
impresa.

Esto es de las pocas partes del sistema donde lo digital hace algo que el papel
no puede: avisar **en el momento de la consulta** de que el niño dejó de crecer
bien, en vez de dejarlo a que alguien compare dos puntos a ojo.

Dos cosas que hay que respetar del papel: el peso va **en libras**, y la gráfica
son **dos paneles** —de 0 a 36 meses y de 38 a 60— porque las escalas no son la
misma.

---

## Por qué conviene partirlo en tres entregas

Es la ficha más grande de las cuatro, y entera no cabe en un PR revisable. El
orden propuesto no es arbitrario: cada etapa deja algo que funciona.

**Etapa A — la consulta (página 3). ✅ Construida.**
Catálogo de los 14 problemas, los 4 signos de peligro, los 4 temas de
consejería y la pantalla de la hoja de reconsulta. Con esto **ya se puede
atender a un niño**, que es lo que el CAP hace todos los días.

**No hizo falta la tabla `FichaNinez`.** Al contrastar la página 3 contra el
modelo que ya existe, resultó que `Atencion` guarda casi todo lo que esa hoja
pide: motivo, historia del problema actual, los cuatro signos vitales, la vacuna
administrada, la referencia, la fecha de próxima visita, los medicamentos y la
consejería. Lo único que no cabía eran las **rayas impresas** que cuatro de los
catorce problemas llevan al lado —«cuánto tiempo hace» en tos, diarrea y fiebre,
«cuántas veces por día» en nutrición—, y eso se resolvió con dos columnas
opcionales en tablas que ya existían:

| Tabla | Columna | Qué guarda |
|---|---|---|
| `problema_ficha` | `etiqueta_anotacion` | El texto de la raya, en el catálogo |
| `problema_atencion` | `anotacion_cifrado` | Lo que se escribió en ella, cifrado |

La etiqueta vive en el **catálogo** y no en la pantalla porque es texto del
formulario: una revisión del MSPAS puede cambiar la pregunta sin que nadie toque
código. Y la anotación va cifrada porque «hace tres días con fiebre» es dato
clínico igual que el diagnóstico.

Con eso, la matriz de problemas, el encabezado y la lista de medicamentos se
reutilizan tal cual.

**Etapa B — el carnet (página 1 y micronutrientes).**
Vacunas, micronutrientes, padres y datos del hogar. Es donde está la migración
grande y donde el sistema empieza a decir *qué le falta* a cada niño.

**Etapa C — la gráfica.**
Peso para edad con sus bandas y el aviso de crecimiento. Depende de que haya
pesos capturados, así que va al final por necesidad, no por comodidad.

La página 4 no necesita nada: son notas fechadas, y el historial del expediente
ya las enseña.

---

## Otras decisiones de la etapa A

### El peso se teclea en libras y se guarda en kilos

El papel pide «Peso ___ Lb.». El sistema guarda `peso_kg`, que es la columna que
alimenta los indicadores de desnutrición de todos los programas.

Se captura en libras —como el papel— y se convierte **una sola vez** al enviar.
Guardar las dos unidades daría dos verdades que un día se contradicen; guardar
solo libras dejaría los indicadores sin peso. La gráfica de la etapa C
reconvierte, y el redondeo a dos decimales de kilo es de menos de una décima de
libra: la gráfica del papel tiene divisiones de una libra entera.

Nota: **la ficha del neonato no hace esto.** Guarda libras y onzas en su tabla
propia y deja `peso_kg` en null, así que sus pesos no llegan a ningún indicador.
Es un hueco heredado, no una decisión.

### El umbral de respiración rápida lo aplica el sistema

El problema 1 imprime tres umbrales para compararlos a mano: 60 por debajo de
dos meses, 50 hasta el año, 40 de ahí a los cinco. El sistema ya tiene la edad y
las respiraciones, así que lo dice en el momento de la consulta.

**Avisa, no decide.** Muestra el número, el umbral y de qué edad sale; quien
atiende marca lo que corresponda. Y lo dice también cuando está por debajo, en
vez de callar: un aviso que solo aparece cuando hay problema no se distingue de
un aviso que no funciona.

### El distrito y la comunidad del servicio no se inventan

Esta es la única de las cuatro hojas que los pide, y nadie del CAP los ha
confirmado. La pantalla dice **«Pendiente de confirmar»** y lo explica, en vez de
imprimir un dato plausible en una ficha oficial. Se corrigen en
`SERVICIO_DE_SALUD`, en `web/src/modulos/fichas/servicio-fichas.ts`.

---

## Lo que necesita tu confirmación para seguir

1. **La migración de la etapa B**, que sí es grande: cinco o seis tablas para
   vacunas, micronutrientes, padres y hogar. La de la etapa A fueron dos
   columnas opcionales y está aplicada.
2. **Los datos del hogar en el grupo familiar.** Es la decisión correcta y no es
   gratis: hoy el grupo familiar existe pero casi no se usa, y esto lo convierte
   en algo que recepción tendrá que llenar de verdad.

---

## Información pendiente

Preguntas reales para el CAP. No inventar las respuestas.

- **¿El CAP usa el CUI?** Aparece manuscrito junto al título de «Datos generales»
  en la hoja escaneada, no impreso. Si lo usan de verdad, es un identificador del
  niño que el sistema no tiene y que habría que cifrar como el DPI.
- **¿Qué se hace con «Neumococo», «Hb» y «Otras»?** El papel las imprime con
  todas las celdas de edad en blanco. ¿Las aplica el CAP? ¿Con qué esquema?
- **¿La persona que acompaña al niño se registra en algún sitio?** El papel la
  pide por nombre. Hoy el sistema no tiene dónde ponerla, y el problema 14 de la
  página 3 es precisamente sobre ella.
- **¿El esquema de vacunación del papel sigue vigente?** Está impreso, pero los
  esquemas nacionales cambian. Si el MSPAS ya lo actualizó, el catálogo tiene que
  nacer con el nuevo y no con el de la hoja.
- **¿De dónde salen las bandas de la gráfica?** Las curvas del papel son un
  escaneo. Dibujarlas bien exige los valores de referencia, no una foto.
- **¿Cuál es el distrito de salud del CAP, y qué comunidad se anota como la del
  servicio?** La hoja del lactante y niñez es la única que los pide. Hoy la
  pantalla dice que están pendientes.
- **¿Un niño sin peso anterior debe salir clasificado?** La leyenda del papel
  compara contra el control previo. En la primera visita no hay contra qué
  comparar, y decir «crece bien» sin base sería inventar.
