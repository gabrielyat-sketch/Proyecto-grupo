# Diseño: Farmacia — inventario, lotes y entrega de medicamentos

El módulo de Farmacia completo (Etapa 8): catálogo, existencias por lote, las
tres alertas, el ajuste por conteo físico y **la entrega de medicamentos a
pacientes**, que es la pantalla más delicada del sistema porque toca inventario
de verdad y un error deja el stock mal contado.

---

## De dónde salió

El servicio `medicamentos` estaba construido desde hacía tiempo —14 endpoints,
5 modelos, 2,401 líneas— y no tenía ni una sola pantalla. Era la superficie más
grande del sistema sin usar.

El backend ya resuelve lo difícil: la selección FEFO, el control de existencia
bajo transacción, el libro mayor de movimientos. Lo que faltaba era la mitad que
usa el personal.

---

## Qué preguntas responde cada pantalla

| Ruta | Pregunta que responde |
|---|---|
| `/farmacia` · Catálogo | "¿Hay de esto?" |
| `/farmacia` · Por vencer | "¿Qué tengo que gastar antes de que se pierda?" |
| `/farmacia` · Vencidos | "¿Qué hay que sacar del estante?" |
| `/farmacia` · Bajo mínimo | "¿Qué le pido al almacén departamental?" |
| `/farmacia` · Entregas | "¿Qué salió del inventario?" |
| `/farmacia/:id` | "¿De qué lotes se compone esta existencia?" |
| `/farmacia/entrega` | "Este paciente viene por su tratamiento" |

---

## Decisiones

### Cuatro pestañas, no cuatro pantallas

Son cuatro vistas del **mismo inventario**, no cuatro flujos distintos. Quien
busca un medicamento y quien revisa qué se está venciendo miran el mismo
estante desde dos ángulos, y pasar de uno a otro es parte del mismo trabajo.

Es lo contrario del caso de la digitalización y la sala de espera, que sí son
dos flujos distintos —miles de carpetas que pueden esperar meses frente a cinco
personas sentadas ahora— y por eso son dos pantallas.

### El número de la alerta va en la pestaña

Sin el contador habría que entrar a cada alerta para descubrir que no hay nada,
y **una alerta que obliga a buscarla deja de avisar**. Con el número a la vista,
abrir Farmacia responde de una sola mirada si hay algo que atender hoy.

Cuesta tres consultas al abrir la pantalla, y las tres están paginadas o
acotadas por el servidor.

### Aquí sí se busca mientras se escribe

Al revés que en la consulta del expediente. Allí el número vive cifrado y se
resuelve por índice ciego, así que hay que escribirlo entero y pulsar Enter.

Aquí el nombre de un medicamento **viaja en claro** —no es un dato personal— y
el servidor lo resuelve con un índice sobre `nombre_generico`. Cada tecla es
una consulta barata. La tabla conserva las filas anteriores mientras llegan las
nuevas: sin eso la lista desaparece y vuelve en cada letra, y el salto se siente
como un tirón bajo la mano que escribe.

El servidor exige dos letras como mínimo, y la pantalla no consulta hasta
tenerlas.

### La existencia nunca se muestra sin su unidad

`320` no dice si son tabletas o frascos. Todas las cantidades salen como
`320 tabletas`, y `JARABE_ML` se dice `ml`: mostrar la constante del enum
obligaría a traducirla mentalmente en cada renglón.

Las columnas de cantidad van con `tabular-nums` para que se lean en vertical y
se note de un vistazo cuál está bajo, sin comparar cifra por cifra.

### Los lotes van a la vista, no tras un desplegable

"320 tabletas" puede ser un lote que vence en dos años o tres que vencen el mes
que viene, y **lo que se hace con cada caso es distinto**. La existencia total
por sí sola no basta para decidir nada.

### Cuánto falta, dicho como lo diría una persona

`En 18 dias` y `En 3 meses`, no `En 87 dias`. Por debajo de dos meses se dice en
días, porque ahí la diferencia entre 20 y 50 días sí cambia lo que hay que hacer
con ese lote.

Los que quedan a **menos de 30 días** van marcados: por debajo de un mes ya no
da tiempo a devolverlos al proveedor ni a redistribuirlos a otro servicio de
salud, así que o se usan o se pierden.

