# Diseño: el sistema visual del panel

Este documento existe para una sola cosa: que quien toque el color del panel
sepa qué está ya comprometido antes de añadir nada. Todo lo de aquí vive en
`web/src/tema.ts` y en `web/src/navegacion/menu.ts`.

Para la pantalla de acceso, ver `diseno-acceso.md`.

---

## 1. El presupuesto de color ya está gastado

Esta es la parte importante. Cada color de la paleta tiene un significado
asignado, y ese es el límite real de lo que se puede añadir:

| color | hex | qué significa |
|---|---|---|
| Azul petróleo | `#15607a` | El armazón del panel: barra superior, cabeceras de tabla, desplegables de filtro, módulo activo |
| Verde azulado | `#136f63` | Los encabezados de página |
| Rojo | `#b3261e` | Error, y el estado "Pendiente" en digitalización |
| Café | `#8a5a00` | El estado "En proceso", restablecer contraseña |
| Verde oscuro | `#1b5e20` | El estado "Completo" |
| Pizarra | `#4a6572` | El estado "No localizado" |

**Un color nuevo que se parezca a alguno de esos deja de leerse como
decoración y empieza a leerse como estado.** Ese es el riesgo, no la estética.

Los tres primeros forman una barrida análoga: 123° el verde de los módulos,
172° el verde azulado, 195° el azul. Van seguidos en la rueda y todos son
oscuros y de saturación parecida (65-71 %), y por eso conviven. **No añadir
nada entre 120° y 200°**: un cuarto tono ahí no se lee como distinto, se lee
como inconsistencia.

Donde sí queda sitio es en los neutros cálidos para superficies, y en **un**
acento cálido —el complementario del azul es un terracota `#a34a1f`— para una
cosa que deba saltar por encima de todo. Hoy no existe esa cosa: las acciones
principales ya son botones azules y lo urgente ya tiene su semáforo. Meterlo
sin trabajo asignado resta en vez de sumar.

---

## 2. Las reglas que hay que conocer antes de tocar código

### La cabecera de tabla está en el tema, no en cada tabla

`MuiTableCell.styleOverrides.head` en `tema.ts`. Son diez tablas repartidas
entre recepción, farmacia, digitalización, administración y el carnet de niñez.
Puesta tabla por tabla, la siguiente que alguien agregue nacería distinta y
habría que acordarse de copiar el estilo.

No es solo decoración: varias de esas tablas se desplazan a lo ancho, y con la
cabecera del mismo color que las filas se pierde de vista qué columna se está
mirando.

### El azul es el armazón; el verde azulado, los encabezados

Empezaron siendo el mismo color y no son lo mismo. Con la banda de título en el
mismo azul que la barra superior, al abrir un módulo las dos se confundían. El
verde azulado las separa sin salirse de la familia.

### Cada módulo tiene su color, y vive en `menu.ts`

El color no dice nada por sí mismo —ninguno significa "farmacia"— y por eso la
etiqueta nunca desaparece. Lo que hace es dar a cada fila una marca fija que se
reconoce sin leer, para quien entra y sale del mismo módulo veinte veces al
día.

| módulo | color |
|---|---|
| Recepción | verde `#1a7a1f` |
| Sala de espera | rojo `#b3261e` |
| Expedientes | mostaza `#9e7700` |
| Digitalización | azul `#1565c0` |
| Programas | morado `#6a1b9a` |
| Farmacia | verde `#1a7a1f` |
| Reportes | verde limón `#558b2f` |
| Auditoría | naranja `#e65100` |
| Administración | café `#6d4c41` |

Está en `menu.ts` y no en las pantallas porque el menú lateral y las tarjetas
de inicio deben pintar el mismo color, y con la definición en dos sitios
acabarían separándose.

El color solo se aplica cuando la fila **no** está activa. La activa se pinta
entera de azul y el icono hereda el blanco.

**Dos avisos sobre esta tabla.** Recepción y Farmacia comparten verde, así que
el color no identifica un módulo de forma única. Y el rojo de Sala de espera es
exactamente el `error.main` del tema: un icono rojo permanente en el menú puede
leerse como "algo va mal ahí". Las dos cosas se decidieron a sabiendas; si al
usarlo estorban, cambiar un hex de `menu.ts` lo resuelve.

### Los desplegables que filtran comparten `MENU_AZUL`

`componentes/menuAzul.ts`. Se reserva para los desplegables que **filtran u
ordenan** el trabajo —comunidad en recepción, rol en administración, estado en
digitalización—, no para los campos de datos de un formulario. Si se pintaran
todos, el color dejaría de significar nada y solo quedaría el ruido.

Ojo con un detalle: sobre el azul entero, el resaltado por omisión de MUI para
la opción elegida es el primario al 8 %, o sea invisible. Por eso `MENU_AZUL`
lo cambia a `primary.dark`.

### Los estados de digitalización son un semáforo, con una excepción

Pendiente en rojo, en proceso en café, completo en verde. **"No localizado" va
en pizarra, deliberadamente fuera del semáforo**: no es una etapa del trabajo
sino un callejón sin salida —la carpeta no apareció en el archivo—, y en rojo o
café quedaría mezclado con lo que sí se puede transcribir hoy.

### El fondo de la aplicación es `#e7edf1`, no un blanco roto

Las tarjetas y las tablas son blancas. Sobre un fondo casi blanco no se
distinguían del papel de la pantalla; con este gris se ve dónde termina cada
superficie.

---

## 3. Accesibilidad

Todo par de color y texto de este sistema pasa el 4.5:1 de la WCAG para texto
normal:

| combinación | contraste |
|---|---|
| Blanco sobre `#15607a` | 7.2:1 |
| Blanco sobre `#136f63` | 6.0:1 |
| Verde `#1a7a1f` sobre blanco | 5.5:1 |

Los iconos de módulo son objetos gráficos, no texto: la exigencia es 3:1 y
todos la superan. El naranja de Auditoría (3.8:1) y el verde limón de Reportes
(4.1:1) son los más bajos, y por eso **no deben usarse para texto**.

Dos reglas que no son de color pero se rompen fácil:

- **El estado nunca va solo en el color.** El indicador de conexión del avatar
  lleva el estado en `aria-label`, y los chips de digitalización llevan su
  etiqueta escrita. Quien no distingue el color tiene que poder saberlo igual.
- **El foco debe verse.** `tema.ts` define un `*:focus-visible` de 3 px, porque
  la digitalización se hace con teclado (§7.2 de la arquitectura). Cuidado con
  poner `overflow: hidden` en contenedores: recorta el anillo de foco de sus
  hijos.

---

## 4. Si vas a añadir un color

Que cumpla las dos condiciones, o no entra:

1. **Luminosidad parecida a `#15607a`** — ni claro ni negro. Es lo que hace que
   la paleta se vea de una pieza, más que el tono.
2. **4.5:1 con el texto que lleve encima**, o 3:1 si es solo un gráfico.

Y antes de eso, la pregunta que importa: **¿qué trabajo hace ese color que no
haga ninguno de los que ya están?** Si no hay respuesta, la paleta no lo
necesita.
