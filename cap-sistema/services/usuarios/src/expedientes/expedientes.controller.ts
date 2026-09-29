import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Autorizacion, Rol, Roles } from '@cap/shared';
import { ExpedientesService } from './expedientes.service';
import { BusquedaPorNumeroDto } from './dto/respuestas.dto';

@ApiTags('expedientes')
@ApiBearerAuth()
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly servicio: ExpedientesService) {}

  @Get('buscar')
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO, Rol.ENFERMERIA, Rol.FARMACIA, Rol.RECEPCION)
  @ApiOperation({
    summary: 'Busca los expedientes con un numero',
    description:
      'El numero esta cifrado en la base; se resuelve por su indice ciego. Devuelve VARIOS: ' +
      'el numero es de la familia y se repite entre lugares.',
  })
  @ApiOkResponse({ type: BusquedaPorNumeroDto })
  porNumero(
    @Query('numero') numero: string,
    @Autorizacion() autorizacion: string,
    @Req() req: { trazaId?: string },
  ): Promise<BusquedaPorNumeroDto> {
    return this.servicio.porNumero(numero ?? '', { autorizacion, trazaId: req.trazaId });
  }
}
