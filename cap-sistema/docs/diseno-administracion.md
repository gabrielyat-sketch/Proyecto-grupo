# Diseño: Administración de cuentas

El módulo que faltaba para que el CAP pueda operar el sistema sin nosotros.

---

## De dónde salió

Hasta ahora, crear una cuenta o recuperar una contraseña exigía **correr un
comando en la terminal del servidor**:

```
npm run cuenta -w @cap/auth -- <usuario> <rol> "<nombres>" "<apellidos>"
```

El personal del CAP no va a hacer eso. Y el problema no era hipotético: al
probar Farmacia se perdió la contraseña de `sgomez` —el script la genera al azar
y la imprime **una sola vez**— y no había forma de recuperarla desde el sistema.
Ese comando, además, se niega a tocar una cuenta que ya existe: la única salida
era borrarla de la base a mano.

Sin este módulo, las pruebas con el personal de la Etapa 14 no se pueden ni
empezar.

Los 5 endpoints llevaban tiempo construidos y sin pantalla, igual que Farmacia.

---

## Qué preguntas responde

| Ruta | Pregunta que responde |
|---|---|
| `/administracion` | "¿Quién tiene cuenta y con qué permisos?" |
| Nueva cuenta | "Entró alguien nuevo al CAP" |
| Editar | "Cambió de puesto" · "Ya no trabaja aquí" |
| Restablecer contraseña | "Perdí mi contraseña" · "Me quedé bloqueado" |
| Reiniciar 2FA | "Perdí el teléfono con la aplicación de autenticación" |

---

## Decisiones

### La contraseña temporal no se puede perder por un clic

Es la decisión que gobierna el módulo entero. El servidor devuelve la contraseña
en claro **una sola vez**; a partir de ahí solo existe su hash. Si la ventana se
cierra sin que nadie la anote, la única salida es restablecerla otra vez.

Por eso ese diálogo:

- **No recibe `onClose`.** Ni Escape ni el clic fuera lo cierran, porque el
  diálogo lo gobierna `open` y sin manejador no hay nada que cambie ese estado.
  (No hace falta `disableEscapeKeyDown`: MUI 9 ya no lo acepta en `Dialog`.)
- **Exige marcar una casilla** —"Ya la anoté o la copié"— antes de habilitar el
  botón de cerrar. Un segundo de fricción a cambio de que nadie cierre en
  automático.
- **Muestra la contraseña en grande**, monoespaciada y con espaciado entre
  caracteres, porque se transcribe a mano en un papel. El servidor ya la genera
  sin caracteres ambiguos (`0/O`, `1/l/I`); el tamaño hace el resto.
- Tiene botón de copiar, con la falla contemplada: si el navegador niega el
  portapapeles no pasa nada, la contraseña está a la vista.

### Nadie elige la contraseña de otra persona

El alta no pide contraseña: la genera el servidor. Así no existe una contraseña
conocida por dos personas desde el primer día, y quien entra está obligado a
cambiarla en su primer acceso.

### El nombre de usuario no se edita

Es con lo que la persona inicia sesión y lo que queda firmado en la traza de
auditoría de todo lo que hizo. Cambiarlo dejaría registros a nombre de un
usuario que ya no existe con ese nombre. El servidor tampoco lo acepta.

### Lo que se explica antes de que ocurra

Tres efectos del backend que no se ven y hay que decir:

- **Desactivar una cuenta cierra su sesión de inmediato**, no en quince minutos
  cuando expire el token. La pantalla lo avisa al cambiar el interruptor.
- **Cambiar el rol también cierra la sesión**, para que el permiso nuevo tenga
  efecto ya.
- **Restablecer la contraseña desbloquea la cuenta.** El servicio pone
  `bloqueadoHasta` en `null`, y hoy **es la única forma de desbloquear** a
  alguien que se pasó de intentos fallidos. Se dice en el diálogo de
  confirmación porque, si no, nadie lo adivinaría.

### Perder el teléfono ya no deja a nadie fuera

Era el hueco más serio del módulo cuando se construyó: no existía forma de
reiniciar el segundo factor de otra persona. Quien perdiera el teléfono con la
aplicación de autenticación dependía de sus códigos de respaldo, y al gastarlos
—o perderlos— quedaba **fuera del sistema de forma permanente**. Afecta justo a
los dos roles que lo tienen obligatorio: Administrador y Director.

`POST /v1/usuarios/:id/reiniciar-mfa` borra la configuración y **los códigos de
respaldo**, y cierra las sesiones. No hizo falta inventar ningún flujo de
recuperación: al borrar la configuración, el siguiente acceso vuelve a caer en
`configuracionPendiente` y la persona configura el segundo factor desde cero,
igual que el primer día.

