# Diseño: ficha clínica para menor de 28 días

La segunda de las cuatro fichas del MSPAS. La primera —adolescente, adulto y
adulto mayor— es el molde; esto documenta **en qué se separa de él**, que es lo
único que hacía falta pensar de nuevo.

Fuente: `docs/pdfs/ficha clínica Menor 28dias.pdf`, dos páginas.

---

## Los PDF son escaneos: no tienen capa de texto

`pdftotext` no extrae nada de ninguno de los cuatro formularios. Hay que
renderizarlos a imagen para poder leerlos:

```python
import pdfplumber
with pdfplumber.open('ficha clínica Menor 28dias.pdf') as pdf:
    for i, p in enumerate(pdf.pages, 1):
        p.to_image(resolution=200).save('pagina-%d.png' % i)
```

Vale la pena saberlo antes de empezar niñez y prenatal.

Leer el papel y no el resumen de `campos-de-fichas.md` cambió tres cosas.

---

## Lo que cambió al leer el original

### Los signos de peligro no son 20, son 27

El formulario los imprime en **tres recuadros con conductas distintas**, cada
una escrita al lado:

| Bloque | Cuántos | Conducta impresa |
|---|---|---|
| Evalué signos de peligro | 20 | *Tiene enfermedad grave: actúe de acuerdo a capacidad resolutiva o refiera INMEDIATAMENTE* |
| Evaluar infección | 3 | *Si tiene capacidad, trate o refiera* |
| Evaluar malformaciones | 4 | *Refiera a donde corresponda* |

Los tres son casillas de la misma sección y el modelo solo distingue por orden,
así que el corte vive en la pantalla (`bloqueDelSigno`). **Si el MSPAS cambia el
formulario, eso es lo primero que hay que revisar.**

**Marcar uno solo de los veinte primeros significa enfermedad grave**, y la
pantalla lo dice en el momento, con la lista de cuáles se marcaron. No al
guardar: para entonces la decisión de referir ya se tomó o ya no se tomó.

### La fila VIH-SIDA no tiene casillas SI/NO

Su columna de diagnóstico es una instrucción: *"verificar que esté en control en
servicio hospitalario o referir"*. Se deja como problema para que el personal
reconozca la fila, pero sus "diagnósticos" son esa conducta.

### La consejería no es un texto: es una tabla

Seis temas impresos, cada uno con su casilla y su columna de **fecha de
reconsulta**. En la ficha de adultos la consejería es un campo libre y basta;
aquí es una lista de lo que hay que explicarle a la madre antes de que se vaya,
y cuándo debe volver por cada cosa.

---

## Decisiones

### El peso va en libras y onzas

Como lo pide el formulario: *"Peso: ___ Lb ___ Onz"*. **No se convierte a
kilos.** Uno de los signos de peligro impresos es, literalmente, *"pesa menos de
5 libras 8 onzas"*: guardar kilos obligaría a deshacer la conversión para poder
compararlo con el papel, y a redondear un dato que el personal escribió exacto.

Las onzas se acotan a **0-15**. Dieciséis onzas son una libra, y aceptarlas
dejaría dos formas de escribir el mismo peso.

`Atencion.pesoKg` queda para las demás fichas. Cuando los indicadores necesiten
comparar el peso de un neonato con el de un lactante, la conversión se hace al
leer, que es donde se sabe para qué se compara.

### Lo propio de la ficha va en su propia tabla

`ficha_neonato` es 1-1 con `atencion`, no columnas de `atencion`. Mismo criterio
que `registro_digitalizacion`: `atencion` se lee en el historial del expediente
—la consulta más frecuente del sistema después de la búsqueda de paciente— y
estos campos solo se miran al abrir **esta** ficha. Mantener la fila caliente
angosta importa con cien mil expedientes.

Es también el molde de `ficha_ninez` y `ficha_prenatal`, que van a tener el
mismo problema.

### La consejería, como catálogo

