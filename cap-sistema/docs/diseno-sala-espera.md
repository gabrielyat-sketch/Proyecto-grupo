# Diseño: sala de espera

Quién está **ahora** en el CAP esperando ser atendido.

---

## De dónde salió

No estaba en los requisitos. Salió de usar el sistema: al revisar el modo de
digitalización, desde el rol de enfermería, Recepción y Digitalización parecían
hacer lo mismo, y la pregunta destapó que faltaba una pieza.

Un paciente registrado hoy **sin** marcar "viene de expediente en papel" nace en
estado `COMPLETO` — no hay nada que transcribir — así que **nunca aparece en la
cola de digitalización**. No era que se perdiera entre muchos: no estaba. La
enfermera tenía que buscarlo por nombre, y eso solo funciona si se sabe el
nombre.

## El concepto que faltaba

Se estaban confundiendo dos trabajos que compiten por el mismo día:

| | Sala de espera | Digitalización |
|---|---|---|
| **Qué es** | Gente sentada esperando | Carpetas en un archivero |
| **Cuándo** | Ahora | Cuando haya un rato |
| **Cuántos** | Cinco o diez | Miles |
| **Si no se hace hoy** | Alguien se va sin atención | No pasa nada |

Meterlos en la misma pantalla —o resolverlo con un filtro— haría que lo urgente
se perdiera entre lo que puede esperar meses. Un filtro no lo arregla: lo tapa.

## Lo que el sistema no podía deducir

Un paciente registrado hace tres años y uno que acaba de entrar por la puerta
son **idénticos en la base**. No hay forma de derivar "está aquí": alguien tiene
que decirlo. Por eso hay una tabla nueva y no una consulta ingeniosa.

## El flujo

1. **Recepción** busca al paciente y pulsa **Marcar llegada**. Un botón y un
   motivo opcional de una línea — la persona está parada en la ventanilla.
2. **Enfermería** abre *Sala de espera* y ve a los que llegaron hoy, **en orden
   de llegada**, numerados.
3. Abre la ficha desde ahí. **Al guardarla, la visita se cierra sola.**

## Decisiones

**La visita se cierra sola al guardar la ficha.** Pedirle a la enfermera un paso
más justo cuando ya terminó y va por el siguiente es pedirle que se le olvide, y
una sala de espera con gente ya atendida deja de servir en dos días. El cierre
va **dentro de la misma transacción** que la ficha: si se hiciera después, un
fallo entre las dos dejaría a alguien esperando eternamente a pesar de haber
sido atendido.

**Se puede sacar a alguien sin ficha, con motivo obligatorio.** La gente se
cansa y se va; sin esa salida la enfermera lo llama tres veces y la lista de
mañana arrastra a los de hoy. El motivo se exige porque *"se fue"* no le sirve a
nadie dentro de un mes: lo que importa es si se fue porque tardaron o porque lo
mandaron a otro lado.

**Solo las llegadas de hoy.** Una visita de ayer que nadie cerró no se arrastra.
La sala describe este momento, y una lista que acumula gente de otros días deja
de mirarse a la semana. Es un filtro en la consulta, no una tarea de limpieza
que pueda fallar.

**Sin filtros ni buscador.** Si hay ocho personas esperando, se ven ocho
renglones. Buscar en una lista de ocho es más trabajo que leerla.

**Numeradas.** El turno es lo que la gente cuenta desde la silla.

**El motivo va cifrado.** "Control de embarazo" o "dolor de pecho" son datos de
salud, y esta lista se ve con la sala llena de gente.

**Se refresca sola cada 30 segundos.** Llega gente mientras la enfermera
atiende; sin refresco habría que recordar recargar, y nadie recuerda recargar.

**Una hora de espera se destaca.** Pasada la hora el tiempo se dice en horas y
minutos, no en minutos: "95 minutos" obliga a dividir mentalmente, y quien mira
esta lista lo hace de paso.

## Una sola espera abierta por paciente

Escrito a mano en la migración, porque Prisma no sabe expresar un índice único
**parcial**:

```sql
CREATE UNIQUE INDEX "visita_una_espera_por_paciente"
    ON "visita" ("paciente_id")
    WHERE "estado" = 'ESPERANDO';
```

