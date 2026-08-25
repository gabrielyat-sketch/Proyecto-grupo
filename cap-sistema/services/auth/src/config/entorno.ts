import { cargarEntorno, esquemaBase, esquemaCifrado } from '@cap/shared';
import { z } from 'zod';

const esquema = esquemaBase.merge(esquemaCifrado).extend({
  DIRECT_URL: z.string().optional(),
  NOMBRE_SERVICIO: z.string().default('auth'),

  /// Secreto APARTE para el token parcial que se emite entre el paso de
  /// contrasena y el de MFA. Al firmarse con otra llave, ese token no lo
  /// acepta ningun otro servicio del sistema.
  JWT_SECRET_MFA: z.string().min(32, 'JWT_SECRET_MFA debe tener al menos 32 caracteres'),
  MFA_TOKEN_EXPIRACION: z.string().default('5m'),

  MAX_INTENTOS_FALLIDOS: z.coerce.number().int().min(3).default(5),
  VENTANA_INTENTOS_MINUTOS: z.coerce.number().int().min(1).default(15),
  MINUTOS_BLOQUEO: z.coerce.number().int().min(1).default(15),

  REFRESH_EXPIRACION_DIAS: z.coerce.number().int().min(1).default(7),
});

export type Entorno = z.infer<typeof esquema>;
export const ENTORNO = 'ENTORNO';

export function leerEntorno(): Entorno {
  const env = cargarEntorno(esquema);
  if (env.JWT_SECRET === env.JWT_SECRET_MFA) {
    throw new Error(
      'JWT_SECRET y JWT_SECRET_MFA no pueden ser iguales: el token parcial de ' +
        'MFA quedaria siendo un token de acceso valido en todo el sistema.',
    );
  }
  return env;
}
