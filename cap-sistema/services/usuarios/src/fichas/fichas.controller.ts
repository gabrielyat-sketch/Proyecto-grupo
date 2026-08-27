import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { FichasService } from './fichas.service';
import { CrearFichaDto, TipoFichaDto } from './dto/crear-ficha.dto';
import { CatalogoFichaDto, FichaCreadaDto, FichaDto } from './dto/respuestas.dto';

/**
 * Fichas clinicas oficiales del MSPAS.
 *
 * Mismo criterio de acceso que el historial clinico: Recepcion y Farmacia no
 * entran. Pueden encontrar al paciente y ver sus datos basicos, pero no leer
 * sus diagnosticos.
 *
 * El catalogo es la excepcion: no contiene dato de ningun paciente, solo la
 * estructura del formulario impreso.
 */
@ApiTags('fichas')
@ApiBearerAuth()
@Controller()
export class FichasController {
  constructor(private readonly servicio: FichasService) {}

  @Get('fichas/catalogo/:tipo')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Estructura de una ficha: signos de peligro, antecedentes y problemas',
    description:
      'Todo lo que la pantalla necesita para dibujarse, en una sola respuesta. Los textos vienen ' +
      'tal cual estan impresos en el formulario oficial.',
  })
  @ApiParam({ name: 'tipo', enum: TipoFichaDto })
  @ApiOkResponse({ type: CatalogoFichaDto })
  catalogo(@Param('tipo') tipo: TipoFichaDto): Promise<CatalogoFichaDto> {
    return this.servicio.catalogo(tipo);
  }

  @Post('expedientes/:expedienteId/fichas')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA)
  @ApiOperation({
    summary: 'Registra una ficha clinica completa',
    description:
      'La ficha entera se guarda en una sola transaccion. Los identificadores de signos, ' +
      'problemas y diagnosticos se validan contra el catalogo de ESA ficha: no se puede guardar ' +
      'un problema de la ficha de neonatos dentro de una de adultos.',
  })
  @ApiCreatedResponse({ type: FichaCreadaDto })
  registrar(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CrearFichaDto,
    @Usuario('id') usuarioId: string,
    @Req() _req: { trazaId?: string },
  ): Promise<FichaCreadaDto> {
    return this.servicio.registrar(expedienteId, dto, usuarioId);
  }

  @Get('fichas/:id')
  @Roles(Rol.MEDICO, Rol.ENFERMERIA, Rol.DIRECTOR, Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Una ficha registrada, con el texto descifrado y el catalogo resuelto',
    description: 'El IMC viene calculado de peso y talla; no se guarda en la base.',
  })
  @ApiOkResponse({ type: FichaDto })
  obtener(@Param('id') id: string): Promise<FichaDto> {
    return this.servicio.obtener(id);
  }
}
