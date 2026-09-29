import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { hashContrasena, verificarContrasena } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Cuanto vale la pena recordar un equipo. */
const DIAS_DE_CONFIANZA = 30;

/** Cuantos equipos puede recordar una misma persona a la vez. */
const MAXIMO_POR_USUARIO = 5;

/**
 * Equipos en los que ya se demostro el segundo factor.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE EXISTE
 * ─────────────────────────────────────────────────────────────────────────
 * El segundo factor protege de que alguien con la contrasena robada entre
 * desde fuera. Pedirlo en CADA entrada no aumenta esa proteccion: la primera
 * vez del dia ya demostro que el telefono esta en manos de quien dice ser.
 * Lo que si produce es que en una clinica donde se entra y sale del sistema
 * varias veces al dia, la gente busque como saltarselo —dejar la sesion
 * abierta, compartir la cuenta— y ahi si se pierde todo.
 *
 * Asi que se cobra una vez por equipo y por mes, no una vez por entrada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  QUE SIGUE PROTEGIENDO
 * ─────────────────────────────────────────────────────────────────────────
 * El token del dispositivo NO es una credencial. Por si solo no abre nada:
 * hay que traer ademas el usuario y la contrasena correctos. Lo unico que
 * evita es el segundo paso, y solo en el equipo donde ya se hizo una vez.
 * Quien roba la contrasena y entra desde otra computadora sigue topando con
 * el codigo.
 *
 * Se guarda hasheado con Argon2id, igual que las contrasenas: si alguien lee
 * la base no se lleva dispositivos utilizables.
 *
 * La confianza se rompe sola en tres casos, y los tres importan:
 *   - a los 30 dias,
 *   - al cambiar la contrasena (la revoca el servicio de autenticacion),
 *   - cuando la persona o un administrador lo revocan a mano, que es lo que
 *     se hace cuando se pierde o se presta un equipo.
 */
@Injectable()
export class DispositivosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recordar este equipo. Devuelve el token que el navegador debe guardar.
   *
   * Solo se llama DESPUES de un segundo factor correcto: es lo que se esta
   * recordando.
   */
  async recordar(
    usuarioId: string,
    descripcion: string | null,
    ip: string | null,
  ): Promise<string> {
    // 32 bytes: no tiene que ser escrito por nadie, asi que puede ser largo.
    const token = randomBytes(32).toString('base64url');

    await this.prisma.dispositivoConfiable.create({
      data: {
        usuarioId,
        hash: await hashContrasena(token),
        descripcion: descripcion?.slice(0, 120) ?? null,
        ip,
        expiraEn: new Date(Date.now() + DIAS_DE_CONFIANZA * 86_400_000),
      },
    });

    await this.podar(usuarioId);
    return token;
  }

  /**
   * ¿Este equipo ya demostro el segundo factor de esta persona?
   *
   * Recorre los vigentes comparando hashes. Son cinco como mucho, asi que el
   * recorrido es barato; y hay que recorrerlos porque el hash de Argon2 lleva
   * sal —no se puede buscar por igualdad como se haria con un indice.
   */
  async esConfiable(usuarioId: string, token: string | undefined): Promise<boolean> {
    if (!token) return false;

    const vigentes = await this.prisma.dispositivoConfiable.findMany({
      where: { usuarioId, revocadoEn: null, expiraEn: { gt: new Date() } },
    });

    for (const d of vigentes) {
      if (await verificarContrasena(d.hash, token)) {
        await this.prisma.dispositivoConfiable.update({
          where: { id: d.id },
          data: { ultimoUsoEn: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  /** Los equipos recordados, para que la persona vea cuales son y los quite. */
  async listar(usuarioId: string) {
    return this.prisma.dispositivoConfiable.findMany({
      where: { usuarioId, revocadoEn: null, expiraEn: { gt: new Date() } },
      select: {
        id: true,
        descripcion: true,
        creadoEn: true,
        ultimoUsoEn: true,
        expiraEn: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /** Quitar la confianza de un equipo concreto. */
  async revocar(usuarioId: string, id: string): Promise<void> {
    await this.prisma.dispositivoConfiable.updateMany({
      where: { id, usuarioId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  /**
   * Quitarla de TODOS.
   *
   * Es lo que se hace al cambiar la contrasena: si se cambio porque alguien
   * mas la sabia, dejar equipos recordados seria dejarle a esa persona la
   * puerta que el cambio pretendia cerrar.
   */
  async revocarTodos(usuarioId: string): Promise<void> {
    await this.prisma.dispositivoConfiable.updateMany({
      where: { usuarioId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  /**
   * Deja como mucho cinco vigentes, quitando los mas viejos.
   *
   * Sin esto la lista crece sola: cada navegador, cada equipo de turno, cada
   * reinstalacion deja uno mas, y quien entra a revisarlos no distingue el
   * suyo de los quince que ya no existen.
   */
  private async podar(usuarioId: string): Promise<void> {
    const vigentes = await this.prisma.dispositivoConfiable.findMany({
      where: { usuarioId, revocadoEn: null, expiraEn: { gt: new Date() } },
      orderBy: { creadoEn: 'desc' },
      select: { id: true },
    });
    const sobran = vigentes.slice(MAXIMO_POR_USUARIO).map((d) => d.id);
    if (sobran.length > 0) {
      await this.prisma.dispositivoConfiable.updateMany({
        where: { id: { in: sobran } },
        data: { revocadoEn: new Date() },
      });
    }
  }
}

/**
 * Como se llama un equipo en la lista.
 *
 * Del `user-agent` entero solo interesa lo que una persona reconoce: el
 * navegador y el sistema. «Chrome en Windows» le dice a alguien cual es el
 * suyo; la cadena completa no se la lee nadie.
 */
export function describirEquipo(agente: string | undefined): string | null {
  if (!agente) return null;

  const navegador = /Edg\//.test(agente)
    ? 'Edge'
    : /OPR\//.test(agente)
      ? 'Opera'
      : /Chrome\//.test(agente)
        ? 'Chrome'
        : /Firefox\//.test(agente)
          ? 'Firefox'
          : /Safari\//.test(agente)
            ? 'Safari'
            : 'Navegador';

  const sistema = /Windows/.test(agente)
    ? 'Windows'
    : /Android/.test(agente)
      ? 'Android'
      : /iPhone|iPad/.test(agente)
        ? 'iPhone o iPad'
        : /Mac OS X/.test(agente)
          ? 'Mac'
          : /Linux/.test(agente)
            ? 'Linux'
            : null;

  return sistema ? navegador + ' en ' + sistema : navegador;
}