### Lo que no se puede editar de un medicamento

Solo se editan tres campos: existencia mínima, receta obligatoria y activo. El
código, el nombre genérico, la presentación y la unidad **no**.

Identifican al medicamento, y los lotes que ya ingresaron se contaron en esa
unidad: cambiar `TABLETA` por `FRASCO` convertiría 500 tabletas en 500 frascos
sin que nadie lo note. Si un medicamento se registró mal, se desactiva y se da
de alta el correcto.

Desactivar no borra: saca el medicamento del catálogo y le impide recibir lotes
nuevos, pero conserva todo su historial.

### El ajuste por conteo físico no borra el error: lo explica

El estante y el sistema se separan tarde o temprano — una caja mal ubicada, una
entrega que no se registró, un frasco roto que nadie anotó. Hasta que existió el
ajuste, la única salida era **dar de baja el lote entero**: obligaba a inventar
un motivo y borraba de golpe existencia que sí estaba.

Tres decisiones sostienen la pantalla:

**Se escribe lo contado, no la diferencia.** Quien recorre el estante cuenta
unidades: "hay 95". Pedirle la diferencia lo obliga a restar de cabeza y a
acertar el signo, y equivocarse ahí deja el inventario peor de como estaba. El
desvío lo calcula el servidor y lo guarda con su signo en el libro mayor.

**El desvío se dice en palabras mientras se escribe:** "Faltan 5 tabletas",
"Sobran 12 tabletas". Un número con signo obliga a interpretar de qué lado está
el error, y quien acaba de contar un estante entero no debería tener que
hacerlo.

**Un conteo que cuadra no se acepta.** Devuelve 400 y la pantalla ni siquiera
deja enviarlo: un movimiento de ajuste con diferencia cero solo ensucia el libro
mayor sin explicar nada.

El ajuste se ofrece también en un lote **agotado** —si aparece una caja que se
creía gastada, hay que poder devolverla al inventario— y contar cero lo deja
`AGOTADO`, no dado de baja: son cosas distintas. Lo único que queda fuera es un
lote dado de baja, que ya no es inventario.

### El conteo lleva control optimista, y aquí hace falta de verdad

El ajuste fija un valor **absoluto**, así que no sirve el descuento condicional
(`WHERE cantidad_disponible >= x`) que protege a las entregas.

Si entre el momento en que se leyó la existencia y el momento de guardar alguien
entregó diez tabletas, escribir el conteo **pisaría esa entrega** y la existencia
quedaría mal sin que nadie lo note — que es exactamente el error que el módulo
tiene que evitar.

Por eso el cuerpo lleva `cantidadEnSistema`: la existencia que se mostraba al
empezar a contar. El `UPDATE` la comprueba en la misma sentencia, y si no
coincide devuelve **409** sin tocar nada. La pantalla lo explica y **no
reintenta sola**: reintentar volvería a mandar un conteo que ya es viejo.

### La baja de un lote pide un motivo, y lo guarda entero

El sistema **no da de baja nada por su cuenta**, ni siquiera un lote vencido:
destruir medicamento es una decisión con responsable, y la baja queda en el
libro mayor a nombre de quien la hizo. Lo que sí hace el sistema es impedir que
un lote vencido se entregue — la selección FEFO nunca lo toma.

El motivo es obligatorio y tiene el tope de la columna, 200 caracteres, con el
contador a la vista antes de enviar.

---

## La entrega de medicamentos

### Es una pantalla propia, no una pestaña

Las cuatro pestañas son vistas del inventario: responden *qué hay*. El despacho
es una **acción** sobre un paciente concreto, con su propio estado a medio
construir. Meterlo como quinta pestaña mezclaría mirar con hacer, y perdería la
receta a medio escribir en cuanto alguien tocara otra pestaña.

El botón de entrar va arriba del todo y en color: quien abre Farmacia con un
paciente enfrente viene a entregar, no a mirar existencias.

### Tres bloques numerados, no un asistente por pasos

A quién · qué · confirmar. Numerados para que el orden se lea solo, pero los
tres a la vista: un asistente de tres pantallas añade dos clics a la operación
más repetida del día y esconde lo que ya se llevaba escrito.

