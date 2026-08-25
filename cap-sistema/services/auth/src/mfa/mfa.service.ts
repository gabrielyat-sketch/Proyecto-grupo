import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { randomBytes } from 'node:crypto';
import { hashContrasena, ServicioCifrado, verificarContrasena } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';

const CANTIDAD_CODIGOS_RESPALDO = 8;

/**
 * Tolerancia de reloj, en segundos. Acepta el codigo anterior y el siguiente.
 *
 * Los relojes de los telefonos se desfasan, y rechazar un codigo por dos
 * segundos de diferencia genera llamadas de soporte que nadie va a atender.
 * Treinta segundos es el estandar de la RFC 6238 y no debilita el mecanismo:
 * un codigo falso sigue siendo rechazado.
 */
const TOLERANCIA_RELOJ_SEGUNDOS = 30;

/**
 * Segundo factor por aplicacion TOTP (Google Authenticator y similares).
 *
 * Por que TOTP y no SMS: la cobertura movil en Purulha no es confiable, y un
 * SMS que no llega deja al director sin poder entrar al sistema. TOTP funciona
 * sin senal.
 *
 * Ver arquitectura-cap-purulha.md §10.3
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Paso 1: genera el secreto y los codigos de respaldo.
   *
   * El MFA queda INACTIVO hasta que el usuario confirme con un codigo real.
   * Si se activara aqui, alguien que configure mal su aplicacion quedaria
   * fuera del sistema sin manera de entrar.
   */
  async iniciarConfiguracion(usuarioId: string, nombreUsuario: string) {
    const secreto = generateSecret();

    await this.prisma.configuracionMfa.upsert({
      where: { usuarioId },
      create: { usuarioId, secretoCifrado: new Uint8Array(this.cifrado.cifrar(secreto)), activo: false },
      update: {
        secretoCifrado: new Uint8Array(this.cifrado.cifrar(secreto)),
        activo: false,
        activadoEn: null,
      },
    });

    const codigos = await this.regenerarCodigosRespaldo(usuarioId);

    return {
      // El frontend convierte esta URI en un codigo QR. El secreto tambien se
      // devuelve por si el usuario debe escribirlo a mano.
      uri: generateURI({
        strategy: 'totp',
        issuer: 'CAP Purulha',
        label: nombreUsuario,
        secret: secreto,
      }),
      secreto,
      codigosRespaldo: codigos,
    };
  }

  /** Paso 2: confirma con un codigo real y activa el segundo factor. */
  async activar(usuarioId: string, codigo: string): Promise<void> {
    const config = await this.prisma.configuracionMfa.findUnique({ where: { usuarioId } });
    if (!config) {
      throw new NotFoundException('Primero debe generar la configuracion del segundo factor.');
    }
    if (!this.verificarTotp(config.secretoCifrado, codigo)) {
      throw new BadRequestException('El codigo no es valido. Verifique la hora de su telefono.');
    }
    await this.prisma.configuracionMfa.update({
      where: { usuarioId },
      data: { activo: true, activadoEn: new Date() },
    });
  }

  async estaActivo(usuarioId: string): Promise<boolean> {
    const config = await this.prisma.configuracionMfa.findUnique({ where: { usuarioId } });
    return config?.activo === true;
  }

  /**
   * Verifica un codigo de 6 digitos o, si no coincide, uno de respaldo.
   * Un codigo de respaldo se consume: solo sirve una vez.
   */
  async verificar(usuarioId: string, codigo: string): Promise<boolean> {
    const limpio = codigo.replace(/\s|-/g, '');

    const config = await this.prisma.configuracionMfa.findUnique({ where: { usuarioId } });
    if (config?.activo && this.verificarTotp(config.secretoCifrado, limpio)) {
      return true;
    }
    return this.consumirCodigoRespaldo(usuarioId, limpio);
  }

  /** Genera codigos nuevos e invalida los anteriores. Se devuelven una sola vez. */
  async regenerarCodigosRespaldo(usuarioId: string): Promise<string[]> {
    await this.prisma.codigoRespaldo.deleteMany({ where: { usuarioId } });

    const codigos: string[] = [];
    for (let i = 0; i < CANTIDAD_CODIGOS_RESPALDO; i++) {
      codigos.push(randomBytes(5).toString('hex').toUpperCase());
    }

    await this.prisma.codigoRespaldo.createMany({
      data: await Promise.all(
        codigos.map(async (c) => ({ usuarioId, hash: await hashContrasena(c) })),
      ),
    });

    return codigos;
  }

  private verificarTotp(secretoCifrado: Uint8Array, codigo: string): boolean {
    if (!/^[0-9]{6}$/.test(codigo)) return false;
    try {
      const secreto = this.cifrado.descifrar(Buffer.from(secretoCifrado));
      return verifySync({
        strategy: 'totp',
        secret: secreto,
        token: codigo,
        epochTolerance: TOLERANCIA_RELOJ_SEGUNDOS,
      }).valid;
    } catch {
      // Secreto corrupto o llave equivocada: se rechaza sin exponer el motivo.
      return false;
    }
  }

  private async consumirCodigoRespaldo(usuarioId: string, codigo: string): Promise<boolean> {
    const disponibles = await this.prisma.codigoRespaldo.findMany({
      where: { usuarioId, usadoEn: null },
    });

    for (const c of disponibles) {
      if (await verificarContrasena(c.hash, codigo.toUpperCase())) {
        await this.prisma.codigoRespaldo.update({
          where: { id: c.id },
          data: { usadoEn: new Date() },
        });
        return true;
      }
    }
    return false;
  }
}
