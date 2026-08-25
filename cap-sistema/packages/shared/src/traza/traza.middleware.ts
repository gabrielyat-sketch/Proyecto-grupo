import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const CABECERA_TRAZA = 'x-traza-id';

/**
 * Asigna un identificador de correlacion a cada peticion.
 *
 * Con ocho microservicios, un error sin trazaId es practicamente imposible de
 * seguir: la peticion pasa por el gateway, un servicio, quiza otro, y el bus de
 * eventos. El mismo trazaId aparece en todos los logs de esa cadena.
 */
@Injectable()
export class MiddlewareTraza implements NestMiddleware {
  use(peticion: any, respuesta: any, siguiente: () => void): void {
    const recibido = peticion.headers?.[CABECERA_TRAZA];
    const trazaId = (Array.isArray(recibido) ? recibido[0] : recibido) || randomUUID();
    peticion.trazaId = trazaId;
    respuesta.setHeader(CABECERA_TRAZA, trazaId);
    siguiente();
  }
}
