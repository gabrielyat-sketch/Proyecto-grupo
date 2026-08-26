import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiParametrosPagina, ApiPaginaDe, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { EntregasService } from './entregas.service';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto';
import { EntregaDto } from './dto/respuestas.dto';

@ApiTags('entregas')
@ApiBearerAuth()
@Controller('entregas')
export class EntregasController {
  constructor(private readonly servicio: EntregasService) {}

  @Get()
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO)
  @ApiOperation({ summary: 'Historial de entregas' })
  @ApiPaginaDe(EntregaDto)
  @ApiParametrosPagina()
  @ApiQuery({ name: 'pacienteId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'comunidadId', required: false, format: 'uuid' })
  listar(
    @Query('pacienteId') pacienteId?: string,
    @Query('comunidadId') comunidadId?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<EntregaDto>> {
    return this.servicio.listar({
      pacienteId,
      comunidadId,
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get(':id')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO)
  @ApiOperation({ summary: 'Detalle de una entrega' })
  @ApiOkResponse({ type: EntregaDto })
  obtener(@Param('id') id: string): Promise<EntregaDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Registra una entrega a un paciente',
    description:
      'El sistema elige los lotes por FEFO (primero el que vence antes). Si algun medicamento no alcanza, NO se entrega nada.',
  })
  @ApiCreatedResponse({ type: EntregaDto })
  @ApiConflictResponse({
    description:
      'Otra persona de farmacia se adelanto con el mismo lote. Nada se descontó: reintente.',
  })
  registrar(
    @Body() dto: RegistrarEntregaDto,
    @Usuario('id') usuarioId: string,
    @Headers('authorization') autorizacion: string,
    @Req() req: { trazaId?: string },
  ): Promise<EntregaDto> {
    return this.servicio.registrar(dto, usuarioId, autorizacion, req.trazaId);
  }
}