`tema_consejeria` + `consejeria_en_atencion`, por tipo de ficha. No como
columnas: los temas cambian entre fichas —seis en neonato, cuatro en niñez,
nueve en prenatal— y el MSPAS revisa estos formatos. **Añadir un tema no debería
ser una migración.** Es el mismo criterio que los signos de peligro y los
problemas.

La fecha de reconsulta **no se cifra**: no dice nada de la persona por sí sola y
alimenta el indicador de reconsultas pendientes, que tendría que descifrar miles
de filas para contar. Viaja como `aaaa-mm-dd`, sin construir un `Date`.

**Solo viajan los temas con algo que decir** —marcados o con fecha—. Mandar los
seis siempre guardaría cuatro filas que dicen "no se hizo nada", y el indicador
contaría como atendido lo que nadie explicó.

### Los antecedentes maternos llevan prefijo

El catálogo de antecedentes es **compartido entre fichas**: "Diabetes" es el
mismo antecedente en la de adultos y en la prenatal, y contar cuántos diabéticos
hay no debería obligar a unir listas distintas.

Pero en esta ficha el paciente es el niño y **los antecedentes son de la madre**
—el propio formulario lo dice: *"revisar ficha de control prenatal y post parto
de la madre"*—. Sin el prefijo `MAT_`, la "Diabetes" del neonato y la del adulto
serían el mismo antecedente cuando una es de la madre y la otra del propio
paciente.

### Los antecedentes del parto NO van al catálogo

No son casillas de sí/no sino campos con valor propio: horas de trabajo de
parto, quién lo atendió, tipo de parto, peso al nacer. *"9 horas"* no cabe en
una casilla que solo sabe decir sí o no.

Las siglas de quién atendió el parto son las del papel —MD, EP, AE, CT— y la
pantalla las muestra con su significado al lado, porque quien captura no tiene
por qué saberlas de memoria.

### La edad se dice en días

El formulario pide *"edad ___ días"*, no años. Se calcula de la fecha de
nacimiento partiendo la cadena `aaaa-mm-dd`: construir un `Date` con ella la
interpretaría como medianoche UTC y en Guatemala restaría un día.

### Un paciente mayor de 28 días avisa, pero no bloquea

El CAP transcribe expedientes de papel (RF-08): una ficha de hace tres años se
llena con la edad que el niño tenía **entonces**. Bloquear la captura por la
edad de hoy haría imposible digitalizar el archivo. Se avisa y se deja seguir.

### El encabezado del papel es el mismo en las cuatro hojas

Las cuatro fichas del MSPAS abren igual: el nombre de la hoja, el recuadro de
**No. Expediente** y el de **Fecha**. La pantalla no los tenía —solo un título y
el nombre del paciente en gris— y eso dejaba a quien capturaba sin saber a qué
expediente estaba entrando.

El encabezado vive ahora en `web/src/modulos/fichas/EncabezadoFicha.tsx` y lo
usan **las dos fichas**. No es reutilización por ahorrar: el personal salta
entre hojas con el papel al lado, y si la de adultos y la de neonato dijeran lo
mismo en sitios distintos, cada salto costaría una búsqueda. Las dos que faltan
—niñez y prenatal— entran por ahí sin volver a decidir nada.

Dentro, **el nombre del paciente es el encabezado de nivel uno** y el de la hoja
va encima en letra pequeña, fuera de la jerarquía: los encabezados de nivel dos
son las secciones numeradas del formulario, y meter ahí el nombre de la hoja
haría que un lector de pantalla anunciara una sección que en el papel no existe.

La **fecha** se editaba en la sección 2. Se movió al encabezado, que es donde el
papel la imprime.

### La sección 1 no se pregunta: se dice

El papel abre con seis casillas —PSF, C/S «A», CENAPA, C/S «B», CAP, CAIMI—,
el nombre del servicio y el área de salud, porque el formulario se imprime igual
para todo el país. Aquí el sistema corre en **un solo establecimiento**, así que
la sección se muestra resuelta: `CAP · CAP Purulhá · Baja Verapaz`. Una casilla
que solo admite una respuesta es una casilla que alguien puede equivocar.

