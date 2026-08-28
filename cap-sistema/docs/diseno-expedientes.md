# Diseño: consulta del expediente

Ver lo que ya se capturó de un paciente: su expediente y su historial de
atenciones.

---

## De dónde salió

Era el hueco más raro que quedaba. El sistema podía capturar fichas clínicas de
doscientos campos y transcribir el archivo de papel entero, pero **no había
forma de volver a ver nada de eso**. Se guardaba y desaparecía.

Para el CAP esa es la primera pregunta de cada consulta: *"¿qué le pusimos la
vez pasada?"*. Y es también lo que le da sentido a la digitalización — transcribir
miles de carpetas no sirve de nada si nadie puede leerlas después.

## Dos pantallas, dos preguntas distintas

| Pantalla | La pregunta | Quién |
|---|---|---|
| `/expedientes` | "Tengo esta carpeta, ¿de quién es?" | Los seis roles |
| `/pacientes/:id/expediente` | "¿Qué le pusimos la vez pasada?" | Los seis entran; el historial solo lo ven los clínicos |

## Decisiones

**La búsqueda por número es exacta y no puede ser otra cosa.** El número vive
cifrado y se resuelve por su índice ciego, igual que el DPI: no hay manera de
buscar "los que empiezan por 2026" sin descifrar los cien mil para comparar.
Por eso tampoco busca mientras se escribe — un número a medias nunca va a
encontrar nada, y consultar en cada tecla solo produciría una pantalla que dice
"no existe" mientras uno teclea. Se pulsa Enter cuando el número está completo.

**Los signos vitales van siempre a la vista**, no escondidos tras un desplegable.
Un expediente de papel se hojea y los números se leen de corrido: así es como se
ve que la presión viene subiendo tres controles seguidos. Guardarlos detrás de un
clic obligaría a abrir diez atenciones para notar lo que en el papel salta a la
vista.

**La ficha completa sí se despliega, y se pide al abrirla.** Son decenas de
renglones y solo se miran cuando interesa esa consulta en concreto. Cargarlas
todas por si acaso serían decenas de peticiones para mirar una.

**La ficha muestra solo lo que se marcó.** Los signos de peligro ausentes y los
problemas no marcados no aparecen: en el papel están impresos pero sin subrayar,
y reproducir el catálogo entero enterraría lo que sí pasó.

**El IMC se calcula al mostrarlo**, igual que en la ficha. Si viniera de la base
podría estar desfasado del peso del que dice venir.

**El número de expediente es el enlace.** En la tabla de Recepción, el número
lleva al expediente. Es donde la mano va a buscarlo: quien quiere ver el
historial de alguien mira su número, no una columna de botones al final de la
fila.

**Lo más reciente primero.** Es lo que casi siempre se busca. Quien necesita el
historial completo baja; quien solo quiere saber cómo quedó la última consulta
lo tiene en la primera pantalla.

## El hueco que había en la API

`GET /v1/expedientes/:id/atenciones` no decía **cuáles atenciones son fichas**.
Sin ese dato el historial no podía distinguir una ficha oficial —con sus
problemas, signos y medicamentos detrás— de una atención breve, ni ofrecer
abrirla: todas se verían igual y media consulta quedaría escondida.

Se añadió `tipoFicha` a `AtencionDto`. Es `null` en las atenciones breves.

## Permisos

| | Buscar por número | Ver el paciente | Ver el historial | Nueva ficha |
|---|---|---|---|---|
| Administrador | sí | sí | sí | no |
| Director | sí | sí | sí | no |
| Médico | sí | sí | sí | **sí** |
| Enfermería | sí | sí | sí | **sí** |
| Recepción | sí | sí | **no** | no |
| Farmacia | sí | sí | **no** | no |

Recepción y Farmacia pueden encontrar al paciente y ver su número de expediente,
pero no sus diagnósticos. Es minimización de datos, no desconfianza: menos gente
con acceso a un diagnóstico es menos superficie de fuga, y el Código de Salud
limita el expediente clínico al personal con rol clínico autorizado.

La pantalla ni siquiera pide el historial cuando el rol no puede verlo — no es
que lo pida y esconda la respuesta.

## Archivos creados

| Archivo | Qué es |
|---|---|
| `web/src/modulos/expedientes/servicio-expedientes.ts` | Acceso a la API, presión e IMC |
| `web/src/modulos/expedientes/PaginaExpedientes.tsx` | Búsqueda por número |
| `web/src/modulos/expedientes/PaginaExpediente.tsx` | El expediente y su historial |
| `web/src/modulos/expedientes/EntradaHistorial.tsx` | Una atención, con la ficha desplegable |
| `web/src/modulos/expedientes/expedientes.spec.tsx` | 16 pruebas de pantalla |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/usuarios/src/atenciones/dto/respuestas.dto.ts` | `tipoFicha` en el historial |
| `services/usuarios/src/atenciones/atenciones.service.ts` | Lo devuelve |
| `services/usuarios/test/fichas.e2e-spec.ts` | Prueba de que distingue ficha de atención breve |
| `web/src/App.tsx`, `web/src/navegacion/menu.ts` | Rutas; Expedientes deja de estar pendiente |
| `web/src/modulos/recepcion/TablaPacientes.tsx` | El número enlaza al expediente |

## Estados cubiertos

| Estado | Qué se ve |
|---|---|
| Carga | Indicador; al paginar, las entradas anteriores se atenúan |
| Sin buscar | "Si no tiene el número a mano, busque al paciente en Recepción" |
| No existe | Lo dice y explica que la búsqueda es exacta |
| Sin atenciones | "Este expediente todavía no tiene ninguna atención registrada" |
| Sin expediente | Aviso: no hay historial que mostrar |
| Rol sin acceso | Explica que el historial no es para su rol, y por qué |
| Fallecido | Distintivo, y no se ofrece ficha nueva |
| Error | `AvisoError` con el mensaje del servidor |

## Accesibilidad

- Cada atención es un `<article>` con su fecha como encabezado.
- El botón de desplegar la ficha lleva `aria-expanded`.
- Los números usan `tabular-nums` para que las columnas se lean verticalmente
  al hojear — que es todo el punto de mostrarlos a la vista.

## Verificaciones realizadas

- `tsc --noEmit` limpio en `usuarios` y en `web`.
- 17 pruebas nuevas: 16 de pantalla + 1 e2e.
- **No se verificó visualmente**: no hay navegador en este entorno.

## Información pendiente

1. **¿Hace falta ver la evolución en una gráfica?** Hoy los signos vitales se
   leen en columna, que es como en el papel. Una gráfica de peso o presión en el
   tiempo sería útil en pacientes crónicos, pero conviene preguntarlo antes de
   construirla.
2. **Los antecedentes del paciente no se muestran aquí.** Están en la ficha, en
   la sección VII. Si el personal espera verlos al abrir el expediente, hay que
   añadir ese bloque.
3. **No hay forma de corregir una atención ya guardada.** Es deliberado —un
   expediente clínico no se edita— pero habrá errores de captura, y hay que
   decidir si se corrigen con una nota nueva o de otra forma.

## Próximo paso recomendado

Entrar como `jperez`, buscar un paciente en Recepción y pulsar su número de
expediente. Debe verse el historial con los signos vitales en columna y, en las
que sean fichas, el botón para abrirlas.
