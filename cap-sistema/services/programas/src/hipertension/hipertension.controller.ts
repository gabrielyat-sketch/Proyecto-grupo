import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiParametrosPagina, ApiPaginaDe, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { HipertensionService } from './hipertension.service';
import { InscribirHipertensionDto } from './dto/inscribir.dto';
import { RegistrarControlHipertensionDto } from './dto/registrar-control.dto';
import {
  ControlHipertensionDto,
  HipertensoAtrasadoDto,
  ProgramaHipertensionDto,
  ProgramaHipertensionResumenDto,
} from './dto/respuestas.dto';

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
  @ApiPaginaDe(ProgramaHipertensionResumenDto, 'El ultimo control viene incrustado: evita el N+1 de esta pantalla.')
  @ApiParametrosPagina()
  @ApiQuery({ name: 'estado', required: false, enum: ['ACTIVO', 'EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO'] })
  @ApiQuery({ name: 'comunidadId', required: false, format: 'uuid' })
  listar(
    @Query('estado') estado?: string,
    @Query('comunidadId') comunidadId?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<ProgramaHipertensionResumenDto>> {
    return this.servicio.listar({
      estado,
      comunidadId,
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get('atrasados')
  @ApiOperation({ summary: 'Pacientes que ya pasaron su fecha de proximo control' })
  @ApiPaginaDe(HipertensoAtrasadoDto, 'Ordenados del mas atrasado al menos.')
  @ApiParametrosPagina()
  atrasados(
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<HipertensoAtrasadoDto>> {
    return this.servicio.atrasados({ pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Inscripcion por su identificador' })
  @ApiOkResponse({ type: ProgramaHipertensionDto })
  obtener(@Param('id') id: string): Promise<ProgramaHipertensionDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({ summary: 'Inscribe a un paciente en el programa' })
  @ApiCreatedResponse({ type: ProgramaHipertensionDto })
  inscribir(
    @Body() dto: InscribirHipertensionDto,
    @Usuario('id') usuarioId: string,
    @Headers('authorization') autorizacion: string,
    @Req() req: { trazaId?: string },
  ): Promise<ProgramaHipertensionDto> {
    return this.servicio.inscribir(dto, usuarioId, autorizacion, req.trazaId);
  }

  @Get(':id/controles')
  @ApiOperation({ summary: 'Controles del programa, lo mas reciente primero' })
  @ApiPaginaDe(ControlHipertensionDto)
  @ApiParametrosPagina()
  listarControles(
    @Param('id') id: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<ControlHipertensionDto>> {
    return this.servicio.listarControles(id, { pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Post(':id/controles')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Registra un control',
    description:
      'La clasificacion y la fecha del proximo control las calcula el sistema; no se teclean.',
  })
  @ApiCreatedResponse({ type: ControlHipertensionDto })
  registrarControl(
    @Param('id') id: string,
    @Body() dto: RegistrarControlHipertensionDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ): Promise<ControlHipertensionDto> {
    return this.servicio.registrarControl(id, dto, usuarioId, req.trazaId);
  }

  @Patch(':id/egreso')
  @Roles(Rol.MEDICO, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Cierra la inscripcion en el programa' })
  @ApiOkResponse({ type: ProgramaHipertensionDto })
  egresar(
    @Param('id') id: string,
    @Body() dto: { motivo: string; estado: 'EGRESADO' | 'ABANDONO' | 'FALLECIDO' | 'TRASLADADO' },
  ): Promise<ProgramaHipertensionDto> {
    return this.servicio.egresar(id, dto.motivo ?? '', dto.estado ?? 'EGRESADO');
  }
}
