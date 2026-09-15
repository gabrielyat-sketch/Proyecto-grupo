import { DynamicModule, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { z } from 'zod';

/**
 * Variables de entorno del bus de eventos.
 *
 * `REDIS_URL` es opcional por la misma razon que `URL_TRAZABILIDAD`: un
 * servicio suelto tiene que poder arrancar en la maquina de alguien sin
 * levantar Redis. Lo que NO puede es arrancar asi en produccion, y de eso
 * responde `ModuloEventos`.
 */
export const esquemaEventos = z.object({
  REDIS_URL: z.string().url('REDIS_URL debe ser una URL, como redis://localhost:6379').optional(),
});

export const BUS_EVENTOS = 'BUS_EVENTOS';

/**
 * La conexion con Redis, o la ausencia de ella.
 *
 * No es UNA conexion sino una fabrica: el consumidor lee con `XREADGROUP ...
 * BLOCK`, que deja la conexion ocupada mientras espera, y si el publicador
 * compartiera esa misma conexion sus `XADD` se quedarian en cola detras del
 * bloqueo. Cada bucle abre la suya.
 */
export interface IBusEventos {
  /** Falso cuando no hay `REDIS_URL`: publicador y consumidor no arrancan. */
  readonly disponible: boolean;
  conectar(): Redis;
}

export class BusEventos implements IBusEventos {
  readonly disponible = true;

  constructor(private readonly url: string) {}

  conectar(): Redis {
    return new Redis(this.url, {
      // Sin tope de reintentos: si Redis se cae, el publicador y el consumidor
      // esperan a que vuelva. Mientras tanto el outbox sigue acumulando, que
      // es exactamente para lo que existe.
      maxRetriesPerRequest: null,
      // Que el arranque del servicio no dependa de que Redis responda ya.
      lazyConnect: true,
      enableOfflineQueue: true,
    });
  }
}

export class BusEventosNulo implements IBusEventos {
  readonly disponible = false;

  conectar(): Redis {
    throw new Error('No hay REDIS_URL: este servicio no esta conectado al bus de eventos.');
  }
}

export interface OpcionesModuloEventos {
  url?: string;
  /** El NODE_ENV del servicio. Decide si se tolera arrancar sin bus. */
  entorno: string;
}

/**
 * Provee el bus a un servicio, con la misma regla que `ModuloAuditoria`: sin
 * `REDIS_URL` se arranca desconectado SOLO fuera de produccion.
 *
 * En produccion, un servicio sin bus escribiria su outbox y nadie lo leeria:
 * las fichas se guardarian, Programas no registraria ningun control y los
 * indicadores de Reportes se quedarian quietos. Nada de eso da error. Es peor
 * que no arrancar, porque no se nota.
 */
@Module({})
export class ModuloEventos {
  private static readonly logger = new Logger(ModuloEventos.name);

  static paraServicio(
    opciones: OpcionesModuloEventos | (() => OpcionesModuloEventos),
  ): DynamicModule {
    return {
      module: ModuloEventos,
      global: true,
      providers: [
        {
          provide: BUS_EVENTOS,
          // Fabrica y no valor, por lo mismo que en ModuloAuditoria: leer el
          // entorno al definir el modulo lo leeria al importar el archivo.
          useFactory: () =>
            ModuloEventos.construir(typeof opciones === 'function' ? opciones() : opciones),
        },
      ],
      exports: [BUS_EVENTOS],
    };
  }

  private static construir(opciones: OpcionesModuloEventos): IBusEventos {
    if (opciones.url) return new BusEventos(opciones.url);

    if (opciones.entorno === 'production') {
      throw new Error(
        'REDIS_URL es obligatoria en produccion: sin ella el servicio escribiria ' +
          'su outbox y nadie lo leeria, y los demas servicios nunca se enterarian ' +
          'de lo que aqui pasa.',
      );
    }

    ModuloEventos.logger.warn(
      'Sin REDIS_URL: este servicio NO publica ni consume eventos. Vale para ' +
        'desarrollo con Redis apagado, nunca para produccion.',
    );
    return new BusEventosNulo();
  }
}
