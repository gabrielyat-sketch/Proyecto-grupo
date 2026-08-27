import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { AntecedentesService } from './antecedentes.service';
import { GuardarAntecedentesDto } from './dto/guardar-antecedentes.dto';
import { AntecedentesPacienteDto } from '../fichas/dto/respuestas.dto';

/**
 * Seccion VII de las fichas: antecedentes medicos, familiares, habitos y
 * gineco-obstetricos.
 *
 * Cuelgan del PACIENTE y no de la atencion porque son historia, no hallazgo del
 * dia: se preguntan una vez y se corrigen cuando cambian.
 *
 * Mismo acceso que el historial clinico. Recepcion y Farmacia no entran: aqui
 * hay VIH, violencia intrafamiliar y conductas suicidas.
 */
@ApiTags('antecedentes')
@ApiBearerAuth()
@Controller('pacientes/:pacienteId/antecedentes')
export class AntecedentesController {
  constructor(private readonly servicio: AntecedentesService) {}

  @Get()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Antecedentes ya registrados de un paciente',
    description:
      'Devuelve solo lo respondido. Un antecedente ausente significa que no se ha preguntado, ' +
      'que no es lo mismo que "no".',
  })
  @ApiOkResponse({ type: AntecedentesPacienteDto })
  obtener(@Param('pacienteId') pacienteId: string): Promise<AntecedentesPacienteDto> {
    return this.servicio.obtener(pacienteId);
  }

  @Patch()
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Guarda o actualiza las respuestas enviadas',
    description:
      'Actualizacion PARCIAL: lo que no viene en la peticion se conserva. Por eso es PATCH y no ' +
      'PUT: si guardar reemplazara el conjunto completo, llenar media hoja borraria lo que otro ' +
      'turno ya habia preguntado.',
  })
  @ApiOkResponse({ type: AntecedentesPacienteDto })
  guardar(
    @Param('pacienteId') pacienteId: string,
    @Body() dto: GuardarAntecedentesDto,
    @Usuario('id') usuarioId: string,
  ): Promise<AntecedentesPacienteDto> {
    return this.servicio.guardar(pacienteId, dto, usuarioId);
  }
}
