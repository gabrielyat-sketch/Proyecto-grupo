import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginaDe, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ConsultarUsuariosDto } from './dto/consultar-usuarios.dto';
import { ContrasenaRestablecidaDto, CuentaCreadaDto, CuentaDto } from './dto/respuestas.dto';

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
  @ApiPaginaDe(CuentaDto)
  listar(@Query() consulta: ConsultarUsuariosDto): Promise<Pagina<CuentaDto>> {
    return this.servicio.listar(consulta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una cuenta por su identificador' })
  @ApiOkResponse({ type: CuentaDto })
  obtener(@Param('id') id: string): Promise<CuentaDto> {
    return this.servicio.obtener(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Crea una cuenta',
    description:
      'Devuelve una contrasena temporal. Es la unica vez que se muestra: anotela y entreguela a la persona.',
  })
  @ApiCreatedResponse({ type: CuentaCreadaDto })
  crear(@Body() dto: CrearUsuarioDto): Promise<CuentaCreadaDto> {
    return this.servicio.crear(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza datos, rol o estado de una cuenta' })
  @ApiOkResponse({ type: CuentaDto })
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @Usuario('id') idQuienEdita: string,
  ): Promise<CuentaDto> {
    return this.servicio.actualizar(id, dto, idQuienEdita);
  }

  @Post(':id/restablecer-contrasena')
  @ApiOperation({ summary: 'Genera una contrasena temporal nueva y cierra las sesiones' })
  @ApiCreatedResponse({ type: ContrasenaRestablecidaDto })
  restablecer(@Param('id') id: string): Promise<ContrasenaRestablecidaDto> {
    return this.servicio.restablecerContrasena(id);
  }
}
