import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { exigeMfa, hashContrasena, Rol, verificarContrasena } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService, DatosSesion } from '../tokens/tokens.service';
import { IntentosService } from '../intentos/intentos.service';
import { MfaService } from '../mfa/mfa.service';
import { LoginDto } from './dto/login.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

/**
 * Hash de una contrasena que no existe. Se usa para gastar el mismo tiempo
 * cuando el usuario no existe que cuando existe con la contrasena equivocada.
 * Sin esto, medir el tiempo de respuesta revela que cuentas son reales.
 */
const HASH_SENUELO =
  '$argon2id$v=19$m=19456,t=2,p=1$c2VudWVsb3NlbnVlbG8$Ck4vGZq0iLwWJ8Xy3aQe9v1nBd6TmRhPqUoZxKfNsLc';

@Injectable()
export class AutenticacionService {
  private readonly logger = new Logger(AutenticacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly intentos: IntentosService,
    private readonly mfa: MfaService,
  ) {}

  async login(dto: LoginDto, datos: DatosSesion) {
    const nombreUsuario = dto.usuario.toLowerCase().trim();
    const usuario = await this.prisma.usuario.findUnique({ where: { usuario: nombreUsuario } });

    const minutos = this.intentos.minutosDeBloqueo(usuario?.bloqueadoHasta ?? null);
    if (minutos > 0) {
      throw new HttpException(
        'La cuenta esta bloqueada temporalmente. Intente de nuevo en ' + minutos + ' minuto(s).',
        HttpStatus.LOCKED,
      );
    }

    const correcta = await verificarContrasena(
      usuario?.contrasenaHash ?? HASH_SENUELO,
      dto.contrasena,
    );

    if (!usuario || !correcta) {
      await this.intentos.registrarFallo(nombreUsuario, datos.ip);
      // Mismo mensaje en ambos casos: no se revela si la cuenta existe.
      throw new UnauthorizedException('Usuario o contrasena incorrectos.');
    }

    if (!usuario.activo) {
      throw new ForbiddenException('La cuenta esta desactivada. Consulte con el administrador.');
    }

    await this.intentos.limpiar(nombreUsuario);

    const rol = usuario.rol as Rol;
    const mfaActivo = await this.mfa.estaActivo(usuario.id);

    // Los roles administrativos deben completar el segundo factor. Si aun no
    // lo configuraron, se les emite el token parcial igual, para que puedan
    // hacerlo: negarles el paso los dejaria sin forma de entrar nunca.
    if (mfaActivo || exigeMfa(rol)) {
      return {
        mfaRequerido: true,
        configuracionPendiente: !mfaActivo,
        tokenParcial: this.tokens.emitirParcialMfa(usuario.id),
      };
    }

    return this.emitirSesion(usuario, datos, false);
  }

  async verificarMfa(tokenParcial: string, codigo: string, datos: DatosSesion) {
    const usuarioId = this.tokens.verificarParcialMfa(tokenParcial);

    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('La cuenta no esta disponible.');
    }

    if (!(await this.mfa.verificar(usuarioId, codigo))) {
      await this.intentos.registrarFallo(usuario.usuario, datos.ip);
      throw new UnauthorizedException('El codigo de verificacion no es valido.');
    }

    await this.intentos.limpiar(usuario.usuario);
    return this.emitirSesion(usuario, datos, true);
  }

  async refrescar(tokenRefresco: string, datos: DatosSesion) {
    const r = await this.tokens.rotar(tokenRefresco, datos);
    return {
      tokenAcceso: r.tokenAcceso,
      tokenRefresco: r.tokenRefresco,
      usuario: AutenticacionService.perfil(r.usuario),
    };
  }

  async cerrarSesion(tokenRefresco: string): Promise<void> {
    await this.tokens.revocarSesion(tokenRefresco);
  }

  async cambiarContrasena(usuarioId: string, dto: CambiarContrasenaDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException('La cuenta no esta disponible.');

    if (!(await verificarContrasena(usuario.contrasenaHash, dto.contrasenaActual))) {
      throw new UnauthorizedException('La contrasena actual no es correcta.');
    }

    if (dto.contrasenaActual === dto.contrasenaNueva) {
      throw new BadRequestException('La contrasena nueva debe ser distinta de la actual.');
    }

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        contrasenaHash: await hashContrasena(dto.contrasenaNueva),
        debeCambiarContrasena: false,
      },
    });

    // Cambiar la contrasena cierra las demas sesiones: si la cambia porque
    // sospecha que alguien la conocia, dejar esas sesiones vivas no serviria
    // de nada.
    const cerradas = await this.tokens.revocarTodasDelUsuario(usuarioId, 'cambio_contrasena');
    this.logger.log({ usuarioId, cerradas }, 'Contrasena cambiada');
  }

  async perfilDe(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new UnauthorizedException('La cuenta no esta disponible.');
    return {
      ...AutenticacionService.perfil(usuario),
      mfaActivo: await this.mfa.estaActivo(usuarioId),
    };
  }

  private async emitirSesion(
    usuario: { id: string; usuario: string; rol: string; debeCambiarContrasena: boolean },
    datos: DatosSesion,
    mfaVerificado: boolean,
  ) {
    const { token, sesion } = await this.tokens.crearSesion(usuario.id, datos);

    const tokenAcceso = this.tokens.emitirAcceso(
      { id: usuario.id, usuario: usuario.usuario, rol: usuario.rol as Rol },
      sesion.id,
      mfaVerificado,
    );

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    return {
      mfaRequerido: false,
      tokenAcceso,
      tokenRefresco: token,
      usuario: AutenticacionService.perfil(usuario),
    };
  }

  private static perfil(u: { id: string; usuario: string; rol: string; debeCambiarContrasena: boolean }) {
    return {
      id: u.id,
      usuario: u.usuario,
      rol: u.rol,
      debeCambiarContrasena: u.debeCambiarContrasena,
    };
  }
}
