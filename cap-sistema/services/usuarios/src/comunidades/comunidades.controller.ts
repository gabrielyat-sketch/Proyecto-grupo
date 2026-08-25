import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { ComunidadesService } from './comunidades.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';

@ApiTags('comunidades')
@ApiBearerAuth()
@Controller('comunidades')
export class ComunidadesController {
  constructor(private readonly servicio: ComunidadesService) {}

  @Get()
  @ApiOperation({ summary: 'Comunidades que atiende el CAP' })
  listar(@Query('todas') todas?: string) {
    return this.servicio.listar(todas !== 'true');
  }

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearComunidadDto) {
    return this.servicio.crear(dto);
  }
}
