# Diseño: Farmacia — inventario, lotes y vencimientos

Primera entrega del módulo de Farmacia (Etapa 8). Cubre el catálogo, las
existencias por lote y las tres alertas. **La entrega de medicamentos a
pacientes no está aquí**: es la segunda entrega, y es la parte crítica porque
toca inventario de verdad.

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
| `/farmacia/:id` | "¿De qué lotes se compone esta existencia?" |

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

### La baja de un lote pide un motivo, y lo guarda entero

El sistema **no da de baja nada por su cuenta**, ni siquiera un lote vencido:
destruir medicamento es una decisión con responsable, y la baja queda en el
libro mayor a nombre de quien la hizo. Lo que sí hace el sistema es impedir que
un lote vencido se entregue — la selección FEFO nunca lo toma.

El motivo es obligatorio y tiene el tope de la columna, 200 caracteres, con el
contador a la vista antes de enviar.

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
| Ingresar lotes y dar de baja | ✓ | — | — | — | ✓ | — |

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
| `web/src/modulos/farmacia/servicio-farmacia.ts` | Llamadas al servicio y cómo se presenta cada dato |
| `web/src/modulos/farmacia/PaginaFarmacia.tsx` | Las cuatro pestañas y sus contadores |
| `web/src/modulos/farmacia/PanelCatalogo.tsx` | Búsqueda y tabla del catálogo |
| `web/src/modulos/farmacia/PanelAlertas.tsx` | Por vencer, vencidos y bajo mínimo |
| `web/src/modulos/farmacia/PaginaMedicamento.tsx` | Un medicamento y sus lotes |
| `web/src/modulos/farmacia/DialogoMedicamento.tsx` | Alta y edición |
| `web/src/modulos/farmacia/DialogoIngresarLote.tsx` | Ingreso de lote |
| `web/src/modulos/farmacia/DialogoBaja.tsx` | Baja de lote con motivo |
| `web/src/modulos/farmacia/farmacia.spec.tsx` | 34 pruebas de pantalla |

## Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `services/medicamentos/src/catalogo/catalogo.controller.ts` | El `PATCH` usa el DTO |
| `services/medicamentos/src/catalogo/catalogo.service.ts` | `data` armado campo por campo |
| `services/medicamentos/src/lotes/lotes.controller.ts` | La baja usa el DTO |
| `services/medicamentos/src/lotes/lotes.service.ts` | Sin recorte silencioso del motivo |
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
npm run test:e2e -w @cap/medicamentos  44 e2e (antes 35)
npx vitest run src/modulos/farmacia    34 de pantalla
tsc --noEmit                           limpio en medicamentos y en web
```

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
5. **No hay ajuste de inventario por conteo físico.** El enum
   `TipoMovimiento` tiene `AJUSTE` y `DEVOLUCION`, pero **ningún endpoint los
   produce**: solo existen `INGRESO`, `ENTREGA` y `BAJA`. Cuando el conteo del
   estante no cuadre con el sistema —y va a pasar— hoy la única salida es dar de
   baja el lote entero, que registra un motivo falso. Hay que decidir si se
   construye el ajuste y quién lo autoriza.
6. **¿La existencia mínima la fija el CAP o viene del MSPAS?** Hoy la escribe
   quien da de alta el medicamento, sin ninguna referencia.

---

## Próximo paso recomendado

**La segunda entrega: `POST /v1/entregas`.** Es la pantalla crítica del módulo:
toca inventario de verdad, no puede registrar dos veces, y un error deja el
stock mal contado.

Antes de construirla hay que preguntar al CAP si se entrega con receta o sin
ella, si se puede entregar a alguien que no es el paciente, y qué pasa cuando no
hay existencia suficiente.

Y **no romper la regla del cliente de API**: renueva el token *antes* de enviar
y nunca reintenta tras un 401, precisamente para que un `POST /v1/entregas` no
se registre dos veces.
