import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { BUS_EVENTOS, FilaOutbox, FuenteOutbox, IBusEventos, PublicadorOutbox } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Lleva el outbox de este servicio al bus.
 *
 * El bucle vive en `@cap/shared`; aqui solo se le da la tabla. Arranca cuando
 * la aplicacion ya esta montada —no en el constructor— y se detiene con ella:
 * `enableShutdownHooks` en `main.ts` es lo que hace que `onModuleDestroy`
 * llegue a ejecutarse cuando Docker manda el SIGTERM.
 *
 * Sin `REDIS_URL` no arranca, y lo dice. En produccion ni siquiera se llega
 * aqui: `ModuloEventos` se niega a construir el bus nulo.
 */
@Injectable()
export class PublicadorService implements OnApplicationBootstrap, OnModuleDestroy, FuenteOutbox {
  private readonly logger = new Logger(PublicadorService.name);
  private publicador: PublicadorOutbox | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BUS_EVENTOS) private readonly bus: IBusEventos,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.bus.disponible) {
      this.logger.warn('El outbox se escribe pero no se publica: no hay bus.');
      return;
    }
    this.publicador = new PublicadorOutbox(this.bus.conectar(), this, {
      origen: 'usuarios',
      logger: this.logger,
    });
    this.publicador.arrancar();
    this.logger.log('Publicando el outbox en el bus de eventos.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.publicador?.detener();
  }

  // ── La tabla, vista como el publicador la necesita ─────────────────────

  pendientes(limite: number): Promise<FilaOutbox[]> {
    return this.prisma.outbox.findMany({
      where: { publicadoEn: null },
      orderBy: { ocurridoEn: 'asc' },
      take: limite,
      select: { id: true, tipo: true, version: true, datos: true, trazaId: true, ocurridoEn: true },
    });
  }

  async marcarPublicada(id: string): Promise<void> {
    await this.prisma.outbox.update({ where: { id }, data: { publicadoEn: new Date() } });
  }

  async marcarFallo(id: string): Promise<void> {
    await this.prisma.outbox.update({ where: { id }, data: { intentos: { increment: 1 } } });
  }
}
