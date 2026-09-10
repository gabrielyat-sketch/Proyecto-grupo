import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiParametrosPagina, ApiPaginaDe, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { LotesService } from './lotes.service';
import { IngresarLoteDto } from './dto/ingresar-lote.dto';
import { DarDeBajaLoteDto } from './dto/dar-de-baja.dto';
import { AjustarLoteDto } from './dto/ajustar-lote.dto';
import {
  LoteDto,
  LotePorVencerDto,
  LoteVencidoDto,
  ResumenSemaforoDto,
} from './dto/respuestas.dto';
import { SEMAFORO } from '../catalogo/dto/respuestas.dto';
import type { ColorSemaforo } from '../dominio/inventario';

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

  @Get('lotes/semaforo/resumen')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Cuantos lotes con existencia hay de cada color del semaforo',
    description: 'Los numeros de las pestanas de Farmacia, en una sola consulta.',
  })
  @ApiOkResponse({ type: ResumenSemaforoDto })
  resumenSemaforo(): Promise<ResumenSemaforoDto> {
    return this.servicio.resumenSemaforo();
  }

  @Get('lotes/semaforo/:color')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Lotes con existencia de un color del semaforo',
    description:
      'ROJO vence en menos de 6 meses, AMARILLO entre 6 y 12, VERDE en mas de 12. Los ya vencidos no entran: tienen su propia lista.',
  })
  @ApiParam({ name: 'color', enum: SEMAFORO })
  @ApiPaginaDe(LotePorVencerDto, 'Ordenados por vencimiento: primero el que vence antes.')
  @ApiParametrosPagina()
  porSemaforo(
    @Param('color') color: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<LotePorVencerDto>> {
    const mayusculas = color.toUpperCase();
    if (!SEMAFORO.includes(mayusculas)) {
      throw new BadRequestException('El color debe ser ROJO, AMARILLO o VERDE.');
    }
    return this.servicio.porSemaforo(mayusculas as ColorSemaforo, {
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

  @Patch('lotes/:id/ajuste')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Ajusta la existencia de un lote a lo que se conto en el estante',
    description:
      'Se envia lo CONTADO, no la diferencia. El servidor calcula el desvio y lo deja en el libro mayor como movimiento de AJUSTE.',
  })
  @ApiOkResponse({ type: LoteDto })
  @ApiConflictResponse({
    description:
      'La existencia se movio mientras se contaba: hubo una entrega o un ingreso. Nada se ajusto, vuelva a contar.',
  })
  ajustar(
    @Param('id') id: string,
    @Body() dto: AjustarLoteDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ): Promise<LoteDto> {
    return this.servicio.ajustar(id, dto, usuarioId, req.trazaId);
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
