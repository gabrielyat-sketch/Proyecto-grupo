# ADR-002 — La auditoría va dentro de la transacción

**Estado:** Aceptada
**Fecha:** 2026-09-07

## Contexto

El RF-09 exige que todo cambio de dato clínico, toda consulta de expediente y toda impresión o
exportación queden registrados con usuario, fecha, acción y motivo. El servicio `trazabilidad`
(puerto 3007) ya existe, con su cadena de hash y su garantía de *append-only* sostenida por permisos
de PostgreSQL, y `@cap/shared` ya trae el `ClienteAuditoria` que sabe hablarle.

Lo que no existía era la llamada: **ningún servicio importaba el cliente**. La Etapa 9 estaba
construida y desconectada, así que el sistema podía crear cuentas, cambiar roles y restablecer
contraseñas sin dejar rastro de quién lo hizo.

Al cablearlo aparece la pregunta que este documento cierra: **¿dónde se llama a la bitácora respecto
del cambio que se está guardando?**

## Decisión

**Dentro de la misma transacción de base de datos que el cambio.**

Cuando el registro falla, la excepción se propaga y la transacción se deshace: el cambio de negocio
no llega a existir.

```ts
await this.prisma.$transaction(async (tx) => {
  const creado = await tx.usuario.create({ ... });
  await this.auditoria.registrar({ ... }, contexto.autorizacion, contexto.trazaId);
  return creado;
}, { timeout: 10_000 });
```

## Motivos

1. **Un dato clínico modificado sin autor conocido es el estado que el RF-09 existe para impedir.**
   Si el cambio se guarda y el registro no, el sistema acaba de producir exactamente eso, y nadie se
   entera hasta que alguien audite meses después y encuentre un hueco.
2. **La política ya estaba decidida en el código.** `ClienteAuditoria` distingue desde el principio
   entre acciones que exigen registro —`CREACION`, `MODIFICACION`, `ELIMINACION`, `IMPRESION`,
   `EXPORTACION`— y la `CONSULTA`, que continúa aunque la bitácora esté caída para no dejar al CAP
   sin poder atender. Esta decisión es la que hace que esa distinción signifique algo.
3. **Es reversible en el sentido correcto.** Pedirle al médico que reintente es molesto; dejar el
   expediente en un estado que nadie puede explicar, no tiene arreglo.

## Consecuencias

- **Una transacción de base de datos queda abierta mientras se espera una petición HTTP.** Es el
  costo real de esta decisión y hay que decirlo en voz alta: bajo carga, transacciones largas
  ocupan conexiones del pool. Se acota por dos lados — `AUDITORIA_TIMEOUT_MS` tiene un tope de 5 s
  (2 s por defecto), y la transacción se amplía a 10 s para que el caso de "trazabilidad tarda pero
  responde" muera por el límite del cliente y no por el de la transacción, con un error que sí dice
  lo que pasó.
- **Si `trazabilidad` se cae, las acciones administrativas dejan de completarse.** Responden 503
  `AUDITORIA_NO_DISPONIBLE` con un mensaje que pide reintentar. Atender pacientes NO se detiene: las
  consultas siguen funcionando.
- **`MfaService.reiniciar` acepta ahora un cliente de transacción.** Sin eso, el borrado del segundo
  factor y su registro no podían caer juntos.
- El volumen previsto ya estaba contemplado en la arquitectura (§9.5): ~3.6 millones de filas, la
  tabla que más crece del sistema.

## Alternativas descartadas

**Registrar después de confirmar el cambio.** Es lo más simple y lo más rápido, y deja abierta
justo la ventana que el RF-09 prohíbe: el cambio guardado, la bitácora caída, y ningún rastro.

**Registrar antes del cambio.** Cierra esa ventana pero abre la contraria: una bitácora
*append-only* que afirma que ocurrió algo que luego falló. Un registro que no se puede corregir es
peor cuando miente que cuando falta.

**Patrón outbox** — escribir la entrada en una tabla local dentro de la transacción y que un proceso
aparte la envíe a `trazabilidad`. Da la misma garantía de "no hay cambio sin rastro" —la fila cae
con el commit— sin sostener la transacción durante una llamada HTTP.

Y hay que decir que **media infraestructura ya existe**: `usuarios`, `programas` y `medicamentos`
tienen tabla `outbox` y su `OutboxService`, que se escribe siempre con el cliente de la transacción
en curso, por exactamente el mismo razonamiento que sostiene este ADR. Lo que falta es **el
publicador que vacía esa bandeja, y llega en la Etapa 10**; hasta entonces las filas se acumularían
sin que nadie las entregue, y una bitácora que se escribirá "cuando exista el publicador" no es una
bitácora. `auth` —el servicio de este PR— además no tiene outbox ni tabla ni módulo.

