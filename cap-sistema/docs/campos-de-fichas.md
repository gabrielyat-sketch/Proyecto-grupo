# Campos de las fichas clínicas del CAP

**Estado: BORRADOR — pendiente de revisión por el equipo y por el CAP.**

Inventario de los campos de las cuatro fichas oficiales que el CAP entregó, leídas de
`docs/pdfs/`. Sirve para decidir el modelo de datos **antes** de escribir pantallas o migraciones.

Nada de lo que sigue está implementado todavía.

---

## De dónde salen estas fichas

No son formatos internos del CAP. Son **formularios oficiales del MSPAS**, del Departamento de
Regulación de los Programas de Atención a las Personas (DRPAP), dentro del Sistema Integral de
Atención en Salud (SIAS). Una de ellas trae impreso *"Área de Salud Baja Verapaz"*.

Eso tiene tres consecuencias que conviene tener claras desde el principio:

1. **Los campos no se negocian.** El CAP los llena porque el MSPAS se los exige. El sistema puede
   ordenarlos mejor, pero no puede omitirlos.
2. **Los nombres tampoco.** Si el papel dice *"Adecuación peso para talla"*, la pantalla debe decir
   lo mismo. Renombrarlo a algo "más claro" obliga al personal a traducir mentalmente en cada
   captura.
3. **Refuerzan el riesgo R-8 del plan.** Al no haber integración con SIGSA, el personal seguirá
   llenando estos formatos a mano para reportar al MSPAS. El sistema tiene que producir esas
   cifras ya calculadas, o le estará agregando trabajo en vez de quitárselo.

### Un detalle que no está impreso

Dos fichas traen anotado **a mano** un campo que el formulario impreso no tiene:

| Ficha | Anotación manuscrita |
|---|---|
| Lactante y niñez | `CUI` junto a "Datos generales del paciente" |
| Prenatal y posparto | `DPI` junto a "Ocupación" |

Alguien del CAP los agregó porque los necesita. **Hay que preguntar** si es una práctica
establecida o una nota suelta — pero apunta a que el identificador sí se captura, aunque el papel
oficial no lo pida.

---

## El esqueleto que comparten las cuatro

Las cuatro fichas siguen la misma estructura, que es la metodología de atención integral del
MSPAS: **evaluar → clasificar → tratar**.

| | Sección | ¿Cambia entre fichas? |
|---|---|---|
| — | No. de expediente y fecha | igual |
| I | Identificación del establecimiento de salud | igual |
| II | Datos generales del paciente | cambia según a quién se atiende |
| III | Signos y síntomas de peligro | **muy distinto por edad** |
| IV | Manejo y estabilización si se refirió | igual |
| V | Motivo de la consulta | igual |
| VI | Historia de la enfermedad actual | igual |
| VII | Antecedentes | **muy distinto** |
| VIII | Examen físico y signos vitales | cambia poco |
| IX | **Revisión de problemas** (matriz) | **distinto por edad** |
| X | Consejería | cambia |
| — | Nombre y cargo de quien atendió | igual |

**La sección IX es el corazón de todas.** Es una matriz de N filas (un problema por fila) × 4
columnas:

```
PROBLEMA          EVALUAR                    CLASIFICAR              CONDUCTA
(sí / no)         (subraye los signos        (subraye el             (medicamento,
                   encontrados)               diagnóstico)            dosis, días)
```

En papel, "subrayar" es marcar una opción de una lista impresa. En digital eso es **selección
múltiple sobre una lista cerrada**, no texto libre — y ahí está buena parte del valor: son datos
que después se pueden contar para los indicadores.

---

## Ficha 1 — Adolescente, adulto y adulto mayor

2 páginas. La más general.

### I. Identificación del establecimiento

| Campo | Tipo |
|---|---|
| Tipo de establecimiento | una de: PS · PSF · C/S "B" · CENAPA · C/S "A" · CAP · CAIMI · CUM · Hospital |
| Nombre del distrito | texto |
| Área de salud | texto |

> **Para el CAP siempre es el mismo valor.** Debería salir de la configuración del sistema, no
> pedirse en cada ficha.

### II. Datos generales del paciente

| Campo | Tipo | Nota |
|---|---|---|
| Nombre | texto | ya existe |
| Edad | número (años) | se calcula de la fecha de nacimiento |
| Fecha de nacimiento | fecha | ya existe |
| Nombre de la madre o responsable | texto | **falta** |
| Teléfono | texto | ya existe |
| Dirección | texto | **falta** (hoy solo hay comunidad) |
| Sexo | F / M | ya existe |
| Migrante | sí / no | **falta** |
| Ocupación | texto | **falta** |