### El sistema elige los lotes, no la persona

Por FEFO: primero el que vence antes. Dejar elegir el lote a mano garantiza que
se despache siempre del primero de la lista y que el resto venza en el estante
— el error que este módulo entero existe para evitar.

El comprobante dice **después** de qué lote salió cada cosa, que es lo que hay
que anotar si alguien pregunta.

### No se envía dos veces

Una entrega repetida descuenta el inventario dos veces por medicamento que salió
una sola, y no hay forma de notarlo hasta que el conteo del estante no cuadre.

- El botón se desactiva mientras la petición está en curso y pasa a decir
  "Registrando…".
- Al responder, la pantalla cambia al comprobante: no queda un botón activo
  sobre una entrega ya registrada.
- El cliente de API **no reintenta**: renueva el token *antes* de enviar, nunca
  tras un 401, precisamente por este `POST`. Esa regla no se toca.

### Es todo o nada, y se avisa antes

Si un solo medicamento no alcanza, el servidor no entrega ninguno: una entrega a
medias deja al paciente con parte del tratamiento y descuenta inventario por
algo que no resolvió la receta.

La pantalla intenta que eso no llegue a pasar. Al añadir un medicamento
comprueba la existencia y no deja agregar más de lo que hay. Si aun así el
servidor lo rechaza —porque otra persona despachó entretanto— muestra la lista
exacta de lo que faltó, **conserva la receta escrita** para corregirla, y deja
claro que el inventario no cambió.

### La existencia que se comprueba NO es la del catálogo

El campo `existencia` del catálogo suma todos los lotes en estado `DISPONIBLE`,
**incluidos los vencidos**, y la selección FEFO nunca toma de un lote vencido.
Un medicamento con 45 tabletas vencidas figura en el catálogo con existencia 45
y no se puede entregar ni una.

Por eso, al elegir un medicamento, la pantalla pide su detalle y suma solo los
lotes vigentes. Es una consulta más por medicamento añadido —una receta son uno
o dos, rara vez cinco— a cambio de no prometer existencia que no se puede
despachar.

**El backend no se cambió.** Que el catálogo muestre la existencia total es
defendible: esas unidades están en el estante y hay que darlas de baja. Pero
son dos números distintos y hoy solo hay nombre para uno.

### El historial no dice a quién

El servicio de medicamentos guarda el id del paciente y su comunidad, no sus
datos personales. Resolver cien nombres contra el servicio de usuarios para
pintar una tabla sería exponer identidad de pacientes en una pantalla que
responde *qué salió del inventario*, no *a quién*. Para ver lo de una persona
concreta se entra por su expediente.

Cada fila es **una** entrega aunque lleve varios medicamentos: contarlas por
medicamento inflaría el indicador de atenciones de farmacia que el CAP reporta
al MSPAS.

### La búsqueda del paciente es la de Recepción, entera

Mismo componente de interpretación: una sola caja que decide sola si lo escrito
es un DPI o un apellido. Es el mismo gesto —la persona está enfrente y trae lo
que trae— y mantener dos búsquedas de pacientes distintas en el sistema
garantizaría que una se quedara atrás. Tampoco muestra el DPI en la lista: el
mostrador de farmacia también tiene gente alrededor.

---

### La fecha de vencimiento no se convierte a `Date`

Guatemala es UTC-6. `new Date('2027-08-31')` se interpreta como medianoche UTC,
que en Purulhá es todavía el 30 de agosto: **un lote parecería vencer un día
antes de lo impreso en la caja**. Se parte la cadena `aaaa-mm-dd` y se arma la
fecha en hora local, y al ingresar un lote se manda tal cual llega del campo.

---

## Permisos

Copiados de los `@Roles` de cada controlador, no inventados en la pantalla. El
control real sigue estando en el guard del backend; esto solo decide qué se
dibuja, para no ofrecer botones que el servidor va a negar con un 403.

