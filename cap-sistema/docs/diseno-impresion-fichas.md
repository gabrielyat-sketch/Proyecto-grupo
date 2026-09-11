# Diseño: Impresión de las fichas clínicas

Las cuatro fichas del MSPAS —adulto, menor de 28 días, lactante y niñez,
prenatal y posparto— impresas **llenas**, con la apariencia de la hoja
oficial, en **oficio** y en **blanco y negro**, desde el historial del
expediente.

---

## Contexto y usuarios

El CAP sigue guardando expediente de papel. Lo que se registra en el sistema
tiene que poder engraparse junto a las hojas que se llenan a mano, y quien lo
reciba —otro médico, el director, un servicio al que se refiere— tiene que
leerlo igual que las de siempre. Imprime quien atiende (médico, enfermería) o
quien dirige; Recepción y Farmacia no ven el historial, así que tampoco lo
imprimen.

El pedido vino del CAP el 10 de septiembre de 2026: «agregar la opción de
impresión en hojas oficio de todos los formularios en blanco y negro».

## Requisitos confirmados

- La ficha **llena**, no el formulario vacío: «para eso es el CAP».
- Con la apariencia de la **hoja original** del MSPAS (`docs/pdfs/`).
- Las **cuatro** fichas.
- Hoja **oficio** (21.6 × 33 cm), la que usa el CAP.
- **Blanco y negro**: las impresoras del CAP no tienen color.

## Supuestos

- **El navegador imprime** (`window.print`), no el servidor. Chrome y Edge
  respetan `@page { size }` y `print-color-adjust`, y el panel ya corre en
  ellos. Generar PDF en el servidor exigiría el Chromium que la Etapa 11
  reserva para `reportes`, y hoy no existe.
- **La firma va en blanco.** «Nombre y cargo de la persona que atendió» se
  firma a mano, como en el papel. El sistema guarda el id de quien registró la
  ficha, no su nombre (vive en `auth`); imprimir el id no sirve de nada.
- **Los antecedentes son los de hoy.** Pertenecen al paciente, no a la
  consulta, y se imprimen como están ahora. Una ficha de hace un año sale con
  los antecedentes actuales; en el papel también se actualizan encima.
- **La hoja 2 de la prenatal (cuatro controles) sale con UN control lleno**:
  el de esta ficha, en la columna «Control 1», con la fecha en «Fecha de la
  visita». En el sistema cada control es una ficha; el papel acompaña a la
  mujer todo el embarazo. Las otras tres columnas quedan en blanco para que
  la hoja se lea igual que la original y se pueda seguir llenando a mano.
- **La gráfica de peso para edad (hoja 2 de niñez, apaisada) sale con la
  cuadrícula del papel y el peso de hoy marcado, sin las curvas de
  referencia**: no tenemos sus datos y trazarlas a ojo sería inventar un
  patrón de crecimiento. Cuando la pantalla tenga las bandas de la OMS (etapa
  C), se pintan aquí con los mismos números.
- **Las hojas de renglones libres** (hoja 4 de niñez, «otros controles» del
  posparto) salen con sus rayas y las notas de la ficha en el primer renglón.
- **Lo que el papel trae en un solo recuadro y el sistema no distingue** se
  resuelve por posición o por nombre, y queda dicho en el código: los 27
  signos del neonato se reparten 20 / 3 / 4 entre «Evalué signos de peligro»,
  «Evaluar infección» y «Evaluar malformaciones» por su orden en el catálogo;
  «VIH-SIDA» (neonato) y «Presenta problemas el / la acompañante» (niñez) no
  llevan SI / NO por su nombre; las cuatro frases de consejería del primer
  control posparto se contestan buscando los temas del catálogo por palabra
  clave (la de lactancia junta dos temas: SI si alguno se brindó).

## Dirección visual

Aquí **no manda el tema del panel: manda el formulario impreso**. La hoja se
reconstruye con las piezas del papel —barra negra con numeral romano por
sección, cuadros con borde, campos con su raya, casillas cuadradas con X,
tablas con borde— y no con los componentes de MUI. Una hoja que sale de aquí
tiene que parecer la misma hoja que se llena a mano, no una impresión de una
pantalla.

Tres decisiones sostienen eso:

1. **Se dibuja desde el catálogo, no desde lo marcado.** La matriz de
   problemas lista los catorce problemas del papel con todos sus signos y
   diagnósticos aunque solo uno esté presente; los signos de peligro salen
   todos con su SI y su NO. Lo marcado va **subrayado y en negrita**, que es
   lo que el papel pide («subraye el diagnóstico»). Un resumen de lo presente
   sería más corto y dejaría de ser el formulario.
