import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ENTORNO, Entorno } from '../config/entorno';

/**
 * Bloqueo temporal de cuenta tras intentos fallidos repetidos.
 *
 * Sobre revelar que una cuenta esta bloqueada: hacerlo confirma que el
 * usuario existe. Se acepta ese costo a proposito, porque este sistema no se
 * expone a Internet abierto (solo lo alcanza el gateway interno) y porque
 * decirle "vuelva en 12 minutos" a una enfermera en turno vale mas que
 * ocultarle informacion a un atacante que ya esta dentro de la red del CAP.
 */
@Injectable()
export class IntentosService {
  private readonly logger = new Logger(IntentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENTORNO) private readonly env: Entorno,
  ) {}

  /** Minutos que faltan para que se libere la cuenta, o 0 si no esta bloqueada. */
  minutosDeBloqueo(bloqueadoHasta: Date | null): number {
    if (!bloqueadoHasta) return 0;
    const restante = bloqueadoHasta.getTime() - Date.now();
    return restante > 0 ? Math.ceil(restante / 60_000) : 0;
  }

  /**
   * Registra un intento fallido y bloquea la cuenta si se supero el limite
   * dentro de la ventana de tiempo.
   */
  async registrarFallo(nombreUsuario: string, ip?: string): Promise<void> {
    const usuario = nombreUsuario.toLowerCase().slice(0, 60);
    await this.prisma.intentoFallido.create({ data: { usuario, ip: ip?.slice(0, 45) } });

    const desde = new Date(Date.now() - this.env.VENTANA_INTENTOS_MINUTOS * 60_000);
    const fallos = await this.prisma.intentoFallido.count({
      where: { usuario, fecha: { gte: desde } },
    });

    if (fallos >= this.env.MAX_INTENTOS_FALLIDOS) {
      const hasta = new Date(Date.now() + this.env.MINUTOS_BLOQUEO * 60_000);
      // updateMany y no update: el usuario intentado puede no existir.
      await this.prisma.usuario.updateMany({
        where: { usuario },
        data: { bloqueadoHasta: hasta },
      });
      this.logger.warn(
        { usuario, fallos, ip },
        'Cuenta bloqueada temporalmente por intentos fallidos',
      );
    }
  }

  /** Tras un acceso correcto se limpia el historial de esa cuenta. */
  async limpiar(nombreUsuario: string): Promise<void> {
    await this.prisma.intentoFallido.deleteMany({
      where: { usuario: nombreUsuario.toLowerCase() },
    });
  }
}
