# Diseño: modo de digitalización (RF-08)

Pantalla y endpoints para transcribir al sistema el archivo de expedientes en
papel del CAP. Cierra la Etapa 5.

---

## Contexto y usuarios

No es un módulo más. Existe para un riesgo concreto del proyecto:

> **R-6 — La digitalización de expedientes nunca se completa.** Impacto alto.
> Mitigación: modo de captura optimizado por teclado (§7.2) + plan por etapas +
> **panel de avance**.

Son miles de carpetas. El trabajo dura meses, lo hace el propio personal del CAP
y compite con atender pacientes. Nadie lo termina por disciplina: se termina si
se ve avanzar.

**El flujo real del CAP**, confirmado con el equipo:

1. Recepción/Administración captura los **datos personales** del paciente y abre
   su expediente, marcando que viene de papel.
2. Le pasa la carpeta a **enfermería**, que llena **todos los campos de cada
   ficha**.

Eso decide quién ve qué, y es lo que había que aclarar antes de construir: el
backend dejaba ver la digitalización a Administrador, Director y Recepción,
pero registrar una ficha clínica es de Médico y Enfermería. Si enfermería no
viera la cola, dependería de que alguien le dijera de palabra qué carpeta sigue.

## Requisitos confirmados

- RF-08, Etapa 5. Mitigación de R-6.
- Captura por teclado sin depender del ratón (§7.2).
- Recepción y Farmacia no entran al historial clínico.
- Ningún listado sin paginar; < 2 s con el volumen de diseño (§9.7).

## Supuestos

- **El archivo se recorre por comunidad.** Es la unidad en que está organizado y
  la única meta alcanzable: "terminar Chilasco" se puede hacer en unos días,
  "transcribir 100,000 expedientes" no se puede imaginar.
- **El orden dentro de una comunidad es por apellido**, que es como están las
  carpetas en el cajón. Buscarlas en otro orden obligaría a recorrerlo entero
  por cada expediente.
- **Enfermería cierra la carpeta.** Es quien la termina; obligarla a avisarle a
  recepción para marcarla completa es el paso extra que hace que el tablero deje
  de reflejar la realidad a los dos días.

## La pantalla, en tres preguntas

El orden de arriba abajo es el orden en que se piensa al sentarse a trabajar:

1. **¿Cuánto llevamos?** — el porcentaje del archivo, en grande, con la barra de
   tramos. Es la razón de volver mañana.
2. **¿Por dónde voy?** — las comunidades, cada una con su barra y su cuenta.
3. **¿Qué carpeta sigue?** — la cola, que se recorre con flechas y se abre con
   Enter.

Un tablero que solo dijera *"faltan 94,000"* sería exacto y no serviría para
nada.

## Captura por teclado

- **Flechas** arriba/abajo recorren la cola; **Enter** abre la carpeta. Quien
  transcribe tiene una mano en el papel y la otra en el teclado.
- **Ctrl+J** lleva el foco a la lista desde cualquier parte de la pantalla.
- La ficha abierta desde la cola **nace marcada** como venida de papel. Pedirle
  a alguien que marque la misma casilla en decenas de carpetas seguidas es
  pedirle que se le olvide, y una ficha transcrita sin marcar no cuenta en el
  avance.
- Al guardar, el botón principal es **"Siguiente hoja de esta carpeta"**: un
  expediente de papel trae varias consultas, y transcribirlas de una sentada sin
  volver a buscar al paciente es lo que hace avanzar el trabajo.

## Endpoints creados

```
GET /v1/digitalizacion/comunidades   avance comunidad por comunidad
GET /v1/digitalizacion/cola          expedientes por transcribir, paginados
```

Ya existían `GET /v1/digitalizacion/resumen` y
`PATCH /v1/digitalizacion/:expedienteId`.

El avance por comunidad va en **SQL directo**: Prisma no agrupa a través de
relaciones, y la alternativa —traer los expedientes para contarlos en memoria—
serían 100,000 filas para calcular una tabla de veinte renglones.

