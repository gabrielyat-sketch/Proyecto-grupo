import type { components } from './generado/auth';

export type RespuestaError = components['schemas']['RespuestaErrorDto'];

/**
 * Codigo que el frontend puede encontrarse.
 *
 * Son los del servidor MAS uno propio: `SIN_CONEXION`. Ese no viene en el
 * contrato a proposito — el servidor no puede emitirlo, porque describe justo
 * el caso en que no respondio. Meterlo en el enum del backend seria ensuciar el
 * contrato con un estado que ese lado nunca produce.
 */
export type CodigoError = RespuestaError['codigo'] | 'SIN_CONEXION';

/** El cuerpo del error tal como lo maneja el panel. */
export type CuerpoError = Omit<RespuestaError, 'codigo'> & { codigo: CodigoError };

/**
 * Error de la API con el cuerpo ya interpretado.
 *
 * Los ocho servicios responden con el mismo formato (arquitectura §8.1), asi que
 * el manejo de errores se escribe una vez y no ocho.
 */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly cuerpo: CuerpoError,
  ) {
    super(cuerpo.mensaje);
    this.name = 'ErrorApi';
  }

  /** El mensaje en espanol del servidor, apto para mostrarse al usuario. */
  get mensaje(): string {
    return this.cuerpo.mensaje;
  }

  get codigo(): CodigoError {
    return this.cuerpo.codigo;
  }

  /** Detalle por campo, tipico de los errores de validacion. */
  get detalles(): string[] {
    return this.cuerpo.detalles ?? [];
  }

  /**
   * Identificador de correlacion. Mostrarlo en pantalla no es un lujo: es lo
   * unico que permite encontrar en los logs lo que le paso a esta persona.
   */
  get trazaId(): string {
    return this.cuerpo.trazaId;
  }

  /**
   * Los conflictos traen el identificador del registro que estorba, en la forma
   * `pacienteId:<uuid>`. Es lo que deja ofrecer "abrir el expediente existente"
   * en vez de dejar al usuario atascado con un mensaje de error.
   */
  detalle(clave: string): string | null {
    const prefijo = clave + ':';
    const encontrado = this.detalles.find((d) => d.startsWith(prefijo));
    return encontrado ? encontrado.slice(prefijo.length) : null;
  }

  /** true cuando ni siquiera hubo respuesta del servidor. */
  get sinConexion(): boolean {
    return this.cuerpo.codigo === 'SIN_CONEXION';
  }
}

const SIN_RESPUESTA = 0;

/** Cuando el servicio no responde no hay cuerpo que interpretar: se fabrica uno. */
export function errorDeRed(ruta: string): ErrorApi {
  return new ErrorApi(SIN_RESPUESTA, {
    codigo: 'SIN_CONEXION',
    mensaje: 'No se pudo contactar al servidor. Revise la conexion e intente de nuevo.',
    trazaId: '',
    ruta,
    fecha: new Date().toISOString(),
  });
}

export function esErrorApi(e: unknown): e is ErrorApi {
  return e instanceof ErrorApi;
}

/**
 * Convierte lo que devuelve openapi-fetch en un ErrorApi y lo lanza.
 *
 * `openapi-fetch` no lanza: entrega `{ data, error, response }`. Cada servicio
 * del panel tenia que traducir eso a mano, y todos lo hacian igual salvo por un
 * detalle —el estado quedaba fijo en 400—, lo que hacia que un 403 llegara a la
 * pantalla disfrazado de error de validacion. Con `response` a la vista, el
 * estado real se conserva.
 */
export function fallarApi(error: unknown, ruta: string, respuesta?: Response): never {
  if (error && typeof error === 'object' && 'mensaje' in error) {
    throw new ErrorApi(respuesta?.status ?? 400, error as CuerpoError);
  }
  throw errorDeRed(ruta);
}
