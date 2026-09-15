# Handoff — Plataforma Inteligente CAP Purulhá

Actualizado el 7 de septiembre de 2026. Para quien retome esto: yo mismo en otra
sesión, Dennis, o Ramiro.

---

## 1. El objetivo del proyecto

Un sistema de información en salud para el **Centro de Atención Permanente de
Purulhá, Baja Verapaz**, un centro de salud público rural de Guatemala. Proyecto
de Seminario, equipo de tres personas.

Hoy el CAP trabaja con **expedientes en papel**. El sistema tiene que:

- Guardar pacientes, expedientes y atenciones, con los datos clínicos cifrados.
- Reproducir las **cuatro fichas oficiales del MSPAS** tal como están impresas.
- Permitir transcribir el archivo de papel al sistema (RF-08).
- Llevar programas de seguimiento (hipertensión, embarazo, desnutrición).
- Controlar el inventario de medicamentos.
- Dar al MSPAS las cifras que el CAP le reporta, ya calculadas.
- Dejar traza verificable de quién vio o cambió cada dato clínico (RF-09).

**Tres restricciones que gobiernan todas las decisiones:**

1. **El personal tiene distinto nivel de alfabetización digital** y jornadas
   largas de captura. De ahí la captura por teclado sin depender del ratón
   (arquitectura §7.2).
2. **Los datos clínicos son sensibles.** El texto clínico se cifra con
   AES-256-GCM; DPI y número de expediente se buscan por índice ciego. Recepción
   y Farmacia no entran al historial clínico.
3. **Riesgo R-6: la digitalización nunca se completa.** Es el riesgo central del
   proyecto y explica por qué el modo de digitalización tiene panel de avance.

La arquitectura completa está en `arquitectura-cap-purulha.md`, con 15 etapas y
una matriz de riesgos. **Léela antes de tomar cualquier decisión estructural.**

---

## 2. Estado en que terminó

### Rama y fusiones

```
develop  7cf43d6   ← todo fusionado: no queda ninguna rama de código pendiente
main     0f7e270   ← CUATRO PR por detrás de develop (se quedó en el PR #22)
   └── docs/entrega-ramiro   PR #19 abierto, solo documentación
```

**Desde el 28 de agosto entraron dieciséis PR.** Ninguna rama de código quedó
fuera; las de `feature/*` ya no existen en el remoto. En orden:

| PR | Qué entró |
|---|---|
| #11 | Ficha de menor de 28 días |
| #12, #13, #14 | Ficha de lactancia y niñez: la hoja, el carné y la gráfica de peso para edad |
| **#3** | Servicio de trazabilidad, el de Ramiro. La línea 8 de `bitacora.e2e-spec.ts` se corrigió y se fusionó |
| #15, #16, #20, #21 | La ruta del cliente de Prisma, el segundo factor y sus herramientas |
| #17, #22 | Identidad visual del panel, y el diseño del CAP en la segunda vuelta |
| #18 | Los barrios de Purulhá Centro, confirmados |
| #23 | **La carpeta familiar**: el folder del archivero dentro del sistema |
| #24 | El 404 y los permisos dicen qué pasa; tres arreglos de recepción |
| #25 | Cada ficha cae en la persona correcta |
| #26 | Enfermería también registra pacientes |

**Lo único abierto es el PR #19**, que solo añade `entrega-ramiro.md`. Está
rebasado sobre `7cf43d6` en local, con respaldo en
`respaldo-entrega-ramiro-07sep`, y **falta empujarlo**.

### Pruebas

**665 unitarias, corridas el 7 de septiembre**: 113 `shared` + 13 `auth` + 36
`medicamentos` + 66 `programas` + 12 `usuarios` + 425 `web`. `plantilla` no
tiene pruebas propias, es el molde.

**663 pasaron y 2 fallaron por tiempo agotado**, las dos en
`web/src/modulos/fichas/ficha.spec.tsx`, con la suite entera corriendo. Ese
archivo **solo pasa 24 de 24 en cuarenta segundos**. Es exactamente la
inestabilidad que describe la §4: los `findBy*` tienen su propio límite y con
26 archivos compitiendo por la CPU se pasan de tiempo. No es una regresión, es
una prueba que mide la máquina y no el código.

**Las e2e no se volvieron a correr** en esta actualización: necesitan los
contenedores de Postgres y Redis levantados. El último conteo conocido, del 28
de agosto, era de 288.

Se corren así:

