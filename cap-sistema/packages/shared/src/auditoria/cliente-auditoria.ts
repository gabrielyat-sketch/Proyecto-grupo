import { Logger } from '@nestjs/common';
import { CABECERA_TRAZA } from '../traza';

/**
 * Cliente del servicio de trazabilidad.
 *
 * Vive aqui y no en cada servicio porque los cuatro que ya existen — auth,
 * usuarios, programas y medicamentos — van a auditar exactamente igual. Si
 * cada uno escribiera su propia llamada, la politica de que pasa cuando la
 * bitacora no responde seria distinta en cada servicio, y bastaria una
 * implementacion descuidada para que un cambio de dato clinico se perdiera
 * sin dejar rastro.
 */

/** Que ocurrio. Coincide con el enum `Accion` del servicio de trazabilidad. */
export type AccionAuditada =
  | 'CONSULTA'
  | 'CREACION'
  | 'MODIFICACION'
  | 'ELIMINACION'
  | 'IMPRESION'
  | 'EXPORTACION';

/**
 * Acciones que NO pueden completarse sin quedar registradas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE ESTAS SI Y LA CONSULTA NO
 * ─────────────────────────────────────────────────────────────────────────
 * Si la bitacora no responde y aun asi se guarda un cambio de expediente, el
 * sistema acaba de producir un dato clinico modificado sin autor conocido. El
 * RF-09 existe justamente para que eso no pueda pasar, asi que la operacion
 * de negocio se deshace: es preferible pedirle al medico que reintente que
 * dejar el expediente en un estado que nadie puede explicar.
 *
 * La CONSULTA es distinta. Aplicar la misma regla dejaria al CAP sin poder
 * ATENDER porque un servicio secundario esta caido — el personal no podria ni
 * abrir el expediente del paciente que tiene enfrente. Ahi la consulta sigue,
 * se registra el fallo con nivel de error y queda para la reconciliacion.
 *
 * Es una decision de riesgo, no una preferencia tecnica: se elige perder
 * trazabilidad de lecturas antes que perder capacidad de atencion.
 */
const EXIGEN_REGISTRO: readonly AccionAuditada[] = [
  'CREACION',
  'MODIFICACION',
  'ELIMINACION',
  'IMPRESION',
  'EXPORTACION',
];

export interface EntradaAuditoria {
  /** Servicio que origina la accion: 'usuarios', 'programas', ... */
  servicio: string;
  accion: AccionAuditada;
  /** Tipo de dato tocado y su id en el servicio de origen. */
  entidad: string;
  entidadId: string;
  /** Por que se hizo. §10.4 lo exige. */
  motivo?: string;
  /** En claro: los cifra el servicio de trazabilidad antes de guardarlos. */
  valorAnterior?: string;
  valorNuevo?: string;
  ocurridoEn?: Date;
  ip?: string;
}

export const CLIENTE_AUDITORIA = 'CLIENTE_AUDITORIA';

export interface IClienteAuditoria {
  registrar(entrada: EntradaAuditoria, autorizacion: string, trazaId?: string): Promise<void>;
}

export interface OpcionesClienteAuditoria {
  /** URL base del servicio de trazabilidad. */
  url: string;
  /** Milisegundos antes de darlo por caido. Corto: bloquea la peticion. */
  timeoutMs?: number;
}

export class ClienteAuditoria implements IClienteAuditoria {
  private readonly logger = new Logger(ClienteAuditoria.name);
  private readonly url: string;
  private readonly timeoutMs: number;

  constructor(opciones: OpcionesClienteAuditoria) {
    this.url = opciones.url.replace(/\/+$/, '');
    this.timeoutMs = opciones.timeoutMs ?? 2000;
  }

  /**
   * Registra una entrada en la bitacora.
   *
   * El token que se propaga es el del USUARIO que origino la accion, no una
   * credencial del servicio: asi el registro queda a nombre de quien de verdad
   * hizo el cambio. El servicio de trazabilidad toma el usuario del token y
   * descarta cualquier cosa que venga en el cuerpo.
   *
   * Lanza si la accion exige registro y no se pudo registrar. El servicio que
   * llama debe hacerlo DENTRO de su transaccion, para que al propagarse la
   * excepcion el cambio de negocio se deshaga con ella.
   */
  async registrar(
    entrada: EntradaAuditoria,
    autorizacion: string,
    trazaId?: string,
  ): Promise<void> {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), this.timeoutMs);

    try {
      const respuesta = await fetch(this.url + '/v1/registros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: autorizacion,
          ...(trazaId ? { [CABECERA_TRAZA]: trazaId } : {}),
        },
        body: JSON.stringify({
          ...entrada,
          ocurridoEn: (entrada.ocurridoEn ?? new Date()).toISOString(),
        }),
        signal: control.signal,
      });

      if (!respuesta.ok) {
        throw new Error('trazabilidad respondio ' + respuesta.status);
      }
    } catch (e) {
      const motivo = e instanceof Error && e.name === 'AbortError' ? 'timeout' : (e as Error).message;

      this.logger.error(
        {
          servicio: entrada.servicio,
          accion: entrada.accion,
          entidad: entrada.entidad,
          entidadId: entrada.entidadId,
          trazaId,
          motivo,
        },
        'No se pudo registrar en la bitacora de trazabilidad',
      );

      if (EXIGEN_REGISTRO.includes(entrada.accion)) {
        throw new FalloDeAuditoria(entrada.accion);
      }
      // Consulta: se deja constancia del fallo y la atencion continua.
    } finally {
      clearTimeout(temporizador);
    }
  }
}

/**
 * La operacion no se completo porque no se pudo dejar constancia de ella.
 *
 * Es un error del sistema, no del usuario: el mensaje tiene que decirle al
 * personal del CAP que reintente, no que hizo algo mal.
 */
export class FalloDeAuditoria extends Error {
  constructor(readonly accion: AccionAuditada) {
    super(
      'La operacion no se guardo porque no se pudo registrar en la bitacora de ' +
        'auditoria. Vuelva a intentarlo; si el problema sigue, avise a soporte.',
    );
    this.name = 'FalloDeAuditoria';
  }
}

/**
 * Cliente que no registra nada. Para pruebas y para el arranque local de un
 * servicio suelto, cuando trazabilidad no esta levantado.
 *
 * NUNCA en produccion: `NODE_ENV=production` con este cliente significa un
 * sistema que incumple el RF-09 en silencio. Quien lo provea debe comprobarlo.
 */
export class ClienteAuditoriaNulo implements IClienteAuditoria {
  async registrar(): Promise<void> {
    // Intencionadamente vacio.
  }
}
