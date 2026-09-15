import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { hostname } from 'node:os';
import { desdeCampos, EventoBus, STREAM_EVENTOS, STREAM_FALLIDOS, TOPE_STREAM } from './evento';

export type ManejadorEvento = (evento: EventoBus) => Promise<void>;

export interface OpcionesConsumidor {
  /** El grupo de consumo: el nombre del servicio. Cada grupo lee TODO el stream. */
  grupo: string;
  /** Con que nombre se apunta esta instancia en el grupo. */
  consumidor?: string;
  manejar: ManejadorEvento;
  /** Cuanto espera una lectura sin mensajes antes de volver a mirar los pendientes. */
  bloqueoMs?: number;
  lote?: number;
  /** Cuanto puede estar un mensaje entregado y sin confirmar antes de reclamarlo. */
  minInactivoMs?: number;
  /** Entregas fallidas que se toleran antes de apartar el mensaje. */
  maxEntregas?: number;
  logger?: Logger;
}

type Mensaje = [id: string, campos: string[]];

/**
 * Lee el stream en nombre de un servicio y le entrega cada evento a `manejar`.
 *
 * Lo que garantiza: cada mensaje se confirma (`XACK`) solo cuando `manejar`
 * termino sin lanzar. Si lanzo, el mensaje se queda pendiente y se vuelve a
 * entregar pasado `minInactivoMs`, hasta `maxEntregas` veces; despues se
 * aparta en `eventos.fallidos` con el motivo, y se confirma para que no
 * bloquee a los que vienen detras. Un consumidor que murio a media tarea deja
 * sus mensajes pendientes, y la siguiente instancia —o esta misma al
 * reiniciar— los reclama por el mismo camino.
 *
 * Lo que NO garantiza: que `manejar` reciba cada evento una sola vez. El
 * publicador entrega «al menos una vez», y reclamar un mensaje de un
 * consumidor que no llego a confirmar es otra segunda entrega. Guardar el
 * `id` de los ya procesados —en la MISMA transaccion que el cambio de
 * negocio— es trabajo del servicio, porque solo el tiene esa transaccion.
 */