## Permisos

| | Ver avance y cola | Marcar carpeta | Transcribir ficha |
|---|---|---|---|
| Administrador | sí | sí | no |
| Director | sí | no | no |
| Recepción | sí | sí | no |
| **Enfermería** | sí | sí | **sí** |
| Médico | sí | no | sí |
| Farmacia | no | no | no |

Los del menú son los mismos del controlador. Mostrar una opción que el servidor
va a negar con un 403 es peor que no mostrarla: la persona cree que el sistema
falla.

## Tres defectos encontrados y corregidos

**1. `PATCH /v1/digitalizacion/:id` nunca ha funcionado.** Estaba escrito
`@IsEnum({ PENDIENTE: 1, EN_PROCESO: 1, ... } as never)`, y class-validator
compara contra los **valores** del enum, que ahí eran cuatro unos. Ningún estado
escrito con letras pasaba: el endpoint respondía **400 a todo**. El `as never`
callaba a TypeScript y ninguna prueba lo ejercitaba. Lo encontraron las pruebas
nuevas.

**2. El servicio de fichas no emitía el evento `atencion.registrada`.** El
servicio de atenciones sí lo hace. Sin él, el panel de indicadores (Etapa 10)
nunca habría visto ninguna consulta capturada con la ficha nueva, y nadie lo
habría notado hasta que los indicadores salieran cortos.

**3. El servicio de fichas no incrementaba `atencionesTranscritas`.** Una
jornada entera de transcripción habría dejado el contador en cero. El personal
deja de creer en un panel que no refleja su trabajo — que es exactamente como se
abandona una digitalización.

Los tres eran anteriores a esta pantalla y ninguno daba error visible.

## Archivos creados