Sin él, pulsar "marcar llegada" dos veces —o que lo hagan dos personas a la vez,
que en una recepción con fila pasa— dejaría al mismo paciente dos veces en la
sala, y la enfermera lo llamaría dos veces. Es parcial a propósito: las visitas
ya cerradas se repiten cuantas veces haga falta, porque un paciente vuelve al
CAP muchas veces en su vida.

El servicio también lo comprueba antes, para poder responder algo útil —"ese
paciente ya está en la sala de espera", con el identificador de la visita— en
vez de un error de restricción.

## La visita que nadie cerró al terminar el día

**Este índice, junto con el filtro de "solo hoy" del listado, dejaba pacientes
bloqueados para siempre.** Lo encontró Dennis probando el sistema, y es el tipo
de defecto que en el CAP habría pasado a diario.

El CAP cierra a las cinco y la gente se va. Nadie recorre la lista sacando uno
por uno a los que no llegaron a pasar, así que esas visitas se quedaban
`ESPERANDO`. Y ahí los dos criterios dejaban de coincidir:

| | |
|---|---|
| `enEspera()` | filtra `llegadaEn >= inicio de hoy` — **solo las de hoy** |
| `marcarLlegada()` y el índice único | miran si hay **cualquier** visita `ESPERANDO`, sin fecha |

El resultado: la visita de ayer era **invisible** —no salía en la lista, así que
no se podía retirar desde ninguna pantalla— y **bloqueaba al paciente**. Marcar
su llegada respondía "ese paciente ya está en la sala de espera" con el
identificador de una visita que nadie podía ver. Ese paciente no volvía a poder
entrar a la sala de espera **nunca**.

### Cómo se arregló

Un barrido que cierra las rezagadas como `RETIRADA` —que es lo que de verdad
pasó: se fueron sin que los atendieran— con un motivo que las distingue de un
retiro anotado a mano:

> *Cerrada por el sistema: quedó abierta al terminar el día.*

Se dispara en dos sitios, y los dos hacen falta:

- **Al marcar una llegada**, acotado a ese paciente. Sin esto, la comprobación
  de duplicado seguiría rechazándolo por una visita que nadie puede ver.
- **Al consultar la sala**, sobre todas. Es la pantalla que se abre cada mañana,
  así que no hace falta un proceso nocturno para algo que se resuelve al primer
  vistazo del día.

No se optó por mostrar las visitas viejas en la lista: la sala de espera
describe **este momento**, y una lista que acumula gente de otros días deja de
mirarse a la semana. Esa decisión sigue en pie; lo que faltaba era cerrar lo que
quedaba fuera de ella.

### Por qué las pruebas no lo vieron

Había una prueba llamada *"una llegada de AYER no aparece hoy"*, y pasaba. Pero
creaba la visita vieja ya cerrada, con estado `ATENDIDA`: comprobaba que las
**cerradas** no se arrastran, no que las **abiertas** bloquean. El caso que
importaba nunca se ejercitó. Ahora hay cuatro pruebas que lo cubren, incluidas
las dos que impiden que el barrido se pase de listo: no toca a quien llegó hoy
ni reescribe las que ya estaban cerradas.

### Y una trampa de fechas de propina

El filtro usaba `new Date(); setHours(0,0,0,0)`, que toma la zona horaria **del
proceso**. En la máquina de un desarrollador eso es Guatemala y funciona; en el
contenedor de producción es UTC, y la frontera del día se corría seis horas —
todo lo registrado entre las 18:00 y la medianoche caería en el día siguiente.
Habría funcionado en las pruebas y fallado desplegado.

Ahora usa `inicioDelDiaLocal()` de `@cap/shared`, que es el complemento de
`fechaDelDia`: una devuelve la medianoche **UTC** del día local, para comparar
días entre sí; la otra la medianoche **local** como instante, que es lo único
comparable contra una columna de marca de tiempo.

## Endpoints

```
POST  /v1/visitas             marca que un paciente llegó
GET   /v1/visitas/espera      quiénes esperan ahora
PATCH /v1/visitas/:id/retiro  se fue sin atención (motivo obligatorio)
```

