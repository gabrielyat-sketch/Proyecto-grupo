# Diseño: pantallas de acceso

## Contexto y usuarios

El acceso es la primera pantalla del panel y la única que ve todo el personal
del CAP sin excepción: recepción, enfermería, médicos, farmacia, dirección y
administración. Se abre al empezar la jornada, muchas veces en una computadora
compartida y a la vista del público que espera, con luz de día entrando a la
sala.

La pantalla ya funcionaba y estaba bien resuelta. Este trabajo no la rediseña:
le añade el fondo y los retoques visuales que pidió la referencia
`imagenes/login.jpeg`, sin tocar el flujo, los textos ni el resto del panel.

## Requisitos confirmados

- Poner un fondo en la pantalla de acceso, en lugar del gris plano.
- Retoques visuales siguiendo `imagenes/login.jpeg`: marca con logo, iconos en
  los campos, tarjeta despegada del fondo, franja de pie con "¿Ayuda?" y el
  lema "Salud Comunitaria para Todos".
- No tocar nada más del diseño de la aplicación.

## Supuestos

- **El fondo es una fotografía de sala de espera**, apaisada y sin marcas de
  agua: `web/public/fondo-acceso.jpg` (1195x896, 89 KB). Antes se probaron dos
  que no servían — un recorte de la propia maqueta, demasiado desenfocado
  porque el original ya lo estaba, y una imagen con la marca de agua del
  servicio que la generó, que no se puede publicar en la pantalla de acceso de
  un centro de salud. Los gradientes se quedan debajo como respaldo mientras
  el JPEG carga.
- **El logo es el oficial**, entregado como JPEG con fondo gris opaco. Se le
  quitó el fondo por distancia de color, se recortó al contenido y se redujo a
  256 px: `web/public/logo-cap.png`. De ahí salen también el icono de la
  pestaña (32 px) y el de iOS (180 px).
- **Los textos se dejaron sin tildes**, como estaban. La referencia los muestra
  con tilde ("Iniciar sesión", "Contraseña"), pero `App.spec.tsx` los busca sin
  ella (`getByLabelText('Contrasena')`); cambiarlos rompería las pruebas y
  excede lo que se pidió.

## Dirección visual

La sala de espera del CAP, desenfocada, con la paleta del panel encima: la
claridad cálida del ventanal, el verde de las plantas, el teal del mobiliario
clínico. Los tintes no son decoración — bajan el contraste de la fotografía
para que la tarjeta blanca se lea sin esfuerzo sobre ella. La tarjeta se
despega con dos sombras y concentra toda la atención.

La marca aparece dos veces y en dos pesos distintos: grande junto al título,
pequeña en el pie junto al lema. Es el único elemento decorativo; el resto de
la pantalla es funcional.

## Tokens de diseño

Se reutilizan los del tema (`web/src/tema.ts`) sin modificarlo. Lo añadido:

| Token | Valor | Rol |
|---|---|---|
| Fotografía | `/fondo-acceso.jpg` (1195x896, 89 KB) | Capa base: la sala de espera |
| Luz cálida | `rgba(255, 206, 148, 0.26)` | Radial superior: el ventanal |
| Teal clínico | `rgba(21, 96, 122, 0.16)` | Radial derecho, derivado de `primary.main` |
| Velo sobre la foto | `rgba(238,243,244,0.24)` → `rgba(221,231,234,0.38)` | Baja el contraste bajo la tarjeta |
| Respaldo del fondo | `#eef3f4` → `#dde7ea` | Lo que se ve si el JPEG no carga |
| Sombra de tarjeta | `0 24px 60px -26px rgba(12,45,58,0.38)` + `0 2px 6px rgba(12,45,58,0.06)` | Despegue y apoyo |
| Borde de tarjeta | `rgba(15, 50, 64, 0.09)` | Contorno sin peso visual |
| Fondo de la franja de pie | `rgba(21, 96, 122, 0.035)` | Separa el pie del formulario |