| Archivo | Qué es |
|---|---|
| `services/usuarios/src/digitalizacion/dto/consultar-cola.dto.ts` | Filtros de la cola |
| `web/src/modulos/digitalizacion/servicio-digitalizacion.ts` | Acceso a la API |
| `web/src/modulos/digitalizacion/PaginaDigitalizacion.tsx` | La pantalla |
| `web/src/modulos/digitalizacion/BarraAvance.tsx` | La barra de tramos y la cifra grande |
| `web/src/modulos/digitalizacion/ListaComunidades.tsx` | El archivo, comunidad por comunidad |
| `web/src/modulos/digitalizacion/ColaTrabajo.tsx` | La cola, con teclado |
| `web/src/modulos/digitalizacion/DialogoEstado.tsx` | Cambiar el estado de una carpeta |
| `services/usuarios/test/digitalizacion.e2e-spec.ts` | 20 pruebas e2e |
| `web/src/modulos/digitalizacion/digitalizacion.spec.tsx` | 15 pruebas de pantalla |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/usuarios/src/digitalizacion/digitalizacion.service.ts` | `porComunidad()` y `cola()` |
| `services/usuarios/src/digitalizacion/digitalizacion.controller.ts` | Dos endpoints; enum corregido; roles según el flujo del CAP |
| `services/usuarios/src/digitalizacion/dto/respuestas.dto.ts` | `ExpedienteEnColaDto`, `AvanceComunidadDto` |
| `services/usuarios/src/fichas/fichas.service.ts` | Evento al outbox y contador de transcripción |
| `services/usuarios/src/fichas/fichas.controller.ts` | Pasa el `trazaId`, que se ignoraba |
| `web/src/App.tsx` | Ruta `/digitalizacion` |
| `web/src/navegacion/menu.ts` | Deja de estar pendiente; roles del flujo real |
| `web/src/modulos/fichas/PaginaFicha.tsx` | `?digitalizacion=1`: nace marcada, vuelve a la cola, ofrece la hoja siguiente |

## Estados cubiertos

| Estado | Qué se ve |
|---|---|
| Carga | Indicador en el encabezado y en la cola, por separado |
| Vacío | "Esta comunidad ya esta transcrita por completo" |
| Sin expedientes | "Todavia no hay expedientes registrados" |
| Error | `AvisoError` con el mensaje del servidor |
| Guardando estado | Botón deshabilitado, "Guardando…" |
| Sin permiso | La guarda por rol devuelve al inicio |
| Solo lectura | Dirección ve el avance sin botones de acción |

## Responsive

- **`lg`+:** comunidades a la izquierda (280 px) y cola a la derecha.
- **`md` y menores:** una columna; las comunidades arriba, la cola debajo.
- La tabla desborda con scroll propio; la página nunca se desplaza en horizontal.

## Accesibilidad

- La lista de comunidades es un `<nav aria-label="Comunidades">` de botones con
  `aria-current`.
- La barra de avance es `role="img"` con etiqueta legible: "40 de 100
  expedientes transcritos".
- Las filas de la cola son focalizables y navegables con flechas.
- El "no localizado" que exige motivo marca el campo con `error` y explica por
  qué en el texto de ayuda, no solo con color.
- **El rojo no se usa aquí.** Un expediente que no aparece en el archivo es un
  dato del inventario, no una alarma clínica; va en gris.

## Dependencias agregadas

Ninguna.

## Verificaciones realizadas

- `tsc --noEmit` limpio en `usuarios` y en `web`.
- 35 pruebas nuevas: 20 e2e + 15 de pantalla.
- Rendimiento medido contra los 100,003 expedientes reales de la base:
  avance por comunidad **227 ms**, cola filtrada **48 ms**, cola sin filtro
  **20 ms**, paginación profunda (offset 30,000) **140 ms**. El requisito es
  < 2 s.
- **No se verificó visualmente**: no hay navegador en este entorno.

## Información pendiente

1. **¿En qué orden quiere el CAP atacar el archivo?** Hoy las comunidades salen
   alfabéticas. Si prefieren empezar por las más avanzadas o por las distantes,
   es un cambio de una línea.
2. **¿Qué cuenta como "carpeta completa"?** Hoy lo decide quien transcribe.
   Podría exigirse que el número de fichas transcritas coincida con las hojas
   del papel, pero eso obligaría a contarlas antes de empezar.
3. El evento `expediente.digitalizado` existe en el código pero **no está en
   `docs/eventos/esquema-eventos.md` y nadie lo emite**. Queda para la Etapa 10.

## Lo que salió de revisarlo con el equipo

Al probar la pantalla apareció una confusión legítima: desde el rol de
enfermería, **Recepción y Digitalización parecían hacer lo mismo**. Investigarlo
destapó que faltaba una pieza.

Un paciente registrado hoy **sin** marcar "viene de expediente en papel" nace en
estado `COMPLETO` — no hay nada que transcribir — así que **nunca aparece en la
cola de digitalización**. No era que se perdiera entre muchos: no estaba. Lo que
faltaba no era un filtro sino una **sala de espera**, que es un tercer concepto:

| | Sala de espera | Digitalización |
|---|---|---|
| Qué es | Gente sentada esperando | Carpetas en un archivero |
| Cuándo | Ahora | Cuando haya un rato |
| Cuántos | Cinco o diez | Miles |
| Si no se hace hoy | Alguien se va sin atención | No pasa nada |

Está construida en `docs/diseno-sala-espera.md`. Mezclarla con la cola del
archivo habría hecho que lo urgente se perdiera entre lo que puede esperar
meses.

También se corrigió que los **estados de la carpeta no significaban nada**: un
expediente de papel nacía `EN_PROCESO`, con lo que todo lo que faltaba figuraba
como empezado desde el primer minuto y `PENDIENTE` era un estado que el sistema
no producía jamás. Ahora nace `PENDIENTE` y pasa a `EN_PROCESO` solo al
transcribirse la primera hoja.

## Próximo paso recomendado

Entrar como `mcaal` (enfermería), abrir Digitalización, elegir una comunidad y
transcribir una carpeta **sin tocar el ratón**: flechas para bajar, Enter para
abrir, llenar, `Ctrl+Enter` para guardar, "Siguiente hoja". Ese circuito es RF-08
entero.