### III. Signos y síntomas de peligro

Siete casillas sí/no: dificultad respiratoria · inconsciencia, letargia o comportamiento extraño ·
dolor u opresión precordial · convulsiones o rigidez de cuello · cefalea intensa · vómitos · otros
(describir).

### IV a VI

Manejo y estabilización del paciente referido · motivo de la consulta · historia de la enfermedad
actual. Los tres son texto libre largo.

### VII. Antecedentes

**Médicos** — sí/no cada uno: asma bronquial · cardiopatía · ITS · infecciones urinarias · toma
medicamentos (+ cuál) · trastorno psicosocial · violencia basada en género · diabetes · cáncer ·
neuropatía · desnutrición · violencia intrafamiliar · conductas anormales (suicidas, alimentarias)
· hipertensión arterial · Tb · Chagas · antecedente de vacuna Td (+ n.º de dosis, fecha de última
dosis) · SR (sí/no/no aplica).

**Gineco-obstétricos** — FUR · n.º de gestas · partos · abortos · detección de cáncer de cérvix ·
papanicolau o IVAA (+ fecha, resultado normal sí/no) · usa método de planificación familiar
(píldora, inyección, condón, T de cobre, AQV, otro) · tipo de sangre (grupo + RH ±).

**Quirúrgicos** — texto libre.

**Familiares** — sí/no: diabetes · tuberculosis · HTA · nefropatía · cáncer · otro (+ especificar).

**Hábitos** — fuma (+ cuántos al día) · ingiere bebidas alcohólicas · consumo de drogas · múltiples
parejas sexuales en los últimos 3 meses · usa condón · actividad física (menos de 60 min/semana ·
60-149 · más de 150) · consume 5 porciones diarias de frutas y verduras.

### VIII. Examen físico

Temperatura °C · presión arterial mmHg · pulso x min · respiraciones x min · peso lb · talla mt ·
**IMC** · circunferencia de cintura cm.

> El IMC **se calcula**, no se teclea. Pedirlo a mano garantiza que alguien lo escriba mal.

### IX. Revisión de problemas — 14 filas

Tos o dificultad para respirar · oído y garganta · bucodental · diarrea · fiebre · piel · ITS ·
suplementación con micronutrientes · signos de alerta de diabetes · signos de alerta de
hipertensión o insuficiencia cardiaca · signos de alerta para diagnóstico precoz de cáncer ·
necesidades de planificación familiar · psicosociales · otros.

Cada fila tiene su propia lista de signos a evaluar y su propia lista de diagnósticos posibles.
Están transcritas en las imágenes; **hay que capturarlas como catálogo** antes de programar.

La columna de conducta admite hasta **4 medicamentos**, cada uno con dosis y días de tratamiento,
más: vacuna administrada · referencia a · consejería brindada · fecha de próxima visita.

### X. Consejería

Texto libre. Al pie: *"Puede apoyarse con medicina popular tradicional de las Normas de atención"*
y el nombre y cargo de quien atendió.

---

## Ficha 2 — Menor de 28 días

2 páginas. Es la ficha del recién nacido, y **el paciente es el niño pero casi todos los datos son
de la madre**.

### Datos generales

Nombre de la **madre** · dirección · fecha de nacimiento del niño · edad en **días** · sexo ·
población migrante (+ lugar de origen) · motivo de consulta.

### Evaluación del recién nacido

**20 signos de peligro**, cada uno una casilla: no respira · está flácido o inconsciente · le cuesta
respirar · cianosis · hipotermia · fiebre · no succiona · pesa menos de 5 lb 8 oz · letárgico ·
convulsiones · no defeca en 48 horas · distensión abdominal · vómitos o salivación excesiva · tiraje
subcostal grave · respiración rápida · aleteo nasal · quejido · abombamiento de fontanela ·
supuración de oído · pústulas en piel o mucosa.

**Evaluar infección** — enrojecimiento del ombligo · pústulas aisladas en la piel · secreción
purulenta de los ojos.

**Evaluar malformaciones** — labio leporino · paladar hendido · anomalías del tubo neural (espina
bífida) · hidrocefalia.

> Cualquiera de los 20 primeros significa **enfermedad grave**: actuar o referir de inmediato. El
> sistema debería avisarlo en pantalla, no dejarlo a que el personal lo recuerde.

### Antecedentes maternos y del parto

**De la madre:** diabetes · hipertensión · TB · ITS · VIH/SIDA · toma o tomó medicamento (+ cuál) ·
otro antecedente · hábitos (fuma, bebe alcohol en abundancia, usa drogas) · quirúrgicos.

