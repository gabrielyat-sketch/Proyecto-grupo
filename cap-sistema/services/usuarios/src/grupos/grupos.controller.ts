import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginaDe, type Pagina, Rol, Roles } from '@cap/shared';
import { GruposService } from './grupos.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ConsultarGruposDto } from './dto/consultar-grupos.dto';
import { GrupoFamiliarCreadoDto, GrupoFamiliarDto, GrupoFamiliarResumenDto } from './dto/respuestas.dto';

const PUEDEN_CONSULTAR = [
  Rol.ADMINISTRADOR,
  Rol.DIRECTOR,
  Rol.MEDICO,
  Rol.ENFERMERIA,
  Rol.RECEPCION,
];

@ApiTags('grupos-familiares')
@ApiBearerAuth()
@Controller('grupos-familiares')
export class GruposController {
  constructor(private readonly servicio: GruposService) {}

  @Get()
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Lista paginada de grupos familiares' })
  @ApiPaginaDe(GrupoFamiliarResumenDto)
  listar(@Query() consulta: ConsultarGruposDto): Promise<Pagina<GrupoFamiliarResumenDto>> {
    return this.servicio.listar(consulta);
  }

  @Get(':id')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Grupo familiar con sus integrantes' })
  @ApiOkResponse({ type: GrupoFamiliarDto })
  obtener(@Param('id') id: string): Promise<GrupoFamiliarDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crea un grupo familiar' })
  @ApiCreatedResponse({ type: GrupoFamiliarCreadoDto })
  crear(@Body() dto: CrearGrupoDto): Promise<GrupoFamiliarCreadoDto> {
    return this.servicio.crear(dto);
  }
}