| | Admin | Director | Médico | Enfermería | Farmacia | Recepción |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Ver el catálogo y las existencias | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Ver por vencer / vencidos | ✓ | ✓ | — | — | ✓ | — |
| Ver bajo mínimo | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Dar de alta y editar medicamentos | ✓ | — | — | — | ✓ | — |
| Ingresar lotes, ajustar por conteo y dar de baja | ✓ | — | — | — | ✓ | — |
| Ver el historial de entregas | ✓ | ✓ | ✓ | — | ✓ | — |
| Registrar una entrega | ✓ | — | — | — | ✓ | — |

**El médico consulta existencias** porque si no sabe qué hay, receta lo que no
hay. **No ve las alertas de vencimiento**: el estante no es asunto suyo, y el
controlador guarda esos endpoints para Farmacia, Administrador y Director. La
pantalla ni siquiera las pide cuando el rol no puede verlas; no es que las pida
y esconda la respuesta.

**Recepción no entra a Farmacia en absoluto**, igual que en el backend.

---

## Dos defectos del backend que salieron al construir esto

Los dos estaban en código que **nunca se había usado desde una pantalla**, que
es exactamente donde han aparecido todos los anteriores.

### `PATCH /v1/medicamentos/{id}` aceptaba cualquier campo

El `@Body()` estaba tipado con un objeto suelto de TypeScript en vez de una
clase. Sin clase, el `ValidationPipe` no tiene metatype que inspeccionar, así
que `whitelist` y `forbidNonWhitelisted` **no se aplicaban**, y el objeto
llegaba entero hasta `prisma.medicamento.update({ data })`. Cualquiera con rol
de Farmacia podía reescribir el código, el nombre o la fecha de creación.

Además el contrato OpenAPI salía con `requestBody: never`, así que el panel
—que consume ese contrato tipado— **no tenía forma de llamar al endpoint**. La
pantalla de edición era imposible de construir sin corregirlo primero.

No tenía ninguna prueba. Ahora tiene siete.

### `POST /v1/entregas` era imposible de llamar desde el contrato

El controlador recibía el token con `@Headers('authorization')`. Con eso,
Swagger publica `authorization` como un parámetro de cabecera **obligatorio**
del endpoint, y el cliente tipado del panel exige pasarlo a mano — cuando el
middleware ya lo pone en cada petición. La autenticación ya estaba declarada
con `@ApiBearerAuth()`; volver a publicarla como parámetro no documentaba nada
y hacía imposible llamar al endpoint desde el contrato generado.

El servicio sí necesita el token, porque lo reenvía al de usuarios para validar
el paciente (arquitectura §8.3). Ahora lo lee del `Request`, que no acaba en el
contrato.

**Quedan dos endpoints iguales sin corregir**, en `programas`:
`embarazo.controller.ts:85` e `hipertension.controller.ts:78`. No se tocaron
porque están fuera de este módulo, pero quien construya las pantallas de
Programas (Etapas 6-7) se va a topar con lo mismo. Es el mismo cambio de dos
líneas.

### `PATCH /v1/lotes/{id}/baja` recortaba el motivo en silencio

Mismo patrón: cuerpo sin clase, sin validación. El servicio hacía
`motivo.trim().slice(0, 200)` para no reventar el `VarChar(200)`, con lo que la
baja quedaba justificada **a media frase** — y el motivo es lo único que explica
después por qué faltan esas cajas. Ahora se rechaza con un 400 que dice el
límite.

---

## Archivos creados

