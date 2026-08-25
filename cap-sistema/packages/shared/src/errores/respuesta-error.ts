/**
 * Formato unico de error de toda la API (arquitectura §8.1).
 *
 * Un solo formato en los ocho servicios significa que el frontend escribe el
 * manejo de errores una vez, no ocho veces.
 */
export interface RespuestaError {
  /** Codigo estable, pensado para que el cliente decida que hacer. */
  codigo: string;
  /** Mensaje en espanol, apto para mostrarse al usuario. */
  mensaje: string;
  /** Detalles opcionales, tipicamente errores de validacion por campo. */
  detalles?: string[];
  /** Identificador de correlacion para encontrar la peticion en los logs. */
  trazaId: string;
  ruta: string;
  fecha: string;
}

export const CodigoError = {
  VALIDACION: 'VALIDACION',
  NO_AUTENTICADO: 'NO_AUTENTICADO',
  SIN_PERMISO: 'SIN_PERMISO',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  CONFLICTO: 'CONFLICTO',
  DEMASIADAS_PETICIONES: 'DEMASIADAS_PETICIONES',
  ERROR_INTERNO: 'ERROR_INTERNO',
} as const;
