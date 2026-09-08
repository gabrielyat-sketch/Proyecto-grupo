import { DynamicModule, Logger, Module } from '@nestjs/common';
import {
  CLIENTE_AUDITORIA,
  ClienteAuditoria,
  ClienteAuditoriaNulo,
  IClienteAuditoria,
} from './cliente-auditoria';

export interface OpcionesModuloAuditoria {
  /** URL base del servicio de trazabilidad. Sin ella no se audita nada. */
  url?: string;
  timeoutMs?: number;
  /** El NODE_ENV del servicio. Decide si se tolera arrancar sin bitacora. */
  entorno: string;
}

/**
 * Provee el cliente de auditoria a un servicio.
 *
 * Vive en `shared` porque los cuatro servicios que auditan van a montarlo
 * igual, y porque la comprobacion que hace abajo tiene que ser la misma en los
 * cuatro: basta que uno se salte esta regla para que el sistema incumpla el
 * RF-09 sin que nadie se entere.
 */
@Module({})
export class ModuloAuditoria {
  private static readonly logger = new Logger(ModuloAuditoria.name);

  /**
   * `global: true` a proposito: cualquier modulo del servicio que toque un
   * dato auditable necesita el cliente, y obligar a importarlo uno por uno
   * significa que el dia que alguien lo olvide el fallo sera silencioso —el
   * dato se guarda igual, solo que sin rastro—. Es exactamente el fallo que
   * el RF-09 existe para impedir.
   */
  static paraServicio(
    opciones: OpcionesModuloAuditoria | (() => OpcionesModuloAuditoria),
  ): DynamicModule {
    return {
      module: ModuloAuditoria,
      global: true,
      providers: [
        {
          provide: CLIENTE_AUDITORIA,
          // Fabrica y no valor: leer el entorno al DEFINIR el modulo lo leeria
          // al importar el archivo, y cualquier prueba que importe AppModule
          // sin variables cargadas fallaria antes de empezar.
          useFactory: () =>
            ModuloAuditoria.construir(typeof opciones === 'function' ? opciones() : opciones),
        },
      ],
      exports: [CLIENTE_AUDITORIA],
    };
  }

  /**
   * Sin URL no hay bitacora, y eso se tolera SOLO fuera de produccion.
   *
   * Arrancar en produccion con el cliente nulo seria un sistema que dice
   * cumplir el RF-09 y no registra nada: las acciones se completarian con
   * normalidad y la bitacora estaria vacia el dia que alguien la audite. Es
   * peor que no arrancar, porque no se nota.
   */
  private static construir(opciones: OpcionesModuloAuditoria): IClienteAuditoria {
    if (opciones.url) {
      return new ClienteAuditoria({ url: opciones.url, timeoutMs: opciones.timeoutMs });
    }

    if (opciones.entorno === 'production') {
      throw new Error(
        'URL_TRAZABILIDAD es obligatoria en produccion: sin ella el servicio ' +
          'atenderia sin registrar nada en la bitacora, y el RF-09 exige que ' +
          'todo cambio de dato clinico quede trazado.',
      );
    }

    ModuloAuditoria.logger.warn(
      'Sin URL_TRAZABILIDAD: este servicio NO esta auditando. Vale para ' +
        'desarrollo con el servicio de trazabilidad apagado, nunca para produccion.',
    );
    return new ClienteAuditoriaNulo();
  }
}
