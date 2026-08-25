import { z } from 'zod';

/**
 * Validacion de la configuracion al arrancar.
 *
 * El servicio debe fallar de inmediato si le falta una variable, no tres horas
 * despues cuando alguien intente cifrar un DPI y descubra que LLAVE_DATOS
 * estaba vacia. Fallar rapido y ruidoso es preferible a arrancar a medias.
 */
export const esquemaBase = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PUERTO: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRACION: z.string().default('15m'),
});

/** Variables extra para los servicios que manejan campos cifrados. */
export const esquemaCifrado = z.object({
  LLAVE_DATOS: z.string().regex(/^[0-9a-fA-F]{64}$/, 'LLAVE_DATOS debe ser 64 caracteres hex'),
  LLAVE_INDICE: z.string().regex(/^[0-9a-fA-F]{64}$/, 'LLAVE_INDICE debe ser 64 caracteres hex'),
});

export type EntornoBase = z.infer<typeof esquemaBase>;

/**
 * Valida las variables de entorno contra un esquema y devuelve el resultado
 * tipado. Si algo falta o esta mal, lanza con la lista completa de problemas
 * en vez de reportarlos de uno en uno.
 */
export function cargarEntorno<T extends z.ZodTypeAny>(esquema: T, fuente: NodeJS.ProcessEnv = process.env): z.infer<T> {
  const resultado = esquema.safeParse(fuente);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((i) => '  - ' + i.path.join('.') + ': ' + i.message)
      .join('\n');
    throw new Error('Configuracion invalida. El servicio no puede arrancar:\n' + problemas);
  }
  return resultado.data;
}
