import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario, UsuarioAutenticado } from '@cap/shared';
import { EjemploService } from './ejemplo.service';
import { CrearEjemploDto } from './dto/crear-ejemplo.dto';
import { ConsultarEjemploDto } from './dto/consultar-ejemplo.dto';

/**
 * Modulo de ejemplo. Muestra el patron que siguen todos los controladores:
 * validacion por DTO, paginacion, restriccion por rol y acceso al usuario
 * autenticado. Al generar un servicio real, se reemplaza por su dominio.
 */
@ApiTags('ejemplo')
@ApiBearerAuth()
@Controller('ejemplo')
export class EjemploController {
  constructor(private readonly servicio: EjemploService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.RECEPCION)
  @ApiOperation({ summary: 'Lista paginada' })
  listar(@Query() consulta: ConsultarEjemploDto) {
    return this.servicio.listar(consulta);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.RECEPCION)
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crea un registro. Solo Administrador.' })
  crear(@Body() dto: CrearEjemploDto, @Usuario() usuario: UsuarioAutenticado) {
    // En un servicio real, aqui iria ademas el registro en trazabilidad,
    // usando el id del usuario que ejecuta la operacion.
    void usuario;
    return this.servicio.crear(dto);
  }
}
