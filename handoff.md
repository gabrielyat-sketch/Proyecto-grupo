# Handoff — Plataforma Inteligente CAP Purulhá

Actualizado el 28 de agosto de 2026. Para quien retome esto: yo mismo en otra
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
develop  35846a9   ← Etapas 1-6, la 5 entera, expedientes (PR #7) y Farmacia (PR #8)
   └── feature/web-administracion         SIN FUSIONAR, empujada
   └── feature/servicio-trazabilidad      PR #3 abierto, sin corregir
```

**La Etapa 8 esta cerrada y fusionada.** Farmacia entera —catalogo, lotes,
alertas, ingreso, baja, conteo fisico y entrega con FEFO— entro en `develop` con
el PR #8, en cuatro commits.

**El PR #3 de Ramiro no se ha tocado.** Sigue en `5117204`, la línea 8 de
`test/bitacora.e2e-spec.ts` sigue mal, y además la rama ya **va por detrás de
`develop`**: le faltan expedientes y este propio handoff. Cuando corrija la
línea tendrá que traerse `develop` antes de que se pueda fusionar.

### Pruebas

**764 verdes**: 514 unitarias + 250 e2e. `tsc --noEmit` limpio en todo el
monorepo, y el panel ya termina con **código de salida 0** (ver §4). Se corren
así:

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
| **Sala de espera**: marcar llegada, atender, sacar sin ficha | Completo |
| **Ficha de adultos**: 10 secciones, ~200 campos, matriz de 14 problemas | Completo |
| **Antecedentes** del paciente (sección VII) | Completo |
| **Digitalización** (RF-08): avance por comunidad, cola, transcripción | Completo |
| **Expedientes**: búsqueda por número, historial, ficha desplegable | Completo |
| **Farmacia**: catálogo, lotes, alertas, ingreso, baja, conteo físico y entrega con FEFO | Completo |
| **Administración**: cuentas, roles, restablecer contraseña | Completo, sin fusionar |

### Qué falta (backend construido, sin pantalla)

| Módulo | Endpoints listos | Peso |
|---|---|---|
| **Programas** (Etapas 6-7) | — | Grande: hipertensión, embarazo, desnutrición |
| Auditoría (Etapa 9) | — | Depende del PR #3 de Ramiro |
| Reportes (Etapa 10) | **ninguno** | El servicio no existe |

Las **otras tres fichas** (niñez, neonato, prenatal) no tienen catálogo sembrado.
El modelo y la pantalla de adultos son el molde; es trabajo largo pero mecánico.

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
    trazabilidad/           3007  de Ramiro, en el PR #3
  web/                      5173  el panel
  docs/openapi/             contratos generados, NO se editan a mano
```

### Módulos del panel, por tamaño

| Módulo | Archivos | Líneas | Pruebas |
|---|---|---|---|
| `modulos/fichas` | 10 | 2,614 | 917 |
| `modulos/digitalizacion` | 6 | 949 | 395 |
| `modulos/recepcion` | 5 | 858 | 399 |
| `modulos/farmacia` | 14 | 3,000 | 1,377 |
| `modulos/administracion` | 4 | 910 | 500 |
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
- **Nunca se aplica una migración sin confirmación explícita de Dennis.**
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
`Request`. `POST /v1/entregas` ya está arreglado; **quedan dos iguales sin
tocar** en `programas`: `embarazo.controller.ts:85` e
`hipertension.controller.ts:78`. Quien construya esas pantallas se va a topar
con lo mismo.

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

**1. Abrir y fusionar el PR de `feature/web-administracion`.**
Empujada y verde. Lleva el módulo de cuentas y la corrección de
`POST /v1/auth/mfa/activar`.

**2. Ramiro tiene que corregir una línea del PR #3.**
Ya está comentado en la línea exacta, con la corrección aplicable de un clic:

```
services/trazabilidad/test/bitacora.e2e-spec.ts:8
- import { PrismaClient } from '../prisma/generado';
+ import { PrismaClient } from '../generado';
```

Sus 15 pruebas e2e no compilan sin eso. En su máquina sí compila porque la
carpeta vieja `prisma/generado` sigue ahí, ignorada por git. **Cuando lo corrija,
revisar y fusionar el PR #3**, que cierra la Etapa 9. Ojo: su rama va por detrás
de `develop`, así que tendrá que traérselo antes.

### El siguiente módulo: Programas (Etapas 6-7)

**Las Etapas 8 y la administración de cuentas están terminadas.** Farmacia
entera está en `develop`; Administración, en `feature/web-administracion`, con
sus diseños en `docs/diseno-farmacia.md` y `docs/diseno-administracion.md`.

Lo que sigue es **Programas**, el último backend grande sin pantalla:
hipertensión, embarazo y desnutrición infantil. **Antes de empezar hay que
corregir sus dos `@Headers('authorization')`** —`embarazo.controller.ts:85` e
`hipertension.controller.ts:78`— o el panel no podrá llamar a esos endpoints (§4).

**Lo que Farmacia y Administración todavía necesitan no es código, son
respuestas.** El catálogo de medicamentos nace vacío: sin sembrarlo, el módulo
no sirve por muy construido que esté. Y Administración deja un hueco serio: **no
se puede reiniciar el segundo factor de otra persona**. Quien pierda el teléfono
y los códigos de respaldo queda fuera del sistema de forma permanente, y afecta
justo a los dos roles con MFA obligatorio.

### Después

En este orden, y por esta razón:

1. **Las otras tres fichas** — largo pero mecánico; el molde ya existe.
2. **Reportes** (Etapa 10) — hay que construir el servicio entero.
3. **Auditoría** (Etapa 9) — depende de que Ramiro corrija el PR #3.

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
- **¿Qué se hace si alguien pierde su segundo factor?** Hoy no hay forma de
  reiniciarlo: solo quedan los códigos de respaldo del sobre cerrado.
- **¿Se entrega con receta o sin ella?** El catálogo marca qué medicamentos la
  requieren y la pantalla lo dice, pero no la exige ni la registra.
- **¿Se le puede entregar a alguien que no es el paciente?** Hoy sí, y quien
  recoge solo puede anotarse en observaciones, en texto libre.
- **¿Qué se hace cuando no hay existencia suficiente?** La entrega se rechaza
  entera y no queda constancia de que el paciente vino y se fue sin su
  tratamiento — que es justo lo que explica un tratamiento incompleto.
