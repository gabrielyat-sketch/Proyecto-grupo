# Esquema de eventos

Los eventos alimentan el modelo de lectura del Servicio de Reportes (arquitectura §3.1, §8.3).
Transporte: **Redis Streams**.

## Por qué existen

Con una base de datos por servicio, Reportes **no puede** hacer un JOIN entre expedientes,
programas y medicamentos. En lugar de encadenar cuatro llamadas HTTP por cada consulta del panel,
cada servicio publica lo que ocurre y Reportes mantiene sus propios indicadores ya calculados.

## Sobre público / emisor

| Evento | Emisor |
|---|---|
| `paciente.creado` | usuarios |
| `atencion.registrada` | usuarios |
| `expediente.digitalizado` | usuarios |
| `ficha.prenatal.registrada` | usuarios |
| `control.prenatal.registrado` | programas |
| `control.hipertension.registrado` | programas |
| `medicion.nutricional.registrada` | programas |
| `medicamento.entregado` | medicamentos |
| `lote.por.vencer` | medicamentos |

Consumidor de todos: **reportes**. Además, `programas` consume `ficha.prenatal.registrada` para
registrar el control prenatal en el seguimiento del embarazo sin que nadie lo capture dos veces
(decisión 3 de `docs/diseno-ficha-prenatal.md`).

## Transporte, tal como está construido

Vive en `packages/shared/src/eventos/` y lo montan los servicios con `ModuloEventos.paraServicio`.

- **Un solo stream, `eventos`**, con un **grupo de consumo por servicio** (`programas`, y `reportes`
  cuando exista). Cada grupo lee todo y descarta lo que no es suyo, que es comparar una cadena. Un
  stream por tipo obligaría a cada consumidor a saber de antemano la lista de tipos que le interesan.
- **`PublicadorOutbox`** corre dentro del servicio emisor (`PublicadorService` en `usuarios`): lee
  las filas con `publicado_en` nulo en orden de ocurrencia, hace `XADD` y marca la fila. Si el
  `XADD` falla, suma `intentos` y se detiene ahí para no desordenar; si el servicio muere entre el
  `XADD` y la marca, la fila se vuelve a publicar. Eso es *al menos una vez*, a propósito.
- **`ConsumidorEventos`** corre dentro del servicio consumidor (`ConsumidorService` en
  `programas`): `XREADGROUP` bloqueante, `XACK` solo cuando el manejador terminó sin lanzar. Lo que
  quedó entregado y sin confirmar —un consumidor que murió, un manejador que lanzó— se reclama
  pasado un minuto, hasta cinco veces; después se copia a **`eventos.fallidos`** con el motivo y se
  confirma, para que no bloquee a los que vienen detrás. Nada se descarta en silencio.
- El stream se recorta a unas cien mil entradas (`MAXLEN ~`). Lo recortado ya fue publicado: la
  fuente de verdad sigue siendo el outbox.
- Sin `REDIS_URL` el servicio arranca desconectado y lo avisa; en producción se niega a arrancar,
  con la misma regla que `URL_TRAZABILIDAD`.

## Forma del mensaje

```json
{
  "id": "uuid del evento",
  "tipo": "atencion.registrada",
  "version": 1,
  "ocurridoEn": "2026-08-25T14:32:00Z",
  "trazaId": "uuid de correlacion",
  "origen": "usuarios",
  "datos": { }
}
```

`datos` cambia según el tipo. `version` permite evolucionar el contrato sin romper al consumidor.

## Outbox transaccional — no es opcional

El emisor escribe el evento en una tabla `outbox` **dentro de la misma transacción** que el cambio
de negocio. Un proceso aparte lo publica después.

Sin outbox, si el servicio cae entre el `COMMIT` y el `publish`, el evento se pierde y el indicador
de salud queda mal **para siempre y en silencio**. Ese es el escenario que este patrón evita.

## Reconciliación nocturna

Un proceso recalcula los indicadores desde la fuente y corrige cualquier desfase. Es la red de
seguridad: aunque se pierda un evento, al día siguiente el número vuelve a ser correcto.

## Idempotencia

El consumidor registra los `id` procesados en `EventoProcesado`. Si un evento llega dos veces,
se descarta. Redis Streams garantiza entrega *al menos una vez*, no *exactamente una vez*.

La tabla se escribe **en la misma transacción que el cambio de negocio** que el evento provocó; por
eso vive en cada servicio consumidor y no en `shared`. En `programas` guarda además el resultado
—`APLICADO` o `DESCARTADO`— y un detalle sin datos clínicos: qué control se creó, o por qué no
(«la paciente no tiene un seguimiento de embarazo activo»). Lo descartado queda anotado, no perdido.