```
cd cap-sistema
for w in shared plantilla auth medicamentos programas usuarios web; do npm test -w @cap/$w; done
for s in auth usuarios programas medicamentos; do npm run test:e2e -w @cap/$s; done
```

### Qué funciona hoy, de punta a punta

| Módulo | Estado |
|---|---|
| Acceso, MFA TOTP, cambio de contraseña obligatorio, cierre por inactividad | Completo |
| Recepción: búsqueda por nombre y DPI, alta de pacientes | Completo |
| **Sala de espera**: marcar llegada, atender, sacar sin ficha, cierre de rezagadas | Completo |
| **Ficha de adultos**: 10 secciones, ~200 campos, matriz de 14 problemas | Completo |
| **Ficha de menor de 28 dias**: 27 signos en tres bloques, parto, consejeria con fechas | Completo |
| **Ficha de lactancia y niñez**: la hoja, el carné y la gráfica de peso para edad | Completo |
| **Elección de ficha por edad**: el botón lleva a la hoja que corresponde | Completo |
| **Cambio de ficha por persona**: el encabezado ofrece a los demás de la carpeta familiar | Completo |
| **Recepción**: barrio/caserío/aldea, migrante, alergias a medicamentos | Completo |
| **Carpeta familiar**: el folder del archivero, con su serie y sus miembros | Completo |
| **Antecedentes** del paciente (sección VII) | Completo |
| **Digitalización** (RF-08): avance por comunidad, cola, transcripción | Completo |
| **Expedientes**: búsqueda por número, historial, ficha desplegable | Completo |
| **Farmacia**: catálogo, lotes, alertas, ingreso, baja, conteo físico y entrega con FEFO | Completo |
| **Administración**: cuentas, roles, restablecer contraseña, reiniciar 2FA | Completo |
| **Permisos y 404**: la pantalla dice por qué no se puede entrar, en vez de callarse | Completo |

### Qué falta (backend construido, sin pantalla)

| Módulo | Endpoints listos | Peso |
|---|---|---|
| **Programas** (Etapas 6-7) | — | Grande: hipertensión, embarazo, desnutrición |
| Auditoría (Etapa 9) | el servicio entero | **Existe y nadie lo usa**: ver abajo |
| Reportes (Etapa 10) | **ninguno** | El servicio no existe |

Falta **una ficha**: la prenatal. Neonato y niñez ya están, y con ellas el molde
de "ficha que no es la de adultos": tabla propia 1-1 con `atencion`, consejería
como catálogo, y componentes compartidos reutilizados.

**El servicio de trazabilidad está construido y nadie le escribe.** El PR #3
entró: `services/trazabilidad` existe en el puerto 3007 con su bitácora
append-only, y `@cap/shared` ya trae el `ClienteAuditoria` que sabe hablarle
—con sus pruebas, incluida la del caso en que trazabilidad responde 500—. Lo que
falta es que alguien lo use: **ningún servicio lo importa**. Cerrar la Etapa 9 ya
no es construir nada, es cablear las acciones que deben dejar traza.

**Ojo: no es tan mecánico como parecía.** Leer el papel de verdad cambió tres
cosas respecto al resumen de `campos-de-fichas.md`. Ver §4.

### El entorno

- **PostgreSQL en el puerto 5433** del anfitrión (no 5432: Dennis tiene otro
  proyecto ocupándolo). Contenedores `cap-postgres` y `cap-redis`.
- Base con **100,003 pacientes sintéticos** para probar el rendimiento.
- Servicios: auth `3001`, usuarios `3002`, programas `3003`, medicamentos `3004`,
  panel `5173`.
- Cuentas de prueba (todas piden cambiar contraseña al entrar):
  `admin` · `jperez` médico · `mcaal` enfermería · `rlopez` recepción ·
  `sgomez` farmacia · `ddirector` director.
  Se crean con `npm run cuenta -w @cap/auth -- <usuario> <rol>`.

---

## 3. Archivos y cambios

### Documentos de diseño — léelos antes de tocar su módulo

