import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { aCampos, EventoBus, STREAM_EVENTOS, TOPE_STREAM } from './evento';

/** Una fila de la tabla `outbox` de cualquier servicio. */
export interface FilaOutbox {
  id: string;
  tipo: string;
  version: number;
  datos: unknown;
  trazaId: string | null;
  ocurridoEn: Date;
}

/**
 * Lo que el publicador necesita de la tabla `outbox`, y nada mas.
 *
 * Cada servicio tiene su propio cliente de Prisma y su propia tabla, asi que
 * el publicador no puede traerse el suyo: le dan estas tres operaciones y con
 * eso trabaja. La consulta de pendientes es la que aprovecha el indice
 * `(publicado_en, ocurrido_en)` que las tres tablas ya tienen.
 */
export interface FuenteOutbox {
  /** Las no publicadas, de la mas vieja a la mas nueva. */
  pendientes(limite: number): Promise<FilaOutbox[]>;
  marcarPublicada(id: string): Promise<void>;
  /** Suma un intento. Es informativo: nunca se deja de reintentar. */
  marcarFallo(id: string): Promise<void>;
}

export interface OpcionesPublicador {
  /** Con que nombre firma este servicio sus eventos: 'usuarios', 'programas'... */
  origen: string;
  /** Cada cuanto se mira el outbox cuando no habia nada. */
  intervaloMs?: number;
  /** Cuantas filas por pasada. Si se llena, la siguiente pasada es inmediata. */
  lote?: number;
  logger?: Logger;
}

/**
 * Lleva el outbox al bus.
 *
 * Es la segunda mitad del patron: la primera —escribir el evento en la misma
 * transaccion que el cambio de negocio— la hacen los `OutboxService` de cada
 * servicio desde el primer dia. Esta lee lo que ellos dejaron, lo escribe en
 * el stream y marca la fila como publicada.
 *
 * Lo que garantiza es «al menos una vez», no «exactamente una vez»: si el
 * `XADD` entra y el servicio muere antes de marcar la fila, la proxima pasada
 * la vuelve a publicar. Por eso el consumidor guarda los ids que ya proceso.
 * Es un precio pequeno comparado con la alternativa, que es marcar primero y
 * publicar despues: ahi un fallo entre las dos deja el evento perdido para
 * siempre y en silencio.
 *
 * Se publica en orden de ocurrencia y, si un `XADD` falla, la pasada se
 * detiene ahi en vez de saltar a la siguiente fila: un fallo de Redis es de
 * todas, y seguir solo desordenaria lo que si llegue a entrar.
 *
 * Esta pensado para UNA instancia por servicio, que es lo que hay en el
 * Droplet. Dos publicadores sobre el mismo outbox no romperian nada —el
 * consumidor descarta los repetidos— pero duplicarian trabajo.
 */
export class PublicadorOutbox {
  private readonly logger: Logger;
  private readonly intervaloMs: number;
  private readonly lote: number;
  private detenido = false;
  private pasadaEnCurso: Promise<number> | null = null;
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly fuente: FuenteOutbox,
    private readonly opciones: OpcionesPublicador,
  ) {
    this.logger = opciones.logger ?? new Logger(PublicadorOutbox.name);
    this.intervaloMs = opciones.intervaloMs ?? 1000;
    this.lote = opciones.lote ?? 100;
  }

  /** Arranca el bucle. Vuelve enseguida: el trabajo queda en segundo plano. */
  arrancar(): void {
    this.detenido = false;
    void this.redis.connect().catch(() => {
      // ioredis reintenta solo; el primer fallo no es noticia.
    });
    this.programar(0);
  }

  /** Espera a que termine la pasada en curso y cierra la conexion. */
  async detener(): Promise<void> {
    this.detenido = true;
    if (this.temporizador) clearTimeout(this.temporizador);
    if (this.pasadaEnCurso) await this.pasadaEnCurso.catch(() => undefined);
    await this.redis.quit().catch(() => undefined);
  }

  /**
   * Una pasada: publica hasta `lote` filas pendientes. Devuelve cuantas entro.
   * Es publica para poder llamarla a mano en las pruebas, sin bucle.
   */
  async publicarPendientes(): Promise<number> {
    const filas = await this.fuente.pendientes(this.lote);
    let publicadas = 0;

    for (const fila of filas) {
      if (this.detenido) break;
      const evento: EventoBus = {
        id: fila.id,
        tipo: fila.tipo,
        version: fila.version,
        ocurridoEn: fila.ocurridoEn.toISOString(),
        trazaId: fila.trazaId,
        origen: this.opciones.origen,
        datos: (fila.datos ?? {}) as Record<string, unknown>,
      };

      try {
        await this.redis.xadd(STREAM_EVENTOS, 'MAXLEN', '~', TOPE_STREAM, '*', ...aCampos(evento));
      } catch (error) {
        this.logger.error(
          'No se pudo publicar el evento ' + fila.id + ' (' + fila.tipo + '): ' + String(error),
        );
        await this.fuente.marcarFallo(fila.id).catch(() => undefined);
        break;
      }

      await this.fuente.marcarPublicada(fila.id);
      publicadas++;
    }

    return publicadas;
  }

  private programar(enMs: number): void {
    if (this.detenido) return;
    this.temporizador = setTimeout(() => {
      this.pasadaEnCurso = this.publicarPendientes();
      this.pasadaEnCurso
        .then((n) => this.programar(n >= this.lote ? 0 : this.intervaloMs))
        .catch((error) => {
          // Un fallo leyendo o marcando el outbox: se anota y se vuelve a
          // intentar en el siguiente turno. El bucle no muere por esto.
          this.logger.error('Fallo la pasada del publicador: ' + String(error));
          this.programar(this.intervaloMs);
        })
        .finally(() => {
          this.pasadaEnCurso = null;
        });
    }, enMs);
    // Que el temporizador no impida que el proceso termine cuando se le pide.
    this.temporizador.unref?.();
  }
}