Los códigos de respaldo se borran a propósito. Dejarlos vivos permitiría entrar
con los papeles viejos después de un reinicio pedido justamente porque esos
papeles se perdieron.

La pantalla ofrece el botón **solo en las cuentas que de verdad lo tienen
configurado** —en las demás el servidor responde 400— y avisa de algo que no es
técnico: reiniciar el segundo factor de alguien por teléfono es un vector de
suplantación, así que hay que confirmar quién lo está pidiendo.

### El bloqueo por intentos fallidos ya se ve

También era invisible: `CuentaDto` no exponía `bloqueadoHasta`, así que una
cuenta bloqueada se veía igual que cualquier otra y había que restablecer la
contraseña a ciegas porque alguien lo pedía por teléfono.

Ahora la cuenta lleva `bloqueada`, calculado contra el reloj. La fecha sola no
sirve: `bloqueadoHasta` se queda ahí cuando el bloqueo expira, y compararla es lo
único que distingue *bloqueado* de *estuvo bloqueado la semana pasada*.

Y `mfaActivo` distingue el segundo factor **configurado** del que solo está
exigido por el rol: una cuenta administrativa recién creada exige 2FA y todavía
no lo tiene. Antes las dos se veían iguales; ahora una dice `2FA` y la otra
`2FA pendiente`.

### Sobre la propia cuenta hay dos cosas prohibidas

Un administrador no puede desactivarse ni cambiarse el rol: el CAP podría
quedarse sin **ninguna** cuenta capaz de administrar el sistema. El servidor lo
rechaza con un 400; la pantalla deshabilita los dos controles y explica por qué,
en vez de dejar que la persona lo intente y reciba un error.

La fila de quien está administrando lleva una marca "Usted".

### Qué hace cada rol, debajo del campo

El desplegable de rol muestra bajo el campo lo que ese rol puede hacer:
*"Farmacia — Inventario y entrega de medicamentos. No entra al historial
clínico."* Quien crea una cuenta no tiene por qué saberse la arquitectura para
elegir bien, y elegir mal aquí es dar acceso clínico a quien no debe tenerlo.

Los dos roles con segundo factor obligatorio —Administrador y Director— lo
avisan al elegirlos, y llevan una marca `2FA` en la lista.

### "Nunca ha entrado" es el dato que importa

La columna de último acceso se dice en palabras: *Hoy*, *Ayer*, *Hace 7 días*, y
la fecha cuando pasa el mes. Pero el valor que de verdad se busca es **"Nunca ha
entrado"**: una cuenta creada hace semanas que nadie usó casi siempre es una
cuenta cuya contraseña temporal se perdió, no alguien de vacaciones.

Junto a ella, la marca "Contraseña sin cambiar" dice quién tiene todavía una
temporal encima.

---

## Permisos

**Todo el módulo es exclusivo del Administrador**, igual que el controlador. Ni
siquiera el Director entra: ve el sistema entero pero no administra cuentas.
Aparece solo en su menú y `RutaPorRol` cierra la dirección escrita a mano.

---

## Dos defectos del backend que salieron al construir esto

**`POST /v1/auth/mfa/activar` era imposible de llamar desde el contrato.** Su
`@Body()` estaba tipado con un objeto suelto de TypeScript en vez de una clase.
Sin clase el `ValidationPipe` no valida —el código podía ser cualquier cosa— y
el contrato OpenAPI publicaba la operación **sin cuerpo**, así que el panel no
tenía forma de llamarla.

Es el **cuarto** defecto idéntico del sistema, después de los dos `PATCH` de
medicamentos y el `POST /v1/entregas`. Corregido con `ActivarMfaDto`, que acepta
espacios porque algunas aplicaciones muestran el código como `123 456`.

Nunca se había notado porque el panel solo usaba `mfa/activar-inicial` —la
configuración obligatoria del primer acceso, que sí tenía DTO— y nadie había
activado el segundo factor voluntariamente después.

**Y los dos `@Headers('authorization')` de `programas`.** No son de este módulo,
pero se corrigieron aquí porque bloqueaban lo siguiente que hay que construir:
`embarazo.controller.ts:85` e `hipertension.controller.ts:78` publicaban el
token como parámetro de cabecera **obligatorio** del contrato, y el cliente
tipado del panel no puede llamar a un endpoint así. Es el mismo defecto que tenía
`POST /v1/entregas`. Con eso, las pantallas de Programas (Etapas 6-7) arrancan
sin tropezar con él.

---

## Archivos creados

