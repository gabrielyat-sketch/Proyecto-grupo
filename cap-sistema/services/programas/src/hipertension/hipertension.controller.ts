import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { HipertensionService } from './hipertension.service';
import { InscribirHipertensionDto } from './dto/inscribir.dto';
import { RegistrarControlHipertensionDto } from './dto/registrar-control.dto';

/**
 * Programa de hipertension.
 *
 * Mismo criterio que el historial clinico: Recepcion y Farmacia no entran.
 */
@ApiTags('programa-hipertension')
@ApiBearerAuth()
@Controller('programas/hipertension')
@Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
export class HipertensionController {
  constructor(private readonly servicio: HipertensionService) {}

  @Get()
  @ApiOperation({ summary: 'Inscripciones, con su ultimo control' })
  listar(
    @Query('estado') estado?: string,
    @Query('comunidadId') comunidadId?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ) {
    return this.servicio.listar({
      estado,
      comunidadId,
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get('atrasados')
  @ApiOperation({ summary: 'Pacientes que ya pasaron su fecha de proximo control' })
  atrasados(@Query('pagina') pagina?: string, @Query('tamano') tamano?: string) {
    return this.servicio.atrasados({ pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({ summary: 'Inscribe a un paciente en el programa' })
  inscribir(
    @Body() dto: InscribirHipertensionDto,
    @Usuario('id') usuarioId: string,
    @Headers('authorization') autorizacion: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.inscribir(dto, usuarioId, autorizacion, req.trazaId);
  }

  @Get(':id/controles')
  listarControles(
    @Param('id') id: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ) {
    return this.servicio.listarControles(id, { pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Post(':id/controles')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Registra un control',
    description:
      'La clasificacion y la fecha del proximo control las calcula el sistema; no se teclean.',
  })
  registrarControl(
    @Param('id') id: string,
    @Body() dto: RegistrarControlHipertensionDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.registrarControl(id, dto, usuarioId, req.trazaId);
  }

  @Patch(':id/egreso')
  @Roles(Rol.MEDICO, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Cierra la inscripcion en el programa' })
  egresar(
    @Param('id') id: string,
    @Body() dto: { motivo: string; estado: 'EGRESADO' | 'ABANDONO' | 'FALLECIDO' | 'TRASLADADO' },
  ) {
    return this.servicio.egresar(id, dto.motivo ?? '', dto.estado ?? 'EGRESADO');
  }
}
