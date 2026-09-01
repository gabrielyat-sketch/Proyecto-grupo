import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';

@Injectable()
export class ComunidadesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sin paginar a proposito: el municipio de Purulha tiene decenas de
   * comunidades, no miles, y este listado alimenta un desplegable que se
   * necesita completo. Es la unica excepcion a la regla de paginacion
   * obligatoria, y esta es la justificacion.
   */
  listar(soloActivas = true) {
    return this.prisma.comunidad.findMany({
      where: soloActivas ? { activa: true } : {},
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, codigo: true, distante: true, activa: true },
    });
  }

  async crear(dto: CrearComunidadDto) {
    const nombre = dto.nombre.trim();
    if (await this.prisma.comunidad.findUnique({ where: { nombre } })) {
      throw new ConflictException('Ya existe una comunidad con ese nombre.');
    }
    return this.prisma.comunidad.create({
      data: { nombre, codigo: dto.codigo?.trim(), distante: dto.distante ?? false },
    });
  }

  async obtener(id: string) {
    const c = await this.prisma.comunidad.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('No existe esa comunidad.');
    return c;
  }

  /**
   * Los barrios, caserios y aldeas de una comunidad.
   *
   * Sin paginar, igual que las comunidades: son unos pocos por comunidad y el
   * formulario de alta necesita la lista entera para su selector.
   *
   * Devuelve vacio cuando esa comunidad todavia no tiene lugares declarados.
   * No es un error: es que nadie del CAP ha dicho todavia cuales son.
   */
  async lugaresDe(comunidadId: string) {
    if (!(await this.prisma.comunidad.findUnique({ where: { id: comunidadId } }))) {
      throw new NotFoundException('No existe esa comunidad.');
    }

    return this.prisma.lugarPoblado.findMany({
      where: { comunidadId, activo: true },
      orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true, tipo: true },
    });
  }
}