Los tres valores están en `SERVICIO_DE_SALUD`, en `servicio-fichas.ts`, y los
usa también la ficha de adultos. Si el CAP algún día comparte el sistema con
otro servicio, eso deja de ser una constante y pasa a ser configuración del
establecimiento.

### Los datos generales se enseñan aunque los llene recepción

La sección 2 del papel pide dirección, fecha de nacimiento del niño, edad en
días, sexo, población migrante y lugar de origen. La pantalla no los tenía
porque recepción ya los anota al registrar al paciente.

Ese razonamiento estaba mal: **recepción no entra a la ficha**. Quien la llena
no puede ir a mirar el registro, y una hoja sin la edad ni la dirección del niño
no es la misma hoja que el MSPAS imprime.

Se muestran, y **no se pueden reescribir**, que es como los trata la ficha de
adultos en su sección I·II: si un dato está mal se corrige en recepción, que es
donde vive, y así el expediente y la ficha nunca dicen cosas distintas.
Editable sigue siendo solo lo que pertenece a la consulta: el nombre de la
madre, el motivo y la fecha.

La **dirección** no es un campo: en Purulhá nadie tiene calle y número. Se arma
con el lugar poblado y la comunidad —«Caserío El Naranjo, Chilasco»—, que es lo
que recepción pregunta y como la gente dice dónde vive.

### Lo que una respuesta destapa va debajo, no al lado

El «¿Cuál?» de los antecedentes maternos, el «¿Quién?» del parto y el número de
dosis de Td colgaban a la derecha de las casillas SI/NO. Responder que sí
**empujaba la fila** y movía las casillas de sitio, y el campo quedaba tan
estrecho que no se leía lo escrito.

Ahora bajan debajo de la pregunta, con fondo y sangría, en un `Collapse`: la
fila no se mueve y el detalle se ve como lo que es, parte de la respuesta
anterior. Es el mismo trato que la ficha de adultos le da a sus treinta y tres
antecedentes, y está en un componente —`DetalleDeRespuesta`— para que la
siguiente ficha no vuelva a inventarlo.

### Libras y onzas a la misma altura

Los dos campos del peso al nacer se alineaban por el centro y solo «Onzas»
llevaba aviso debajo, así que su casilla quedaba más arriba que la de «Libras».
Se alinean por arriba.

---

## Permisos

Los mismos de la ficha de adultos —**Médico y Enfermería**— porque es el mismo
`POST /v1/fichas` el que la guarda. La ruta `/pacientes/:id/ficha-neonato` está
fuera del menú, igual que la de adultos: se llega con un paciente ya elegido.

---

## Archivos creados

| Archivo | Qué es |
|---|---|
| `services/usuarios/prisma/catalogo-ficha-neonato.ts` | El catálogo, transcrito del PDF |
| `services/usuarios/prisma/migrations/…_ficha_neonato_y_consejeria/` | Las tres tablas nuevas |
| `web/src/modulos/fichas/neonato/borrador-neonato.ts` | El estado del formulario y sus reglas |
| `web/src/modulos/fichas/neonato/PaginaFichaNeonato.tsx` | La pantalla |
| `web/src/modulos/fichas/neonato/neonato.spec.tsx` | 28 pruebas de pantalla |
| `web/src/modulos/fichas/EncabezadoFicha.tsx` | El encabezado impreso, compartido con la ficha de adultos |

## Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `prisma/schema.prisma` | `FichaNeonato`, `TemaConsejeria`, `ConsejeriaEnAtencion` y dos enums |
| `src/fichas/fichas.service.ts` | Catálogo con temas, guardado y lectura de lo nuevo, validación |
| `src/fichas/dto/*.ts` | Los DTO de entrada y respuesta |
| `test/fichas.e2e-spec.ts` | +15 pruebas |
| `docs/openapi/usuarios.yaml` y `web/src/api/generado/usuarios.ts` | Regenerados |
| `web/src/App.tsx` y `navegacion/menu.ts` | La ruta nueva |
| `web/src/modulos/fichas/SeccionFicha.tsx` | `Dato` sale de la ficha de adultos y se comparte |
| `web/src/modulos/fichas/servicio-fichas.ts` | `SERVICIO_DE_SALUD` |
| `web/src/modulos/fichas/PaginaFicha.tsx` | Usa el encabezado compartido y la constante del servicio |

