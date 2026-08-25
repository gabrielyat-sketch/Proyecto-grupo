import { cargarEntorno, esquemaBase, esquemaCifrado } from '@cap/shared';
import { z } from 'zod';

const esquema = esquemaBase.merge(esquemaCifrado).extend({
  DIRECT_URL: z.string().optional(),
  NOMBRE_SERVICIO: z.string().default('programas'),

  /// URL interna del servicio de usuarios. Se consulta para validar que el
  /// paciente exista al inscribirlo en un programa.
  URL_USUARIOS: z.string().url().default('http://localhost:3002'),
  /// Timeout corto a proposito: si usuarios no responde, es preferible fallar
  /// rapido a dejar colgada la pantalla del personal.
  TIMEOUT_USUARIOS_MS: z.coerce.number().int().min(200).default(2000),
});

export type Entorno = z.infer<typeof esquema>;
export const ENTORNO = 'ENTORNO';

export function leerEntorno(): Entorno {
  return cargarEntorno(esquema);
}
