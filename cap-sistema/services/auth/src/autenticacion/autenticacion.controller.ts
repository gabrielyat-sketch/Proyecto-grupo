import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico, Usuario, UsuarioAutenticado } from '@cap/shared';
import { AutenticacionService } from './autenticacion.service';
import { MfaService } from '../mfa/mfa.service';
import { LoginDto } from './dto/login.dto';
import { VerificarMfaDto } from './dto/verificar-mfa.dto';
import { RefrescarDto } from './dto/refrescar.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

function datosDe(req: { ip?: string; headers?: Record<string, unknown> }) {
  const agente = req.headers?.['user-agent'];
  return { ip: req.ip, agente: typeof agente === 'string' ? agente : undefined };
}

@ApiTags('autenticacion')
@Controller('auth')
export class AutenticacionController {
  constructor(
    private readonly servicio: AutenticacionService,
    private readonly mfa: MfaService,
  ) {}

  @Post('login')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesion',
    description:
      'Devuelve los tokens, o mfaRequerido=true con un token parcial si el rol exige segundo factor.',
  })
  login(@Body() dto: LoginDto, @Req() req: never) {
    return this.servicio.login(dto, datosDe(req));
  }

  @Post('mfa/verificar')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completa el login con el codigo de segundo factor' })
  verificarMfa(@Body() dto: VerificarMfaDto, @Req() req: never) {
    return this.servicio.verificarMfa(dto.tokenParcial, dto.codigo, datosDe(req));
  }

  @Post('refrescar')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el token de refresco y emite uno de acceso nuevo' })
  refrescar(@Body() dto: RefrescarDto, @Req() req: never) {
    return this.servicio.refrescar(dto.tokenRefresco, datosDe(req));
  }

  @Post('cerrar-sesion')
  @Publico()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoca la sesion indicada' })
  async cerrarSesion(@Body() dto: RefrescarDto): Promise<void> {
    await this.servicio.cerrarSesion(dto.tokenRefresco);
  }

  @Get('yo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  yo(@Usuario('id') id: string) {
    return this.servicio.perfilDe(id);
  }

  @Post('contrasena')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambia la propia contrasena' })
  async cambiarContrasena(
    @Usuario('id') id: string,
    @Body() dto: CambiarContrasenaDto,
  ): Promise<void> {
    await this.servicio.cambiarContrasena(id, dto);
  }

  @Post('mfa/configurar')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Genera el secreto TOTP y los codigos de respaldo',
    description: 'El segundo factor queda INACTIVO hasta confirmarlo en mfa/activar.',
  })
  configurarMfa(@Usuario() usuario: UsuarioAutenticado) {
    return this.mfa.iniciarConfiguracion(usuario.id, usuario.usuario);
  }

  @Post('mfa/activar')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirma con un codigo real y activa el segundo factor' })
  async activarMfa(@Usuario('id') id: string, @Body() dto: { codigo: string }): Promise<void> {
    await this.mfa.activar(id, dto.codigo);
  }
}