**Del parto:** peso al nacer (lb + oz) · lloró rápido y fuerte al nacer · nació cianótico · horas de
trabajo de parto · quién atendió el parto (MD · EP · AE · CT · otro) · complicaciones durante el
embarazo (ruptura prematura de membranas · trabajo de parto prematuro · parto prolongado) · tipo de
parto (normal · cesárea · distócico fórceps · podálica) · BCG · Td en la madre (+ n.º de dosis) ·
lactancia materna exclusiva.

### Examen físico

Temperatura · peso (lb + oz) · frecuencia cardiaca · respiraciones · talla cm · **perímetro
braquial** cm · **circunferencia cefálica** cm.

### Revisión de problemas — 10 filas

Diarrea · piel · ITS · nutrición · vacunación · discapacidades · salud bucodental · VIH-SIDA · otros
problemas · **problemas del acompañante**.

### Consejería — 6 temas con fecha de reconsulta

Técnica de amamantamiento · cuidados del cordón umbilical · medidas preventivas de higiene ·
monitoreo del crecimiento · vacunación · signos generales de peligro del neonato.

---

## Ficha 3 — Lactante y niñez

4 páginas, y la más compleja de las cuatro.

### Página 1 — datos que se capturan una sola vez

**Signos de peligro (4):** no puede beber o tomar el pecho · vomita todo · está letárgico o
inconsciente · presenta convulsiones.

**Datos del paciente:** CUI *(manuscrito)* · nombre y apellidos · fecha de nacimiento · lugar de
nacimiento · dirección · **nombre de la persona que acompaña al niño** · edad (años + meses) · sexo
· población migrante (+ lugar).

**Padres** — de la madre y del padre por separado: nombre y apellidos · edad · ocupación · sabe leer
(sí/no). De la madre además: nivel de escolaridad (ninguno · 1.º a 3.º primaria · 4.º a 6.º primaria
· media · superior). Y: número de hijos (total · vivos · muertos).

**Casa** — abastecimiento de agua (chorro intradomiciliario · chorro público · pozo · río · otro) ·
disposición de excretas (inodoro · letrina · aire libre).

> Estos datos de vivienda no son del niño, son **del hogar**. En el sistema ya existe el grupo
> familiar; es donde deberían vivir, para no repetirlos en cada hermano.

**Esquema de vacunación** — una tabla de 10 vacunas × 5 dosis, y por cada dosis **fecha y edad**:

| Vacuna | Edades recomendadas |
|---|---|
| Hepatitis | RN |
| BCG | RN |
| Rotavirus | 2, 4, 6 meses |
| OPV | 2, 4, 6 meses · refuerzos 18 meses y 4 años |
| DPT | refuerzos 18 meses y 4 años |
| Pentavalente | 2, 4, 6 meses |
| SPR | meses |
| Neumococo, Hb, Otras | — |

Son ~100 celdas. **En digital no es una tabla que se llena: es una lista de dosis aplicadas**, cada
una con vacuna, número de dosis, fecha y edad. El esquema recomendado es un catálogo aparte, y el
sistema puede señalar solo lo que falta.

**Antecedentes** — producto de embarazo normal · parto normal · atendido en (hospital · C/S ·
domicilio · vía pública · otro) · parto atendido por (médico · enfermera · auxiliar · comadrona ·
otro) · peso al nacer (lb + oz) · antecedentes médicos marcados como **P** (personal) o **F**
(familiar): problemas de crecimiento o desnutrición · diabetes · hipertensión · cáncer ·
discapacidad · nefropatía · ITS/VIH/SIDA · tuberculosis · otro · quirúrgicos · psicosociales
(problemas de relación intrafamiliar · violencia).

### Página 2 — gráfica y micronutrientes

**Gráfica de peso para edad**, con las bandas «crece bien» / «no crece bien, no gana peso» / «no
crece bien, pierde peso».

> **Esto no se captura: se dibuja.** El sistema tiene los pesos de cada control; la gráfica y la
> clasificación salen de ahí. Es de las pocas partes donde lo digital hace algo que el papel no
> puede: avisar en el momento de que el niño dejó de crecer bien.

**Micronutrientes** — vitamina A y desparasitante por tramo de edad (6 m a <1 año, 1<2, 2<3, 3<4,
4<5), 1.ª y 2.ª dosis · sulfato ferroso y ácido fólico, hasta 4 entregas por tramo.

### Página 3 — hoja de reconsulta *(se repite en cada visita)*

Encabezado: *"Si es reconsulta, volver a investigar signos de peligro — ver hoja 1"*. Trae nombre,
fecha, n.º de expediente, motivo de consulta, historia del problema actual y signos vitales
(temperatura, peso, talla, pulso).

