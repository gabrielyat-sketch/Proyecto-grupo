import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { crearPagina, hashContrasena, normalizarPagina, Rol } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
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
  ultimoAcceso: true,
  creadoEn: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  /**
   * Contrasena temporal legible: se dicta o se entrega en papel al personal.
   * Sin caracteres ambiguos (0/O, 1/l/I) porque se transcribe a mano.
   */
  private static generarContrasenaTemporal(): string {
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = randomBytes(14);
    return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
  }

  async crear(dto: CrearUsuarioDto) {
    const usuario = dto.usuario.toLowerCase();

    const existe = await this.prisma.usuario.findUnique({ where: { usuario } });
    if (existe) {
      throw new ConflictException('Ya existe una cuenta con ese nombre de usuario.');
    }

    const contrasenaTemporal = UsuariosService.generarContrasenaTemporal();

    const creado = await this.prisma.usuario.create({
      data: {
        usuario,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        rol: dto.rol,
        contrasenaHash: await hashContrasena(contrasenaTemporal),
        debeCambiarContrasena: true,
      },
      select: CAMPOS_PUBLICOS,
    });

    // Es la unica vez que esta contrasena existe en claro.
    return { ...creado, contrasenaTemporal };
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

    return crearPagina(datos, total, consulta);
  }

  async obtener(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: CAMPOS_PUBLICOS,
    });
    if (!usuario) throw new NotFoundException('No existe esa cuenta.');
    return usuario;
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto, idQuienEdita: string) {
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

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(dto.nombres !== undefined ? { nombres: dto.nombres.trim() } : {}),
        ...(dto.apellidos !== undefined ? { apellidos: dto.apellidos.trim() } : {}),
        ...(dto.rol !== undefined ? { rol: dto.rol } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
      select: CAMPOS_PUBLICOS,
    });

    // Desactivar o cambiar de rol debe surtir efecto ya, no en 15 minutos
    // cuando expire el token de acceso que la persona tenga abierto.
    if (dto.activo === false || (dto.rol && dto.rol !== (usuario.rol as Rol))) {
      await this.tokens.revocarTodasDelUsuario(id, 'cambio_administrativo');
    }

    return actualizado;
  }

  async restablecerContrasena(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('No existe esa cuenta.');

    const contrasenaTemporal = UsuariosService.generarContrasenaTemporal();

    await this.prisma.usuario.update({
      where: { id },
      data: {
        contrasenaHash: await hashContrasena(contrasenaTemporal),
        debeCambiarContrasena: true,
        bloqueadoHasta: null,
      },
    });

    await this.tokens.revocarTodasDelUsuario(id, 'restablecimiento');

    return { usuario: usuario.usuario, contrasenaTemporal };
  }
}
