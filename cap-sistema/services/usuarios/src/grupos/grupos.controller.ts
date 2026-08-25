import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles } from '@cap/shared';
import { GruposService } from './grupos.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ConsultarGruposDto } from './dto/consultar-grupos.dto';

@ApiTags('grupos-familiares')
@ApiBearerAuth()
@Controller('grupos-familiares')
export class GruposController {
  constructor(private readonly servicio: GruposService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO, Rol.ENFERMERIA, Rol.RECEPCION)
  @ApiOperation({ summary: 'Lista paginada de grupos familiares' })
  listar(@Query() consulta: ConsultarGruposDto) {
    return this.servicio.listar(consulta);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.MEDICO, Rol.ENFERMERIA, Rol.RECEPCION)
  @ApiOperation({ summary: 'Grupo familiar con sus integrantes' })
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.RECEPCION, Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearGrupoDto) {
    return this.servicio.crear(dto);
  }
}