| Archivo | Qué explica |
|---|---|
| `arquitectura-cap-purulha.md` | La arquitectura entera, las 15 etapas, los riesgos |
| `cap-sistema/docs/campos-de-fichas.md` | Inventario de las 4 fichas del MSPAS, campo por campo |
| `cap-sistema/docs/diseno-ficha-adulto.md` | La ficha de adultos y sus decisiones |
| `cap-sistema/docs/diseno-digitalizacion.md` | El modo de digitalización (RF-08) |
| `cap-sistema/docs/diseno-sala-espera.md` | La sala de espera |
| `cap-sistema/docs/diseno-expedientes.md` | La consulta del expediente |
| `cap-sistema/docs/diseno-farmacia.md` | El inventario, los lotes, las alertas y la entrega |
| `cap-sistema/docs/diseno-administracion.md` | Las cuentas del personal |
| `cap-sistema/docs/diseno-ficha-neonato.md` | La ficha de menor de 28 días |
| `cap-sistema/docs/diseno-ficha-ninez.md` | La ficha de lactancia y niñez, y su carné |
| `cap-sistema/docs/diseno-acceso.md` | La pantalla de entrada y el segundo factor |
| `cap-sistema/docs/diseno-panel.md` | El armazón del panel: menú, encabezados, color |
| `cap-sistema/docs/base-de-datos-carpeta-familiar.md` | La carpeta familiar y su serie |
| `cap-sistema/docs/servicios-pendientes.md` | Los tres servicios sin construir: reportes, cms, ml |

Cada uno termina con una sección **"Información pendiente"** — preguntas reales
para el CAP que están sin responder. No las inventes.

### Estructura

```
cap-sistema/
  packages/shared/          @cap/shared: cifrado, guards, paginación, OpenAPI
  services/
    _plantilla/             el molde del que salen los demás
    auth/                   3001  cuentas, JWT, MFA
    usuarios/               3002  pacientes, expedientes, fichas, visitas
    programas/              3003  hipertensión, embarazo
    medicamentos/           3004  inventario, lotes, entregas
    trazabilidad/           3007  bitacora append-only (RF-09), fusionado y sin cablear
  web/                      5173  el panel
  docs/openapi/             contratos generados, NO se editan a mano
```

### Módulos del panel, por tamaño

| Módulo | Archivos | Líneas | Pruebas |
|---|---|---|---|
| `modulos/fichas` | 13 | 3,879 | 1,426 |
| `modulos/digitalizacion` | 6 | 949 | 395 |
| `modulos/recepcion` | 5 | 1,108 | 399 |
| `modulos/farmacia` | 14 | 3,000 | 1,377 |
| `modulos/administracion` | 4 | 1,020 | 640 |
| `modulos/expedientes` | 4 | 790 | 402 |
| `modulos/espera` | 2 | 334 | 222 |

### Cosas que hay que saber antes de tocar código

- **El contrato OpenAPI se genera, no se escribe.** Después de cambiar un DTO:
  `npm run contrato -w @cap/<servicio>` y luego `npm run api:generar` en `web/`.
- **El cliente de Prisma vive FUERA de `prisma/`**, en `services/*/generado/`. La
  extensión de VS Code trata todos los `.prisma` de una carpeta como un solo
  esquema y da errores falsos de "ya existe" si el generado está dentro.
- **`Decimal` de Prisma viaja como TEXTO en JSON**, no como número. Peso, talla y
  temperatura son `string` en las respuestas.
- **Las fechas se mandan como `aaaa-mm-dd` sin convertir a `Date`.** Guatemala es
  UTC-6 y construir un `Date` mueve la fecha al día anterior.
- **Para filtrar "lo de hoy" en el servidor, `inicioDelDiaLocal()` de
  `@cap/shared`.** Nunca `setHours(0,0,0,0)`: eso toma la zona horaria del
  proceso, que en tu máquina es Guatemala y en el contenedor de producción es
  UTC. Funciona en las pruebas y falla desplegado, corriendo la frontera del
  día seis horas. Y no la confundas con `fechaDelDia`: una devuelve la
  medianoche UTC del día local —para comparar días entre sí— y la otra la
  medianoche local como instante, que es lo único comparable contra una columna
  de marca de tiempo.
- **Nunca se aplica una migración sin confirmación explícita de Dennis.**
- **`prisma migrate dev` necesita `pg_trgm` en `template1`.** Crea una base
  espejo para validar la migración, y esa base sale de `template1`: sin la
  extensión falla antes de empezar, con un error que parece de la migración
  vieja de búsqueda por nombre. Ya está instalada en el contenedor; si se
  recrea, hay que repetirlo:
  `docker exec cap-postgres psql -U postgres -d template1 -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"`
- **Para regenerar el cliente de Prisma hay que parar el servicio.** El proceso
  tiene bloqueado `query_engine-windows.dll.node` y `prisma generate` falla con
  `EPERM`.
