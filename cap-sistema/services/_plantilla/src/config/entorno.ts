import { cargarEntorno, esquemaBase } from '@cap/shared';
import { z } from 'zod';

/**
 * Configuracion del servicio, validada al arrancar.
 *
 * Se extiende el esquema base con lo propio del servicio. Al generar un
 * servicio nuevo desde esta plantilla, se agregan aqui sus variables.
 */
const esquema = esquemaBase.extend({
  DIRECT_URL: z.string().optional(),
  NOMBRE_SERVICIO: z.string().default('plantilla'),
});

export type Entorno = z.infer<typeof esquema>;

export const ENTORNO = 'ENTORNO';

export function leerEntorno(): Entorno {
  return cargarEntorno(esquema);
}
