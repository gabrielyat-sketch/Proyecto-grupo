import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { crearPagina, fechaDelDia, normalizarPagina, sumarDias } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ENTORNO, Entorno } from '../config/entorno';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { clasificarVencimiento, diasParaVencer } from '../dominio/inventario';
import { IngresarLoteDto } from './dto/ingresar-lote.dto';

@Injectable()
export class LotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(ENTORNO) private readonly env: Entorno,
  ) {}

  async ingresar(
    medicamentoId: string,
    dto: IngresarLoteDto,
    usuarioId: string,
    trazaId?: string,
  ) {
    const medicamento = await this.prisma.medicamento.findUnique({ where: { id: medicamentoId } });
    if (!medicamento) throw new NotFoundException('No existe ese medicamento.');
    if (!medicamento.activo) {
      throw new BadRequestException('El medicamento esta desactivado. Actívelo antes de ingresar lotes.');
    }

    const numeroLote = dto.numeroLote.trim();
    const repetido = await this.prisma.lote.findUnique({
      where: { medicamentoId_numeroLote: { medicamentoId, numeroLote } },
    });
    if (repetido) {
      throw new ConflictException({
        mensaje: 'Ese numero de lote ya fue ingresado para este medicamento.',
        detalles: ['loteId:' + repetido.id],
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const lote = await tx.lote.create({
        data: {
          medicamentoId,
          numeroLote,
          fechaVencimiento: dto.fechaVencimiento,
          proveedor: dto.proveedor?.trim(),
          cantidadInicial: dto.cantidad,
          cantidadDisponible: dto.cantidad,
        },
      });

      // El ingreso tambien queda en el libro mayor: la existencia de un lote
      // siempre debe poder explicarse por sus movimientos.
      await tx.movimientoInventario.create({
        data: {
          loteId: lote.id,
          tipo: 'INGRESO',
          cantidad: dto.cantidad,
          cantidadResultante: dto.cantidad,
          motivo: dto.proveedor ? 'Ingreso de ' + dto.proveedor : 'Ingreso a inventario',
          registradoPor: usuarioId,
        },
      });

      await this.outbox.registrar(
        tx,
        Evento.LOTE_INGRESADO,
        {
          loteId: lote.id,
          medicamentoId,
          codigo: medicamento.codigo,
          cantidad: dto.cantidad,
          fechaVencimiento: lote.fechaVencimiento.toISOString().slice(0, 10),
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return lote;
    });
  }

  /**
   * Lotes que vencen dentro de la ventana de alerta.
   *
   * Resuelve el requerimiento SHOULD de alertas por vencimiento. Filtra por
   * fecha en la base usando el indice de `fecha_vencimiento`, no trayendo
   * todo el inventario para revisarlo en memoria.
   */
  async porVencer(dias: number | undefined, consulta: { pagina?: number; tamano?: number }) {
    const ventana = dias && dias > 0 ? Math.min(dias, 365) : this.env.DIAS_ALERTA_VENCIMIENTO;
    const hoy = fechaDelDia(new Date());
    const limite = sumarDias(hoy, ventana);

    const where = {
      estado: 'DISPONIBLE' as const,
      cantidadDisponible: { gt: 0 },
      fechaVencimiento: { gte: hoy, lte: limite },
    };

    const { tamano, saltar } = normalizarPagina(consulta);
    const [lotes, total] = await this.prisma.$transaction([
      this.prisma.lote.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { fechaVencimiento: 'asc' },
        include: {
          medicamento: { select: { codigo: true, nombreGenerico: true, unidad: true } },
        },
      }),
      this.prisma.lote.count({ where }),
    ]);

    return crearPagina(
      lotes.map((l) => ({
        id: l.id,
        numeroLote: l.numeroLote,
        medicamento: l.medicamento,
        fechaVencimiento: l.fechaVencimiento,
        cantidadDisponible: l.cantidadDisponible,
        diasParaVencer: diasParaVencer(l.fechaVencimiento, hoy),
        vencimiento: clasificarVencimiento(l.fechaVencimiento, hoy, this.env.DIAS_ALERTA_VENCIMIENTO),
      })),
      total,
      consulta,
    );
  }

  /**
   * Lotes ya vencidos que todavia figuran con existencia.
   *
   * No se dan de baja solos: dar de baja medicamento es una decision con
   * responsable, y el sistema no puede tomarla en nombre de nadie. Lo que si
   * hace es no dejar que se entreguen (ver seleccionarFefo) y mostrarlos aqui
   * para que alguien actue.
   */
  async vencidos(consulta: { pagina?: number; tamano?: number }) {
    const hoy = fechaDelDia(new Date());
    const where = {
      estado: 'DISPONIBLE' as const,
      cantidadDisponible: { gt: 0 },
      fechaVencimiento: { lt: hoy },
    };

    const { tamano, saltar } = normalizarPagina(consulta);
    const [lotes, total] = await this.prisma.$transaction([
      this.prisma.lote.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { fechaVencimiento: 'asc' },
        include: { medicamento: { select: { codigo: true, nombreGenerico: true, unidad: true } } },
      }),
      this.prisma.lote.count({ where }),
    ]);

    return crearPagina(
      lotes.map((l) => ({
        id: l.id,
        numeroLote: l.numeroLote,
        medicamento: l.medicamento,
        fechaVencimiento: l.fechaVencimiento,
        cantidadDisponible: l.cantidadDisponible,
        diasVencido: -diasParaVencer(l.fechaVencimiento, hoy),
      })),
      total,
      consulta,
    );
  }

  /** Da de baja lo que queda de un lote: vencido, danado o extraviado. */
  async darDeBaja(loteId: string, motivo: string, usuarioId: string, trazaId?: string) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: { medicamento: { select: { codigo: true } } },
    });
    if (!lote) throw new NotFoundException('No existe ese lote.');
    if (lote.estado === 'DADO_DE_BAJA') {
      throw new BadRequestException('Ese lote ya fue dado de baja.');
    }
    if (!motivo?.trim()) {
      throw new BadRequestException('Indique el motivo de la baja.');
    }

    const cantidad = lote.cantidadDisponible;

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.lote.update({
        where: { id: loteId },
        data: {
          cantidadDisponible: 0,
          estado: 'DADO_DE_BAJA',
          motivoBaja: motivo.trim().slice(0, 200),
        },
      });

      if (cantidad > 0) {
        await tx.movimientoInventario.create({
          data: {
            loteId,
            tipo: 'BAJA',
            cantidad: -cantidad,
            cantidadResultante: 0,
            motivo: motivo.trim().slice(0, 200),
            registradoPor: usuarioId,
          },
        });
      }

      await this.outbox.registrar(
        tx,
        Evento.LOTE_DADO_DE_BAJA,
        {
          loteId,
          medicamentoId: lote.medicamentoId,
          codigo: lote.medicamento.codigo,
          cantidad,
          motivo: motivo.trim().slice(0, 200),
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return actualizado;
    });
  }
}
