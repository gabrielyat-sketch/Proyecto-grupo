import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { crearPagina, fechaDelDia, normalizarPagina, type Pagina, sumarDias } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ENTORNO, Entorno } from '../config/entorno';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { clasificarVencimiento, diasParaVencer } from '../dominio/inventario';
import { IngresarLoteDto } from './dto/ingresar-lote.dto';
import { AjustarLoteDto } from './dto/ajustar-lote.dto';
import { LoteDto, LotePorVencerDto, LoteVencidoDto } from './dto/respuestas.dto';

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
  ): Promise<LoteDto> {
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
  async porVencer(
    dias: number | undefined,
    consulta: { pagina?: number; tamano?: number },
  ): Promise<Pagina<LotePorVencerDto>> {
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
  async vencidos(consulta: { pagina?: number; tamano?: number }): Promise<Pagina<LoteVencidoDto>> {
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

  /**
   * Ajusta la existencia de un lote a lo que se conto fisicamente.
   *
   * El conteo del estante y el sistema se separan tarde o temprano: una caja
   * mal ubicada, una entrega que no se registro, un frasco roto que nadie
   * anoto. Hasta ahora la unica salida era dar de baja el lote ENTERO, lo que
   * obligaba a inventar un motivo y borraba de golpe existencia que si estaba.
   *
   * El ajuste no borra el error: lo deja explicado. La existencia queda en lo
   * contado y el desvio —con su signo y su motivo— queda en el libro mayor,
   * que es lo que se revisa cuando el conteo no cuadra.
   */
  async ajustar(
    loteId: string,
    dto: AjustarLoteDto,
    usuarioId: string,
    trazaId?: string,
  ): Promise<LoteDto> {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: { medicamento: { select: { codigo: true } } },
    });
    if (!lote) throw new NotFoundException('No existe ese lote.');
    if (lote.estado === 'DADO_DE_BAJA') {
      throw new BadRequestException(
        'Ese lote esta dado de baja: ya no forma parte del inventario.',
      );
    }
    if (dto.cantidadContada === dto.cantidadEnSistema) {
      throw new BadRequestException(
        'El conteo coincide con el sistema: no hay nada que ajustar.',
      );
    }

    const diferencia = dto.cantidadContada - dto.cantidadEnSistema;

    return this.prisma.$transaction(async (tx) => {
      // ─────────────────────────────────────────────────────────────────
      //  CONTROL OPTIMISTA, no leer-y-escribir.
      //
      //  El ajuste fija un valor ABSOLUTO, asi que no sirve el descuento
      //  condicional que protege a las entregas. Si entre el momento en que
      //  se leyo la existencia y el momento de guardar alguien entrego diez
      //  tabletas, escribir el conteo pisaria esa entrega y la existencia
      //  quedaria mal sin que nadie lo note.
      //
      //  El WHERE sobre `cantidad_disponible` comprueba que nada se movio y
      //  escribe en la MISMA sentencia. Si devuelve 0 filas, alguien se
      //  adelanto y hay que volver a contar.
      //
      //  Sin ::uuid en el id: Prisma mapea `String @id` a TEXT, y el cast
      //  rompe la comparacion con "operator does not exist".
      // ─────────────────────────────────────────────────────────────────
      const filas = await tx.$executeRaw`
        UPDATE medicamentos.lote
        SET cantidad_disponible = ${dto.cantidadContada},
            estado = CASE
              WHEN ${dto.cantidadContada} = 0 THEN 'AGOTADO'::"medicamentos"."EstadoLote"
              ELSE 'DISPONIBLE'::"medicamentos"."EstadoLote"
            END
        WHERE id = ${loteId}
          AND cantidad_disponible = ${dto.cantidadEnSistema}
      `;

      if (filas === 0) {
        throw new ConflictException({
          mensaje:
            'La existencia cambio mientras se contaba: hubo una entrega o un ingreso. Vuelva a contar.',
          detalles: ['loteId:' + loteId, 'enSistema:' + lote.cantidadDisponible],
        });
      }

      await tx.movimientoInventario.create({
        data: {
          loteId,
          tipo: 'AJUSTE',
          // Con signo: negativa cuando falta y positiva cuando sobra. Guardar
          // el signo evita tener que deducirlo del tipo al sumar el libro.
          cantidad: diferencia,
          cantidadResultante: dto.cantidadContada,
          motivo: dto.motivo,
          registradoPor: usuarioId,
        },
      });

      await this.outbox.registrar(
        tx,
        Evento.LOTE_AJUSTADO,
        {
          loteId,
          medicamentoId: lote.medicamentoId,
          codigo: lote.medicamento.codigo,
          diferencia,
          cantidadResultante: dto.cantidadContada,
          motivo: dto.motivo,
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return tx.lote.findUniqueOrThrow({ where: { id: loteId } });
    });
  }

  /** Da de baja lo que queda de un lote: vencido, danado o extraviado. */
  async darDeBaja(
    loteId: string,
    motivo: string,
    usuarioId: string,
    trazaId?: string,
  ): Promise<LoteDto> {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: { medicamento: { select: { codigo: true } } },
    });
    if (!lote) throw new NotFoundException('No existe ese lote.');
    if (lote.estado === 'DADO_DE_BAJA') {
      throw new BadRequestException('Ese lote ya fue dado de baja.');
    }

    // El motivo llega ya recortado y validado por DarDeBajaLoteDto: aqui no se
    // vuelve a truncar. Truncar en silencio dejaba la baja justificada a media
    // frase, y el motivo es lo unico que explica por que se destruyo
    // medicamento.
    const cantidad = lote.cantidadDisponible;

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.lote.update({
        where: { id: loteId },
        data: {
          cantidadDisponible: 0,
          estado: 'DADO_DE_BAJA',
          motivoBaja: motivo,
        },
      });

      if (cantidad > 0) {
        await tx.movimientoInventario.create({
          data: {
            loteId,
            tipo: 'BAJA',
            cantidad: -cantidad,
            cantidadResultante: 0,
            motivo,
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
          motivo,
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return actualizado;
    });
  }
}