---

## Verificaciones realizadas

```
npm run catalogo:neonato -w @cap/usuarios   idempotente, comprobado dos veces
npm run test:e2e -w @cap/usuarios           149 e2e (antes 134)
npx vitest run src/modulos/fichas           76 de pantalla   (desde web/)
tsc --noEmit                                limpio en los siete paquetes
```

Regresión completa: **829 verdes** (552 unitarias + 277 e2e). La suite del panel
se corrió dos veces seguidas: 318 verdes y salida 0 en ambas.

**No se verificó visualmente**: no hay navegador en este entorno.

---

## Lo que se encontró revisando el propio backend

Tres huecos, todos de la misma familia y todos introducidos aquí:

- **Los temas de consejería no se validaban contra el catálogo.** El servicio ya
  comprobaba que los signos y problemas fueran de esta ficha; los temas no. Un
  `temaId` de otra ficha habría llegado a la llave foránea.
- **Un tema repetido daba 500**, no 400: `consejeria_en_atencion` tiene clave
  compuesta por atención y tema.
- **Un problema repetido, lo mismo**, y eso ya existía antes de esta ficha.

Los tres se cierran con la misma comprobación, y tienen prueba.

### Y uno que sigue abierto: la ficha de neonato no se puede marcar como transcrita

`BorradorNeonato` tiene `digitalizada` y el cuerpo lo envía, pero **la pantalla
no tiene la casilla** que sí tiene la de adultos: `borrador.digitalizada` vale
`false` siempre. Consecuencia: una jornada entera transcribiendo fichas de
neonato del archivo de papel se registraría como consultas del día, y el panel
de avance de la digitalización (RF-08) no vería ninguna.

Es la misma familia que los tres de arriba —código que nunca se ejercitó desde
una pantalla— y **no está corregido**: aparece al revisar la sección 2, pero
tocarlo bien exige decidir si esta ficha entra también desde la cola de
digitalización, como la de adultos, y no solo desde recepción.

---

## Información pendiente

1. **Los antecedentes maternos se capturan pero no se guardan todavía.** La
   pantalla los pide y el catálogo existe, pero el envío al endpoint de
   antecedentes del paciente no está conectado: en la ficha de adultos los
   antecedentes son **del paciente**, y aquí son de la madre, que puede no ser
   paciente del CAP. Hay que decidir dónde viven antes de guardarlos mal.
2. **El borrador vive solo en memoria**, igual que en la ficha de adultos. Si se
   cierra la pestaña a media captura, se pierde.
3. **¿El CAP llena esta ficha completa?** Son dos páginas densas y la pregunta 2
   de `campos-de-fichas.md` sigue sin responder: si hay secciones que en la
   práctica se dejan en blanco, no tiene sentido haberlas construido primero.
4. **La ficha no calcula nada del peso.** El signo de peligro *"pesa menos de 5
   libras 8 onzas"* podría marcarse solo a partir del peso capturado. No se hizo
   porque el papel lo deja al criterio de quien evalúa, y adelantarse sería
   decidir por el personal.

---

## Próximo paso recomendado

Entrar como `jperez`, abrir un paciente recién nacido y llenar la ficha. El
recorrido que importa: marcar un signo de los veinte primeros y comprobar que el
aviso de enfermedad grave aparece **en el momento**, con el nombre del signo.

Después, la ficha de **lactancia y niñez**: cuatro páginas, la más compleja de
las cuatro, con esquema de vacunación, micronutrientes y la gráfica de peso para
edad. Y antes de la prenatal hay que decidir su relación con el módulo
Programas, que ya lleva el embarazo.