2. **Lo llenado va en negrita.** En el papel, lo escrito a mano se distingue
   de lo impreso por la letra; aquí todo sale de la misma impresora, y sin
   esa marca un valor y un rótulo se confunden. Es la única licencia visual.
3. **Lo que el sistema no captura sale con su raya en blanco**, como en el
   original: ocupación, nombre del responsable, quirúrgicos. No se inventa y
   no se quita.

Un cuarto punto es de honestidad clínica: **un signo o antecedente que no se
contestó no lleva NO**. Las dos casillas quedan vacías. En un formulario
clínico, un NO que nadie marcó es un dato falso.

## Tokens de diseño

Medidas en milímetros y puntos: son las unidades del papel, y el navegador
las respeta al imprimir.

| Token | Valor | Por qué |
|---|---|---|
| Hoja | 216 × 330 mm, márgenes 8 / 10 mm | Oficio. El original está maquetado en A4 y cabe con margen |
| Letra | Arial / Helvetica, 8 pt, interlínea 1.2 | La del formulario; en tablas 7.5 pt, notas 7 pt |
| Título | 12.5 pt negrita; subtítulo 10 pt | «FICHA CLÍNICA / ADOLESCENTE, ADULTO Y ADULTO MAYOR» |
| Barra de sección | fondo negro, texto blanco 8.5 pt mayúsculas, 78 % de ancho | La del papel, que no llega al borde derecho |
| Casilla | 3.2 mm, borde 0.3 mm, X en negrita | Se lee marcada a simple vista y fotocopiada |
| Raya de campo | borde inferior 0.25 mm | Igual en todas; el valor encima, en negrita |
| Renglón para escribir | 4.8 mm | Rayas de fondo con `background-size`; crecen si el texto es más largo |
| Color | negro y blanco, nada más | El CAP imprime en blanco y negro; ningún estado depende del color |

Los emblemas del papel (DRPAP, SIAS, MSPAS) van como recuadros de texto: son
logos a color en el original y en negro no se reconocerían.

## Componentes creados o modificados

`web/src/modulos/fichas/impresion/`:

| Archivo | Qué es |
|---|---|
| `hoja.css` | Los tokens de arriba, la vista en pantalla (hojas sobre mesa gris) y `@media print` |
| `Hoja.tsx` | Las piezas: `Pliego` (con variante apaisada), `Barra`, `Cuadro`, `Fila`, `Campo`, `Casilla`, `MarcaEnRaya` («MD___» con su X), `SiNo`, `Renglones`, `Firma`, `Flecha` (los recuadros con punta del neonato), `RecuadroDato`, `Encabezado`, emblemas, y las conversiones (kg → lb, cm → m, fechas con barras, edad en días y en años/meses) |
| `Bloques.tsx` | Lo que las cuatro hojas comparten: signos de peligro (SI/NO —en el orden de columna o intercalado como se lee el papel— y de una casilla), antecedentes en columnas o en línea, la matriz de problemas (SI/NO en casillas, en rayas o bajo el nombre; filas sin SI/NO; texto fijo del papel), la columna de conducta, la tabla de consejería |
| `AntecedentesAdulto.tsx` | La sección VII de adultos, renglón por renglón como el papel |
| `GraficaPeso.tsx` | «Gráfica de peso para edad» en SVG: cuadrícula en escalera 0–36 meses y 38–60 meses, con el peso de hoy |
| `HojaAdulto.tsx` | Dos hojas: secciones I–VIII y IX–X |
| `HojaNeonato.tsx` | Dos hojas: los tres recuadros de la sección 3 con sus flechas, madre y parto; examen, matriz con SI___/NO___ y tratamiento por fila, consejería con reconsulta |
| `HojaNinez.tsx` | Cuatro hojas: la del niño (carnet: padres, casa, esquema de vacunas con sus grises), la gráfica apaisada con las tablas de micronutrientes, la de la consulta (14 problemas en una cara) y «Otros problemas, controles u observaciones» |
| `HojaPrenatal.tsx` | `HojaPrenatal` (hojas 1 y 2: la tabla de controles con sus barras dentro) y `HojaPosparto` (primer control con las cuatro frases del papel, o la tabla de controles con «Otros controles y observaciones») |
| `PaginaImprimirFicha.tsx` | La ruta: pide ficha, paciente, catálogo, antecedentes (y carnet en niñez), barra con «Imprimir» y «Expediente» |
| `impresion.spec.tsx` | 32 pruebas |
| `vista-previa.spec.tsx` | Genera las hojas como HTML estático con datos de ejemplo y los catálogos copiados de las semillas reales, para mirarlas con Chrome sin ventana |

