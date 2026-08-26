import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { EmbarazoService } from './embarazo.service';
import { InscribirEmbarazoDto } from './dto/inscribir.dto';
import { RegistrarControlPrenatalDto } from './dto/registrar-control.dto';

@ApiTags('programa-embarazo')
@ApiBearerAuth()
@Controller('programas/embarazo')
@Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
export class EmbarazoController {
  constructor(private readonly servicio: EmbarazoService) {}

  @Get()
  @ApiOperation({ summary: 'Seguimientos, ordenados por fecha probable de parto' })
  listar(
    @Query('estado') estado?: string,
    @Query('riesgo') riesgo?: string,
    @Query('comunidadId') comunidadId?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ) {
    return this.servicio.listar({
      estado,
      riesgo,
      comunidadId,
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get('alto-riesgo')
  @ApiOperation({ summary: 'Embarazos activos clasificados como de alto riesgo' })
  altoRiesgo(@Query('pagina') pagina?: string, @Query('tamano') tamano?: string) {
    return this.servicio.listar({
      estado: 'ACTIVO',
      riesgo: 'ALTO',
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Inscribe un embarazo',
    description: 'La FPP y la clasificacion de riesgo las calcula el sistema a partir de la FUM.',
  })
  inscribir(
    @Body() dto: InscribirEmbarazoDto,
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
    summary: 'Registra un control prenatal',
    description:
      'Las semanas de gestacion, las senales de alarma y la fecha del proximo control las calcula el sistema.',
  })
  registrarControl(
    @Param('id') id: string,
    @Body() dto: RegistrarControlPrenatalDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ) {
    return this.servicio.registrarControl(id, dto, usuarioId, req.trazaId);
  }

  @Patch(':id/cierre')
  @Roles(Rol.MEDICO, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Cierra el seguimiento con su resultado' })
  cerrar(@Param('id') id: string, @Body() dto: { resultado: string }) {
    return this.servicio.cerrar(id, dto.resultado ?? 'OTRO');
  }
}
