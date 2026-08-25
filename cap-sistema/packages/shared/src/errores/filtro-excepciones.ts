import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CodigoError, RespuestaError } from './respuesta-error';

/**
 * Convierte cualquier excepcion en el formato unico de error.
 *
 * Regla de seguridad: un error inesperado NUNCA expone su mensaje interno al
 * cliente. El detalle real va al log con el mismo trazaId, de modo que el
 * equipo puede encontrarlo sin que un atacante vea rutas de archivo, nombres de
 * tabla ni fragmentos de consultas SQL.
 */
@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepciones.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const respuesta = ctx.getResponse();
    const peticion = ctx.getRequest();

    const trazaId: string = peticion?.trazaId ?? peticion?.headers?.['x-traza-id'] ?? 'sin-traza';
    const ruta: string = peticion?.url ?? '';

    let estado = HttpStatus.INTERNAL_SERVER_ERROR;
    let codigo: string = CodigoError.ERROR_INTERNO;
    let mensaje = 'Ocurrio un error inesperado. El equipo tecnico fue notificado.';
    let detalles: string[] | undefined;

    if (excepcion instanceof HttpException) {
      estado = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      codigo = FiltroExcepciones.codigoPorEstado(estado);

      if (typeof cuerpo === 'string') {
        mensaje = cuerpo;
      } else if (cuerpo && typeof cuerpo === 'object') {
        const c = cuerpo as { message?: string | string[]; codigo?: string };
        if (Array.isArray(c.message)) {
          mensaje = 'La informacion enviada no es valida.';
          detalles = c.message;
        } else if (typeof c.message === 'string') {
          mensaje = c.message;
        }
        if (typeof c.codigo === 'string') codigo = c.codigo;
      }
    }

    if (estado >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // El detalle real se registra, no se devuelve.
      this.logger.error(
        { trazaId, ruta, error: excepcion instanceof Error ? excepcion.message : excepcion },
        'Error no controlado',
      );
    }

    const cuerpo: RespuestaError = {
      codigo,
      mensaje,
      ...(detalles ? { detalles } : {}),
      trazaId,
      ruta,
      fecha: new Date().toISOString(),
    };

    respuesta.status(estado).json(cuerpo);
  }

  private static codigoPorEstado(estado: number): string {
    switch (estado) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return CodigoError.VALIDACION;
      case HttpStatus.UNAUTHORIZED:
        return CodigoError.NO_AUTENTICADO;
      case HttpStatus.FORBIDDEN:
        return CodigoError.SIN_PERMISO;
      case HttpStatus.NOT_FOUND:
        return CodigoError.NO_ENCONTRADO;
      case HttpStatus.CONFLICT:
        return CodigoError.CONFLICTO;
      case HttpStatus.TOO_MANY_REQUESTS:
        return CodigoError.DEMASIADAS_PETICIONES;
      default:
        return CodigoError.ERROR_INTERNO;
    }
  }
}