**Revisión de problemas — 14 filas:** tos o dificultad para respirar · oído y garganta · diarrea ·
fiebre · nutrición · vacunación · piel · genitourinario · VIH-SIDA · discapacidades · signos de
alerta en cáncer · salud bucodental · salud mental y otros problemas · problemas del acompañante.

Incluye umbrales clínicos impresos que el sistema puede evaluar solo:

> Respiración rápida: menos de 2 meses **60 o más** · 2 m a <1 año **50 o más** · 1 a <5 años
> **40 o más**.
>
> Adecuación peso para talla: menor 70 % → desnutrición severa · 70-80 % → moderada · 80-90 % →
> leve · arriba de 90 % → normal.

**Consejería brindada** — uso del medicamento · uso de sobres de rehidratación oral · alimentación
de acuerdo a edad · signos generales de peligro.

### Página 4 — otras observaciones

Lista de líneas con fecha y observación. En digital: **notas fechadas, cuantas hagan falta.**

---

## Ficha 4 — Prenatal y posparto

4 páginas. Es la que más se acerca a lo ya construido en la Etapa 6.

### Página 1 — datos y antecedentes

Datos generales iguales a la ficha de adultos, más **DPI** *(manuscrito)*.

**Signos de peligro (8):** hemorragia vaginal · dolor de cabeza severo · visión borrosa ·
convulsión · dolor abdominal severo (epigastralgia) · presión arterial alta · fiebre ·
presentaciones fetales anormales.

**Motivo de la consulta:** embarazo · parto · posparto · otro.

**Antecedentes gineco-obstétricos** — FUR · n.º de gestas · partos · abortos · abortos consecutivos
· n.º de LIU · nacidos vivos · nacidos muertos · hijos vivos · hijos muertos · n.º de cesáreas ·
embarazos múltiples · fecha del último parto · n.º de niños nacidos antes de los 8 meses ·
preeclampsia · último RN pesó menos de 5½ lb · último RN pesó más de 7 lb 12 oz · detección de
cáncer de cérvix (papanicolau o IVAA, fecha, resultado normal) · usó método de planificación
familiar (+ cuál).

**Antecedentes médicos** — asma bronquial · hipertensión arterial · cáncer · ITS · Chagas · diabetes
· cardiopatía · tuberculosis · neuropatía · infecciones urinarias · toma medicamentos (+ cuál) ·
tipo de sangre (grupo + RH) · trastorno psicosocial · violencia intrafamiliar · violencia basada en
género · quirúrgicos · hábitos (fuma, alcohol, drogas) · vacuna Td (+ dosis, fecha de última dosis)
· SR.

### Página 2 — controles prenatales

Una tabla de **4 columnas (control 1 a 4) × ~35 filas**. Por cada control:

| Grupo | Campos |
|---|---|
| Encabezado | meses/semanas de embarazo · fecha de la visita |
| Peligro | presenta signos o síntomas de peligro (+ cuál) |
| Signos vitales | presión arterial · temperatura · peso en libras · respiraciones · frecuencia cardiaca materna |
| Examen general | estado general, palidez palmar, conjuntivas, uñas (¿normal?) · examen bucodental |
| Examen obstétrico | altura uterina · movimientos fetales (20 semanas o más) · frecuencia cardiaca fetal · presentación por Leopold (>36 semanas) |
| Examen ginecológico | trazas de sangre o manchado · verrugas, herpes, papilomas, úlceras · flujo vaginal |
| Laboratorio | hemoglobina y hematocrito · grupo y RH · orina (proteína, glucosa, cetona) · glicemia · VDRL · VIH · papanicolau · infecciones |
| Clasificación | semanas de embarazo por FUR y/o AU · problemas detectados |
| Conducta | sulfato ferroso (n.º de tabletas) · ácido fólico (n.º de tabletas) · vacunación Td (dosis) |
| Consejería | 9 temas sí/no |

Además, arriba: FUR · FPP · circunferencia del brazo *(solo si el embarazo es menor de 12 semanas)*.

> **Las 4 columnas son una limitación del papel, no del cuidado.** En digital son N controles. Y
> `ControlPrenatal`, que ya existe de la Etapa 6, tiene 9 campos: **le faltan unos 25**.

### Página 3 — evaluación del posparto

**Signos de peligro (8):** hemorragia vaginal · dolor de cabeza severo · visión borrosa · fiebre ·
dolor abdominal severo · presión arterial alta (140/90) · convulsiones · coágulos con mal olor
(loquios).

