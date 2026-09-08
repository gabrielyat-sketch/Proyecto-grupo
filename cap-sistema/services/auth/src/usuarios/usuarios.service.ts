import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  CLIENTE_AUDITORIA,
  ContextoAuditoria,
  crearPagina,
  exigeMfa,
  hashContrasena,
  IClienteAuditoria,
  normalizarPagina,
  Rol,
} from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { MfaService } from '../mfa/mfa.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { ConsultarUsuariosDto } from './dto/consultar-usuarios.dto';

/** Campos que se devuelven. NUNCA incluye contrasenaHash. */
const CAMPOS_PUBLICOS = {
  id: true,
  usuario: true,
  nombres: true,
  apellidos: true,
  rol: true,
  activo: true,
  debeCambiarContrasena: true,
  bloqueadoHasta: true,
  ultimoAcceso: true,
  creadoEn: true,
  // Solo si el segundo factor esta activo, nunca el secreto.
  mfa: { select: { activo: true } },
} as const;

/** Forma de una cuenta tal como sale del select de arriba. */
interface CuentaLeida {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  rol: string;
  activo: boolean;
  debeCambiarContrasena: boolean;
  bloqueadoHasta: Date | null;
  ultimoAcceso: Date | null;
  creadoEn: Date;
  mfa: { activo: boolean } | null;
}

/**
 * Aplana la relacion del segundo factor y dice si la cuenta esta bloqueada
 * AHORA MISMO.
 *
 * `bloqueadoHasta` es una fecha en el futuro mientras dura el bloqueo por
 * intentos fallidos, y se queda ahi cuando pasa: comparar contra el reloj es
 * lo unico que distingue "bloqueado" de "estuvo bloqueado la semana pasada".
 */