## Permisos

| | Ver la sala | Marcar llegada | Sacar sin ficha | Atender |
|---|---|---|---|---|
| Administrador | sí | sí | sí | no |
| Director | sí | no | no | no |
| Recepción | sí | **sí** | sí | no |
| Enfermería | sí | no | sí | **sí** |
| Médico | sí | no | no | sí |
| Farmacia | no | no | no | no |

Marcar la llegada es de quien está en la ventanilla y ve entrar a la gente.
Farmacia no entra: la sala dice quién vino al médico y a qué, y eso es
información clínica aunque no lo parezca.

## Archivos creados

| Archivo | Qué es |
|---|---|
| `services/usuarios/prisma/migrations/20260827180000_sala_de_espera/` | Tabla, enum e índice parcial |
| `services/usuarios/src/visitas/visitas.service.ts` | Llegada, sala y retiro |
| `services/usuarios/src/visitas/visitas.controller.ts` | Los tres endpoints |
| `services/usuarios/src/visitas/dto/visitas.dto.ts` | Entradas y respuestas |
| `services/usuarios/test/visitas.e2e-spec.ts` | 16 pruebas e2e |
| `web/src/modulos/espera/servicio-espera.ts` | Acceso a la API y el tiempo en palabras |
| `web/src/modulos/espera/PaginaSalaEspera.tsx` | La pantalla |
| `web/src/modulos/espera/espera.spec.tsx` | 12 pruebas de pantalla |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/usuarios/prisma/schema.prisma` | Modelo `Visita` y enum `EstadoVisita` |
| `services/usuarios/src/fichas/fichas.service.ts` | Cierra la visita al guardar la ficha |
| `services/usuarios/src/app.module.ts` | Registra el módulo |
| `web/src/App.tsx`, `web/src/navegacion/menu.ts` | Ruta y entrada de menú |
| `web/src/modulos/recepcion/PaginaRecepcion.tsx` | Diálogo de llegada |
| `web/src/modulos/recepcion/TablaPacientes.tsx` | Botón "Marcar llegada" |

## Estados cubiertos

| Estado | Qué se ve |
|---|---|
| Carga | Indicador centrado |
| Vacío | "No hay nadie esperando", explicando de dónde sale la lista |
| Error | `AvisoError` con el mensaje del servidor |
| Espera larga | Borde y distintivo en ámbar pasada la hora |
| Duplicado | 409 con el mensaje de que ya está en la sala |
| Guardando | Botón deshabilitado |
| Sin permiso | La guarda por rol devuelve al inicio |

## Accesibilidad

- Las filas son focalizables y se recorren con flechas; **Enter** atiende.
- **Ctrl+J** lleva el foco a la lista, igual que en digitalización.
- El número de turno va `aria-hidden`: es una ayuda visual, y un lector de
  pantalla ya anuncia la posición en la lista.
- La espera larga se marca con borde **y** texto, no solo con color.

## Verificaciones realizadas

- `tsc --noEmit` limpio en `usuarios` y en `web`.
- 28 pruebas nuevas: 16 e2e + 12 de pantalla.
- La migración se aplicó y se verificó el índice parcial en PostgreSQL.
- **No se verificó visualmente**: no hay navegador en este entorno.

## Información pendiente

1. **¿Se cierra la sala al final del día?** Hoy las visitas de ayer
   simplemente no salen en la lista de hoy, pero quedan `ESPERANDO` en la base.
   Para un reporte de "cuántos se fueron sin atención" habría que cerrarlas de
   noche con un estado propio.
2. **¿Hace falta prioridad?** Hoy es estricto orden de llegada. Si el CAP
   atiende antes a una embarazada con sangrado, el orden puro no lo refleja.
3. **¿Quién más debería poder marcar la llegada?** Hoy solo Recepción y
   Administración. Si en la práctica la enfermera también recibe pacientes,
   habría que ampliarlo.

## Próximo paso recomendado

Con dos sesiones abiertas: entrar como `rlopez` (recepción), buscar un paciente
y marcar su llegada; entrar como `mcaal` (enfermería) y ver que aparece en la
sala. Atenderlo y comprobar que desaparece solo al guardar la ficha.
