import { cargarEntorno, esquemaBase, esquemaCifrado } from '@cap/shared';
import { z } from 'zod';

const esquema = esquemaBase.merge(esquemaCifrado).extend({
  DIRECT_URL: z.string().optional(),
  NOMBRE_SERVICIO: z.string().default('usuarios'),
});

export type Entorno = z.infer<typeof esquema>;
export const ENTORNO = 'ENTORNO';

export function leerEntorno(): Entorno {
  return cargarEntorno(esquema);
}
