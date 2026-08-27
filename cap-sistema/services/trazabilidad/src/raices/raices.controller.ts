import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { RaicesService } from './raices.service';
import { ConsultarRaicesDto } from './dto/consultar-raices.dto';
import { CerrarDiaDto } from './dto/cerrar-dia.dto';

@ApiTags('raices')
@ApiBearerAuth()
@Controller('raices')
export class RaicesController {
  constructor(private readonly servicio: RaicesService) {}

  /**
   * Lo llama una tarea programada de madrugada, con la cuenta de servicio.
   * Se expone como endpoint y no como un temporizador dentro del proceso
   * porque el servicio correra en mas de una replica: un temporizador interno
   * intentaria cerrar el mismo dia tantas veces como replicas haya.
   */
  @Post('cierre')
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Cierra un dia y firma su hash raiz',
    description:
      'Sin `dia`, cierra el de ayer. No cierra el dia en curso: todavia puede recibir ' +
      'registros, y la firma quedaria invalidada por el siguiente que entrara.',
  })
  cerrar(@Body() dto: CerrarDiaDto) {
    return this.servicio.cerrarDia(dto?.dia);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR)
  @ApiOperation({
    summary: 'Raices diarias firmadas',
    description:
      'Cada una trae `firmaValida`, resultado de recomprobarla con LLAVE_RAIZ_TRAZA. ' +
      'Una raiz con la firma rota significa que alguien reescribio ese dia.',
  })
  listar(@Query() filtros: ConsultarRaicesDto) {
    return this.servicio.listar(filtros);
  }
}
