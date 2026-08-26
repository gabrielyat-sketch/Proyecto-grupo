import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { crearPagina, fechaDelDia, normalizarPagina } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../prisma/generado';
import { CLIENTE_PACIENTES, IClientePacientes } from '../pacientes/cliente-pacientes';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { seleccionarFefo } from '../dominio/inventario';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto';

/** Forma de una entrega con sus lineas, tal como la devuelven las consultas. */
interface EntregaConDetalles {
  id: string;
  pacienteId: string;
  comunidadId: string;
  fecha: Date;
  registradoPor: string;
  observaciones: string | null;
  detalles: {
    cantidad: number;
    lote: {
      numeroLote: string;
      fechaVencimiento?: Date;
      medicamento: { codigo: string; nombreGenerico: string; unidad: string };
    };
  }[];
}

@Injectable()
export class EntregasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(CLIENTE_PACIENTES) private readonly pacientes: IClientePacientes,
  ) {}

  /**
   * Registra una entrega a un paciente.
   *
   * El personal pide "20 tabletas de amoxicilina"; **el sistema elige de que
   * lotes salen**, con criterio FEFO. Dejar que el usuario elija el lote a
   * mano garantiza que se entregue siempre del primero de la lista y que el
   * resto venza en el estante.
   */
  async registrar(
    dto: RegistrarEntregaDto,
    usuarioId: string,
    autorizacion: string,
    trazaId?: string,
  ) {
    const paciente = await this.pacientes.obtener(dto.pacienteId, autorizacion, trazaId);

    const idsRepetidos = new Set(dto.lineas.map((l) => l.medicamentoId));
    if (idsRepetidos.size !== dto.lineas.length) {
      throw new BadRequestException(
        'Un mismo medicamento aparece dos veces. Sume las cantidades en una sola linea.',
      );
    }

    const hoy = fechaDelDia(new Date());

    const medicamentos = await this.prisma.medicamento.findMany({
      where: { id: { in: [...idsRepetidos] } },
      include: {
        lotes: {
          where: { estado: 'DISPONIBLE', cantidadDisponible: { gt: 0 } },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    });

    if (medicamentos.length !== idsRepetidos.size) {
      throw new BadRequestException('Alguno de los medicamentos indicados no existe.');
    }

    // ─── Se arma el plan completo ANTES de tocar nada ──────────────────
    //
    // Si un solo medicamento no alcanza, no se entrega nada. Una entrega a
    // medias deja al paciente con parte del tratamiento y descuenta
    // inventario por algo que no resolvio la receta.
    const plan: { medicamentoId: string; codigo: string; lineas: { loteId: string; cantidad: number }[] }[] = [];
    const faltantes: string[] = [];

    for (const linea of dto.lineas) {
      const medicamento = medicamentos.find((m) => m.id === linea.medicamentoId)!;
      const seleccion = seleccionarFefo(medicamento.lotes, linea.cantidad, hoy);

      if (seleccion.faltante > 0) {
        faltantes.push(
          medicamento.nombreGenerico + ': faltan ' + seleccion.faltante + ' de ' + linea.cantidad,
        );
      }
      plan.push({
        medicamentoId: medicamento.id,
        codigo: medicamento.codigo,
        lineas: seleccion.lineas,
      });
    }

    if (faltantes.length > 0) {
      throw new ConflictException({
        mensaje: 'No hay existencia suficiente para completar la entrega.',
        detalles: faltantes,
      });
    }

    // ─── Recien ahora se escribe ───────────────────────────────────────
    return this.prisma.$transaction(async (tx) => {
      const entrega = await tx.entrega.create({
        data: {
          pacienteId: dto.pacienteId,
          comunidadId: paciente.comunidad.id,
          registradoPor: usuarioId,
          observaciones: dto.observaciones?.trim().slice(0, 500),
        },
      });

      for (const medicamento of plan) {
        for (const linea of medicamento.lineas) {
          // ─────────────────────────────────────────────────────────────
          //  DESCUENTO CONDICIONAL, no leer-y-escribir.
          //
          //  Dos farmaceuticos despachando al mismo tiempo pueden haber
          //  leido la misma existencia. Si se hiciera
          //  `update { cantidadDisponible: leido - x }`, el segundo pisaria
          //  al primero y la existencia quedaria mal, o en negativo.
          //
          //  El WHERE con `>= cantidad` hace la comprobacion y el descuento
          //  en la MISMA sentencia atomica. Si devuelve 0 filas, alguien se
          //  adelanto: la transaccion completa se deshace.
          //
          //  Sin ::uuid en el id: Prisma mapea `String @id` a TEXT, no a UUID,
          //  y el cast rompe la comparacion con "operator does not exist".
          // ─────────────────────────────────────────────────────────────
          const filas = await tx.$executeRaw`
            UPDATE medicamentos.lote
            SET cantidad_disponible = cantidad_disponible - ${linea.cantidad},
                estado = CASE
                  WHEN cantidad_disponible - ${linea.cantidad} = 0 THEN 'AGOTADO'::"medicamentos"."EstadoLote"
                  ELSE estado
                END
            WHERE id = ${linea.loteId}
              AND cantidad_disponible >= ${linea.cantidad}
          `;

          if (filas === 0) {
            throw new ConflictException({
              mensaje:
                'La existencia cambio mientras se registraba la entrega. Vuelva a intentarlo.',
              detalles: ['loteId:' + linea.loteId],
            });
          }

          const lote = await tx.lote.findUniqueOrThrow({
            where: { id: linea.loteId },
            select: { cantidadDisponible: true },
          });

          await tx.detalleEntrega.create({
            data: { entregaId: entrega.id, loteId: linea.loteId, cantidad: linea.cantidad },
          });

          await tx.movimientoInventario.create({
            data: {
              loteId: linea.loteId,
              tipo: 'ENTREGA',
              cantidad: -linea.cantidad,
              cantidadResultante: lote.cantidadDisponible,
              motivo: 'Entrega a paciente',
              registradoPor: usuarioId,
              entregaId: entrega.id,
            },
          });
        }
      }

      // El evento NO lleva el nombre del paciente ni su DPI: para los
      // indicadores basta la comunidad y que medicamento salio.
      await this.outbox.registrar(
        tx,
        Evento.MEDICAMENTO_ENTREGADO,
        {
          entregaId: entrega.id,
          pacienteId: dto.pacienteId,
          comunidadId: paciente.comunidad.id,
          fecha: entrega.fecha.toISOString(),
          medicamentos: plan.map((m) => ({
            codigo: m.codigo,
            cantidad: m.lineas.reduce((s, l) => s + l.cantidad, 0),
          })),
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return this.detalle(entrega.id, tx);
    });
  }

  async listar(consulta: {
    pacienteId?: string;
    comunidadId?: string;
    pagina?: number;
    tamano?: number;
  }) {
    const { tamano, saltar } = normalizarPagina(consulta);
    const where = {
      ...(consulta.pacienteId ? { pacienteId: consulta.pacienteId } : {}),
      ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
    };

    const [entregas, total] = await this.prisma.$transaction([
      this.prisma.entrega.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { fecha: 'desc' },
        include: {
          detalles: {
            include: {
              lote: {
                select: {
                  numeroLote: true,
                  medicamento: { select: { codigo: true, nombreGenerico: true, unidad: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.entrega.count({ where }),
    ]);

    return crearPagina(
      entregas.map((e) => EntregasService.aVista(e as unknown as EntregaConDetalles)),
      total,
      consulta,
    );
  }

  async obtener(id: string) {
    return this.detalle(id, this.prisma);
  }

  /**
   * `Prisma.TransactionClient` acepta tanto el cliente global como el de una
   * transaccion en curso. Asi el mismo metodo sirve para devolver la entrega
   * recien creada dentro de la transaccion y para consultarla despues.
   */
  private async detalle(id: string, cliente: Prisma.TransactionClient) {
    const e = await cliente.entrega.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            lote: {
              select: {
                numeroLote: true,
                fechaVencimiento: true,
                medicamento: { select: { codigo: true, nombreGenerico: true, unidad: true } },
              },
            },
          },
        },
      },
    });
    if (!e) throw new NotFoundException('No existe esa entrega.');
    return EntregasService.aVista(e as EntregaConDetalles);
  }

  private static aVista(e: EntregaConDetalles) {
    return {
      id: e.id,
      pacienteId: e.pacienteId,
      comunidadId: e.comunidadId,
      fecha: e.fecha,
      registradoPor: e.registradoPor,
      observaciones: e.observaciones,
      medicamentos: e.detalles.map((d) => ({
        codigo: d.lote.medicamento.codigo,
        nombre: d.lote.medicamento.nombreGenerico,
        unidad: d.lote.medicamento.unidad,
        numeroLote: d.lote.numeroLote,
        fechaVencimiento: d.lote.fechaVencimiento,
        cantidad: d.cantidad,
      })),
    };
  }
}
