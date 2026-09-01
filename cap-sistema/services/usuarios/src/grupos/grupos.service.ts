import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { crearPagina, normalizarPagina } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PacientesService } from '../pacientes/pacientes.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ConsultarGruposDto } from './dto/consultar-grupos.dto';

/**
 * Grupos familiares.
 *
 * El CAP organiza la atencion por familia y no solo por individuo: los
 * programas de desnutricion infantil y de embarazo se siguen en ese nivel, y
 * una visita domiciliaria atiende a la casa completa.
 */
@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(consulta: ConsultarGruposDto) {
    const { tamano, saltar } = normalizarPagina(consulta);

    const where = {
      ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
      ...(consulta.codigo
        ? { codigo: { startsWith: consulta.codigo.trim(), mode: 'insensitive' as const } }
        : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.grupoFamiliar.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { codigo: 'asc' },
        select: {
          id: true,
          codigo: true,
          direccion: true,
          telefono: true,
          comunidad: { select: { id: true, nombre: true } },
          // Se cuenta en la base. Traer los pacientes para contarlos en
          // memoria seria el clasico N+1 de esta pantalla.
          _count: { select: { pacientes: true } },
        },
      }),
      this.prisma.grupoFamiliar.count({ where }),
    ]);

    return crearPagina(
      datos.map((g) => ({
        id: g.id,
        codigo: g.codigo,
        direccion: g.direccion,
        telefono: g.telefono,
        comunidad: g.comunidad,
        integrantes: g._count.pacientes,
      })),
      total,
      consulta,
    );
  }

  /**
   * Un grupo con sus integrantes.
   *
   * No se pagina la lista de integrantes: un grupo familiar tiene un puñado de
   * personas, no miles, y la pantalla los necesita completos. Es una excepcion
   * acotada por el dominio, no un descuido.
   */
  async obtener(id: string) {
    const g = await this.prisma.grupoFamiliar.findUnique({
      where: { id },
      include: {
        comunidad: { select: { id: true, nombre: true } },
        pacientes: {
          orderBy: { fechaNacimiento: 'asc' },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            fechaNacimiento: true,
            sexo: true,
            fallecido: true,
          },
        },
      },
    });
    if (!g) throw new NotFoundException('No existe ese grupo familiar.');

    return {
      id: g.id,
      codigo: g.codigo,
      direccion: g.direccion,
      telefono: g.telefono,
      comunidad: g.comunidad,
      integrantes: g.pacientes.map((p) => ({
        ...p,
        edad: PacientesService.edad(p.fechaNacimiento),
      })),
    };
  }

  async crear(dto: CrearGrupoDto) {
    if (!(await this.prisma.comunidad.findUnique({ where: { id: dto.comunidadId } }))) {
      throw new BadRequestException('La comunidad indicada no existe.');
    }

    const codigo = dto.codigo?.trim() || (await this.siguienteCodigo());

    if (await this.prisma.grupoFamiliar.findUnique({ where: { codigo } })) {
      throw new ConflictException({ mensaje: 'Ya existe un grupo familiar con ese codigo.' });
    }

    return this.prisma.grupoFamiliar.create({
      data: {
        codigo,
        comunidadId: dto.comunidadId,
        direccion: dto.direccion?.trim(),
        telefono: dto.telefono?.trim(),
      },
      select: { id: true, codigo: true, direccion: true, telefono: true, comunidadId: true },
    });
  }

  /** Mismo razonamiento que el correlativo de expedientes: secuencia atomica. */
  private async siguienteCodigo(): Promise<string> {
    const filas = await this.prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('usuarios.grupo_correlativo') AS nextval
    `;
    return 'GF-' + new Date().getFullYear() + '-' + String(Number(filas[0].nextval)).padStart(6, '0');
  }
}
