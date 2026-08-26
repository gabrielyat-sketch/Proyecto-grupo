import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { CatalogoService } from './catalogo.service';
import { CrearMedicamentoDto } from './dto/crear-medicamento.dto';
import { ConsultarMedicamentosDto } from './dto/consultar-medicamentos.dto';

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
  listar(@Query() consulta: ConsultarMedicamentosDto) {
    return this.servicio.listar(consulta);
  }

  @Get('bajo-minimo')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Medicamentos por debajo de su existencia minima' })
  bajoMinimo() {
    return this.servicio.bajoMinimo();
  }

  @Get(':id')
  @Roles(...PUEDEN_CONSULTAR)
  @ApiOperation({ summary: 'Detalle con sus lotes y el estado de vencimiento de cada uno' })
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearMedicamentoDto) {
    return this.servicio.crear(dto);
  }

  @Patch(':id')
  @Roles(Rol.FARMACIA, Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ajusta existencia minima, receta obligatoria o estado' })
  actualizar(
    @Param('id') id: string,
    @Body() dto: { stockMinimo?: number; activo?: boolean; requiereReceta?: boolean },
  ) {
    return this.servicio.actualizar(id, dto);
  }
}
