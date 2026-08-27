import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Publico, Usuario, UsuarioAutenticado } from '@cap/shared';
import { AutenticacionService } from './autenticacion.service';
import { MfaService } from '../mfa/mfa.service';
import { LoginDto } from './dto/login.dto';
import { VerificarMfaDto } from './dto/verificar-mfa.dto';
import { RefrescarDto } from './dto/refrescar.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { ConfigurarMfaInicialDto } from './dto/configurar-mfa-inicial.dto';
import {
  ConfiguracionMfaDto,
  MfaRequeridoDto,
  PerfilPropioDto,
  RefrescoDto,
  SesionAbiertaDto,
} from './dto/respuestas.dto';

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
  // Dos formas posibles, discriminadas por mfaRequerido. Declararlas como oneOf
  // hace que el cliente generado sea una union: el frontend no puede leer
  // tokenAcceso sin comprobar antes el discriminante.
  @ApiExtraModels(SesionAbiertaDto, MfaRequeridoDto)
  @ApiOkResponse({
    description: 'Sesion abierta, o segundo factor pendiente.',
    // SIN `discriminator`. openapi-typescript lo interpreta como que la
    // propiedad guarda el NOMBRE del esquema, y generaba
    // `mfaRequerido: "SesionAbiertaDto"` en vez de `false`. El `enum: [false]`
    // / `enum: [true]` de cada DTO ya produce una union discriminada correcta.
    schema: {
      oneOf: [{ $ref: getSchemaPath(SesionAbiertaDto) }, { $ref: getSchemaPath(MfaRequeridoDto) }],
    },
  })
  login(@Body() dto: LoginDto, @Req() req: never): Promise<SesionAbiertaDto | MfaRequeridoDto> {
    return this.servicio.login(dto, datosDe(req));
  }

  @Post('mfa/verificar')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completa el login con el codigo de segundo factor' })
  @ApiOkResponse({ type: SesionAbiertaDto })
  verificarMfa(@Body() dto: VerificarMfaDto, @Req() req: never): Promise<SesionAbiertaDto> {
    return this.servicio.verificarMfa(dto.tokenParcial, dto.codigo, datosDe(req));
  }

  @Post('refrescar')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rota el token de refresco y emite uno de acceso nuevo' })
  @ApiOkResponse({ type: RefrescoDto })
  refrescar(@Body() dto: RefrescarDto, @Req() req: never): Promise<RefrescoDto> {
    return this.servicio.refrescar(dto.tokenRefresco, datosDe(req));
  }

  @Post('cerrar-sesion')
  @Publico()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoca la sesion indicada' })
  @ApiNoContentResponse({ description: 'Sesion revocada.' })
  async cerrarSesion(@Body() dto: RefrescarDto): Promise<void> {
    await this.servicio.cerrarSesion(dto.tokenRefresco);
  }

  @Post('mfa/configurar-inicial')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configura el segundo factor por primera vez, sin sesion previa',
    description:
      'Para cuentas cuyo rol exige MFA y que aun no lo configuraron. Se autoriza con el token ' +
      'parcial del login, no con un token de acceso: sin esto la cuenta inicial del sistema no ' +
      'podria entrar nunca. Devuelve el QR, el secreto y los codigos de respaldo. El segundo ' +
      'factor queda INACTIVO hasta confirmarlo en mfa/activar-inicial.',
  })
  @ApiOkResponse({ type: ConfiguracionMfaDto })
  @ApiConflictResponse({
    description: 'La cuenta ya tiene el segundo factor configurado. Use mfa/verificar.',
  })
  configurarMfaInicial(@Body() dto: ConfigurarMfaInicialDto): Promise<ConfiguracionMfaDto> {
    return this.servicio.configurarMfaInicial(dto.tokenParcial);
  }

  @Post('mfa/activar-inicial')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma la primera configuracion y abre la sesion',
    description:
      'Devuelve los tokens directamente: a estas alturas la persona ya demostro contrasena ' +
      'correcta y control de su aplicacion de autenticacion.',
  })
  @ApiOkResponse({ type: SesionAbiertaDto })
  @ApiConflictResponse({
    description: 'La cuenta ya tiene el segundo factor configurado. Use mfa/verificar.',
  })
  activarMfaInicial(@Body() dto: VerificarMfaDto, @Req() req: never): Promise<SesionAbiertaDto> {
    return this.servicio.activarMfaInicial(dto.tokenParcial, dto.codigo, datosDe(req));
  }

  @Get('yo')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiOkResponse({ type: PerfilPropioDto })
  yo(@Usuario('id') id: string): Promise<PerfilPropioDto> {
    return this.servicio.perfilDe(id);
  }

  @Post('contrasena')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cambia la propia contrasena' })
  @ApiNoContentResponse({ description: 'Contrasena actualizada.' })
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
  @ApiOkResponse({ type: ConfiguracionMfaDto })
  configurarMfa(@Usuario() usuario: UsuarioAutenticado): Promise<ConfiguracionMfaDto> {
    return this.mfa.iniciarConfiguracion(usuario.id, usuario.usuario);
  }

  @Post('mfa/activar')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Confirma con un codigo real y activa el segundo factor' })
  @ApiNoContentResponse({ description: 'Segundo factor activado.' })
  async activarMfa(@Usuario('id') id: string, @Body() dto: { codigo: string }): Promise<void> {
    await this.mfa.activar(id, dto.codigo);
  }
}
