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
import { EmbarazoService } from './embarazo.service';
import { InscribirEmbarazoDto } from './dto/inscribir.dto';
import { RegistrarControlPrenatalDto } from './dto/registrar-control.dto';
import {
  ControlPrenatalDto,
  EmbarazoInscritoDto,
  ProgramaEmbarazoBaseDto,
  ProgramaEmbarazoDto,
  ProgramaEmbarazoResumenDto,
} from './dto/respuestas.dto';

@ApiTags('programa-embarazo')
@ApiBearerAuth()
@Controller('programas/embarazo')
@Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
export class EmbarazoController {
  constructor(private readonly servicio: EmbarazoService) {}

  @Get()
  @ApiOperation({ summary: 'Seguimientos, ordenados por fecha probable de parto' })
  @ApiPaginaDe(ProgramaEmbarazoResumenDto)
  @ApiParametrosPagina()
  @ApiQuery({ name: 'estado', required: false, enum: ['ACTIVO', 'EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO'] })
  @ApiQuery({ name: 'riesgo', required: false, enum: ['BAJO', 'ALTO'] })
  @ApiQuery({ name: 'comunidadId', required: false, format: 'uuid' })
  listar(
    @Query('estado') estado?: string,
    @Query('riesgo') riesgo?: string,
    @Query('comunidadId') comunidadId?: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<ProgramaEmbarazoResumenDto>> {
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
  @ApiPaginaDe(ProgramaEmbarazoResumenDto)
  @ApiParametrosPagina()
  altoRiesgo(
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<ProgramaEmbarazoResumenDto>> {
    return this.servicio.listar({
      estado: 'ACTIVO',
      riesgo: 'ALTO',
      pagina: Number(pagina),
      tamano: Number(tamano),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Seguimiento por su identificador' })
  @ApiOkResponse({ type: ProgramaEmbarazoDto })
  obtener(@Param('id') id: string): Promise<ProgramaEmbarazoDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Inscribe un embarazo',
    description: 'La FPP y la clasificacion de riesgo las calcula el sistema a partir de la FUM.',
  })
  @ApiCreatedResponse({ type: EmbarazoInscritoDto })
  inscribir(
    @Body() dto: InscribirEmbarazoDto,
    @Usuario('id') usuarioId: string,
    /**
     * El token se lee del `Request`, NO con `@Headers('authorization')`.
     *
     * Con `@Headers`, Swagger publica `authorization` como un parametro de
     * cabecera OBLIGATORIO del endpoint, y el cliente tipado del panel exige
     * pasarlo a mano — cuando el middleware ya lo pone en cada peticion. La
     * autenticacion ya esta declarada con `@ApiBearerAuth()`; volver a
     * publicarla como parametro no documenta nada y hace imposible llamar al
     * endpoint desde el contrato generado.
     *
     * El servicio necesita el token para reenviarlo al de usuarios al validar
     * el paciente (arquitectura §8.3), asi que hay que leerlo de algun lado;
     * solo que no de una firma que acabe en el contrato.
     */
    @Req() req: { trazaId?: string; headers: { authorization?: string } },
  ): Promise<EmbarazoInscritoDto> {
    return this.servicio.inscribir(dto, usuarioId, req.headers.authorization ?? '', req.trazaId);
  }

  @Get(':id/controles')
  @ApiOperation({ summary: 'Controles prenatales, lo mas reciente primero' })
  @ApiPaginaDe(ControlPrenatalDto)
  @ApiParametrosPagina()
  listarControles(
    @Param('id') id: string,
    @Query('pagina') pagina?: string,
    @Query('tamano') tamano?: string,
  ): Promise<Pagina<ControlPrenatalDto>> {
    return this.servicio.listarControles(id, { pagina: Number(pagina), tamano: Number(tamano) });
  }

  @Post(':id/controles')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Registra un control prenatal',
    description:
      'Las semanas de gestacion, las senales de alarma y la fecha del proximo control las calcula el sistema.',
  })
  @ApiCreatedResponse({ type: ControlPrenatalDto })
  registrarControl(
    @Param('id') id: string,
    @Body() dto: RegistrarControlPrenatalDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ): Promise<ControlPrenatalDto> {
    return this.servicio.registrarControl(id, dto, usuarioId, req.trazaId);
  }

  @Patch(':id/cierre')
  @Roles(Rol.MEDICO, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Cierra el seguimiento con su resultado' })
  @ApiOkResponse({
    type: ProgramaEmbarazoBaseDto,
    description: 'Sin semanasGestacion: el seguimiento ya cerro, la cuenta dejo de correr.',
  })
  cerrar(
    @Param('id') id: string,
    @Body() dto: { resultado: string },
  ): Promise<ProgramaEmbarazoBaseDto> {
    return this.servicio.cerrar(id, dto.resultado ?? 'OTRO');
  }
}
