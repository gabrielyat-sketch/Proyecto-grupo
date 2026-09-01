# Diseño: ficha clínica de adolescente, adulto y adulto mayor

Pantalla de captura del formulario oficial del MSPAS, ficha 1 del inventario
(`docs/campos-de-fichas.md`). Es el formulario más largo del sistema: diez
secciones, cerca de doscientos campos y una matriz de catorce problemas.

---

## Contexto y usuarios

Quien llena esta pantalla es personal de enfermería o un médico del CAP de
Purulhá, con el expediente de papel al lado, en dos situaciones distintas:

1. **Durante la consulta.** El paciente está enfrente. Lo que importa es no
   perder tiempo buscando dónde escribir.
2. **Transcribiendo expedientes de papel** (RF-08). Miles de hojas, una tras
   otra. Aquí cada pulsación de más se paga miles de veces.

La segunda situación es la que manda en el diseño, porque es la que se rompe
antes: un formulario que se llena bien con el ratón una vez al día se vuelve
insoportable a la hora ochenta de transcripción.

## Requisitos confirmados

- Stack ya decidido: React 19, TypeScript 5.9.3, Vite 8, MUI 9.3.1, TanStack
  Query 5, tema en `web/src/tema.ts`. No se cambió nada de eso.
- Captura por teclado sin depender del ratón (arquitectura §7.2, RF-08).
- La API ya existe: `GET /v1/fichas/catalogo/ADULTO`,
  `POST /v1/expedientes/:id/fichas`, `GET`/`PATCH /v1/pacientes/:id/antecedentes`.
- El personal tiene distinto nivel de alfabetización digital.
- Recepción y Farmacia no entran al historial clínico.

## Supuestos

- **La ficha de adultos empieza a los 10 años.** Es lo que dice el título del
  formulario ("adolescente, adulto y adulto mayor") y la edad en que la OMS
  sitúa el inicio de la adolescencia. A un paciente menor la pantalla se niega
  a abrirse y explica que le corresponde la ficha de lactante y niñez, que aún
  no está construida.
- **Establecimiento y área de salud son fijos**: "CAP Purulhá" y "Baja
  Verapaz". La sección I del papel los pide en cada hoja; aquí se muestran
  como dato, no como campo. Si algún día el sistema atendiera a más de un
  establecimiento, saldrían de configuración.
- **El borrador vive solo en memoria.** No se guarda en el navegador. Ver
  "Información pendiente".

## Dirección visual

El punto de partida fue descartar la respuesta genérica: tarjetas con sombra,
esquinas redondeadas, secciones en pestañas. Ninguna de las tres sirve aquí.

Lo que gobierna la pantalla es que **el usuario tiene el papel al lado y salta
entre los dos todo el tiempo**. Así que la pantalla se parece al papel a
propósito:

- **Bandas de sección con el numeral romano**, igual que la hoja impresa: `III
  SIGNOS Y SÍNTOMAS DE PELIGRO`. El ojo encuentra en la pantalla lo que acaba
  de leer en el papel, sin traducir.
- **Recuadros rectos, sin redondeo.** La hoja del MSPAS es una retícula de
  recuadros; el redondeo la haría parecer otra cosa.
- **Casillas cuadradas** para sí/no, no pastillas ni interruptores. En el papel
  eso son casillas.
- **Los textos son los impresos, verbatim**, con sus acentos, tal como los
  sembró el catálogo.
- **Una sola página larga, en el orden del formulario.** No hay pestañas: con
  pestañas, media hoja sin llenar queda escondida detrás de una que nadie abrió,
  y quien transcribe no lo nota hasta que el expediente ya está guardado.

Lo audaz está concentrado en un sitio: la banda de sección. El resto es
deliberadamente sobrio, denso y sin movimiento.

## Tokens de diseño

Se reutilizan los del tema (`web/src/tema.ts`) sin añadir ninguno nuevo:

| Rol | Valor | Dónde |
|---|---|---|
| Primario | `#15607a` | casilla elegida, borde de sección activa, foco |
| Secundario | `#4a6572` | banda de sección |
| Error | `#b3261e` | valores fuera de rango |
| Éxito | `#1b5e20` | sección completa en el índice |
| Fondo / superficie | `#f4f6f8` / `#ffffff` | |

Tipografía: la base de 16 px del tema. Los rótulos de sección van a 14 px con
`letter-spacing: 0.08em` en versalitas; los recuentos usan
`font-variant-numeric: tabular-nums` para que las cifras no bailen al cambiar.

Radio: `0` en las secciones (contra los 8 px del tema) y `0.5` en las casillas.
Es la única desviación del tema, y es la que hace que la pantalla lea como una
hoja.

## Decisiones de captura por teclado

Son las que justifican el trabajo:

1. **Un grupo sí/no es UNA parada de tabulador, no tres.** Roving tabindex sobre
   un `role="radiogroup"`. Con tres paradas por pregunta, recorrer los 33
   antecedentes costaría 99 pulsaciones de Tab en vez de 33.