**Primer control posparto:** cuántos días después del parto · dónde fue atendido el parto · quién le
atendió el parto · herida operatoria · involución uterina · P/A · FC · temperatura · examen de mamas
· examen ginecológico (loquios, episiorrafía) · lactancia materna exclusiva (+ por qué no) ·
diagnóstico · conducta y tratamiento · nombre y cargo de quien atiende.

**Suplementación y consejería:** sulfato ferroso · ácido fólico · otro medicamento · Td · consejería
en PF posparto · en lactancia materna exclusiva y alimentación de la mujer lactante · de lactancia
materna a mujer VIH+ · a mujer VIH+.

### Página 4 — controles posparto

Tabla de **4 columnas (control 2 a 5, hasta 6 meses después del parto)**: fecha de la visita ·
involución uterina · examen de mamas · herida operatoria · examen ginecológico · P/A · FC ·
temperatura · lactancia materna exclusiva · problemas detectados · conducta (sulfato ferroso, ácido
fólico, Td, medicamento) · consejería (5 temas).

Al final, otra hoja de observaciones fechadas.

---

## Qué de esto ya existe en el sistema

| Ya existe | Falta |
|---|---|
| Paciente: nombre, DPI, fecha de nacimiento, sexo, idioma, comunidad, teléfono | dirección, ocupación, migrante, responsable, lugar de nacimiento |
| Grupo familiar | datos de los padres, escolaridad, agua y excretas |
| Expediente y atenciones | la matriz de problemas, los antecedentes, la consejería |
| `Atencion`: motivo, diagnóstico, tratamiento, notas, peso, talla, presión, temperatura | ~15 campos más de examen físico |
| `ProgramaEmbarazo` y `ControlPrenatal` (9 campos) | ~25 campos por control, laboratorios, consejería |
| `ProgramaHipertension` | — |
| — | **posparto entero** |
| — | **vacunación entera** |
| — | **micronutrientes** |
| — | **antecedentes** (personales, familiares, hábitos) |

---

## Decisiones que hay que tomar antes de programar

### 1. Cuántas fichas son en realidad

Las cuatro comparten esqueleto pero difieren en los detalles. Dos caminos:

**A — Una pantalla por ficha.** Fiel al papel, más fácil de reconocer para el personal. Cuesta
repetir mucha estructura.

**B — Una pantalla que cambia según la edad y el motivo.** Menos código, pero el personal ya no
reconoce «su» ficha.

*Recomendación:* **A**, porque el personal ya conoce estas cuatro hojas y va a transcribir miles.
Lo compartido se resuelve con componentes, no fundiendo las cuatro en una.

### 2. Cómo se guarda la matriz de problemas

Cada ficha tiene su lista de problemas, cada problema su lista de signos y de diagnósticos.

*Recomendación:* **catálogo en la base de datos**, no listas escritas en el código. El MSPAS cambia
estos formatos cada cierto tiempo, y un cambio de catálogo no debería ser un despliegue.

### 3. Qué se calcula y qué se captura

Cuatro cosas del papel **no deben pedirse**, porque el sistema puede calcularlas mejor:

- IMC, a partir de peso y talla.
- Edad, a partir de la fecha de nacimiento.
- Semanas de gestación, a partir de la FUR *(ya está hecho en la Etapa 6)*.
- La gráfica de peso para edad y su clasificación.

### 4. Qué se cifra

La arquitectura (§9.3) exige cifrar los datos clínicos. Estas fichas traen categorías especialmente
delicadas: VIH, violencia basada en género, violencia intrafamiliar, conductas suicidas, salud
mental.

*Recomendación:* que **todo el contenido clínico** de las fichas viaje cifrado, no solo el
diagnóstico. Y que la trazabilidad (Etapa 9) registre cada consulta a estos campos.

---

## Preguntas para el CAP

1. **¿El CUI y el DPI anotados a mano son práctica establecida?** Aparecen manuscritos en dos
   fichas, pero el formato impreso no los pide.
2. **¿Se llenan las cuatro fichas completas, o hay secciones que en la práctica se dejan en
   blanco?** Si hay campos que nadie llena desde hace años, no tiene sentido construirlos primero.
3. **¿Los datos del establecimiento cambian alguna vez?** Si siempre son los mismos, salen de la
   configuración y no se preguntan.
4. **¿Cuántas fichas de cada tipo se atienden al día?** Decide cuál se construye primero.
5. **¿Las fichas viejas se van a digitalizar completas, o solo los datos del paciente y las
   atenciones recientes?** Cambia por completo el tamaño del trabajo de digitalización (RF-08).
6. **¿Hay una versión más nueva de estos formatos?** Conviene confirmarlo antes de construir sobre
   una edición que el MSPAS ya cambió.