| Archivo | Qué es |
|---|---|
| `services/medicamentos/src/catalogo/dto/actualizar-medicamento.dto.ts` | Los tres campos editables, validados |
| `services/medicamentos/src/lotes/dto/dar-de-baja.dto.ts` | El motivo de la baja, obligatorio y acotado |
| `services/medicamentos/src/lotes/dto/ajustar-lote.dto.ts` | El conteo físico y su control optimista |
| `web/src/modulos/farmacia/servicio-farmacia.ts` | Llamadas al servicio y cómo se presenta cada dato |
| `web/src/modulos/farmacia/PaginaFarmacia.tsx` | Las cuatro pestañas y sus contadores |
| `web/src/modulos/farmacia/PanelCatalogo.tsx` | Búsqueda y tabla del catálogo |
| `web/src/modulos/farmacia/PanelAlertas.tsx` | Por vencer, vencidos y bajo mínimo |
| `web/src/modulos/farmacia/PaginaMedicamento.tsx` | Un medicamento y sus lotes |
| `web/src/modulos/farmacia/DialogoMedicamento.tsx` | Alta y edición |
| `web/src/modulos/farmacia/DialogoIngresarLote.tsx` | Ingreso de lote |
| `web/src/modulos/farmacia/DialogoBaja.tsx` | Baja de lote con motivo |
| `web/src/modulos/farmacia/DialogoAjuste.tsx` | Conteo físico con el desvío en palabras |
| `web/src/modulos/farmacia/servicio-entregas.ts` | Llamadas de entrega y existencia entregable |
| `web/src/modulos/farmacia/PaginaEntrega.tsx` | El despacho, en tres bloques |
| `web/src/modulos/farmacia/SelectorPaciente.tsx` | A quién se le entrega |
| `web/src/modulos/farmacia/SelectorMedicamentos.tsx` | Qué se le entrega |
| `web/src/modulos/farmacia/PanelEntregas.tsx` | Historial de entregas |
| `web/src/modulos/farmacia/entregas.spec.tsx` | 24 pruebas de pantalla |
| `web/src/modulos/farmacia/farmacia.spec.tsx` | 45 pruebas de pantalla |

## Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `services/medicamentos/src/catalogo/catalogo.controller.ts` | El `PATCH` usa el DTO |
| `services/medicamentos/src/catalogo/catalogo.service.ts` | `data` armado campo por campo |
| `services/medicamentos/src/lotes/lotes.controller.ts` | La baja usa el DTO |
| `services/medicamentos/src/lotes/lotes.service.ts` | Sin recorte silencioso del motivo, y el ajuste |
| `services/medicamentos/src/eventos/outbox.service.ts` | Evento `lote.ajustado` |
| `services/medicamentos/src/entregas/entregas.controller.ts` | El token sale del contrato |
| `web/vitest.setup.ts` | `scrollIntoView` y el límite de los `findBy*` |
| `services/medicamentos/test/medicamentos.e2e-spec.ts` | +9 pruebas |
| `docs/openapi/medicamentos.yaml` | Regenerado: los dos `PATCH` ya publican cuerpo |
| `web/src/api/generado/medicamentos.ts` | Regenerado |
| `web/src/App.tsx` | Rutas `/farmacia` y `/farmacia/:medicamentoId` |
| `web/src/navegacion/menu.ts` | Farmacia deja de estar pendiente |
| `web/src/componentes/Layout.spec.tsx` | La prueba de navegación usa un módulo que sigue pendiente |

---

## Estados cubiertos

- Catálogo vacío, búsqueda sin resultados, medicamento inexistente (404).
- Medicamento sin lotes, medicamento desactivado (no admite lotes nuevos).
- Sin lotes por vencer, sin lotes vencidos, nada bajo mínimo — los tres lo dicen
  con un mensaje, en vez de mostrar una tabla vacía.
- Mínimo en cero: se muestra como sin alerta, no como cero.
- Conteo que cuadra con el sistema, y conteo que choca con una entrega
  simultánea (409): los dos se explican y ninguno ajusta nada.
- Entrega sin paciente, sin medicamentos, con más cantidad de la disponible, con
  toda la existencia vencida, y rechazada por el servidor: en todos los casos la
  receta escrita se conserva.
- Error de red o del servidor en cualquiera de las consultas.

## Accesibilidad y captura por teclado

- `Ctrl+K` lleva el foco al campo de búsqueda del catálogo, igual que en
  Recepción y Expedientes.
- Los diálogos se envían con Enter desde cualquier campo; todos son `<form>`.
- Ningún `autoFocus` en pantallas largas: arrastraría la página a media hoja.

---

## Verificaciones realizadas

```
npm test -w @cap/medicamentos          36 unitarias
npm run test:e2e -w @cap/medicamentos  56 e2e (antes 35)
npx vitest run src/modulos/farmacia    69 de pantalla  (desde web/, no desde la raiz)
tsc --noEmit                           limpio en medicamentos y en web
```

La suite del panel se corrió **tres veces seguidas** tras añadir el módulo:
256 verdes y salida 0 en las tres. Hacía falta porque los archivos nuevos
empujaron la carga en paralelo lo suficiente para que `ficha.spec` empezara a
fallar de forma consistente (ver más abajo).