2. **La respuesta se elige con la inicial**: `S`, `N`, `A` (no aplica). Las
   flechas también funcionan, que es lo que anuncia un lector de pantalla.
3. **Suprimir borra la respuesta** y la devuelve a "sin preguntar" — que es un
   estado distinto de "no" y hay que poder volver a él tras una tecla mal dada.
4. **`Alt`+1 a `Alt`+8** saltan de sección; el foco viaja con la vista, no se
   queda donde estaba.
5. **`Ctrl`+`Enter` guarda** desde cualquier campo.
6. **Lo que no aplica no se dibuja.** El "cuál" de un antecedente aparece al
   responder que sí; la fila de un problema abre sus signos y diagnósticos al
   marcarla. Dibujarlo todo daría más de cien casillas abiertas para una
   consulta que normalmente toca uno o dos problemas.

## Componentes creados

| Archivo | Qué es |
|---|---|
| `web/src/modulos/fichas/PaginaFicha.tsx` | La pantalla: orquesta las ocho secciones, el guardado y los atajos |
| `web/src/modulos/fichas/borrador.ts` | El modelo del borrador y su conversión a las peticiones. Sin React: es lo que se puede probar solo |
| `web/src/modulos/fichas/servicio-fichas.ts` | Acceso a la API, tipado contra el contrato generado |
| `web/src/modulos/fichas/SelectorRespuesta.tsx` | El grupo sí/no/no-aplica con teclado, y `LineaPregunta` |
| `web/src/modulos/fichas/SeccionFicha.tsx` | La banda con numeral romano y el subtítulo de bloque |
| `web/src/modulos/fichas/IndiceFicha.tsx` | El índice lateral fijo con el recuento por sección |
| `web/src/modulos/fichas/MatrizProblemas.tsx` | Las catorce filas con sus signos y diagnósticos |
| `web/src/modulos/fichas/SeccionAntecedentes.tsx` | Sección VII, incluidos los gineco-obstétricos |
| `web/src/modulos/fichas/SeccionExamenFisico.tsx` | Sección VIII con el IMC calculado |
| `web/src/modulos/fichas/SeccionPlan.tsx` | Medicamentos, diagnóstico, tratamiento y cierre |
| `web/src/modulos/fichas/borrador.spec.ts` | 31 pruebas del modelo |
| `web/src/modulos/fichas/ficha.spec.tsx` | 16 pruebas de la pantalla completa |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `web/src/App.tsx` | Ruta `/pacientes/:pacienteId/ficha`; se exporta el cliente de consultas para poder vaciarlo entre pruebas |
| `web/src/navegacion/menu.ts` | `RUTAS_FUERA_DEL_MENU`: rutas que necesitan un paciente elegido y aun así se cierran por rol |
| `web/src/modulos/recepcion/TablaPacientes.tsx` | Columna "Atención" con el botón de abrir ficha, visible solo a Médico y Enfermería |
| `web/src/api/errores.ts` | `fallarApi()`, extraído de lo que ya estaba duplicado |
| `web/src/api/index.ts` | Exporta `fallarApi` |
| `web/src/modulos/recepcion/servicio-pacientes.ts` | Usa el helper compartido |

### Un arreglo que salió de camino

El manejo de error duplicado fijaba el estado HTTP en `400`. Un `403` llegaba a
la pantalla disfrazado de error de validación. Ahora se conserva el estado real.

## Decisiones que no son de estilo

**Los antecedentes se guardan primero y aparte.** Pertenecen al paciente, no a
la consulta de hoy: `PATCH /v1/pacientes/:id/antecedentes` antes que
`POST .../fichas`. Si fallara el registro de la ficha, lo que se preguntó hoy
queda igualmente en su historia — que es lo correcto. Al revés (ficha guardada,
antecedentes perdidos) habría que volver a preguntárselo todo.

**El IMC no se teclea ni se envía.** Se calcula en pantalla mientras se escribe
—con el mismo cálculo del backend— y el servidor lo vuelve a calcular al leer la
ficha. Así nunca queda desfasado del peso del que dice venir.

**La hoja pide libras y metros; el sistema guarda kilos y centímetros.** Debajo
del campo aparece el equivalente mientras se escribe, para que nadie haga la
cuenta a mano.

**Los gineco-obstétricos son solo los de esta hoja.** FUR, gestas, partos,
abortos, detección de cáncer de cérvix, método de planificación familiar y tipo
de sangre. Las cuentas de cesáreas, legrados, nacidos vivos y muertos,
preeclampsia y demás pertenecen a la **ficha prenatal**, que las trae impresas.
El modelo de datos las guarda —son las mismas columnas para las dos fichas—
pero pedirlas en una consulta de adulto sería inventarle campos al formulario
oficial, y lo que se capture así no tiene respaldo en ningún papel firmado.

**El método de planificación es una lista cerrada**, con las opciones impresas.
Escrito a mano, el mismo método aparece como "inyección", "Inyectable" y "depo",
y después ningún reporte de cobertura puede sumarlos.