Modificados: `App.tsx` (ruta `/pacientes/:pacienteId/fichas/:fichaId/imprimir`,
**fuera del layout**: sin menú ni barra), `navegacion/menu.ts`
(`/imprimir-ficha`, mismos roles que `GET /v1/fichas/:id`),
`expedientes/EntradaHistorial.tsx` (botón «Imprimir» en cada ficha, en la
misma pestaña: la sesión vive en memoria), `expedientes/PaginaExpediente.tsx`
(pasa el `pacienteId`).

Sin cambios en el backend: todo lo que la hoja necesita ya lo devolvía la API.

## Estados cubiertos

- Cargando (las cuatro o seis consultas), error de cualquiera de ellas.
- Atención **sin ficha oficial** (`tipoFicha` nulo): aviso y botón deshabilitado.
- Antecedentes o carnet que no llegan: la hoja sale con esas rayas en blanco,
  no deja de imprimirse.
- Signo o antecedente no contestado: casillas vacías.
- Más de cuatro medicamentos: los que sobran van en «Otros medicamentos».
- Texto más largo que los renglones del papel: los renglones crecen.
- Posparto: primer control y controles posteriores son dos hojas distintas.
- Rol sin permiso: «Esta pantalla no es de su perfil», sin pedir la ficha.

## Responsive

La hoja mide 21.6 cm: en una pantalla más angosta se desplaza horizontalmente,
no se rompe. Es una vista previa de impresión, no una pantalla de trabajo, y
se abre desde un escritorio con impresora. La barra de herramientas sí envuelve
en móvil.

## Accesibilidad

- Cada hoja es una `section` con nombre («Ficha clínica, hoja 1»); cada barra
  de sección es un `h2`.
- Cada casilla es `role="checkbox"` con `aria-checked` y su nombre («SI
  Dificultad respiratoria», «CAP», «RH (+)»). En las tablas donde SI y NO ya
  están en el encabezado, el nombre queda para el lector de pantalla y no se
  dibuja (`soloAccesible`).
- El título del documento pasa a ser «Ficha Adulto - Apellidos, Nombres»
  mientras la página está abierta: es el nombre que el navegador propone al
  guardar como PDF.
- `@page { margin: 0 }` es lo que evita que Chrome imprima la URL y la fecha
  en el margen; los márgenes reales los pone la hoja.

## Dependencias agregadas

Ninguna.

## Verificaciones realizadas

```
npx vitest run src/modulos/fichas src/modulos/expedientes   214 + 1 (todo verde)
tsc --noEmit                                                 limpio
```

**Sí se verificó visualmente**, aunque sin navegador con sesión: las hojas
(adulto, neonato, niñez, prenatal, posparto primer control, posparto control
posterior) se generaron como HTML estático con datos de ejemplo y los
catálogos reales (`vista-previa.spec.tsx`), se imprimieron a PDF con Chrome
sin ventana y se miraron página por página junto al PDF original, hasta que
cada sección, casilla, raya y título quedó donde el papel lo pone. Cada una
sale en 216 × 330 mm (la gráfica de niñez en 330 × 216) y en el número de
páginas del papel: 2, 2, 4 y 2 + 1. De esa revisión salieron, entre otros: los
rótulos de las casillas SI/NO se dibujaban en las tablas (ahora son solo para
el lector de pantalla); los degradados con `calc()` de los renglones salían
como una banda negra al imprimir (se dibujan desde abajo, sin `calc()`); una
raya vacía dibujada con un espacio en blanco se colapsa y queda a media
altura (se usa un espacio duro); y un `flex-basis` en milímetros dentro de
una columna flex es ALTO, no ancho.

Lo que NO se ha hecho todavía: imprimir en una impresora real del CAP. El
diálogo de impresión debe quedar en «Oficio» y sin encabezados; `@page` lo
propone, pero el usuario puede cambiarlo.

## Información pendiente

1. **Nombre de quien atendió.** Hoy se firma a mano. Si el CAP quiere el
   nombre impreso, hace falta que `usuarios` conozca el nombre del personal
   (vive en `auth`) o que la impresión lo pida a `auth`.
2. **Curvas de la gráfica de peso para edad**: la cuadrícula ya se imprime;
   cuando la pantalla tenga las bandas de la OMS (etapa C), pintarlas aquí.
3. **Distrito y comunidad del servicio** (`SERVICIO_DE_SALUD`): siguen sin
   confirmar y salen en blanco. No se inventa.
4. **Antecedentes históricos.** Se imprimen los actuales del paciente; si el
   CAP necesita los que tenía el día de la consulta, habría que guardarlos con
   la ficha.
5. **Probar en la impresora del CAP** y ajustar márgenes si recorta.

## Próximo paso recomendado

Imprimir una ficha real en el CAP y mirarla al lado de una llenada a mano. Es
la única verificación que no se puede hacer desde aquí, y de ella salen los
ajustes finos (márgenes, grosor de raya, tamaño de casilla).
