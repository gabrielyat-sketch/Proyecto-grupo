# Entrega de Ramiro — 30 de agosto de 2026

Para Dennis. Esto es lo que trabajé, en qué PR está cada cosa, y qué hay que
saber para revisarlo o continuarlo. Está escrito para leerse de arriba abajo
una sola vez.

Todo sale de `develop` en `2cdd6fe` (tu merge del PR #3, trazabilidad). Las
cuatro ramas están rebasadas sobre ese commit, ninguna tiene conflictos, y
ninguna depende de las otras: se pueden fusionar en cualquier orden.

---

## 1. Los cuatro PR, en el orden en que conviene mirarlos

| PR | Rama | Qué es | Tamaño |
|---|---|---|---|
| **#15** | `feature/rutas-prisma-trazabilidad` | Arregla un script tuyo que no arranca | 2 líneas |
| **#16** | `feature/mfa-doble-peticion` | Nadie podía activar el segundo factor | 2 archivos |
| — | `feature/barrios-purulha` | Los barrios reales de Purulhá Centro | 1 archivo |
| **#17** | `feature/web-diseno` | Identidad visual del panel | 23 archivos |

Los tres primeros son cortos y de leer en cinco minutos. El #17 es grande pero
no toca lógica: es CSS, componentes de presentación y un tema de MUI.

---

## 2. PR #15 — La ruta del cliente de Prisma

**`npm run verificar-cadena` no arranca en `develop` ahora mismo.**

El script llegó con tu PR #3 e importa el cliente desde
`services/trazabilidad/prisma/generado`, pero el generador lo escribe en
`services/trazabilidad/generado` — es el `output = "../generado"` del
`schema.prisma`. El resultado es un `MODULE_NOT_FOUND` antes de ejecutar nada.

Son dos líneas: el import en `infra/scripts/verificar-cadena.ts:34` y la tabla
de carpetas del `README.md:73`, que seguía documentando la ubicación vieja.

Comprobado con el arreglo puesto:

```
  Verificacion de la bitacora de trazabilidad
  ✓  Cadena intacta: 19 registros encadenados correctamente.
  •  No hay raices diarias firmadas todavia.
  La bitacora esta intacta.
```

Este commit es el mismo que yo tenía en `feature/servicio-trazabilidad` sin
subir cuando fusionaste el PR #3, así que se quedó fuera. No es culpa de nadie:
no lo había empujado.

---

## 3. PR #16 — El segundo factor no se podía activar

Este es el que más vale la pena leer, porque el síntoma no apuntaba a nada.

**Lo que se veía:** Google Authenticator mostraba códigos correctos y el
servidor los rechazaba todos, con el mensaje "El codigo no es valido. Verifique
la hora de su telefono". El reloj estaba bien.

**Lo que pasaba:** `PasoConfigurarMfa` pide la configuración dentro de un
`useEffect`, y `StrictMode` monta el componente dos veces en desarrollo. La
bandera `vigente` evitaba que la primera respuesta pintara la pantalla, pero
**no cancelaba la petición**: salían dos, cada una generaba su propio secreto
TOTP, y la última en escribir se quedaba en la base. El QR que la persona ya
había escaneado era el de la otra.

**Cómo se encontró:** por la base, no por el síntoma. La cuenta `admin` tenía
**16 códigos de respaldo** guardados en vez de 8. Eso solo ocurre si los dos
`deleteMany` corrieron antes de los dos `createMany`, es decir, si las dos
peticiones se solaparon de verdad. Ese 16 fue la prueba.

**Los tres cambios:**

- El frontend guarda la petición en vuelo en un `ref` y la reutiliza, así que
  sale una sola aunque el efecto corra dos veces.
- `iniciarConfiguracion` reutiliza el secreto de una configuración que aún no
  se ha activado en vez de generar otro. Cubre también el doble clic y el
  refresco, no solo StrictMode. Una configuración **ya activa** sí se
  reemplaza: ahí la intención es reconfigurar, y el secreto viejo debe morir.
- El borrado y la creación de los códigos de respaldo van en una transacción.
  Sueltos dejaban 16 códigos vivos: los 8 que la persona anotó y otros 8 que
  nadie vio nunca pero que abrían la cuenta igual. Eso último es un agujero de
  seguridad, no solo un número raro.

---

## 4. `feature/barrios-purulha` — Los barrios reales

El catálogo de lugares nació con nombres inventados. El propio archivo avisaba
de que nadie los había confirmado. El personal del CAP ya dio los de Purulhá
Centro, que son siete:

```
Barrio El Calvario     Barrio La Cruz I
Barrio El Carpintero   Barrio La Cruz II
Barrio El Cementerio   Barrio San Antonio
Barrio El Centro
```

Entra uno que no estaba, "Barrio La Esperanza", y sale de la lista. **Que salga
de la lista no bastaba**: el script solo sabía crear y actualizar, así que un
nombre inventado seguía ofreciéndose en el formulario de alta para siempre
aunque se corrigiera el archivo. Ahora los lugares que ya no aparecen en la
lista de su comunidad se **desactivan**.

Desactivar y no borrar es deliberado: un paciente pudo quedar registrado en uno
de esos lugares, y su dirección tiene que seguir leyéndose aunque el lugar ya no
se ofrezca. El endpoint filtra por `activo`, así que desaparece del desplegable
sin romper ningún expediente.

**Los lugares de las demás comunidades siguen sin confirmar.** El aviso del
archivo ahora lo dice con esa precisión, en vez de marcar la lista entera como
dudosa.

Para aplicarlo en tu máquina: `npm run lugares -w @cap/usuarios`.

---

## 5. PR #17 — Identidad visual del panel

El panel funcionaba pero se veía sin dueño: nueve módulos que se abrían todos
igual, un título gris sobre fondo gris, y ningún elemento que dijera de qué
sistema se trata.

**No toca ni un flujo.** No hay cambios de backend, de rutas, de contratos ni
de lógica. Todo el color sale del `primary.main` que ya estaba en el tema
(`#15607a`). No se añadió ninguna dependencia.

### Componentes nuevos

| Archivo | Qué hace |
|---|---|
| `componentes/EncabezadoPagina.tsx` | La banda azul con título y descripción, más `NotaPagina` para textos sueltos |
| `componentes/LogoCap.tsx` | La marca, desde `public/logo-cap.png` |
| `componentes/AvatarUsuario.tsx` | Avatar con iniciales, color derivado del usuario, e indicador de presencia opcional |
| `componentes/Reloj.tsx` | Hora y fecha en la barra superior |
| `componentes/usarConexion.ts` | `navigator.onLine` como store de React |
| `componentes/menuAzul.ts` | `MENU_AZUL`, el estilo de los desplegables que filtran |

### Decisiones que conviene conocer antes de tocarlo

**La cabecera de tabla está en el tema, no en cada tabla.** Son diez tablas
repartidas entre recepción, farmacia, digitalización, administración y el
carnet de niñez. Puesto tabla por tabla, la siguiente que alguien agregue
nacería distinta. Está en `MuiTableCell.styleOverrides.head` de `tema.ts`.

**El indicador de presencia solo aparece donde la presencia es real.** En la
barra superior responde a `navigator.onLine`, que es la única señal de conexión
que existe hoy. En la lista de cuentas de Administración **no puse punto**: el
servidor no sabe quién está dentro ahora mismo, porque `auth.usuario.ultimo_acceso`
se escribe al iniciar sesión y quien entró a las siete y sigue trabajando se
vería igual que quien se fue a media mañana. Un punto verde ahí afirmaría algo
que nadie ha comprobado.

**El componente ya está listo para recibirla**: acepta `conectado`, y omitirlo
es lo que hace que no dibuje el punto. Ver §7.

**Los colores de estado en digitalización** son un semáforo: pendiente en rojo,
en proceso en café, completo en verde. "No localizado" va en pizarra, **fuera
del semáforo a propósito**: no es una etapa del trabajo sino un callejón sin
salida —la carpeta no apareció en el archivo—, y en rojo o café quedaría
mezclado con lo que sí se puede transcribir hoy.

**El fondo del acceso lleva la foto debajo de tres capas de tinte**, y el
degradado del final es el respaldo: es lo que se ve mientras el JPEG carga y lo
que queda si el archivo faltara. La pantalla nunca aparece en blanco.

Antes de esa foto se probaron dos que no servían, y quedó anotado en
`docs/diseno-acceso.md` para que nadie lo repita: un recorte de la propia
maqueta —salía en pasta porque el original ya venía desenfocado— y una imagen
con la marca de agua del servicio que la generó, repetida en diagonal por toda
la superficie. Publicar una marca ajena en la pantalla de acceso de un centro
de salud no es aceptable.

**Accesibilidad:** blanco sobre `#15607a` da 7.2:1, muy por encima del 4.5:1 de
la WCAG. El estado de conexión va también en `aria-label`, porque el color por
sí solo no comunica nada a quien no lo distingue. La cabecera del menú de
cuenta dejó de ser un `MenuItem` deshabilitado: los lectores de pantalla la
anunciaban como una opción más, apagada.

**El favicon.** Sin él el navegador ponía su globo y, con varias pestañas
abiertas, el sistema del CAP no se distinguía de cualquier otra página. Hay
tres tamaños en `public/`: 32 px para la pestaña, 256 para pantallas densas y
180 para iOS.

---

## 6. Cómo traer todo esto

```bash
git fetch origin --prune

# Uno por uno, o los cuatro de golpe si vas a fusionarlos ya
git checkout feature/rutas-prisma-trazabilidad
git checkout feature/mfa-doble-peticion
git checkout feature/barrios-purulha
git checkout feature/web-diseno
```

Después de fusionar `feature/barrios-purulha`, en tu máquina:

```bash
npm run lugares -w @cap/usuarios
```

Después de fusionar `feature/mfa-doble-peticion`, **reinicia el servicio de
auth** (`3001`): el cambio del secreto vive ahí y no se recarga solo.

Si alguna cuenta tuya quedó con el segundo factor a medio configurar por el
error, bórrale la configuración y vuelve a escanear el QR:

```sql
DELETE FROM auth.codigo_respaldo   WHERE usuario_id IN (SELECT id FROM auth.usuario WHERE usuario='admin');
DELETE FROM auth.configuracion_mfa WHERE usuario_id IN (SELECT id FROM auth.usuario WHERE usuario='admin');
```

---

## 7. Lo que queda pendiente

Nada de esto está a medias en el código: son decisiones que no tomé por mi
cuenta.

**Presencia real de usuarios en Administración.** El dato existe:
`auth.sesion_refresh` guarda las sesiones vivas de cada cuenta. Falta un
endpoint que liste los usuarios con sesión no expirada. `AvatarUsuario` solo
necesita que le pasen `conectado`; no hay que tocar el componente.

**Las sub-pantallas siguen sin la banda de encabezado**: Registrar paciente, el
expediente individual, y las de farmacia (Registrar entrega, detalle de
medicamento). Se ven distintas de sus pantallas padre. Es un cambio mecánico,
lo dejé fuera porque no estaba pedido.

**Los textos del acceso siguen sin tildes** ("Iniciar sesion", "Contrasena").
Cambiarlos obliga a actualizar `App.spec.tsx`, que los busca sin tilde con
`getByLabelText('Contrasena')`.

**En digitalización, "Estado" quedó relleno y "Transcribir" delineado**, así
que el botón secundario pesa más que la acción principal de la pantalla. Se
pidió así; lo dejo anotado por si al verlo en uso conviene invertirlo.

**Los lugares de las demás comunidades siguen inventados.** Solo los siete
barrios de Purulhá Centro están confirmados.

---

## 8. Una cosa del entorno que cuesta una hora

Si borras y recreas el contenedor de Postgres, hay que volver a habilitar
`pg_trgm` en `template1` **antes** de migrar:

```bash
docker exec cap-postgres psql -U postgres -d template1 -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

`prisma migrate dev` crea una base espejo desde `template1` para validar la
migración. Si la plantilla no trae la extensión, la validación revienta con un
error que parece de una migración vieja y se busca donde no es.

Y para comprobar el estado de las migraciones sin arriesgar nada, `prisma
migrate status` en vez de `migrate dev`: solo lee. `migrate dev` ofrece resetear
la base si detecta *drift*, y ahí se van los 100,000 pacientes de prueba.
