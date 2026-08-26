import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { LotesService } from './lotes.service';
import { IngresarLoteDto } from './dto/ingresar-lote.dto';

@ApiTags('lotes')
@ApiBearerAuth()
@Controller()
export class LotesController {
  constructor(private readonly servicio: LotesService) {}

  @Post('medicamentos/:medicamentoId/lotes')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ingresa un lote al inventario' })
  ingresar(
    @Param('medicamentoId') medicamentoId: string,
    @Body() dto: IngresarLoteDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.ingresar(medicamentoId, dto, usuarioId, req.trazaId);
  }

  @Get('lotes/por-vencer')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Lotes que vencen dentro de la ventana de alerta',
    description: 'Por defecto usa DIAS_ALERTA_VENCIMIENTO (90 dias).',
  })
  porVencer(
    @Query('dias') dias?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ) {
    return this.servicio.porVencer(dias ? Number(dias) : undefined, {
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get('lotes/vencidos')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({ summary: 'Lotes vencidos que aun figuran con existencia' })
  vencidos(@Query('pagina') pagina?: string, @Query('tamano') tamano?: string) {
    return this.servicio.vencidos({ pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Patch('lotes/:id/baja')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Da de baja lo que queda de un lote' })
  darDeBaja(
    @Param('id') id: string,
    @Body() dto: { motivo: string },
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.darDeBaja(id, dto?.motivo ?? '', usuarioId, req.trazaId);
  }
}
