import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginaDe, type Pagina, Rol, Roles } from '@cap/shared';
import { CatalogoService } from './catalogo.service';
import { CrearMedicamentoDto } from './dto/crear-medicamento.dto';
import { ConsultarMedicamentosDto } from './dto/consultar-medicamentos.dto';
import { ActualizarMedicamentoDto } from './dto/actualizar-medicamento.dto';
import {
  MedicamentoBajoMinimoDto,
  MedicamentoConExistenciaDto,
  MedicamentoDetalleDto,
  MedicamentoDto,
} from './dto/respuestas.dto';

/**
 * Catalogo de medicamentos.
 *
 * LEER lo puede todo el personal clinico: un medico necesita saber si hay
 * existencia antes de recetar, o receta algo que la farmacia no tiene.
 * ESCRIBIR queda para Farmacia y Administrador.
 */
const PUEDEN_CONSULTAR = [
  Rol.ADMINISTRADOR,
  Rol.DIRECTOR,
  Rol.MEDICO,
  Rol.ENFERMERIA,
  Rol.FARMACIA,
];

@ApiTags('medicamentos')
@ApiBearerAuth()
@Controller('medicamentos')
export class CatalogoController {
  constructor(private readonly servicio: CatalogoService) {}

  @Get()
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Catalogo con la existencia total de cada medicamento' })
  @ApiPaginaDe(MedicamentoConExistenciaDto)
  listar(@Query() consulta: ConsultarMedicamentosDto): Promise<Pagina<MedicamentoConExistenciaDto>> {
    return this.servicio.listar(consulta);
  }

  @Get('bajo-minimo')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({
    summary: 'Medicamentos por debajo de su existencia minima',
    description: 'Sin paginar: son cientos, no miles. Un minimo en cero desactiva la alerta.',
  })
  @ApiOkResponse({ type: [MedicamentoBajoMinimoDto] })
  bajoMinimo(): Promise<MedicamentoBajoMinimoDto[]> {
    return this.servicio.bajoMinimo();
  }

  @Get(':id')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Detalle con sus lotes y el estado de vencimiento de cada uno' })
  @ApiOkResponse({ type: MedicamentoDetalleDto })
  obtener(@Param('id') id: string): Promise<MedicamentoDetalleDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Da de alta un medicamento en el catalogo' })
  @ApiCreatedResponse({ type: MedicamentoDto })
  crear(@Body() dto: CrearMedicamentoDto): Promise<MedicamentoDto> {
    return this.servicio.crear(dto);
  }

  @Patch(':id')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ajusta existencia minima, receta obligatoria o estado' })
  @ApiOkResponse({ type: MedicamentoDto })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarMedicamentoDto,
  ): Promise<MedicamentoDto> {
    return this.servicio.actualizar(id, dto);
  }
}
