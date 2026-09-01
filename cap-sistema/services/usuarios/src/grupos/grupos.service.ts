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
import { serieDe } from './serie';

/**
 * Las carpetas familiares del archivero del CAP.
 *
 * El CAP no archiva por persona sino por FAMILIA: cada una tiene un folder de
 * carton con un numero escrito en la pestana, rotulado con el apellido y
 * guardado por el lugar donde vive. «Familia Lopez Ac · El Calvario · No. 1».
 *
 * El numero lo asigna quien registra, no el sistema: el folder de carton ya
 * existe en el archivero antes que el registro digital, y si el sistema
 * inventara el suyo habria dos numeraciones para la misma carpeta. Lo unico
 * que hace el sistema es DECIR cual sigue libre y no dejar repetir uno dado.
 */
@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(consulta: ConsultarGruposDto) {
    const { tamano, saltar } = normalizarPagina(consulta);

    const where = {
      ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
      ...(consulta.lugarId ? { lugarId: consulta.lugarId } : {}),
      ...(consulta.apellidos
        ? { apellidos: { contains: consulta.apellidos.trim(), mode: 'insensitive' as const } }
        : {}),
      ...(consulta.numero !== undefined ? { numero: consulta.numero } : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.grupoFamiliar.findMany({
        where,
        skip: saltar,
        take: tamano,
        // Por numero, que es como estan en el archivero.
        orderBy: [{ numero: 'asc' }],
        select: {
          id: true,
          numero: true,
          apellidos: true,
          direccion: true,
          telefono: true,
          comunidad: { select: { id: true, nombre: true } },
          lugar: { select: { id: true, nombre: true, tipo: true } },
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
        numero: g.numero,
        apellidos: g.apellidos,
        direccion: g.direccion,
        telefono: g.telefono,
        comunidad: g.comunidad,
        lugar: g.lugar,
        integrantes: g._count.pacientes,
      })),
      total,
      consulta,
    );
  }

  /**
   * Una carpeta con sus integrantes.
   *
   * No se pagina la lista de integrantes: una familia tiene un punado de
   * personas, no miles, y la pantalla los necesita completos. Es una excepcion
   * acotada por el dominio, no un descuido.
   */
  async obtener(id: string) {
    const g = await this.prisma.grupoFamiliar.findUnique({
      where: { id },
      include: {
        comunidad: { select: { id: true, nombre: true } },
        lugar: { select: { id: true, nombre: true, tipo: true } },
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
    if (!g) throw new NotFoundException('No existe esa carpeta familiar.');

    return {
      id: g.id,
      numero: g.numero,
      apellidos: g.apellidos,
      direccion: g.direccion,
      telefono: g.telefono,
      comunidad: g.comunidad,
      lugar: g.lugar,
      integrantes: g.pacientes.map((p) => ({
        ...p,
        edad: PacientesService.edad(p.fechaNacimiento),
      })),
    };
  }

  /**
   * El numero mas bajo que todavia no esta usado en una serie.
   *
   * Es lo que se le muestra al recepcionista para que no tenga que ir al
   * archivero a mirar por cual van. Sale del indice unico, sin recorrer la
   * tabla.
   *
   * No reutiliza huecos: si la carpeta 7 se dio de baja, la siguiente sigue
   * siendo la mayor mas uno. Es lo que hace un archivero de verdad, y
   * reaprovechar un numero pondria dos familias distintas bajo la misma
   * pestana con anos de diferencia.
   */
  async siguienteNumero(comunidadId: string, lugarId?: string | null) {
    await this.comprobarLugar(comunidadId, lugarId);
    const serieId = serieDe(comunidadId, lugarId);

    const mayor = await this.prisma.grupoFamiliar.aggregate({
      where: { serieId },
      _max: { numero: true },
    });

    return { serieId, numero: (mayor._max.numero ?? 0) + 1 };
  }

  async crear(dto: CrearGrupoDto) {
    await this.comprobarLugar(dto.comunidadId, dto.lugarId);

    const serieId = serieDe(dto.comunidadId, dto.lugarId);
    const numero = dto.numero ?? (await this.siguienteNumero(dto.comunidadId, dto.lugarId)).numero;

    const ocupada = await this.prisma.grupoFamiliar.findUnique({
      where: { serieId_numero: { serieId, numero } },
      select: { apellidos: true },
    });
    if (ocupada) {
      throw new ConflictException({
        mensaje:
          'El numero ' + numero + ' ya lo tiene la carpeta de la familia ' + ocupada.apellidos + '.',
      });
    }

    return this.prisma.grupoFamiliar.create({
      data: {
        numero,
        apellidos: dto.apellidos.trim(),
        serieId,
        comunidadId: dto.comunidadId,
        lugarId: dto.lugarId ?? null,
        direccion: dto.direccion?.trim(),
        telefono: dto.telefono?.trim(),
      },
      select: {
        id: true,
        numero: true,
        apellidos: true,
        direccion: true,
        telefono: true,
        comunidadId: true,
        lugarId: true,
      },
    });
  }

  /**
   * Que la comunidad exista y que el lugar sea suyo.
   *
   * Lo segundo importa mas de lo que parece: aceptar un barrio de otra
   * comunidad pondria la carpeta en una serie de numeracion que no le
   * corresponde, y el numero de la pestana dejaria de significar lo que dice.
   */
  private async comprobarLugar(comunidadId: string, lugarId?: string | null) {
    if (!(await this.prisma.comunidad.findUnique({ where: { id: comunidadId } }))) {
      throw new BadRequestException('La comunidad indicada no existe.');
    }
    if (!lugarId) return;

    const lugar = await this.prisma.lugarPoblado.findUnique({
      where: { id: lugarId },
      select: { comunidadId: true },
    });
    if (!lugar) throw new BadRequestException('El barrio o caserio indicado no existe.');
    if (lugar.comunidadId !== comunidadId) {
      throw new BadRequestException('Ese barrio o caserio no pertenece a la comunidad indicada.');
    }
  }
}
