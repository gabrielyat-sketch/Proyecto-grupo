import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CABECERA_TRAZA } from '@cap/shared';
import { ENTORNO, Entorno } from '../config/entorno';

export interface PacienteResumen {
  id: string;
  nombres: string;
  apellidos: string;
  edad: number;
  sexo: 'M' | 'F';
  comunidad: { id: string; nombre: string };
}

export const CLIENTE_PACIENTES = 'CLIENTE_PACIENTES';

export interface IClientePacientes {
  obtener(pacienteId: string, autorizacion: string, trazaId?: string): Promise<PacienteResumen>;
}

/**
 * Consulta al servicio de usuarios.
 *
 * Unica llamada sincrona de este servicio, y esta justificada: al entregar
 * medicamento hay que saber en ese momento si el paciente existe y de que
 * comunidad es. Una entrega a un paciente inexistente es inventario que sale
 * sin destino comprobable.
 *
 * Sigue las mismas reglas que el cliente de `programas` (arquitectura §8.3):
 * timeout corto, un solo salto, propagacion del token del usuario y del
 * trazaId, y traduccion de los codigos ajenos.
 */
@Injectable()
export class ClientePacientes implements IClientePacientes {
  private readonly logger = new Logger(ClientePacientes.name);

  constructor(@Inject(ENTORNO) private readonly env: Entorno) {}

  async obtener(
    pacienteId: string,
    autorizacion: string,
    trazaId?: string,
  ): Promise<PacienteResumen> {
    const url = this.env.URL_USUARIOS + '/v1/pacientes/' + encodeURIComponent(pacienteId);
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), this.env.TIMEOUT_USUARIOS_MS);

    try {
      const respuesta = await fetch(url, {
        headers: {
          Authorization: autorizacion,
          ...(trazaId ? { [CABECERA_TRAZA]: trazaId } : {}),
        },
        signal: control.signal,
      });

      if (respuesta.status === 404) {
        throw new BadRequestException('El paciente indicado no existe.');
      }
      if (respuesta.status === 401 || respuesta.status === 403) {
        throw new BadRequestException('No tiene permiso para consultar ese paciente.');
      }
      if (!respuesta.ok) {
        throw new BadGatewayException('El servicio de pacientes respondio con un error.');
      }

      return (await respuesta.json()) as PacienteResumen;
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof BadGatewayException) throw e;

      const esTimeout = e instanceof Error && e.name === 'AbortError';
      this.logger.error(
        { pacienteId, trazaId, motivo: esTimeout ? 'timeout' : (e as Error).message },
        'No se pudo consultar el servicio de pacientes',
      );
      throw new BadGatewayException(
        esTimeout
          ? 'El servicio de pacientes no respondio a tiempo. Intente de nuevo.'
          : 'No se pudo consultar el servicio de pacientes.',
      );
    } finally {
      clearTimeout(temporizador);
    }
  }
}
