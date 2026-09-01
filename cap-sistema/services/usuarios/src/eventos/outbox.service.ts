import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generado';

/** Eventos que publica este servicio (docs/eventos/esquema-eventos.md). */
export const Evento = {
  PACIENTE_CREADO: 'paciente.creado',
  ATENCION_REGISTRADA: 'atencion.registrada',
  EXPEDIENTE_DIGITALIZADO: 'expediente.digitalizado',
} as const;

export type TipoEvento = (typeof Evento)[keyof typeof Evento];

/**
 * Escritura de eventos en la bandeja de salida.
 *
 * SIEMPRE se llama con el cliente de una transaccion en curso, nunca con el
 * cliente global. Ese es todo el punto del patron: si el evento se escribiera
 * fuera de la transaccion, un fallo entre el COMMIT y la escritura del evento
 * dejaria el indicador desfasado de forma permanente y silenciosa.
 *
 * El publicador que lleva estos eventos al bus llega en la Etapa 10.
 */
@Injectable()
export class OutboxService {
  registrar(
    tx: Prisma.TransactionClient,
    tipo: TipoEvento,
    datos: Record<string, unknown>,
    trazaId?: string,
  ) {
    return tx.outbox.create({
      data: { tipo, datos: datos as Prisma.InputJsonValue, trazaId: trazaId?.slice(0, 64) },
    });
  }
}
