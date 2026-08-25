import pino, { Logger } from 'pino';

/**
 * Campos que NUNCA deben aparecer en un log.
 *
 * Un log con el DPI de un paciente es una fuga de datos sensibles tan real como
 * una consulta no autorizada, con el agravante de que los logs se copian,
 * se envian a herramientas externas y nadie los audita.
 */
const CAMPOS_OCULTOS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'contrasena',
  'contrasenaPlana',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'dpi',
  'dpiCifrado',
  'dpiIndice',
  'llaveDatos',
  'llaveIndice',
  'LLAVE_DATOS',
  'LLAVE_INDICE',
  'JWT_SECRET',
  'codigoTotp',
  'codigosRespaldo',
  'diagnostico',
  'notasClinicas',
  '*.contrasena',
  '*.token',
  '*.dpi',
];

/**
 * @param destino stream alternativo. Solo se usa en pruebas; en produccion
 *                pino escribe a stdout y el contenedor se encarga del resto.
 */
export function crearLogger(
  servicio: string,
  nivel = 'info',
  destino?: pino.DestinationStream,
): Logger {
  const opciones: pino.LoggerOptions = {
    name: servicio,
    level: nivel,
    redact: { paths: CAMPOS_OCULTOS, censor: '[OCULTO]' },
    formatters: {
      level: (etiqueta) => ({ nivel: etiqueta }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  return destino ? pino(opciones, destino) : pino(opciones);
}

export { CAMPOS_OCULTOS };
