import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { CarnetService } from './carnet.service';
import {
  CarnetDto,
  CatalogoCarnetDto,
  CrecimientoDto,
  GuardarCarnetDto,
} from './dto/carnet.dto';

/**
 * El carnet del lactante y la ninez: paginas 1 y 2 de su ficha.
 *
 * Va aparte de `/fichas` a proposito. Una ficha es una CONSULTA; esto es del
 * NINO y se llena a lo largo de anos. Meterlo bajo la ficha obligaria a abrir
 * una consulta para anotar una vacuna que se puso en otra visita.
 *
 * Mismo criterio de acceso que el historial clinico: Recepcion y Farmacia no
 * entran. El catalogo es la excepcion, porque no lleva dato de nadie.
 */
@ApiTags('carnet')
@ApiBearerAuth()
@Controller()
export class CarnetController {
  constructor(private readonly servicio: CarnetService) {}

  @Get('carnet/catalogo')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'El esquema de vacunacion y los micronutrientes del formulario',
    description:
      'Solo las casillas que el papel deja llenables. Las sombreadas no vienen: Hepatitis y BCG ' +
      'tienen una sola dosis, DPT solo los dos refuerzos, y el desparasitante no empieza hasta ' +
      'los dos anos.',
  })
  @ApiOkResponse({ type: CatalogoCarnetDto })
  catalogo(): Promise<CatalogoCarnetDto> {
    return this.servicio.catalogo();
  }

  @Get('pacientes/:pacienteId/carnet')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'El carnet de un nino: dosis puestas, entregas hechas, padres y hogar',
    description:
      'La edad de cada dosis viene calculada contra la fecha de nacimiento. No se guarda: en el ' +
      'papel hay que escribirla porque no se puede restar.',
  })
  @ApiOkResponse({ type: CarnetDto })
  obtener(@Param('pacienteId') pacienteId: string): Promise<CarnetDto> {
    return this.servicio.obtener(pacienteId);
  }

  @Get('pacientes/:pacienteId/crecimiento')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Los pesos del nino en el tiempo, para la grafica de peso para edad',
    description:
      'No se captura nada: sale de los pesos que cada atencion ya guarda. Viene en LIBRAS, que es ' +
      'como el papel dibuja la grafica, y cada punto trae como se movio desde el control anterior ' +
      '—que es lo que dice la leyenda impresa, y no depende de donde cae el punto—.',
  })
  @ApiOkResponse({ type: CrecimientoDto })
  crecimiento(@Param('pacienteId') pacienteId: string): Promise<CrecimientoDto> {
    return this.servicio.crecimiento(pacienteId);
  }

  @Patch('pacientes/:pacienteId/carnet')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Anota o corrige el carnet',
    description:
      'Todo es opcional y lo que no viene no se toca: la pagina 1 se llena a lo largo de anos y ' +
      'casi nunca se toca entera. Una dosis con fecha null se BORRA, que es como se corrige una ' +
      'casilla mal anotada. El agua y las excretas van al grupo familiar del nino, y si no tiene ' +
      'uno el sistema se lo crea.',
  })
  @ApiOkResponse({ type: CarnetDto })
  guardar(
    @Param('pacienteId') pacienteId: string,
    @Body() dto: GuardarCarnetDto,
    @Usuario('id') usuarioId: string,
  ): Promise<CarnetDto> {
    return this.servicio.guardar(pacienteId, dto, usuarioId);
  }
}
