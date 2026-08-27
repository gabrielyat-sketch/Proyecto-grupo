import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiParametrosPagina, ApiPaginaDe, crearPagina, normalizarPagina, type Pagina, Rol, Roles } from '@cap/shared';
import { MovimientoInventarioDto } from './dto/respuestas.dto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Libro mayor del inventario.
 *
 * Explica como se llego a la existencia actual de cada lote. Es lo que se
 * revisa cuando el conteo fisico no cuadra con el sistema.
 */
@ApiTags('inventario')
@ApiBearerAuth()
@Controller('inventario')
@Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
export class InventarioController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('movimientos')
  @ApiOperation({ summary: 'Movimientos de inventario, lo mas reciente primero' })
  @ApiPaginaDe(MovimientoInventarioDto, 'Libro mayor. Es lo que se revisa cuando el conteo fisico no cuadra.')
  @ApiParametrosPagina()
  @ApiQuery({ name: 'loteId', required: false, format: 'uuid' })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['INGRESO', 'ENTREGA', 'AJUSTE', 'BAJA', 'DEVOLUCION'],
  })
  async movimientos(
    @Query('loteId') loteId?: string,
    @Query('tipo') tipo?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<MovimientoInventarioDto>> {
    const consulta = { pagina: Number(pagina), tamano: Number(tamano) };
    const { tamano: take, saltar } = normalizarPagina(consulta);

    const where = {
      ...(loteId ? { loteId } : {}),
      ...(tipo ? { tipo: tipo as never } : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.findMany({
        where,
        skip: saltar,
        take,
        orderBy: { fecha: 'desc' },
        include: {
          lote: {
            select: {
              numeroLote: true,
              medicamento: { select: { codigo: true, nombreGenerico: true } },
            },
          },
        },
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    return crearPagina(
      datos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        cantidad: m.cantidad,
        cantidadResultante: m.cantidadResultante,
        motivo: m.motivo,
        registradoPor: m.registradoPor,
        entregaId: m.entregaId,
        numeroLote: m.lote.numeroLote,
        medicamento: m.lote.medicamento,
      })),
      total,
      consulta,
    );
  }
}