export class ConsumidorEventos {
  private readonly logger: Logger;
  private readonly consumidor: string;
  private readonly bloqueoMs: number;
  private readonly lote: number;
  private readonly minInactivoMs: number;
  private readonly maxEntregas: number;
  private detenido = false;
  private bucle: Promise<void> | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly opciones: OpcionesConsumidor,
  ) {
    this.logger = opciones.logger ?? new Logger(ConsumidorEventos.name);
    this.consumidor = opciones.consumidor ?? hostname() + '-' + process.pid;
    this.bloqueoMs = opciones.bloqueoMs ?? 5000;
    this.lote = opciones.lote ?? 10;
    this.minInactivoMs = opciones.minInactivoMs ?? 60_000;
    this.maxEntregas = opciones.maxEntregas ?? 5;
  }

  /** Crea el grupo si no existe y arranca el bucle en segundo plano. */
  async arrancar(): Promise<void> {
    this.detenido = false;
    await this.crearGrupo();
    this.bucle = this.correr();
  }

  async detener(): Promise<void> {
    this.detenido = true;
    // La lectura bloqueante no vuelve hasta `bloqueoMs`; cortar la conexion la
    // despierta ya. Lo que estuviera a medio procesar queda pendiente en Redis
    // y se reclama al volver a arrancar.
    this.redis.disconnect();
    if (this.bucle) await this.bucle.catch(() => undefined);
  }

  /**
   * Una vuelta sin bloquear: reclama lo abandonado y lee lo nuevo. Devuelve
   * cuantos mensajes entrego. Para las pruebas, que no quieren un bucle.
   */
  async procesarUnaVez(): Promise<number> {
    await this.crearGrupo();
    return (await this.reclamar()) + (await this.leer(0));
  }

  private async crearGrupo(): Promise<void> {
    try {
      // `$`: el grupo empieza en lo que llegue a partir de ahora. Lo anterior
      // a que este servicio existiera no es suyo.
      await this.redis.xgroup('CREATE', STREAM_EVENTOS, this.opciones.grupo, '$', 'MKSTREAM');
    } catch (error) {
      if (!String(error).includes('BUSYGROUP')) throw error;
    }
  }

  private async correr(): Promise<void> {
    while (!this.detenido) {
      try {
        await this.reclamar();
        await this.leer(this.bloqueoMs);
      } catch (error) {
        if (this.detenido) return;
        this.logger.error('Fallo el bucle del consumidor: ' + String(error));
        await new Promise((r) => setTimeout(r, this.bloqueoMs));
      }
    }
  }

  /** Lo nuevo del stream para este grupo. */
  private async leer(bloqueoMs: number): Promise<number> {
    const args: (string | number)[] = ['GROUP', this.opciones.grupo, this.consumidor, 'COUNT', this.lote];
    if (bloqueoMs > 0) args.push('BLOCK', bloqueoMs);
    args.push('STREAMS', STREAM_EVENTOS, '>');

    const respuesta = (await (this.redis.xreadgroup as (...a: (string | number)[]) => Promise<unknown>)(
      ...args,
    )) as [string, Mensaje[]][] | null;

    const mensajes = respuesta?.[0]?.[1] ?? [];
    for (const m of mensajes) {
      if (this.detenido) break;
      await this.procesar(m);
    }
    return mensajes.length;
  }

  /**
   * Los mensajes que alguien recibio y no confirmo a tiempo: los de un
   * consumidor que murio, o los que `manejar` no pudo con ellos.
   */
  private async reclamar(): Promise<number> {
    const pendientes = (await this.redis.xpending(
      STREAM_EVENTOS,
      this.opciones.grupo,
      'IDLE',
      this.minInactivoMs,
      '-',
      '+',
      this.lote,
    )) as [id: string, consumidor: string, inactivoMs: number, entregas: number][];

    let entregados = 0;
    for (const [id, , , entregas] of pendientes) {
      if (this.detenido) break;

      if (entregas > this.maxEntregas) {
        await this.apartar(id, null, 'Fallo ' + entregas + ' veces seguidas.');
        continue;
      }

      const reclamados = (await this.redis.xclaim(
        STREAM_EVENTOS,
        this.opciones.grupo,
        this.consumidor,
        this.minInactivoMs,
        id,
      )) as Mensaje[];
      for (const m of reclamados) {
        await this.procesar(m);
        entregados++;
      }
    }
    return entregados;
  }

  private async procesar([id, campos]: Mensaje): Promise<void> {
    const evento = desdeCampos(campos);
    if (evento instanceof Error) {
      await this.apartar(id, campos, evento.message);
      return;
    }

    try {
      await this.opciones.manejar(evento);
    } catch (error) {
      // Sin confirmar: se reintenta cuando pase `minInactivoMs`.
      this.logger.error(
        'No se pudo procesar el evento ' + evento.id + ' (' + evento.tipo + '): ' + String(error),
      );
      return;
    }

    await this.redis.xack(STREAM_EVENTOS, this.opciones.grupo, id);
  }

  /**
   * Aparta un mensaje que no se va a poder procesar: lo copia a
   * `eventos.fallidos` con el motivo y lo confirma en el stream principal.
   * Copiarlo antes de confirmarlo: si el orden fuera el contrario, un fallo
   * entre las dos operaciones lo perderia.
   */
  private async apartar(id: string, campos: string[] | null, motivo: string): Promise<void> {
    if (campos === null) {
      const leidos = (await this.redis.xrange(STREAM_EVENTOS, id, id)) as Mensaje[];
      campos = leidos[0]?.[1] ?? [];
    }
    this.logger.error('Evento ' + id + ' apartado en ' + STREAM_FALLIDOS + ': ' + motivo);
    await this.redis.xadd(
      STREAM_FALLIDOS,
      'MAXLEN',
      '~',
      TOPE_STREAM,
      '*',
      ...campos,
      'grupo',
      this.opciones.grupo,
      'motivo',
      motivo,
      'mensajeOriginal',
      id,
    );
    await this.redis.xack(STREAM_EVENTOS, this.opciones.grupo, id);
  }
}
