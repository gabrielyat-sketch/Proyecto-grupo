import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiParametrosPagina, ApiPaginaDe, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { LotesService } from './lotes.service';
import { IngresarLoteDto } from './dto/ingresar-lote.dto';
import { DarDeBajaLoteDto } from './dto/dar-de-baja.dto';
import { LoteDto, LotePorVencerDto, LoteVencidoDto } from './dto/respuestas.dto';

@ApiTags('lotes')
@ApiBearerAuth()
@Controller()
export class LotesController {
  constructor(private readonly servicio: LotesService) {}

  @Post('medicamentos/:medicamentoId/lotes')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ingresa un lote al inventario' })
  @ApiCreatedResponse({ type: LoteDto })
  ingresar(
    @Param('medicamentoId') medicamentoId: string,
    @Body() dto: IngresarLoteDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ): Promise<LoteDto> {
    return this.servicio.ingresar(medicamentoId, dto, usuarioId, req.trazaId);
  }

  @Get('lotes/por-vencer')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Lotes que vencen dentro de la ventana de alerta',
    description: 'Por defecto usa DIAS_ALERTA_VENCIMIENTO (90 dias).',
  })
  @ApiPaginaDe(LotePorVencerDto, 'Ordenados por vencimiento: primero el que vence antes.')
  @ApiParametrosPagina()
  @ApiQuery({
    name: 'dias',
    required: false,
    type: Number,
    description: 'Ventana de alerta. Por defecto DIAS_ALERTA_VENCIMIENTO; el tope es 365.',
    example: 90,
  })
  porVencer(
    @Query('dias') dias?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<LotePorVencerDto>> {
    return this.servicio.porVencer(dias ? Number(dias) : undefined, {
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get('lotes/vencidos')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Lotes vencidos que aun figuran con existencia',
    description: 'El sistema no los da de baja solo: esa decision necesita un responsable.',
  })
  @ApiPaginaDe(LoteVencidoDto)
  @ApiParametrosPagina()
  vencidos(
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<LoteVencidoDto>> {
    return this.servicio.vencidos({ pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Patch('lotes/:id/baja')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Da de baja lo que queda de un lote' })
  @ApiOkResponse({ type: LoteDto })
  darDeBaja(
    @Param('id') id: string,
    @Body() dto: DarDeBajaLoteDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ): Promise<LoteDto> {
    return this.servicio.darDeBaja(id, dto.motivo, usuarioId, req.trazaId);
  }
}
