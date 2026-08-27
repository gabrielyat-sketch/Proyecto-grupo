import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { ComunidadesService } from './comunidades.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';
import { ComunidadDto } from './dto/respuestas.dto';

@ApiTags('comunidades')
@ApiBearerAuth()
@Controller('comunidades')
export class ComunidadesController {
  constructor(private readonly servicio: ComunidadesService) {}

  @Get()
  @ApiOperation({
    summary: 'Comunidades que atiende el CAP',
    description: 'Por defecto solo las activas. Con ?todas=true incluye las dadas de baja.',
  })
  // Sin paginar a proposito: son decenas, no miles, y el formulario de alta de
  // paciente necesita la lista completa para su selector.
  @ApiQuery({
    name: 'todas',
    required: false,
    description: "Con 'true' incluye las comunidades dadas de baja.",
    example: 'true',
  })
  @ApiOkResponse({ type: [ComunidadDto] })
  listar(@Query('todas') todas?: string): Promise<ComunidadDto[]> {
    return this.servicio.listar(todas !== 'true');
  }

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Registra una comunidad' })
  @ApiCreatedResponse({ type: ComunidadDto })
  crear(@Body() dto: CrearComunidadDto): Promise<ComunidadDto> {
    return this.servicio.crear(dto);
  }
}