**Los datos del paciente son de solo lectura.** Vienen del registro de
recepción. Corregirlos aquí haría que el expediente y la ficha pudieran decir
cosas distintas; además, el `PATCH` del paciente es de Recepción, no del médico.

**Las secciones pesadas van memorizadas.** La ficha entera es un solo estado;
sin `memo`, cada letra escrita en el motivo de la consulta volvería a dibujar
las catorce filas de problemas. En una máquina modesta eso se siente como que
el teclado se traba.

## Estados cubiertos

| Estado | Qué se ve |
|---|---|
| Carga | Indicador con "Cargando el formulario…" |
| Error de carga | `AvisoError` con el mensaje del servidor |
| Vacío | La ficha en blanco es el estado normal; el índice muestra `0/33` |
| Con datos previos | Los antecedentes de visitas anteriores llegan marcados |
| Reparos antes de guardar | Aviso con la lista y salto a la primera sección afectada |
| Guardando | Botones deshabilitados, "Guardando…" |
| Éxito | Aviso con el expediente y la fecha, y dos salidas: ir a recepción u otra atención |
| Error del servidor | La ficha queda en pantalla con todo lo escrito intacto |
| Sin expediente | Aviso: hay que abrirlo en recepción |
| Edad que no corresponde | Aviso: le toca otra ficha |
| Paciente hombre | Los gineco-obstétricos no se piden |
| Rol sin permiso | La guarda por rol devuelve al inicio |
| Cambios sin guardar | Distintivo "Sin guardar" y aviso del navegador al recargar o cerrar |

## Responsive

- **Escritorio ancho (`lg`+):** índice lateral fijo de 188 px + formulario.
  Signos y diagnósticos en dos columnas.
- **Tableta (`md`):** el índice desaparece; el examen físico pasa a cuatro
  columnas y las cuentas obstétricas a tres.
- **Móvil (`xs`):** una columna. La barra superior se apila. Las listas de
  opciones a columna única.

La barra con el nombre del paciente y el botón de guardar es fija en todos los
tamaños: hay que poder guardar sin volver arriba.

## Accesibilidad

- Grupos sí/no con `role="radiogroup"` / `role="radio"` y `aria-checked`, más
  navegación por flechas: es lo que un lector de pantalla sabe anunciar.
- El nombre accesible de cada grupo es el texto impreso de la pregunta.
- Foco visible: el contorno de 3 px del tema, sin sobrescribir.
- El salto de sección lleva el foco consigo.
- El IMC se anuncia con `aria-live="polite"` al cambiar.
- Cada sección es un `<section>` con `aria-label` y su `<h2>`; los bloques
  internos, `<h3>`.
- Contraste: blanco sobre `#4a6572` en la banda (7.4:1) y sobre `#15607a` en la
  casilla elegida (6.6:1).
- Sin animación decorativa. Lo único que se mueve es el despliegue de una fila
  al marcarla, que explica de dónde salió el contenido.

## Dependencias agregadas

Ninguna.

## Verificaciones realizadas

- `tsc --noEmit` sobre `web`: limpio.
- 47 pruebas nuevas (31 del modelo + 16 de la pantalla). Suite del panel: 130
  pruebas en 13 archivos, todas en verde.
- Regresión completa del monorepo tras el cambio.
- **No se verificó visualmente**: no hay navegador en este entorno. El
  comportamiento está cubierto por pruebas, pero el aspecto hay que mirarlo en
  `localhost:5173`.

## Información pendiente

1. **¿Dónde vive el borrador?** Hoy solo en memoria, con aviso del navegador al
   salir. Guardarlo en el navegador lo haría sobrevivir a una recarga, pero
   dejaría texto clínico en claro en una computadora compartida — justo lo que
   se evita cifrando en la base. Es una decisión que hay que tomar, no un
   descuido.
2. **¿El CAP pesa en libras o en kilos?** Lo decide la báscula. Hoy se captura
   en kilos y se muestra el equivalente.
3. **Ficha de niñez, neonato y prenatal.** El catálogo solo tiene sembrada la de
   adultos.
4. **Antecedentes quirúrgicos.** El inventario los lista como texto libre; no
   están en el modelo de datos ni en esta pantalla.
5. **El tipo de sangre está impreso dentro del bloque gineco-obstétrico**, así
   que un paciente hombre nunca lo tiene dónde anotarse. Es lo que hace el
   papel y la pantalla lo respeta, pero conviene preguntarlo en el CAP.
6. **`npm run lint` no funciona en ningún paquete del repositorio**: no existe
   ningún `eslint.config.*`. No se tocó porque configurarlo es una decisión
   aparte que afecta a todo el código.

## Próximo paso recomendado

Abrir `localhost:5173`, entrar como médico, buscar un paciente y pulsar "Abrir
ficha". Recorrer la hoja **sin tocar el ratón** y ver dónde se atasca: es la
única prueba que importa para RF-08.
