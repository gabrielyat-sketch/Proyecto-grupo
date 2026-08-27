import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generado';

export const Evento = {
  MEDICAMENTO_ENTREGADO: 'medicamento.entregado',
  LOTE_INGRESADO: 'lote.ingresado',
  LOTE_POR_VENCER: 'lote.por.vencer',
  LOTE_DADO_DE_BAJA: 'lote.dado.de.baja',
} as const;

export type TipoEvento = (typeof Evento)[keyof typeof Evento];

/**
 * Bandeja de salida. Siempre se llama con el cliente de una transaccion en
 * curso: si el evento se escribiera fuera, un fallo entre el COMMIT y la
 * escritura dejaria el indicador desfasado de forma permanente y silenciosa.
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
