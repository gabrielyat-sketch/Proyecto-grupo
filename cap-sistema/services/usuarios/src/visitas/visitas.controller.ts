import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { VisitasService } from './visitas.service';
import {
  MarcarLlegadaDto,
  RetirarVisitaDto,
  VisitaDto,
  VisitaEnEsperaDto,
} from './dto/visitas.dto';

/**
 * Sala de espera: quien esta AHORA en el CAP.
 *
 * No se confunde con la digitalizacion aunque las dos sean listas de trabajo.
 * Aqui hay cinco o diez personas sentadas y si no se atienden hoy alguien se va
 * sin consulta; alli hay miles de carpetas que pueden esperar meses.
 *
 * Farmacia no entra: la sala de espera dice quien vino al medico y a que, y eso
 * es informacion clinica aunque no lo parezca.
 */
const VEN_LA_SALA = [
  Rol.ADMINISTRADOR,
  Rol.DIRECTOR,
  Rol.RECEPCION,
  Rol.ENFERMERIA,
  Rol.MEDICO,
] as const;

@ApiTags('visitas')
@ApiBearerAuth()
@Controller('visitas')
export class VisitasController {
  constructor(private readonly servicio: VisitasService) {}

  @Post()
  // Quien esta en la ventanilla es quien ve entrar a la gente.
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Marca que un paciente llego y espera ser atendido',
    description:
      'Es lo unico que el sistema no puede deducir solo: un paciente registrado hace anios y uno ' +
      'que acaba de entrar por la puerta son identicos en la base.',
  })
  @ApiCreatedResponse({ type: VisitaDto })
  @ApiConflictResponse({ description: 'Ese paciente ya esta en la sala de espera.' })
  marcarLlegada(
    @Body() dto: MarcarLlegadaDto,
    @Usuario('id') usuarioId: string,
  ): Promise<VisitaDto> {
    return this.servicio.marcarLlegada(dto, usuarioId);
  }

  @Get('espera')
  @Roles(...VEN_LA_SALA)
  @ApiOperation({
    summary: 'Quienes esperan ahora, por orden de llegada',
    description:
      'Solo las llegadas de hoy: una visita de ayer que nadie cerro no se arrastra a la lista de ' +
      'manana.',
  })
  @ApiOkResponse({ type: [VisitaEnEsperaDto] })
  enEspera(): Promise<VisitaEnEsperaDto[]> {
    return this.servicio.enEspera();
  }

  @Patch(':id/retiro')
  // La ve irse recepcion, o la llama enfermeria y no contesta nadie.
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Saca de la sala a alguien que se fue sin atencion',
    description: 'El motivo es obligatorio: "se fue" no le sirve a nadie dentro de un mes.',
  })
  @ApiOkResponse({ type: VisitaDto })
  retirar(
    @Param('id') id: string,
    @Body() dto: RetirarVisitaDto,
    @Usuario('id') usuarioId: string,
  ): Promise<VisitaDto> {
    return this.servicio.retirar(id, dto.motivo, usuarioId);
  }
}
