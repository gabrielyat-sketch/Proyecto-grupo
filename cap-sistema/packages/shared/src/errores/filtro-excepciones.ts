import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FalloDeAuditoria } from '../auditoria/cliente-auditoria';
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

    if (excepcion instanceof FalloDeAuditoria) {
      // 503 y no 500: no es un fallo de esta operacion, es que un servicio del
      // que depende no esta respondiendo. El cambio no se guardo, y reintentar
      // es lo correcto — que es justo lo que dice el mensaje de la excepcion.
      estado = HttpStatus.SERVICE_UNAVAILABLE;
      codigo = CodigoError.AUDITORIA_NO_DISPONIBLE;
      mensaje = excepcion.message;
    } else if (excepcion instanceof HttpException) {
      estado = excepcion.getStatus();
      const cuerpo = excepcion.getResponse();
      codigo = FiltroExcepciones.codigoPorEstado(estado);

      if (typeof cuerpo === 'string') {
        mensaje = cuerpo;
      } else if (cuerpo && typeof cuerpo === 'object') {
        const c = cuerpo as {
          message?: string | string[];
          mensaje?: string;
          detalles?: string[];
          codigo?: string;
        };

        if (Array.isArray(c.message)) {
          // Formato de class-validator: una linea por campo invalido.
          mensaje = 'La informacion enviada no es valida.';
          detalles = c.message;
        } else if (typeof c.message === 'string') {
          mensaje = c.message;
        }

        // Los servicios de este proyecto escriben en espanol. Sin esta rama,
        // lanzar new ConflictException({ mensaje: '...' }) devolvia el mensaje
        // generico de error interno y el detalle se perdia en silencio.
        if (typeof c.mensaje === 'string') mensaje = c.mensaje;
        if (Array.isArray(c.detalles)) detalles = c.detalles;
        if (typeof c.codigo === 'string') codigo = c.codigo;
      }
    }

    if (estado >= HttpStatus.INTERNAL_SERVER_ERROR && !(excepcion instanceof FalloDeAuditoria)) {
      // El detalle real se registra, no se devuelve.
      //
      // El fallo de auditoria queda fuera: el cliente ya lo registro con su
      // causa real —timeout, 500 de trazabilidad, red caida—, y volver a
      // escribirlo aqui como "Error no controlado" solo entierra esa linea
      // util bajo otra que no dice nada.
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
