import { cargarEntorno, esquemaBase, esquemaCifrado } from '@cap/shared';
import { z } from 'zod';

/**
 * Configuracion del servicio de trazabilidad, validada al arrancar.
 *
 * Si falta una llave, el servicio muere aqui. Arrancar sin poder cifrar los
 * valores clinicos de la bitacora seria peor que no arrancar: quedarian en
 * claro registros que nadie puede borrar despues.
 */
const esquema = esquemaBase.merge(esquemaCifrado).extend({
  DIRECT_URL: z.string().optional(),
  NOMBRE_SERVICIO: z.string().default('trazabilidad'),

  /**
   * Firma del hash raiz diario (arquitectura §9.5). Es una llave distinta de
   * LLAVE_DATOS: comprometer el cifrado de los valores no debe alcanzar para
   * volver a firmar la raiz y borrar el rastro de una alteracion.
   */
  LLAVE_RAIZ_TRAZA: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'LLAVE_RAIZ_TRAZA debe ser 64 caracteres hex'),
});

export type Entorno = z.infer<typeof esquema>;

export const ENTORNO = 'ENTORNO';

export function leerEntorno(): Entorno {
  return cargarEntorno(esquema);
}
