import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { AtencionesService } from './atenciones.service';
import { RegistrarAtencionDto } from './dto/registrar-atencion.dto';

/**
 * Historial clinico. Acceso MAS RESTRINGIDO que el de pacientes.
 *
 * Recepcion y Farmacia NO entran aqui: pueden encontrar al paciente y ver sus
 * datos basicos, pero no leer sus diagnosticos. Es minimizacion de datos, no
 * desconfianza: menos gente con acceso a un diagnostico es menos superficie de
 * fuga, y el Codigo de Salud limita el expediente clinico al personal con rol
 * clinico autorizado.
 */
@ApiTags('atenciones')
@ApiBearerAuth()
@Controller('expedientes/:expedienteId/atenciones')
@Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
export class AtencionesController {
  constructor(private readonly servicio: AtencionesService) {}

  @Get()
  @ApiOperation({ summary: 'Historial del expediente, lo mas reciente primero' })
  listar(
    @Param('expedienteId') expedienteId: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ) {
    return this.servicio.listar(expedienteId, { pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Post()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({ summary: 'Registra una atencion en el expediente' })
  registrar(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: RegistrarAtencionDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.registrar(expedienteId, dto, usuarioId, req.trazaId);
  }
}
