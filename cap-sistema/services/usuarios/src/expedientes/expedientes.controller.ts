import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { ExpedientesService } from './expedientes.service';

@ApiTags('expedientes')
@ApiBearerAuth()
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly servicio: ExpedientesService) {}

  @Get('buscar')
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO, Rol.ENFERMERIA, Rol.FARMACIA, Rol.RECEPCION)
  @ApiOperation({ summary: 'Busca un expediente por su numero' })
  porNumero(@Query('numero') numero: string) {
    return this.servicio.porNumero(numero ?? '');
  }
}
