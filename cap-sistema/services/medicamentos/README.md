# medicamentos — Servicio de Medicamentos

**Puerto:** 3004 · **Requerimiento:** RF-02 · **Esquema:** `medicamentos`

Inventario por lotes, control de vencimientos y entregas a pacientes.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/v1/medicamentos` | Todo el personal clínico |
| `GET` | `/v1/medicamentos/bajo-minimo` | Todo el personal clínico |
| `GET` | `/v1/medicamentos/:id` | Todo el personal clínico |
| `POST` `PATCH` | `/v1/medicamentos` · `/v1/medicamentos/:id` | Farmacia, Administrador |
| `POST` | `/v1/medicamentos/:id/lotes` | Farmacia, Administrador |
| `GET` | `/v1/lotes/por-vencer?dias=` | Farmacia, Admin, Dirección |
| `GET` | `/v1/lotes/vencidos` | Farmacia, Admin, Dirección |
| `PATCH` | `/v1/lotes/:id/baja` | Farmacia, Administrador |
| `GET` `POST` | `/v1/entregas` | Alta: **solo Farmacia y Admin** |
| `GET` | `/v1/inventario/movimientos` | Farmacia, Admin, Dirección |

**Recepción no entra.** El médico **sí puede consultar existencias**: si no sabe qué hay, receta lo
que la farmacia no tiene.

## La regla central: FEFO, no FIFO

El personal pide *"20 tabletas de amoxicilina"*. **El sistema elige de qué lotes salen**, con
criterio **FEFO** (*First Expired, First Out*): primero el que vence antes.

No es FIFO. Da igual cuál entró primero: si el lote que llegó ayer vence en dos meses y el que llegó
hace un año vence en dos años, se entrega el de ayer. Usar FIFO aquí hace que el CAP tire
medicamento vigente mientras dispensa del que le sobraba tiempo.

Dejar que el usuario elija el lote a mano tiene el mismo efecto: siempre se toma el primero de la
lista y el resto vence en el estante.

### Reglas que aplica la selección

- **Nunca** toma de un lote vencido, aunque con él alcanzara de sobra.
- El lote que vence **hoy** sí se puede entregar: vence al final del día. Descartarlo un día antes
  tira medicamento utilizable, y el abastecimiento del CAP no da para eso.
- Salta lotes sin existencia.
- Si un solo medicamento de la receta no alcanza, **no se entrega ninguno**. Una entrega a medias
  deja al paciente con parte del tratamiento y descuenta inventario por algo que no resolvió la
  receta.

## El problema de concurrencia, y cómo se resuelve

Dos personas de farmacia despachando al mismo tiempo pueden haber leído la misma existencia. Con un
`leer → restar → escribir`, el segundo pisa al primero y el inventario queda mal o en negativo.

El descuento se hace con una **sentencia condicional atómica**:

```sql
UPDATE medicamentos.lote
SET cantidad_disponible = cantidad_disponible - $1
WHERE id = $2 AND cantidad_disponible >= $1
```

La comprobación y el descuento ocurren en la misma sentencia. Si devuelve **0 filas**, alguien se
adelantó: la transacción completa se deshace y el usuario recibe un 409 pidiéndole reintentar.

Hay una prueba que lanza **dos entregas simultáneas** de 8 unidades sobre un lote de 10: una recibe
201, la otra 409, y la existencia queda en 2 — nunca en negativo.

> **Sin `::uuid` en el `id`.** Prisma mapea `String @id` a `TEXT`, no a `UUID`. El cast rompe la
> comparación con `operator does not exist: text = uuid`.

## Decisiones de modelo

### El lote es la unidad de control, no el medicamento

Dos lotes de la misma amoxicilina vencen en fechas distintas. Guardar la existencia en el
medicamento haría imposible el control de vencimiento, que es el requerimiento.

### Existencia desnormalizada + libro mayor

`lote.cantidadDisponible` también podría calcularse sumando `movimiento_inventario`. Está
desnormalizada a propósito: la farmacia necesita la respuesta **con el paciente enfrente**, y sumar
el libro mayor completo sería lento en cuanto haya años de movimientos.

El libro mayor sigue existiendo para trazabilidad y reconciliación: **toda** modificación de la
existencia escribe su movimiento en la misma transacción, con la cantidad resultante. Es lo que se
revisa cuando el conteo físico no cuadra con el sistema.

### Una receta es UNA entrega

`Entrega` (cabecera) + `DetalleEntrega` (líneas). Un paciente que sale con tres medicamentos es una
entrega, no tres. Contarlas por medicamento inflaría el indicador de atenciones de farmacia.

### Los lotes vencidos NO se dan de baja solos

Dar de baja medicamento es una decisión con responsable, y el sistema no puede tomarla en nombre de
nadie. Lo que sí hace: no dejar que se entreguen, y listarlos en `/v1/lotes/vencidos` para que
alguien actúe.

### Este servicio no cifra nada

Un inventario no es dato sensible del paciente: el nombre de un medicamento no identifica a nadie.
Lo único ligado a una persona es el `pacienteId` de la entrega, que ya es un identificador opaco.

Por eso no declara `LLAVE_DATOS` ni `LLAVE_INDICE`: pedir llaves que no se usan solo aumenta la
superficie de configuración que puede quedar mal.

### Alerta de existencia mínima

Un mínimo en **cero desactiva la alerta**. Hay medicamentos que el CAP no mantiene en existencia
permanente, y avisar por ellos solo entrena al personal a ignorar las alertas.

## Poner en marcha

```bash
cp .env.example .env
npx prisma migrate dev
npm run build -w @cap/medicamentos
node dist/main.js            # http://localhost:3004/docs
```

Necesita el servicio `usuarios` levantado en el 3002 (`URL_USUARIOS`), que se consulta para validar
el paciente al registrar una entrega.

## Pruebas

```bash
npm test -w @cap/medicamentos             # 36 unitarias (27 de FEFO)
npm run test:e2e -w @cap/medicamentos     # 35 e2e contra PostgreSQL real
```

## Pendiente

- Registrar en trazabilidad los ingresos, entregas y bajas (RF-09, Etapa 9).
- El evento `lote.por.vencer` está definido pero **no se emite**: hace falta un proceso programado
  que lo publique. Hoy la información se obtiene consultando `/v1/lotes/por-vencer`.
- Devoluciones de medicamento no entregado: el tipo de movimiento `DEVOLUCION` existe en el modelo,
  falta el endpoint.
