import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { EntregasService } from './entregas.service';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto';

@ApiTags('entregas')
@ApiBearerAuth()
@Controller('entregas')
export class EntregasController {
  constructor(private readonly servicio: EntregasService) {}

  @Get()
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO)
  @ApiOperation({ summary: 'Historial de entregas' })
  listar(
    @Query('pacienteId') pacienteId?: string,
    @Query('comunidadId') comunidadId?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ) {
    return this.servicio.listar({
      pacienteId,
      comunidadId,
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get(':id')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO)
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Registra una entrega a un paciente',
    description:
      'El sistema elige los lotes por FEFO (primero el que vence antes). Si algun medicamento no alcanza, NO se entrega nada.',
  })
  registrar(
    @Body() dto: RegistrarEntregaDto,
    @Usuario('id') usuarioId: string,
    @Headers('authorization') autorizacion: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.registrar(dto, usuarioId, autorizacion, req.trazaId);
  }
}
