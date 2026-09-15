import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginaDe, type Pagina, Rol, Roles } from '@cap/shared';
import { GruposService } from './grupos.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ConsultarGruposDto } from './dto/consultar-grupos.dto';
import { SiguienteNumeroConsultaDto } from './dto/siguiente-numero.dto';
import {
  GrupoFamiliarCreadoDto,
  GrupoFamiliarDto,
  GrupoFamiliarResumenDto,
  SiguienteNumeroDto,
} from './dto/respuestas.dto';

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
  @ApiOperation({ summary: 'Lista paginada de carpetas familiares' })
  @ApiPaginaDe(GrupoFamiliarResumenDto)
  listar(@Query() consulta: ConsultarGruposDto): Promise<Pagina<GrupoFamiliarResumenDto>> {
    return this.servicio.listar(consulta);
  }

  /*
    ANTES de `:id`, no despues.

    Nest resuelve por orden de declaracion: puesto debajo, `siguiente-numero`
    entraria por `:id` y se buscaria una carpeta cuyo identificador es la
    palabra «siguiente-numero». El sintoma seria un 404 en vez de un error de
    ruta, que es de los que cuesta encontrar.
  */
  @Get('siguiente-numero')
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'El siguiente numero libre de la serie de ese lugar' })
  @ApiOkResponse({ type: SiguienteNumeroDto })
  siguienteNumero(@Query() consulta: SiguienteNumeroConsultaDto): Promise<SiguienteNumeroDto> {
    return this.servicio.siguienteNumero(consulta.comunidadId, consulta.lugarId);
  }

  @Get(':id')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Carpeta familiar con sus integrantes' })
  @ApiOkResponse({ type: GrupoFamiliarDto })
  obtener(@Param('id') id: string): Promise<GrupoFamiliarDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Abre una carpeta familiar' })
  @ApiCreatedResponse({ type: GrupoFamiliarCreadoDto })
  crear(@Body() dto: CrearGrupoDto): Promise<GrupoFamiliarCreadoDto> {
    return this.servicio.crear(dto);
  }
}