| Archivo | Qué es |
|---|---|
| `services/auth/src/autenticacion/dto/activar-mfa.dto.ts` | El código TOTP, validado |
| `web/src/modulos/administracion/servicio-cuentas.ts` | Llamadas y cómo se presenta cada dato |
| `web/src/modulos/administracion/PaginaAdministracion.tsx` | La lista, los filtros y las acciones |
| `web/src/modulos/administracion/DialogoCuenta.tsx` | Alta y edición |
| `web/src/modulos/administracion/DialogoContrasenaTemporal.tsx` | La contraseña que solo se ve una vez |
| `web/src/modulos/administracion/administracion.spec.tsx` | 29 pruebas de pantalla |

## Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `services/auth/src/autenticacion/autenticacion.controller.ts` | `mfa/activar` usa el DTO |
| `services/auth/src/mfa/mfa.service.ts` | `reiniciar()`: borra configuración y códigos |
| `services/auth/src/usuarios/usuarios.service.ts` | `reiniciarMfa()`, `mfaActivo` y `bloqueada` |
| `services/auth/src/usuarios/usuarios.controller.ts` | Endpoint de reinicio |
| `services/auth/src/usuarios/dto/respuestas.dto.ts` | Los tres campos nuevos y `MfaReiniciadoDto` |
| `services/auth/test/auth.e2e-spec.ts` | +8 pruebas |
| `services/programas/src/embarazo/embarazo.controller.ts` | El token sale del contrato |
| `services/programas/src/hipertension/hipertension.controller.ts` | Igual |
| `docs/openapi/programas.yaml` y `web/src/api/generado/programas.ts` | Regenerados |
| `docs/openapi/auth.yaml` y `web/src/api/generado/auth.ts` | Regenerados |
| `web/src/App.tsx` | Ruta `/administracion` |
| `web/src/navegacion/menu.ts` | Deja de estar pendiente, y su descripción ya no promete lo que no hace |

---

## Estados cubiertos

- Búsqueda sin resultados, filtro por rol, cuenta desactivada, cuenta con
  contraseña sin cambiar, cuenta que nunca ha entrado.
- Nombre de usuario repetido (409), explicado con el mensaje del servidor.
- La propia cuenta: rol e interruptor de activa, deshabilitados con su motivo.
- Cancelar el restablecimiento o el reinicio de 2FA no envía nada al servidor.
- Cuenta bloqueada, cuenta con 2FA activo, cuenta con 2FA solo exigido por el
  rol, cuenta sin ninguna marca de estado.

## Accesibilidad y captura por teclado

- `Ctrl+K` lleva el foco a la búsqueda, igual que en los demás módulos.
- Los diálogos de alta y edición se envían con Enter; los dos son `<form>`.
- La contraseña temporal es un `<output>` con nombre accesible, para que un
  lector de pantalla la anuncie como resultado y no como texto suelto.

---

## Verificaciones realizadas

```
npm test -w @cap/auth                  13 unitarias
npm run test:e2e -w @cap/auth          39 e2e (antes 31)
npx vitest run src/modulos/administracion   39 de pantalla  (desde web/)
tsc --noEmit                           limpio en los siete paquetes
```

**No se verificó visualmente**: no hay navegador en este entorno.

---

## Información pendiente

1. **Nada impide reiniciar el segundo factor de alguien que no lo pidió.** El
   sistema no puede comprobar la identidad de quien llama por teléfono, y el
   Administrador puede reiniciar el 2FA de cualquiera —incluido el del
   Director— y con eso abrirle la puerta a una configuración nueva. La pantalla
   lo advierte, pero es una salvaguarda de procedimiento, no técnica. Conviene
   acordar con el CAP cómo se verifica a quien lo solicita.
2. **Las cuentas no se borran, solo se desactivan.** Es lo correcto —lo que esa
   persona registró tiene que seguir teniendo autor— pero conviene confirmarlo
   con el CAP, sobre todo de cara a la protección de datos del personal.
3. **¿Quién es el administrador del CAP?** El sistema exige al menos una cuenta
   con ese rol y hoy hay una sola (`admin`). Si esa persona se va o pierde su
   segundo factor, nadie más puede crear cuentas. Conviene decidir si habrá dos.
4. **No hay traza de quién administró qué.** Crear una cuenta, cambiar un rol,
   restablecer una contraseña o reiniciar un segundo factor son acciones
   sensibles y hoy no quedan registradas. Se resuelve cuando se integre el
   servicio de trazabilidad (Etapa 9, PR #3).

---

## Próximo paso recomendado

Entrar como `admin`, crear una cuenta de prueba y comprobar que la contraseña
temporal sirve para entrar. Después, restablecer la de `sgomez`, que sigue
perdida desde las pruebas de Farmacia — es el caso real que motivó el módulo.

Con eso cerrado, lo siguiente del sistema es **Programas** (Etapas 6-7): el
último backend grande sin pantalla, y con sus dos `@Headers` ya corregidos aquí,
arranca sin tropiezos.
