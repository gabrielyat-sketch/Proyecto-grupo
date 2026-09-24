# Diseño: app de la comunidad (cap-movil)

## Contexto y usuarios
Habitantes de Purulhá (Baja Verapaz): personas mayores con presión alta, madres y cuidadores,
embarazadas y adolescentes. Distintos niveles de lectura y de práctica con el celular; señal
intermitente. Se lee en casa, con calma, salvo las alarmas, que se abren con prisa.

## Requisitos confirmados
- Solo informativa, anónima, contenido fijo dentro de la app (24 sep 2026).
- Contenido: documento "CONTENIDOS EDUCATIVOS DE LA APP DEL CAP PURULHÁ" (3 ejes, 3 pruebas).
- Dirección visual elegida por el usuario: **Tejido y hoja**.
- Datos `[LLENAR CAP]` y la cifra `(VERIFICAR DATOS)`: **ocultos** hasta que el CAP los confirme.
- Android 8.0+.

## Supuestos
- El logo oficial es `imagenes/logoficial.jpeg` (se le quitó el fondo gris).
- La tabla de presión del documento dice "Menos de 120 sobre 70"; se dejó tal cual (ver pendientes).
- Correcciones menores de redacción: "después del nacer" → "después de nacer",
  "coma y pecho más seguido" → "comida y pecho más seguido".

## Dirección visual
La base es el verde azulado del logo y del panel del CAP, para que se reconozca como del mismo
centro. Encima, un fondo de papel cálido y un color por eje tomado de los tejidos de la región
(añil, maíz, fucsia). El único elemento audaz es la **franja tejida** de rombos y zigzag en las
portadas; el resto es sobrio. El rojo solo se usa para alarmas, para que siempre signifique
"vaya ya al CAP".

## Tokens de diseño
| Rol | Color | Contraste |
|---|---|---|
| Marca | `#164A55` | 9.8:1 con blanco |
| Fondo (papel) | `#F7F3EC` | — |
| Texto / suave | `#1D2B2F` / `#56666A` | 13.2:1 / 5.4:1 sobre papel |
| Presión alta (añil) | `#2E4A93` sobre `#E7ECF8` | 7.1:1 |
| Niñez (maíz) | `#855400` sobre `#FBEFD4` | 5.6:1 |
| Embarazo (fucsia) | `#9A2A67` sobre `#F8E6EF` | 6.1:1 |
| Alarma | `#B3261E` sobre `#FDECEB` | 5.7:1 (6.5:1 con blanco) |

Tipografía, ambas dentro de la app (licencia OFL, en `assets/fuentes/`):
- **Fraunces** (variable, eje SOFT al máximo) para los titulares: cálida, no clínica.
- **Atkinson Hyperlegible** para el cuerpo, a 17.5 px: hecha para baja visión, distingue 0/O e 1/l/I.

Espaciado en múltiplos de 4 (`Esp`), curvas de 10/14/20 (`Curva`).

## Componentes creados
`FranjaTejida`, `VistaBloques` (párrafo, subtítulo, lista, tabla→tarjetas, aviso en 4 tonos,
señales, cifra, dato del CAP), `Marco` (ancho máximo 640), tarjetas de eje, filas de lección,
opción de prueba en 4 estados.

## Pantallas
Inicio · Eje (portada, "Por qué importa", temas por sección, prueba) · Lección (con "Siguiente
tema") · Señales de alarma (5 grupos por persona) · Prueba (pregunta → explicación → resultado)
· Sobre esta app · No encontrado.

## Estados cubiertos
- Sin conexión: no aplica, todo va dentro de la app.
- Dato del CAP faltante: el bloque no se dibuja.
- Prueba: sin responder / correcta / incorrecta (con la correcta marcada) / resultado final.
- Ruta inexistente (web): pantalla "No encontramos esa página" con vuelta al inicio.
- No hay carga ni error de red, porque no hay red.

## Responsive
Probado a 412×915 (Android común). En tablet el contenido se centra a 640 px. Las tablas del
documento se dibujan como tarjetas apiladas: una tabla de 4 columnas no cabe en 360 px.
La letra respeta el tamaño del sistema hasta 1.6×.

## Accesibilidad
Contraste ≥ 4.5:1 en todo el texto; objetivos táctiles de 48 px o más; un estado nunca va solo en
color (icono + palabra); títulos marcados como encabezados; el resultado de cada pregunta se anuncia
al lector de pantalla; transiciones desactivadas si el sistema pide menos movimiento.

## Dependencias agregadas
Ninguna. Se quitó `cupertino_icons`, que no se usa.

## Verificaciones realizadas
- `flutter analyze`: sin problemas.
- `flutter test`: 9 pruebas (integridad del contenido y recorridos de pantallas), todas pasan.
- Capturas en Chrome sin ventana a 412 px: inicio, ejes, lecciones, alarmas, prueba.
- **No probado todavía en un celular real.**

## Información pendiente (del CAP)
Todo en `lib/datos/datos_cap.dart`: dato local de desnutrición, horario de control de crecimiento,
semanas de la 2.ª y 3.ª atención prenatal, horario de planificación familiar, métodos disponibles,
números de denuncia, dirección del MP/juzgado, persona de contacto, atención para adolescentes,
y verificar las cifras de presión alta. Además:
- "Menos de 120 sobre 70" deja un hueco con la fila siguiente (120/80). ¿Debería decir 120/80?
- "¿Quiénes tienen más riesgo?" solo trae lo que **no** se puede cambiar; falta la lista de lo que sí.
- El documento no trae imágenes.

## Próximo paso recomendado
Probar en el celular por USB (`flutter run`), revisar los textos con el CAP y llenar `datos_cap.dart`.
