import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginaDe, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { PacientesService } from './pacientes.service';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { BuscarPacientesDto } from './dto/buscar-pacientes.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { PacienteCreadoDto, PacienteDto, PacienteResumenDto } from './dto/respuestas.dto';

/**
 * Acceso por rol.
 *
 * Farmacia y Recepcion pueden ENCONTRAR a un paciente y ver sus datos
 * basicos, porque lo necesitan para atenderlo. No pueden leer su historial
 * clinico: eso vive en /atenciones y esta restringido al personal clinico.
 * Es la minimizacion de datos que exige el marco legal (§4.7 del plan).
 */
const PUEDEN_CONSULTAR = [
  Rol.ADMINISTRADOR,
  Rol.DIRECTOR,
  Rol.MEDICO,
  Rol.ENFERMERIA,
  Rol.FARMACIA,
  Rol.RECEPCION,
];

@ApiTags('pacientes')
@ApiBearerAuth()
@Controller('pacientes')
export class PacientesController {
  constructor(private readonly servicio: PacientesService) {}

  @Get()
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({
    summary: 'Busca pacientes por DPI, inicio de nombre o comunidad',
    description: 'La busqueda por DPI se resuelve con el indice ciego sobre el campo cifrado.',
  })
  @ApiPaginaDe(PacienteResumenDto, 'Resultados. El listado NO incluye DPI ni telefono.')
  buscar(@Query() consulta: BuscarPacientesDto): Promise<Pagina<PacienteResumenDto>> {
    return this.servicio.buscar(consulta);
  }

  @Get(':id')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Ficha completa del paciente' })
  @ApiOkResponse({ type: PacienteDto })
  obtener(@Param('id') id: string): Promise<PacienteDto> {
    return this.servicio.obtener(id);
  }

  /*
    Enfermeria tambien da de alta.

    No es una concesion: es quien llena las fichas, y hay un caso en que
    registrar y atender ocurren en el mismo minuto. Llega la madre con un
    recien nacido que todavia no tiene nombre ni registro; sin poder abrirle
    expediente, la enfermera no tiene donde guardar la ficha de menor de 28
    dias, y mandarla a recepcion a media consulta es lo que hace que el dato
    acabe en un papel suelto.

    Lo que se abre es el alta COMPLETA, no una version recortada para bebes:
    partir el permiso en dos exigiria un segundo camino de creacion que hay que
    mantener igual que el primero, y el dia que se separen nadie sabra cual de
    los dos es el bueno.
  */
  @Post()
  @Roles(Rol.RECEPCION, Rol.ENFERMERIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Registra un paciente y abre su expediente' })
  @ApiCreatedResponse({ type: PacienteCreadoDto })
  crear(
    @Body() dto: CrearPacienteDto,
    @Usuario('id') usuarioId: string,
    @Req() req: { trazaId?: string },
  ): Promise<PacienteCreadoDto> {
    return this.servicio.crear(dto, usuarioId, req.trazaId);
  }

  @Patch(':id')
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Corrige datos del paciente' })
  @ApiOkResponse({ type: PacienteDto })
  actualizar(@Param('id') id: string, @Body() dto: ActualizarPacienteDto): Promise<PacienteDto> {
    return this.servicio.actualizar(id, dto);
  }
}
