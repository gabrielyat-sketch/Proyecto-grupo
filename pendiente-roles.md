# Pendiente para Dennis — Los roles del CAP

Escrito el 15 de septiembre de 2026 por Ramiro. **Es lo único que falta del
proyecto.** Todo lo demás está en `develop` (ver `handoff.md` y
`entrega-ramiro.md`).

---

## 1. Qué pidió el seminario

La compañera mandó esta lista y dijo que "solamente falta agregar los roles":

> **Roles oficiales**
>
> 1. **Archivo (Recepción y Control):** personal administrativo encargado de la
>    admisión, búsqueda del expediente clínico y apertura de registros.
>    Garantiza que el historial médico acompañe al paciente.
> 2. **Preconsulta (Evaluación y Triage):** atendido por un auxiliar de
>    enfermería. Cuantifica signos vitales y medidas antropométricas
>    (peso/talla) para documentar el estado inicial antes de ver al médico.
> 3. **Clínica (Consulta Médica):** a cargo de un médico general o EPS. Examen
>    físico completo, diagnóstico y receta oficial.
> 4. **Posconsulta (Farmacia y Consejería):** encargado de farmacia o
>    enfermería. Despacho gratuito de medicamentos y educación incidental
>    (dosis, horarios, cuidados).
> 5. **Inmunización (Prevención):** personal de enfermería. Aplicación de
>    biológicos del esquema nacional, cadena de frío y registro epidemiológico.
>    Flexible para pacientes que solo vienen a vacunarse.

Se refiere a **los usuarios del sistema**: el personal que entra al CAP a
trabajar. Son los cinco puestos (estaciones) por los que pasa un paciente.

---

## 2. Lo que hay que saber antes de tocar nada: los roles YA existen

No hay que crearlos de cero. El sistema tiene **seis roles** desde la
arquitectura (§10.3) y están definidos en **tres lugares que deben coincidir**:

| Lugar | Archivo |
|---|---|
| Enum que usan los guards de todos los servicios | `cap-sistema/packages/shared/src/auth/roles.ts` |
| Enum de la base de datos de auth | `cap-sistema/services/auth/prisma/schema.prisma` (línea ~30, `enum RolUsuario`) |
| Lista y menú por rol del frontend | `cap-sistema/web/src/navegacion/menu.ts` (`ROLES` y `MENU`) |

Si se agrega un rol en uno y no en los otros dos, los guards lo rechazan (el
propio comentario del schema lo advierte).

### Cómo mapean contra la lista oficial

| Rol del sistema | Nombre que hoy se ve en pantalla | Rol oficial de la lista |
|---|---|---|
| `RECEPCION` | "Recepción y archivo" | **1. Archivo** ✅ |
| `ENFERMERIA` | "Enfermería" | **2. Preconsulta** y **5. Inmunización** (los dos) |
| `MEDICO` | "Medicina" | **3. Clínica** ✅ |
| `FARMACIA` | "Farmacia" | **4. Posconsulta** ✅ |
| `DIRECTOR` | "Dirección" | — no está en la lista |
| `ADMINISTRADOR` | "Administrador" | — no está en la lista |

**Los permisos por estación también ya están.** Cada controlador lleva su
`@Roles(...)`. Ejemplos que se pueden mostrar en la defensa:

- `services/usuarios/src/visitas/visitas.controller.ts` — solo `RECEPCION` y
  `ADMINISTRADOR` marcan la llegada del paciente (Archivo).
- `services/usuarios/src/atenciones/atenciones.controller.ts` — solo `MEDICO` y
  `ENFERMERIA` registran una atención (Clínica y Preconsulta).
- `services/medicamentos/src/entregas/entregas.controller.ts` — `FARMACIA`
  despacha (Posconsulta).
- `services/usuarios/src/carnet/carnet.controller.ts` — el carnet de vacunación
  (Inmunización).
- `web/src/navegacion/menu.ts` — Farmacia y Recepción **no** entran al
  historial clínico; el menú se arma según el rol.

---

## 3. Dónde SÍ hay diferencias con la lista

1. **Preconsulta e Inmunización comparten el rol `ENFERMERIA`.** En el CAP
   real las hace la misma gente (enfermería), así que un solo rol es correcto y
   defendible. Separarlos en dos roles obligaría a revisar los `@Roles` de unos
   20 controladores más la matriz de la arquitectura. **No hacerlo salvo que el
   seminario lo exija por escrito.**

2. **Posconsulta = Farmacia + consejería.** El despacho está. La "educación
   incidental" (explicar dosis y horarios) no es un permiso, es una acción de
   la persona; a lo sumo un campo de texto en la entrega. No cambia los roles.

