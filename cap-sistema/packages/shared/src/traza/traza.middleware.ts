import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const CABECERA_TRAZA = 'x-traza-id';

/**
 * Lo unico que se acepta de fuera como identificador. La columna traza_id de
 * la bitacora es VarChar(64): una cabecera mas larga (o con cualquier cosa
 * que no sea un id) haria fallar el INSERT de auditoria y la peticion entera
 * volveria como 503. Si no cumple, se genera uno propio; el cliente no pierde
 * nada porque el que vale se le devuelve en la respuesta.
 */
const TRAZA_VALIDA = /^[A-Za-z0-9-]{1,64}$/;

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
    const propuesto = Array.isArray(recibido) ? recibido[0] : recibido;
    const trazaId = typeof propuesto === 'string' && TRAZA_VALIDA.test(propuesto) ? propuesto : randomUUID();
    peticion.trazaId = trazaId;
    respuesta.setHeader(CABECERA_TRAZA, trazaId);
    siguiente();
  }
}
