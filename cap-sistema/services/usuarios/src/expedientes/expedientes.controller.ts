import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { ExpedientesService } from './expedientes.service';
import { ExpedienteEncontradoDto } from './dto/respuestas.dto';

@ApiTags('expedientes')
@ApiBearerAuth()
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly servicio: ExpedientesService) {}

  @Get('buscar')
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO, Rol.ENFERMERIA, Rol.FARMACIA, Rol.RECEPCION)
  @ApiOperation({
    summary: 'Busca un expediente por su numero',
    description: 'El numero esta cifrado en la base; se resuelve por su indice ciego.',
  })
  @ApiOkResponse({ type: ExpedienteEncontradoDto })
  porNumero(@Query('numero') numero: string): Promise<ExpedienteEncontradoDto> {
    return this.servicio.porNumero(numero ?? '');
  }
}
