import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ConsultarUsuariosDto } from './dto/consultar-usuarios.dto';

/**
 * Gestion de cuentas. Todo el modulo es exclusivo del Administrador.
 */
@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@Roles(Rol.ADMINISTRADOR)
export class UsuariosController {
  constructor(private readonly servicio: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Lista paginada de cuentas' })
  listar(@Query() consulta: ConsultarUsuariosDto) {
    return this.servicio.listar(consulta);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.servicio.obtener(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crea una cuenta',
    description:
      'Devuelve una contrasena temporal. Es la unica vez que se muestra: anotela y entreguela a la persona.',
  })
  crear(@Body() dto: CrearUsuarioDto) {
    return this.servicio.crear(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza datos, rol o estado de una cuenta' })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @Usuario('id') idQuienEdita: string,
  ) {
    return this.servicio.actualizar(id, dto, idQuienEdita);
  }

  @Post(':id/restablecer-contrasena')
  @ApiOperation({ summary: 'Genera una contrasena temporal nueva y cierra las sesiones' })
  restablecer(@Param('id') id: string) {
    return this.servicio.restablecerContrasena(id);
  }
}