Se descarta **por ahora**, entonces, no por diseño sino por orden: cuando la Etapa 10 traiga el
publicador, mover la auditoría al outbox es un cambio local en cada servicio y esta decisión debería
revisarse. Queda anotado como la evolución esperada.

Hay una diferencia real entre las dos, y conviene tenerla presente al decidir: con el outbox la
operación se completa aunque `trazabilidad` esté caída, y el rastro llega después. Con la llamada
síncrona la operación no ocurre. La segunda es más estricta; la primera es más disponible.

## Las lecturas van al revés, y a propósito

Todo lo anterior vale para las **escrituras**. Una consulta de expediente se registra con la regla
contraria: **la llamada no se espera y la lectura no se bloquea.**

```ts
registrarConsulta(this.auditoria, { entidad: 'expediente', entidadId }, contexto);
// La lectura sigue. Nadie espera a la bitácora.
```

Dos razones, y la primera ya estaba escrita en el `ClienteAuditoria` antes de este trabajo:

1. **Aplicar la regla estricta dejaría al CAP sin poder atender** cuando un servicio secundario se
   cae. El personal no podría ni abrir el expediente del paciente que tiene delante. Se elige perder
   trazabilidad de lecturas antes que perder capacidad de atención.
2. **Esperar cuesta en cada consulta del día.** Hasta dos segundos añadidos a cada apertura de
   expediente, y a cambio no evita ningún dato huérfano: la lectura ya ocurrió, registrarla un
   instante después la describe igual de bien.

**Un caso que hay que decidir explícitamente:** `AntecedentesService.obtener` y
`CarnetService.obtener` los llama también el propio guardado, para devolver lo que acaba de
escribir. Esa relectura no la pidió nadie. Por eso las dos reciben un `contexto` que puede ser
`null` —"esto no es una consulta de expediente"— y el guardado lo pasa así: sin eso, cada escritura
emitiría además una `CONSULTA` fantasma, inflando la tabla que más crece del sistema con lecturas
que nunca ocurrieron.

Se registra **el hallazgo, no la búsqueda**: un número de expediente mal tecleado no es una consulta
de expediente y llenaría la bitácora de erratas.

## Lo que la bitácora guarda, y lo que no

**Guarda el qué, el quién y el cuándo. No copia el contenido clínico.**

Un diagnóstico, el motivo de consulta, las notas o el detalle de un antecedente ya viven cifrados en
su propia tabla. Duplicarlos en la bitácora tiene tres problemas, y el segundo es el que decide:

1. Multiplica la tabla que más crece del sistema (§9.5: ~3.6 millones de filas).
2. **La bitácora es append-only.** Una copia ahí no se puede corregir nunca. Un diagnóstico mal
   tecleado se arregla en el expediente y queda fijado para siempre en el único sitio que nadie
   puede tocar.
3. Amplía la superficie del dato más sensible del sistema a un segundo almacén.

Lo que sí se registra son los identificadores y la forma del cambio: qué antecedentes se tocaron,
qué dosis se anotaron **y cuáles se borraron** —una fecha en `null` borra la dosis, y es el único
caso en que un dato clínico desaparece—, de qué tipo era la ficha, a qué expediente y paciente
pertenece.

**Esto es una lectura parcial de la §10.4**, que pide "valor anterior y nuevo". Se cumple para la
forma del cambio, no para el contenido. Cerrar esa distancia de verdad exige una decisión que no es
técnica: cuánto tiempo el CAP debe conservar copias del texto clínico en un almacén que no admite
correcciones. Queda como pregunta abierta, no como olvido.

## Alcance

**Entregado:**

- `auth` — las cuatro acciones administrativas: crear cuenta, actualizar datos/rol/estado, reiniciar
  segundo factor y restablecer contraseña.
- `usuarios` — las cuatro escrituras de dato clínico: registrar una atención, guardar una ficha
  completa, capturar antecedentes y anotar el carnet.
- `usuarios` — las consultas de expediente: búsqueda por número, historial, apertura de una ficha,
  antecedentes, carnet y gráfica de peso para edad.

**Falta:**

- El resto de escrituras de `usuarios`: pacientes, visitas, grupos familiares, comunidades y el
  marcado de digitalización.
- **Impresión y exportación.** La §10.4 las nombra aparte y con razón —el papel sale del sistema y
  ya no hay control técnico sobre él—. Hoy no existe ninguna pantalla que imprima, así que no hay
  dónde ponerlo todavía.
- `programas` y `medicamentos`.
- **El `motivo` todavía no lo escribe una persona.** §10.4 lo exige y hoy se registra una constante
  por acción ("Alta de cuenta desde Administracion"). Capturar el motivo real obliga a añadir el
  campo a los DTO y una casilla a las pantallas: es un cambio de contrato y de interfaz, y se deja
  para su propio PR.