function comoSePresenta(cuenta: CuentaLeida) {
  const { mfa, bloqueadoHasta, ...resto } = cuenta;
  return {
    ...resto,
    bloqueadoHasta,
    bloqueada: bloqueadoHasta !== null && bloqueadoHasta.getTime() > Date.now(),
    mfaActivo: mfa?.activo === true,
  };
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly mfa: MfaService,
    @Inject(CLIENTE_AUDITORIA) private readonly auditoria: IClienteAuditoria,
  ) {}

  /**
   * Presupuesto de las transacciones que esperan a la bitacora.
   *
   * El valor por defecto de Prisma son 5 s, y dentro de la transaccion cabe
   * una llamada HTTP de hasta `AUDITORIA_TIMEOUT_MS` (tope 5 s). Sin ampliarlo,
   * el caso que importa —trazabilidad tarda pero acaba respondiendo— moriria
   * por el limite de la transaccion y no por el del cliente, con un error que
   * no dice lo que paso.
   */
  private static readonly MS_TRANSACCION = 10_000;

  /**
   * Contrasena temporal legible: se dicta o se entrega en papel al personal.
   * Sin caracteres ambiguos (0/O, 1/l/I) porque se transcribe a mano.
   */
  private static generarContrasenaTemporal(): string {
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(14);
    return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
  }

  async crear(dto: CrearUsuarioDto, contexto: ContextoAuditoria) {
    const usuario = dto.usuario.toLowerCase();

    const existe = await this.prisma.usuario.findUnique({ where: { usuario } });
    if (existe) {
      throw new ConflictException('Ya existe una cuenta con ese nombre de usuario.');
    }

    const contrasenaTemporal = UsuariosService.generarContrasenaTemporal();
    // El hash se calcula FUERA de la transaccion: tarda cientos de
    // milisegundos a proposito, y dentro se comeria el presupuesto que hace
    // falta para esperar a la bitacora.
    const contrasenaHash = await hashContrasena(contrasenaTemporal);

    const creado = await this.prisma.$transaction(
      async (tx) => {
        const creado = await tx.usuario.create({
          data: {
            usuario,
            nombres: dto.nombres.trim(),
            apellidos: dto.apellidos.trim(),
            rol: dto.rol,
            contrasenaHash,
            debeCambiarContrasena: true,
          },
          select: CAMPOS_PUBLICOS,
        });

        // Dentro de la transaccion: si la bitacora no responde, la cuenta no
        // llega a existir. Una cuenta creada sin rastro de quien la creo es
        // exactamente lo que el RF-09 esta para impedir.
        await this.auditoria.registrar(
          {
            servicio: 'auth',
            accion: 'CREACION',
            entidad: 'cuenta',
            entidadId: creado.id,
            motivo: 'Alta de cuenta desde Administracion',
            valorNuevo: JSON.stringify({
              usuario: creado.usuario,
              rol: creado.rol,
              nombres: creado.nombres,
              apellidos: creado.apellidos,
            }),
          },
          contexto.autorizacion,
          contexto.trazaId,
        );

        return creado;
      },
      { timeout: UsuariosService.MS_TRANSACCION },
    );

    // Es la unica vez que esta contrasena existe en claro.
    return { ...comoSePresenta(creado), contrasenaTemporal };
  }

  async listar(consulta: ConsultarUsuariosDto) {
    const { tamano, saltar } = normalizarPagina(consulta);
    const buscar = consulta.buscar?.trim();

    const where = {
      ...(consulta.rol ? { rol: consulta.rol } : {}),
      ...(buscar
        ? {
            OR: [
              { usuario: { contains: buscar, mode: 'insensitive' as const } },
              { nombres: { contains: buscar, mode: 'insensitive' as const } },
              { apellidos: { contains: buscar, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        select: CAMPOS_PUBLICOS,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return crearPagina(datos.map(comoSePresenta), total, consulta);
  }

  async obtener(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: CAMPOS_PUBLICOS,
    });
    if (!usuario) throw new NotFoundException('No existe esa cuenta.');
    return comoSePresenta(usuario);
  }

  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
    idQuienEdita: string,
    contexto: ContextoAuditoria,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('No existe esa cuenta.');

    // Un administrador no puede desactivarse ni degradarse a si mismo: el CAP
    // podria quedarse sin ninguna cuenta capaz de administrar el sistema.
    if (id === idQuienEdita) {
      if (dto.activo === false) {
        throw new BadRequestException('No puede desactivar su propia cuenta.');
      }
      if (dto.rol && dto.rol !== (usuario.rol as Rol)) {
        throw new BadRequestException('No puede cambiar su propio rol.');
      }
    }

    const data = {
      ...(dto.nombres !== undefined ? { nombres: dto.nombres.trim() } : {}),
      ...(dto.apellidos !== undefined ? { apellidos: dto.apellidos.trim() } : {}),
      ...(dto.rol !== undefined ? { rol: dto.rol } : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
    };

    const actualizado = await this.prisma.$transaction(
      async (tx) => {
        const actualizado = await tx.usuario.update({
          where: { id },
          data,
          select: CAMPOS_PUBLICOS,
        });

        // Solo los campos que de verdad cambian. Volcar la cuenta entera
        // obligaria a quien audita a comparar dos bloques largos para
        // encontrar el unico dato distinto, que suele ser el rol.
        const anterior: Record<string, unknown> = {};
        const nuevo: Record<string, unknown> = {};
        for (const campo of Object.keys(data) as (keyof typeof data)[]) {
          const antes = (usuario as Record<string, unknown>)[campo];
          const despues = (actualizado as Record<string, unknown>)[campo];
          if (antes !== despues) {
            anterior[campo] = antes;
            nuevo[campo] = despues;
          }
        }

        await this.auditoria.registrar(
          {
            servicio: 'auth',
            accion: 'MODIFICACION',
            entidad: 'cuenta',
            entidadId: id,
            motivo: 'Cambio de datos, rol o estado desde Administracion',
            valorAnterior: JSON.stringify(anterior),
            valorNuevo: JSON.stringify(nuevo),
          },
          contexto.autorizacion,
          contexto.trazaId,
        );

        return actualizado;
      },
      { timeout: UsuariosService.MS_TRANSACCION },
    );

    // Desactivar o cambiar de rol debe surtir efecto ya, no en 15 minutos
    // cuando expire el token de acceso que la persona tenga abierto.
    if (dto.activo === false || (dto.rol && dto.rol !== (usuario.rol as Rol))) {
      await this.tokens.revocarTodasDelUsuario(id, 'cambio_administrativo');
    }

    return comoSePresenta(actualizado);
  }

  /**
   * Borra el segundo factor de una cuenta para que se configure de nuevo.
   *
   * Es la salida cuando alguien pierde el telefono con la aplicacion de
   * autenticacion y ya gasto —o perdio— sus codigos de respaldo. Sin esto
   * quedaba fuera del sistema de forma permanente, y afecta justo a los dos
   * roles con segundo factor obligatorio.
   *
   * Tambien cierra sus sesiones: si quedara alguna abierta, seguiria dentro
   * con un segundo factor que acaba de dejar de existir.
   */
  async reiniciarMfa(id: string, contexto: ContextoAuditoria) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('No existe esa cuenta.');

    const tenia = await this.prisma.$transaction(
      async (tx) => {
        // `tx` entra en el reinicio para que el borrado del segundo factor y su
        // registro sean la misma transaccion. Reiniciar el MFA de una cuenta
        // ajena es la accion mas delicada del modulo: deja entrar a quien la
        // pida sin el factor que la protegia.
        const tenia = await this.mfa.reiniciar(id, tx);
        if (!tenia) return false;

        await this.auditoria.registrar(
          {
            servicio: 'auth',
            accion: 'ELIMINACION',
            entidad: 'segundo_factor',
            entidadId: id,
            motivo: 'Reinicio del segundo factor desde Administracion',
            valorAnterior: JSON.stringify({ usuario: usuario.usuario, mfaActivo: true }),
          },
          contexto.autorizacion,
          contexto.trazaId,
        );

        return true;
      },
      { timeout: UsuariosService.MS_TRANSACCION },
    );

    if (!tenia) {
      throw new BadRequestException('Esa cuenta no tiene segundo factor configurado.');
    }

    await this.tokens.revocarTodasDelUsuario(id, 'reinicio_mfa');

    return {
      usuario: usuario.usuario,
      // Si su rol lo exige, el sistema se lo va a volver a pedir en el proximo
      // acceso; si no, entrara sin el hasta que decida configurarlo.
      exigeSegundoFactor: exigeMfa(usuario.rol as Rol),
    };
  }

  async restablecerContrasena(id: string, contexto: ContextoAuditoria) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('No existe esa cuenta.');

    const contrasenaTemporal = UsuariosService.generarContrasenaTemporal();
    const contrasenaHash = await hashContrasena(contrasenaTemporal);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.usuario.update({
          where: { id },
          data: { contrasenaHash, debeCambiarContrasena: true, bloqueadoHasta: null },
        });

        // Ni la contrasena ni su hash entran en la bitacora: queda constancia
        // de QUE se restablecio y de quien lo hizo, que es lo que se audita.
        await this.auditoria.registrar(
          {
            servicio: 'auth',
            accion: 'MODIFICACION',
            entidad: 'contrasena',
            entidadId: id,
            motivo: 'Restablecimiento de contrasena desde Administracion',
            valorNuevo: JSON.stringify({ usuario: usuario.usuario, debeCambiarContrasena: true }),
          },
          contexto.autorizacion,
          contexto.trazaId,
        );
      },
      { timeout: UsuariosService.MS_TRANSACCION },
    );

    await this.tokens.revocarTodasDelUsuario(id, 'restablecimiento');

    return { usuario: usuario.usuario, contrasenaTemporal };
  }
}