**No se verificó visualmente**: no hay navegador en este entorno.

---

## Información pendiente

Preguntas reales para el CAP. No están respondidas.

1. **El catálogo nace vacío.** ¿De dónde sale la lista inicial: el listado
   básico del MSPAS, un inventario propio del CAP, un archivo que ya tienen? Sin
   eso, la primera persona que entre a Farmacia tiene que teclear cientos de
   medicamentos.
2. **¿Noventa días es la ventana de alerta correcta?** Es el valor por defecto
   de `DIAS_ALERTA_VENCIMIENTO`, elegido para dar margen a devolver el lote al
   proveedor o redistribuirlo. Nadie del CAP lo ha confirmado.
3. **¿Quién puede dar de baja un lote?** Hoy cualquiera con rol de Farmacia, sin
   segunda firma. Si el CAP exige acta o visto bueno del director, el sistema
   todavía no lo refleja.
4. **¿Qué se hace físicamente con un lote vencido?** ¿Se destruye en el CAP, se
   devuelve al almacén departamental, hace falta un acta? De la respuesta
   depende si la baja necesita más campos que el motivo.
5. **El ajuste por conteo físico ya existe, pero no está decidido quién lo
   autoriza.** Hoy lo hace cualquiera con rol de Farmacia, sin segunda firma y
   sin acta. Si el CAP exige que un conteo lo respalde alguien más, el sistema
   todavía no lo refleja. Queda además `DEVOLUCION` en el enum `TipoMovimiento`
   sin ningún endpoint que lo produzca: hay que preguntar si el CAP devuelve
   medicamento al almacén departamental, y si eso debe salir del inventario como
   devolución y no como baja.
6. **¿La existencia mínima la fija el CAP o viene del MSPAS?** Hoy la escribe
   quien da de alta el medicamento, sin ninguna referencia.
7. **¿Se entrega con receta o sin ella?** El catálogo marca qué medicamentos
   requieren receta y la pantalla lo dice al añadirlos, pero **no la exige ni la
   registra**: no hay campo para el número de receta ni para quién la firmó.
8. **¿Se le puede entregar a alguien que no es el paciente?** Hoy sí, sin
   distinguirlo: la entrega queda a nombre del paciente y quien recoge solo
   puede anotarse en observaciones, en texto libre. Si eso importa, hace falta
   un campo propio.
9. **¿Qué se hace cuando no hay existencia suficiente?** Hoy la entrega se
   rechaza entera y no queda constancia de que el paciente vino y se fue sin su
   tratamiento. Un CAP con abastecimiento irregular probablemente necesite ese
   dato — es justo lo que explica por qué un tratamiento no se completó.

---

## Lo que salió del entorno de pruebas

Dos correcciones en `web/vitest.setup.ts` que no son de Farmacia pero salieron
construyéndola:

**jsdom no implementa `scrollIntoView`.** El panel terminaba con código 1 aunque
todas las pruebas pasaran: la llamada ocurre dentro del manejador de un clic, y
React la reporta como excepción no capturada en vez de hacer fallar la prueba.
En CI eso es rojo sin un solo test fallado. Venía de `1c3d301`.

**El límite de los `findBy*` es independiente del de vitest.** `testTimeout`
está en 20 s desde que se construyó la ficha clínica, por lo lento que jsdom la
dibuja — pero los `findBy*` tienen su propio límite de un segundo y no lo
heredan. Al añadir los dos archivos del módulo de farmacia, la competencia por
la CPU bastó para cruzarlo y `ficha.spec` empezó a fallar **de forma
consistente**, no intermitente. Subido a 5 s, que es la pieza que le faltaba a
esa misma decisión.

## Próximo paso recomendado

El módulo de Farmacia está completo. Lo que falta no es código sino
**respuestas**: las nueve preguntas de arriba, y sobre todo de dónde sale el
catálogo inicial. Hoy nace vacío, y sin medicamentos sembrados el módulo entero
no sirve de nada por muy construido que esté.

Del resto del sistema, lo que más desbloquea es **Administración**: mientras no
exista, crear una cuenta o restablecer una contraseña exige correr un comando en
la terminal, y el CAP no va a hacer eso.