3. **`DIRECTOR` y `ADMINISTRADOR` no aparecen en la lista** porque la lista
   describe el flujo del paciente, no la gestión del centro. Son necesarios
   igual: quién crea cuentas, quién ve los reportes al MSPAS, quién tiene MFA
   obligatorio. Hay que explicárselo a la compañera, no quitarlos.

4. **Lo que falta de verdad, si quieren el flujo completo:** la sala de espera
   solo tiene tres estados (`ESPERANDO`, `ATENDIDA`, `RETIRADA`, en
   `services/usuarios/prisma/schema.prisma`, `enum EstadoVisita`). No existe
   "en preconsulta" (signos tomados, esperando al médico) ni "en posconsulta".
   Eso sería reflejar las cinco estaciones como flujo, y es bastante más
   trabajo que "agregar roles".

---

## 4. Qué hacer, en orden

### Paso 1 — Preguntar (antes de programar)

Preguntarle a la compañera **una sola cosa**: ¿el seminario pide que los cinco
aparezcan **como roles separados en el sistema**, o basta con que el sistema los
**contemple** (documentados, con nombre visible y con permisos)?

- Si basta con contemplarlos → pasos 2 y 3, una tarde.
- Si tienen que ser cinco roles separados → paso 4, varios días.

### Paso 2 — Poner los nombres oficiales en pantalla (recomendado, poco esfuerzo)

Hay **dos** mapas de etiquetas y hoy no dicen lo mismo entre sí. Unificarlos y
que digan lo que dice la lista oficial:

- `cap-sistema/web/src/componentes/Layout.tsx` (const `ETIQUETA_ROL`, ~línea 64)
- `cap-sistema/web/src/modulos/administracion/servicio-cuentas.ts`
  (const `ETIQUETA_ROL`, ~línea 95; la usan `DialogoCuenta.tsx`,
  `PaginaAdministracion.tsx` y `PaginaNoDisponible.tsx`)

Propuesta de etiquetas:

| Rol | Etiqueta propuesta |
|---|---|
| `RECEPCION` | Archivo (Recepción y Control) |
| `ENFERMERIA` | Enfermería (Preconsulta e Inmunización) |
| `MEDICO` | Clínica (Consulta Médica) |
| `FARMACIA` | Farmacia (Posconsulta) |
| `DIRECTOR` | Dirección |
| `ADMINISTRADOR` | Administrador |

Lo ideal es dejar **un solo** `ETIQUETA_ROL` (el de `servicio-cuentas.ts` o
moverlo a `navegacion/menu.ts` junto a `ROLES`) y que `Layout.tsx` lo importe.
Hay specs que comprueban esos textos (`Layout.spec.tsx`,
`administracion.spec.tsx`): actualizarlos.

### Paso 3 — Documentar los roles (esto es probablemente lo que quieren ver)

Crear `cap-sistema/docs/roles.md` con:

1. La tabla de la sección 2 (rol del sistema ↔ rol oficial ↔ qué hace).
2. La **matriz de permisos**: qué puede hacer cada rol en cada módulo. Se saca
   directo de los `@Roles(...)` de los controladores; no hay que inventarla.
   Un `grep -rn "@Roles" cap-sistema/services/*/src` la da entera.
3. Un párrafo explicando por qué Preconsulta e Inmunización son un solo rol y
   por qué existen Director y Administrador.

Y actualizar la §10.3 de `arquitectura-cap-purulha.md` para que nombre los
roles oficiales junto a los del sistema.

### Paso 4 — Solo si exigen cinco roles separados

Tocar los tres lugares de la sección 2 **a la vez**, más:

- Migración de Prisma en `services/auth` (nuevo valor del enum; nunca borrar
  `ENFERMERIA` mientras haya cuentas con ese rol).
- Cada `@Roles(...)` que hoy dice `Rol.ENFERMERIA` decidir si es de
  preconsulta, de inmunización o de ambos.
- `MENU` en `navegacion/menu.ts` con los roles nuevos por módulo.
- Todas las e2e que crean usuarios con `Rol.ENFERMERIA`.
- `crear-cuenta.ts` en `services/auth/prisma`.

Rama nueva desde `develop`, rebase (no merge), PR desde GitHub. Igual que todo
lo demás.

---

## 5. Resumen para decirlo en una frase

**Los roles ya existen y cubren las cinco estaciones oficiales; Preconsulta e
Inmunización comparten `ENFERMERIA` porque en el CAP las hace la misma gente.
Lo que falta es ponerles el nombre oficial en pantalla y documentar la matriz
de permisos.**
