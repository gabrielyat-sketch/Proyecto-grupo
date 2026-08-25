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
| `control.prenatal.registrado` | programas |
| `control.hipertension.registrado` | programas |
| `medicion.nutricional.registrada` | programas |
| `medicamento.entregado` | medicamentos |
| `lote.por.vencer` | medicamentos |

Consumidor de todos: **reportes**.

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
