import { Injectable, NotFoundException } from '@nestjs/common';
import { crearPagina, normalizarPagina, Pagina } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CrearEjemploDto } from './dto/crear-ejemplo.dto';
import { ConsultarEjemploDto } from './dto/consultar-ejemplo.dto';

@Injectable()
export class EjemploService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(consulta: ConsultarEjemploDto): Promise<Pagina<{ id: string; nombre: string }>> {
    const { tamano, saltar } = normalizarPagina(consulta);

    // Se piden los datos y el total en una sola transaccion para que el
    // conteo no quede desfasado respecto de la pagina devuelta.
    const [datos, total] = await this.prisma.$transaction([
      this.prisma.ejemplo.findMany({
        skip: saltar,
        take: tamano,
        orderBy: { creadoEn: 'desc' },
        select: { id: true, nombre: true, activo: true, creadoEn: true },
      }),
      this.prisma.ejemplo.count(),
    ]);

    return crearPagina(datos, total, consulta);
  }

  async obtener(id: string) {
    const registro = await this.prisma.ejemplo.findUnique({ where: { id } });
    if (!registro) {
      throw new NotFoundException('No existe un registro con ese identificador.');
    }
    return registro;
  }

  async crear(dto: CrearEjemploDto) {
    return this.prisma.ejemplo.create({ data: { nombre: dto.nombre, activo: dto.activo ?? true } });
  }
}
