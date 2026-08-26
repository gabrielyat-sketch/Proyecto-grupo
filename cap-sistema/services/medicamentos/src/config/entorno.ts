import { cargarEntorno, esquemaBase } from '@cap/shared';
import { z } from 'zod';

const esquema = esquemaBase.extend({
  DIRECT_URL: z.string().optional(),
  NOMBRE_SERVICIO: z.string().default('medicamentos'),

  URL_USUARIOS: z.string().url().default('http://localhost:3002'),
  TIMEOUT_USUARIOS_MS: z.coerce.number().int().min(200).default(2000),

  /**
   * Cuantos dias antes de vencer se considera que un lote esta "por vencer".
   *
   * 90 dias da margen para devolverlo al proveedor o redistribuirlo a otro
   * servicio de salud antes de que haya que darlo de baja.
   */
  DIAS_ALERTA_VENCIMIENTO: z.coerce.number().int().min(1).max(365).default(90),
});

export type Entorno = z.infer<typeof esquema>;
export const ENTORNO = 'ENTORNO';

export function leerEntorno(): Entorno {
  return cargarEntorno(esquema);
}