- **`npm run lint` no funciona en ningún paquete**: no existe ningún
  `eslint.config.*` en el repositorio. En los servicios, `lint` es `tsc --noEmit`.

---

## 4. Intentos y fallos, para no repetirlos

### Herramientas y entorno

**Los heredocs se rompen con contenido grande o con comillas.** Pasó varias
veces, con mensajes de commit largos y con cuerpos de PR. **Usa la herramienta
de escritura de archivos** y luego lee el archivo desde el script.

**`git push` falla con "Could not resolve host" desde Bash.** Esa herramienta no
tiene DNS. Usa PowerShell, y con un bucle de reintento: el DNS también falla
intermitentemente ahí.

```powershell
$ok = $false
for ($i = 1; $i -le 10 -and -not $ok; $i++) {
  $r = Test-NetConnection -ComputerName github.com -Port 443 -WarningAction SilentlyContinue
  if ($r.NameResolutionSucceeded -and $r.TcpTestSucceeded) { $ok = $true; break }
  Start-Sleep -Seconds 6
}
```

**`gh` no está instalado.** Los PR se abren por la API de GitHub, con el token
que `git credential fill` devuelve. Dos detalles que costaron intentos: hay que
mandar `Content-Type: application/json` (sin él, GitHub responde 400 "malformed
request"), y `commit_id` en una revisión necesita el **SHA completo**, no el
corto.

**`netstat | grep` miente sobre los puertos en esta máquina.** Da "libre" con los
servicios en marcha. Lo fiable es
`Get-NetTCPConnection -LocalPort 3002 -State Listen` en PowerShell, o mirar las
líneas de comando con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`.

**Los servicios que arranca el asistente en segundo plano mueren con la sesión.**
Pasó: se cayeron auth, usuarios y Vite a la vez. Que los levante Dennis en sus
propias terminales. Y antes de arrancar uno, comprobar que el puerto esté libre
— si no, `EADDRINUSE`.

**Reiniciar un servicio no basta con recompilar.** Node ya tiene el código viejo
en memoria. Pasó dos veces: rutas nuevas respondiendo 404 con el `dist`
actualizado. Hay que matar el proceso y volver a arrancarlo.

### Pruebas

**El cliente de TanStack Query es de módulo y sobrevive entre pruebas.** Sin
`clienteConsultas.clear()` en `beforeEach`, una prueba lee los datos que dejó la
anterior y falla por un motivo que no tiene que ver con lo que comprobaba. Costó
un rato entenderlo porque las pruebas pasaban en aislamiento.

**El límite de los `findBy*` NO es el de vitest, y son dos cosas distintas.**
`testTimeout` está en 20 s; los `findBy*` de testing-library tienen el suyo
propio, de un segundo por defecto, y no lo heredan. El síntoma es una prueba que
pasa sola y falla en la suite completa. Pasó al añadir el módulo de farmacia:
dos archivos más compitiendo por la CPU bastaron para que `ficha.spec` empezara
a fallar **de forma consistente**, no intermitente. Está subido a 5 s en
`vitest.setup.ts`. Si vuelve a aparecer al añadir pantallas, es ahí donde se
mira, no en la prueba que falla.

**El límite de tiempo global de vitest está en 20 s a propósito** (`vite.config.ts`).
La ficha clínica satura la CPU y, como los archivos corren en paralelo, empujaba
por encima del límite de 5 s a pruebas de otras pantallas. No es lentitud del
panel: jsdom dibuja ese formulario mucho más despacio que un navegador.

**Una suite entera en verde puede salir con código 1.** Pasó durante semanas
sin que nadie lo viera: jsdom no implementa `scrollIntoView`, y las dos
pantallas que la usan la llaman dentro del manejador de un clic. React reporta
eso como excepción **no capturada**, no como fallo de la prueba: las aserciones
se cumplían, vitest decía "221 passed", y lo único que delataba el problema era
el código de salida. En CI eso es rojo sin un solo test fallado. Ya está
sustituida en `web/vitest.setup.ts`. **Mira siempre el código de salida, no solo
el conteo de "passed".**

**Corre `tsc` DESPUÉS de escribir las pruebas, no antes.** Un import sin usar en
un `.spec` solo aparece cuando se comprueba el proyecto entero.

**`--testPathPatterns` no filtró** en la versión de Jest del proyecto: corrió la
suite completa y el conteo pareció normal. Verifica el número total, no solo que
diga "passed".

**Cuidado con el directorio al correr vitest.** Desde la raíz del monorepo
recoge las specs de todos los paquetes y fallan todas. Se corre desde `web/`.
Vuelve a pasar con facilidad, y el síntoma engaña: el error que sale es
`ReferenceError: beforeEach is not defined`, que parece un problema del archivo
de pruebas. Mira la primera línea de la salida de vitest: dice desde qué carpeta
arrancó.

**Los selectores ambiguos son el error más común.** Un texto que aparece en dos
sitios legítimos —el porcentaje global y el de "todas las comunidades", o el
nombre de una comunidad en la lista y en la tabla— rompe `getByText`. Acota con
`within()`.

**La limpieza de las pruebas e2e tiene un orden obligatorio.** El expediente NO
cae en cascada al borrar el paciente, y está bien que no lo haga. Hay que borrar
en orden: atenciones → visitas → registro de digitalización → expediente →
paciente. Un `delete().catch(() => undefined)` se traga el fallo y deja pacientes
de prueba acumulándose: llegó a haber nueve.

**Los pacientes de prueba con prefijo "Zz" ordenan al final.** Si la consulta
está paginada por apellido, no van a aparecer en la primera página. Crea una
comunidad propia para la prueba en vez de buscar entre 8,000 registros.

**Un paciente registrado sin marcar "viene de papel" nace `COMPLETO`.** Si la
prueba espera encontrarlo en la cola de digitalización, tiene que crearlo con
`digitalizado: true`.

### La sesión y las pruebas

**La sesión vive SOLO en memoria, y recargar la página echa al usuario.** Es
deliberado —`api/sesion-almacen.ts` lo explica: un token en `localStorage` lo
lee cualquier script inyectado, y en un sistema con datos clínicos eso entrega
expedientes enteros—. La consecuencia práctica: **nunca le pidas a nadie que
pegue una dirección en la barra del navegador**, porque eso es una recarga.
Todo lo que haya que probar necesita un botón que lleve hasta ahí. La solución
definitiva es la cookie HttpOnly que pide la arquitectura §10.1, y sigue
pendiente.

**Una prueba e2e que crea pacientes tiene que registrarlos para la limpieza.**
El archivo `usuarios.e2e-spec.ts` borra al terminar solo los ids de la lista
`creados`, que llena el ayudante `crearPaciente`. Haciendo el `POST` a mano, los
pacientes sobreviven y el borrado de la comunidad de prueba falla por la llave
foránea: **160 pruebas en verde y la suite en rojo**, con el error real
enterrado en un volcado de Prisma de miles de caracteres. Usa el ayudante.

**Y no crees comunidades en las pruebas.** Una comunidad con pacientes no se
puede borrar —la llave foránea lo impide, y está bien que lo impida—. Usa las
que ya existen con un `findFirst`.

### Las fichas del MSPAS

**Los PDF son escaneos: no tienen capa de texto.** `pdftotext` no extrae nada de
ninguno de los cuatro. Hay que renderizarlos a imagen con `pdfplumber`
(`page.to_image(resolution=200).save(...)`) y leerlos.

**Y hay que leerlos, no fiarse del resumen.** `docs/campos-de-fichas.md` es un
buen mapa, pero al abrir el formulario del neonato aparecieron tres cosas que no
estaban: los signos de peligro son 27 y no 20 —en tres bloques con conductas
distintas—, la fila de VIH-SIDA no tiene casillas SI/NO, y la consejería es una
tabla con fecha de reconsulta, no un texto libre. **Contrasta siempre contra el
PDF antes de sembrar un catálogo.**

**El catálogo ya está preparado para las cuatro.** `SignoPeligro`,
`ProblemaFicha`, `CatalogoAntecedente` y `TemaConsejeria` van por `TipoFicha`, y
`GET /fichas/catalogo/:tipo` sirve cualquiera. Sembrar una ficha nueva es
escribir un archivo como `catalogo-ficha-neonato.ts`, sin tocar el esquema. Lo
que **sí** exige migración son los campos propios de cada ficha.

**El catálogo de antecedentes es compartido entre fichas.** Si un antecedente no
es del paciente sino de otra persona —los maternos del neonato— tiene que llevar
prefijo (`MAT_`), o se mezclará con el del mismo nombre de otra ficha.

### Trampas de la librería

**MUI 9 quitó `disableEscapeKeyDown` de `Dialog`.** No hace falta: el diálogo
lo gobierna `open`, así que basta con NO pasarle `onClose` para que ni Escape ni
el clic de fuera puedan cerrarlo. Se usa en la contraseña temporal de
Administración, que no debe cerrarse por accidente.

**MUI 9 quitó `TransitionProps` de `Dialog`.** Para inicializar el estado de un
diálogo con el registro que se abre, móntalo con `key={id}` desde el padre.
También quitó `alignItems`, `align` y `display` como props: van en `sx`.

**`@IsEnum({ A: 1, B: 1 })` no valida lo que parece.** class-validator compara
contra los **valores** del enum. Escrito así, los valores eran cuatro unos y el
endpoint respondía 400 a todo estado escrito con letras. Un `as never` callaba a
TypeScript y ninguna prueba lo tocaba. **Declara un enum de verdad.**

**El `?` de un parámetro opcional se borra al compilar.** Sin `ApiParametrosPagina()`
o `@ApiQuery({ required: false })`, el contrato publica los parámetros como
obligatorios.

### Defectos que aparecieron y por qué nadie los había visto

**Dos criterios que miran lo mismo y no coinciden dejan datos atrapados.** La
sala de espera lo tuvo durante semanas: `enEspera()` listaba solo las visitas de
HOY, pero `marcarLlegada()` y el índice único de la base miraban si había
CUALQUIER visita `ESPERANDO`, sin fecha. Una visita que nadie cerró al terminar
el día se volvía **invisible** —no salía en la lista, así que no se podía
retirar desde ninguna pantalla— y **bloqueaba al paciente para siempre**. Lo
encontró Dennis probando, no las pruebas.

**Y las pruebas no lo vieron por un detalle de una sola palabra.** Había una
prueba de "una llegada de AYER no aparece hoy" y pasaba, pero creaba la visita
vieja con estado `ATENDIDA`: comprobaba que las cerradas no se arrastran, no que
las abiertas bloquean. **Cuando escribas la prueba de un caso límite, comprueba
que el dato que montas está en el estado que de verdad causa el problema.**

Todos estaban en código que **nunca se había usado desde una pantalla**:

- El `PATCH` de digitalización llevaba semanas respondiendo 400 a todo.
- El servicio de fichas no emitía el evento `atencion.registrada`: el panel de
  indicadores de la Etapa 10 nunca habría visto ninguna consulta capturada con
  la ficha nueva.
- Tampoco incrementaba el contador de transcripción: el panel de avance habría
  quedado en cero después de una jornada entera de trabajo.
- El botón "Registrar paciente" se le ofrecía a los seis roles, pero el servidor
  solo deja dar de alta a dos.

Al construir Farmacia aparecieron dos más, y los dos por **la misma causa
raíz**, que conviene buscar en el resto del sistema:

**Un `@Body()` tipado con un objeto suelto de TypeScript no se valida.** Sin una
clase, el `ValidationPipe` no tiene metatype que inspeccionar, así que
`whitelist` y `forbidNonWhitelisted` **no se aplican** y el cuerpo llega entero
al servicio. En `PATCH /v1/medicamentos/{id}` eso terminaba en
`prisma.update({ data })` con lo que mandara el cliente: escritura de campos
arbitrarios del modelo. Y hay un segundo efecto que se nota antes: el contrato
OpenAPI sale con `requestBody: never`, así que **el panel no puede llamar al
endpoint** aunque quiera. Si una pantalla no logra mandar un cuerpo, mira el DTO
antes que el cliente.

El **cuarto** aparecio en `POST /v1/auth/mfa/activar`, con la misma causa. El
panel nunca lo habia llamado porque el acceso usa `mfa/activar-inicial`, que si
tenia DTO. Ya corregido. **Busca este patron antes de construir cualquier
pantalla nueva:** si un endpoint que necesitas no publica cuerpo en el contrato,
mira su `@Body()`.

**`@Headers('authorization')` publica el token como parámetro obligatorio del
contrato.** Con eso, el cliente tipado del panel exige pasar la cabecera a mano
—cuando el middleware ya la pone en cada petición— y el endpoint es
sencillamente imposible de llamar desde el contrato generado. La autenticación
ya está declarada con `@ApiBearerAuth()`. Se corrige leyendo el token del
`Request`. **Los tres del sistema ya están arreglados**: `POST /v1/entregas` y
los dos de `programas`.

**Espera encontrar más.** El criterio que los ha delatado a todos es el mismo:
código que nunca se ejercitó desde una pantalla ni desde una prueba.

### Errores de criterio, no de código

**Metí campos de la ficha prenatal en la de adultos.** El modelo de datos guarda
las mismas columnas para las dos fichas, y confundí *lo que la base puede
guardar* con *lo que esa hoja pregunta*. Dennis lo detectó. **No le inventes
campos a un formulario oficial:** lo que se capture así no tiene respaldo en
ningún papel firmado. Verifica siempre contra `docs/campos-de-fichas.md`.

**Un `autoFocus` arrastró la página a media hoja.** El navegador desplaza hasta
el campo enfocado. En un formulario largo, eso significa abrir por la mitad.

**Confundí dos flujos distintos en una pantalla.** La digitalización y la sala de
espera son las dos "listas de trabajo", pero una es de miles de carpetas que
pueden esperar meses y la otra son cinco personas sentadas ahora. Un filtro no lo
arreglaba: lo tapaba.

---

## 5. Los pasos siguientes, exactos

### Inmediato

**1. Empujar el PR #19 y fusionarlo.**
Es lo único abierto. Solo añade `entrega-ramiro.md`; ya está rebasado sobre
`7cf43d6` en local y necesita `git push --force-with-lease`, porque el rebase
reescribió sus dos commits.

**2. Poner `main` al día.**
Se quedó en `0f7e270`, el merge del PR #22, y `develop` lleva cuatro PR más
—carpeta familiar, el 404 y los permisos, las fichas por persona y el alta de
Enfermería—. No bloquea a nadie mientras se trabaje en `develop`, pero `main`
está apuntando a un sistema que ya no es el que existe.

**3. Cablear la trazabilidad, que es lo que cierra la Etapa 9.**
El servicio y su cliente están hechos y nadie los llama. Lo primero que debería
dejar traza son las acciones administrativas —crear cuentas, cambiar roles,
restablecer contraseñas, reiniciar segundos factores— y las lecturas de
historial clínico, que es lo que pide el RF-09.

### El siguiente módulo: la ficha que falta

**Farmacia, Administración y tres de las cuatro fichas están terminadas y
fusionadas.** Sus diseños están en `docs/diseno-farmacia.md`,
`docs/diseno-administracion.md`, `docs/diseno-ficha-neonato.md` y
`docs/diseno-ficha-ninez.md`.

Lo último que se hizo, y que conviene conocer antes de seguir:

- **El sistema elige la ficha por la fecha de nacimiento.** Hasta 28 días,
  neonato; hasta los 10 años, niñez; de ahí en adelante, adultos. El botón
  "Abrir ficha" de Recepción lleva a la que toca, y las tres hojas tienen ya su
  pantalla. Está en `web/src/modulos/fichas/ficha-por-edad.ts`. La prenatal
  queda fuera: depende del embarazo, no de la edad.
- **La ficha se cambia de PERSONA, no de formulario.** Cuando llega la señora
  con el niño en brazos, el encabezado ofrece a los demás de la carpeta familiar
  y a cada uno le abre la suya. Dejar elegir el formulario metería los datos del
  niño en el historial de la madre, y eso no se nota hasta años después.
- **Recepción pregunta tres cosas más**: barrio/caserío/aldea (tabla
  `lugar_poblado` por comunidad), población migrante con su lugar de origen, y
  **alergias a medicamentos**. Las alergias tienen TRES estados —`null` es "no
  se preguntó", que no es lo mismo que "no tiene"— y el texto va cifrado.

**Lactancia y niñez ya está**, que era la más compleja de las cuatro: entró en
tres PR —la hoja (#12), el carné (#13) y la gráfica de peso para edad (#14)—.
La gráfica no se captura: se dibuja a partir de los pesos que el sistema ya
tiene.

**Prenatal y posparto** es la única que queda, y antes hay que decidir una cosa
que no es técnica: **se solapa con el módulo Programas**, que ya lleva el embarazo con su
FUR, su fecha probable de parto y sus alertas. O la ficha escribe en
`ControlPrenatal` de `programas`, o el embarazo queda registrado en dos sitios
que no se hablan. Depende de si el personal llena la ficha **y además** inscribe
en el programa, o solo una de las dos: es una pregunta para el CAP.

Después de las fichas queda **Programas** (pantallas de hipertensión y embarazo;
desnutrición ni siquiera tiene backend) y **Reportes**, que hay que construir
entero.

**Lo que Farmacia y Administración necesitan no es código, son respuestas.** El
catálogo de medicamentos nace vacío: sin sembrarlo, el módulo no sirve por muy
construido que esté.

### Después

En este orden, y por esta razón:

1. **Programas** (Etapas 6-7) — hipertensión y embarazo tienen backend listo;
   desnutrición infantil **no existe todavía**, ni modelo ni endpoints.
2. **Reportes** (Etapa 10) — hay que construir el servicio entero.
3. **Auditoría** (Etapa 9) — el servicio ya está fusionado; falta cablearlo,
   como dice el punto 3 de "Inmediato". Es lo que falta para que las acciones
   administrativas —crear cuentas, cambiar roles, restablecer contraseñas,
   reiniciar segundos factores— dejen traza.

### La forma de trabajar que Dennis pidió

- **Correr la regresión completa después de cada avance.**
- **Decir siempre qué archivo se está tocando.**
- **Informar de todos los cambios**, incluidos los que salieron de camino.
- Todo tiene que funcionar **desde Visual Studio Code**, no solo desde la
  terminal.
- Ramas: `main` ← `develop` ← `feature/*`, con PR. Nunca commitear a `develop`.

### Preguntas abiertas para el CAP

Están repartidas en los documentos de diseño. Las que más pesan:

- **¿Cómo se corrige una atención mal capturada?** Hoy no se puede, y va a pasar.
- ¿Dónde vive el borrador de una ficha a medio llenar? Hoy solo en memoria.
- ¿La sala de espera necesita prioridad? Hoy es orden estricto de llegada.
- ¿En qué orden quiere el CAP atacar el archivo de papel?
- El tipo de sangre está impreso dentro del bloque gineco-obstétrico, así que un
  paciente hombre no tiene dónde anotarlo. La pantalla respeta el papel.
- Las seis preguntas al final de `docs/campos-de-fichas.md`.

De Recepción, y son urgentes porque ya hay pantalla esperándolas:

- **¿Cuáles son los barrios, caseríos y aldeas de cada comunidad?** Los que hay
  sembrados **me los inventé yo** para que el desplegable tuviera contenido. Se
  corrigen editando `services/usuarios/prisma/lugares-poblados.ts` y volviendo a
  correr `npm run lugares -w @cap/usuarios`.
- **¿Quién pregunta por las alergias, y cuándo?** Hoy lo hace Recepción al
  registrar al paciente. Si el CAP lo hace en la consulta, el campo está en el
  sitio equivocado.

De Farmacia, en `docs/diseno-farmacia.md`:

- **El catálogo nace vacío.** ¿De dónde sale la lista inicial: el listado básico
  del MSPAS, un inventario propio del CAP, un archivo que ya tienen? Sin eso, la
  primera persona que entre tiene que teclear cientos de medicamentos.
- ¿Noventa días es la ventana de alerta de vencimiento correcta? Es el valor por
  defecto de `DIAS_ALERTA_VENCIMIENTO` y nadie del CAP lo ha confirmado.
- **¿Quién puede dar de baja un lote, y quién puede ajustar por conteo?** Hoy
  cualquiera con rol de Farmacia, sin segunda firma ni acta. Y qué se hace
  físicamente con lo vencido: ¿se destruye en el CAP, se devuelve al almacén
  departamental, hace falta un acta?
- **¿El CAP devuelve medicamento al almacén departamental?** `DEVOLUCION` sigue
  en el enum `TipoMovimiento` sin ningún endpoint que lo produzca. Si eso pasa
  de verdad, debería salir del inventario como devolución y no como baja.
- ¿La existencia mínima la fija el CAP o viene del MSPAS?
- **¿Quién será el administrador del CAP, y habrá más de uno?** Hoy hay una sola
  cuenta con ese rol. Si esa persona se va o pierde su segundo factor, nadie más
  puede crear cuentas.
- **¿Cómo se verifica a quien pide que le reinicien el segundo factor?** El
  Administrador ya puede hacerlo, pero el sistema no puede comprobar que quien
  llama es esa persona. Hace falta un procedimiento acordado con el CAP.
- **¿Se entrega con receta o sin ella?** El catálogo marca qué medicamentos la
  requieren y la pantalla lo dice, pero no la exige ni la registra.
- **¿Se le puede entregar a alguien que no es el paciente?** Hoy sí, y quien
  recoge solo puede anotarse en observaciones, en texto libre.
- **¿Qué se hace cuando no hay existencia suficiente?** La entrega se rechaza
  entera y no queda constancia de que el paciente vino y se fue sin su
  tratamiento — que es justo lo que explica un tratamiento incompleto.
