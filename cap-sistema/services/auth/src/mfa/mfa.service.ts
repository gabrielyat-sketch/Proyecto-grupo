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
    /**
     * Si ya hay una configuracion SIN activar, se reutiliza su secreto en vez
     * de generar otro.
     *
     * Dos peticiones seguidas —un doble clic, un refresco de la pantalla—
     * generaban cada una su secreto, y la ultima en escribir invalidaba el QR
     * que la persona ya habia escaneado. El sintoma era desconcertante: la
     * aplicacion del telefono mostraba codigos correctos que el servidor
     * rechazaba siempre, con un mensaje que culpaba al reloj.
     *
     * Una configuracion YA ACTIVA si se reemplaza: ahi la intencion es
     * reconfigurar el segundo factor, y el secreto viejo debe morir.
     */
    const existente = await this.prisma.configuracionMfa.findUnique({ where: { usuarioId } });

    const secreto =
      existente && !existente.activo
        ? this.cifrado.descifrar(Buffer.from(existente.secretoCifrado))
        : generateSecret();

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

  /**
   * Borra el segundo factor de una cuenta para que se configure de nuevo.
   *
   * Es la salida cuando alguien pierde el telefono con la aplicacion de
   * autenticacion. Sin esto quedaba fuera del sistema de forma permanente en
   * cuanto se le acabaran los codigos de respaldo, y afecta justo a los dos
   * roles que tienen el segundo factor obligatorio.
   *
   * No hay que inventar ningun flujo de recuperacion: al borrar la
   * configuracion, el proximo acceso vuelve a caer en `configuracionPendiente`
   * y la persona configura el segundo factor desde cero como el primer dia.
   *
   * Los codigos de respaldo se borran tambien. Dejarlos vivos permitiria entrar
   * con los papeles viejos despues de un reinicio pedido justamente porque
   * esos papeles se perdieron.
   */
  async reiniciar(usuarioId: string): Promise<boolean> {
    const config = await this.prisma.configuracionMfa.findUnique({ where: { usuarioId } });
    if (!config) return false;

    await this.prisma.$transaction([
      this.prisma.codigoRespaldo.deleteMany({ where: { usuarioId } }),
      this.prisma.configuracionMfa.delete({ where: { usuarioId } }),
    ]);
    return true;
  }

  /**
   * Genera codigos nuevos e invalida los anteriores. Se devuelven una sola vez.
   *
   * El borrado y la creacion van en una transaccion. Sueltos, dos llamadas
   * simultaneas podian borrar las dos antes de crear ninguna y dejar 16
   * codigos vivos: los 8 que la persona anoto y otros 8 que nadie vio nunca
   * pero que abrian la cuenta igual.
   */
  async regenerarCodigosRespaldo(usuarioId: string): Promise<string[]> {
    const codigos: string[] = [];
    for (let i = 0; i < CANTIDAD_CODIGOS_RESPALDO; i++) {
      codigos.push(randomBytes(5).toString('hex').toUpperCase());
    }

    const data = await Promise.all(
      codigos.map(async (c) => ({ usuarioId, hash: await hashContrasena(c) })),
    );

    await this.prisma.$transaction([
      this.prisma.codigoRespaldo.deleteMany({ where: { usuarioId } }),
      this.prisma.codigoRespaldo.createMany({ data }),
    ]);

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
