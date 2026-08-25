import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Rol, exigeMfa } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ENTORNO, Entorno } from '../config/entorno';

export interface ParTokens {
  tokenAcceso: string;
  tokenRefresco: string;
  expiraEn: string;
}

export interface DatosSesion {
  ip?: string;
  agente?: string;
}

/**
 * Emision y rotacion de tokens.
 *
 * Decisiones que conviene no deshacer:
 *
 * - El token de refresco NO es un JWT. Es un valor aleatorio opaco, y de el
 *   se guarda solo el SHA-256. Asi puede revocarse de inmediato, cosa que un
 *   JWT autocontenido no permite sin mantener una lista negra.
 *
 * - Cada refresco ROTA el token y marca el anterior como usado. Si llega un
 *   token ya rotado, es senal de que alguien lo copio: se revoca la familia
 *   completa y ambas partes quedan fuera. Es preferible obligar a un usuario
 *   legitimo a entrar de nuevo antes que dejar viva una sesion robada.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(ENTORNO) private readonly env: Entorno,
  ) {}

  /** SHA-256 basta aqui: el token ya es aleatorio de 256 bits, no adivinable. */
  static hashear(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  emitirAcceso(usuario: { id: string; usuario: string; rol: Rol }, sesionId: string, mfaVerificado: boolean): string {
    return this.jwt.sign(
      {
        sub: usuario.id,
        usuario: usuario.usuario,
        rol: usuario.rol,
        sesionId,
        mfaVerificado,
      },
      { secret: this.env.JWT_SECRET, expiresIn: this.env.JWT_EXPIRACION } as never,
    );
  }

  /**
   * Token intermedio: la contrasena fue correcta, falta el segundo factor.
   * Se firma con OTRO secreto, de modo que no sirve como token de acceso en
   * ningun servicio del sistema.
   */
  emitirParcialMfa(usuarioId: string): string {
    return this.jwt.sign(
      { sub: usuarioId, proposito: 'mfa' },
      { secret: this.env.JWT_SECRET_MFA, expiresIn: this.env.MFA_TOKEN_EXPIRACION } as never,
    );
  }

  verificarParcialMfa(token: string): string {
    let contenido: { sub?: string; proposito?: string };
    try {
      contenido = this.jwt.verify(token, { secret: this.env.JWT_SECRET_MFA });
    } catch {
      throw new UnauthorizedException('El token de verificacion expiro. Inicie sesion de nuevo.');
    }
    if (contenido.proposito !== 'mfa' || !contenido.sub) {
      throw new UnauthorizedException('Token de verificacion invalido.');
    }
    return contenido.sub;
  }

  async crearSesion(usuarioId: string, datos: DatosSesion, familia?: string) {
    const token = randomBytes(32).toString('base64url');
    const expiraEn = new Date(Date.now() + this.env.REFRESH_EXPIRACION_DIAS * 86400_000);

    const sesion = await this.prisma.sesionRefresh.create({
      data: {
        usuarioId,
        tokenHash: TokensService.hashear(token),
        familia: familia ?? randomUUID(),
        expiraEn,
        ip: datos.ip?.slice(0, 45),
        agente: datos.agente?.slice(0, 255),
      },
    });

    return { token, sesion };
  }

  /**
   * Rota un token de refresco. Devuelve la sesion nueva o lanza si el token
   * no sirve.
   */
  async rotar(tokenPlano: string, datos: DatosSesion) {
    const hash = TokensService.hashear(tokenPlano);
    const sesion = await this.prisma.sesionRefresh.findUnique({
      where: { tokenHash: hash },
      include: { usuario: true },
    });

    if (!sesion) {
      throw new UnauthorizedException('Sesion invalida. Inicie sesion de nuevo.');
    }

    if (sesion.revocadaEn) {
      // Reuso de un token ya rotado: alguien tiene una copia. Se corta toda
      // la familia, no solo este token.
      await this.prisma.sesionRefresh.updateMany({
        where: { familia: sesion.familia, revocadaEn: null },
        data: { revocadaEn: new Date(), motivoRevocacion: 'reuso_detectado' },
      });
      throw new UnauthorizedException(
        'Se detecto un uso indebido de la sesion. Todas las sesiones fueron cerradas por seguridad.',
      );
    }

    if (sesion.expiraEn < new Date()) {
      throw new UnauthorizedException('La sesion expiro. Inicie sesion de nuevo.');
    }

    if (!sesion.usuario.activo) {
      throw new UnauthorizedException('La cuenta esta desactivada.');
    }

    await this.prisma.sesionRefresh.update({
      where: { id: sesion.id },
      data: { revocadaEn: new Date(), motivoRevocacion: 'rotacion' },
    });

    const nueva = await this.crearSesion(sesion.usuarioId, datos, sesion.familia);

    const mfaVerificado = !exigeMfa(sesion.usuario.rol as Rol) ? false : true;
    const tokenAcceso = this.emitirAcceso(
      { id: sesion.usuario.id, usuario: sesion.usuario.usuario, rol: sesion.usuario.rol as Rol },
      nueva.sesion.id,
      mfaVerificado,
    );

    return { tokenAcceso, tokenRefresco: nueva.token, usuario: sesion.usuario };
  }

  async revocarSesion(tokenPlano: string): Promise<void> {
    await this.prisma.sesionRefresh.updateMany({
      where: { tokenHash: TokensService.hashear(tokenPlano), revocadaEn: null },
      data: { revocadaEn: new Date(), motivoRevocacion: 'cierre_sesion' },
    });
  }

  async revocarTodasDelUsuario(usuarioId: string, motivo: string): Promise<number> {
    const r = await this.prisma.sesionRefresh.updateMany({
      where: { usuarioId, revocadaEn: null },
      data: { revocadaEn: new Date(), motivoRevocacion: motivo.slice(0, 60) },
    });
    return r.count;
  }
}