Tipografía, color primario, radios, espaciado y altura mínima de botones: sin
cambios, salen del tema.

## Componentes creados o modificados

- **`LogoCap`** (nuevo): la marca en SVG. Hereda el color por `currentColor` y
  es `aria-hidden`, porque siempre viaja junto al texto "CAP Purulha".
- **`MarcoAcceso`** (modificado): fondo, tarjeta a sangre con franja de pie,
  encabezado con logo, y el desplegable de ayuda.
- **`PasoCredenciales`** (modificado): iconos de persona y llave en los campos.

## Archivos creados

- `web/src/componentes/LogoCap.tsx`
- `cap-sistema/docs/diseno-acceso.md` (este documento)

## Archivos modificados

- `web/src/componentes/MarcoAcceso.tsx`
- `web/src/modulos/sesion/PasoCredenciales.tsx`

## Estados cubiertos

El marco no introduce estados nuevos: los del formulario ya existían y siguen
funcionando igual.

- **Carga**: el botón pasa a "Entrando..." y se deshabilita (ya existía).
- **Error**: `AvisoError` sobre el formulario, y los campos en rojo con su
  mensaje; se limpian al escribir de nuevo (ya existía).
- **Éxito**: navega al panel; el aviso de la pantalla anterior se muestra como
  `Alert` verde (ya existía).
- **Ayuda cerrada / abierta**: estado nuevo del pie, cerrado por omisión.

## Responsive

- Tarjeta de ancho fijo máximo (460 px) y `width: 100%` por debajo de eso.
- Relleno que se reduce en móvil: `p: 3` en `xs`, `4.5` en `sm` y más.
- La franja de pie usa `flexWrap`, así que en pantallas estrechas el lema baja
  a una segunda línea en vez de desbordarse.
- Fondo con `background-size: cover` y `minHeight: 100dvh`: la foto llena la
  pantalla real del móvil, sin deformarse y sin el salto de la barra de
  direcciones. Centrada, porque es apaisada y en pantallas más anchas `cover`
  la recorta por los lados. Sin `background-attachment: fixed`, que Safari de
  iOS dibuja mal y hace tironear el desplazamiento.

## Accesibilidad

- El logo es `aria-hidden` y `focusable="false"`: la marca ya está en el texto.
- El botón de ayuda declara `aria-expanded` y `aria-controls` apuntando al
  bloque que despliega.
- Los iconos de los campos son adornos decorativos; MUI ya los marca
  `aria-hidden`, y las etiquetas de los campos no cambiaron.
- Se respeta el `*:focus-visible` de 3 px del tema, que era el motivo de que la
  tarjeta no lleve `overflow` recortando el foco de sus hijos.
- El texto del pie usa `text.secondary` sobre blanco y la franja tiene apenas
  un 3.5 % de tinte, para no bajar el contraste.
- No se añadió ninguna animación salvo el desplegable de MUI, que ya respeta
  `prefers-reduced-motion`.

## Dependencias agregadas

Ninguna. Todo sale de `@mui/material` y `@mui/icons-material`, que ya estaban.

## Verificaciones realizadas

- `tsc --noEmit` en `@cap/web`: limpio.
- `npm test -w @cap/web`: 378 de 379 pruebas pasan, incluidas las cuatro de
  `App.spec.tsx` que ejercen esta pantalla. La que falla,
  `ficha.spec.tsx > calcula el indice de masa corporal`, agota los 20 s de
  tiempo límite con la suite completa en paralelo; ejecutada sola pasa 22/22.
  No toca el acceso.
- **Sin verificación visual del resultado**: este entorno no tiene navegador. La
  pantalla montada no se ha visto renderizada.

## Información pendiente

- ¿Existe el logo en vectorial (SVG)? El PNG actual sirve, pero un vectorial
  no perdería nitidez en pantallas de alta densidad.

## Próximo paso recomendado

Verlo en el navegador con `npm run dev -w @cap/web` y ajustar la intensidad de
los tintes si la tarjeta no se despega lo suficiente de la fotografía.
