import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { crearPagina, fechaDelDia, normalizarPagina, type Pagina } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ENTORNO, Entorno } from '../config/entorno';
import { bajoMinimo, clasificarVencimiento } from '../dominio/inventario';
import { CrearMedicamentoDto } from './dto/crear-medicamento.dto';
import { ConsultarMedicamentosDto } from './dto/consultar-medicamentos.dto';
import { ActualizarMedicamentoDto } from './dto/actualizar-medicamento.dto';
import {
  MedicamentoBajoMinimoDto,
  MedicamentoConExistenciaDto,
  MedicamentoDetalleDto,
  MedicamentoDto,
} from './dto/respuestas.dto';

@Injectable()
export class CatalogoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENTORNO) private readonly env: Entorno,
  ) {}

  /**
   * Catalogo con la existencia total de cada medicamento.
   *
   * La existencia se agrega en la MISMA consulta con un groupBy, no pidiendo
   * los lotes de cada medicamento uno por uno: eso seria el N+1 clasico de
   * esta pantalla, y la farmacia la abre decenas de veces al dia.
   */
  async listar(consulta: ConsultarMedicamentosDto): Promise<Pagina<MedicamentoConExistenciaDto>> {
    const { tamano, saltar } = normalizarPagina(consulta);
    const buscar = consulta.buscar?.trim();

    const where = {
      ...(consulta.incluirInactivos === 'true' ? {} : { activo: true }),
      ...(buscar
        ? {
            OR: [
              { nombreGenerico: { startsWith: buscar, mode: 'insensitive' as const } },
              { codigo: { startsWith: buscar, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [medicamentos, total] = await this.prisma.$transaction([
      this.prisma.medicamento.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { nombreGenerico: 'asc' },
      }),
      this.prisma.medicamento.count({ where }),
    ]);

    if (medicamentos.length === 0) return crearPagina([], total, consulta);

    const existencias = await this.prisma.lote.groupBy({
      by: ['medicamentoId'],
      where: {
        medicamentoId: { in: medicamentos.map((m) => m.id) },
        estado: 'DISPONIBLE',
      },
      _sum: { cantidadDisponible: true },
    });
    const porMedicamento = new Map(
      existencias.map((e) => [e.medicamentoId, e._sum.cantidadDisponible ?? 0]),
    );

    return crearPagina(
      medicamentos.map((m) => {
        const existencia = porMedicamento.get(m.id) ?? 0;
        return {
          id: m.id,
          codigo: m.codigo,
          nombreGenerico: m.nombreGenerico,
          nombreComercial: m.nombreComercial,
          presentacion: m.presentacion,
          concentracion: m.concentracion,
          unidad: m.unidad,
          requiereReceta: m.requiereReceta,
          activo: m.activo,
          stockMinimo: m.stockMinimo,
          existencia,
          bajoMinimo: bajoMinimo(existencia, m.stockMinimo),
        };
      }),
      total,
      consulta,
    );
  }

  /** Detalle con sus lotes, cada uno con su estado de vencimiento calculado. */
  async obtener(id: string): Promise<MedicamentoDetalleDto> {
    const m = await this.prisma.medicamento.findUnique({
      where: { id },
      include: {
        lotes: {
          where: { estado: { in: ['DISPONIBLE', 'AGOTADO'] } },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    });
    if (!m) throw new NotFoundException('No existe ese medicamento.');

    const hoy = fechaDelDia(new Date());
    const existencia = m.lotes
      .filter((l) => l.estado === 'DISPONIBLE')
      .reduce((s, l) => s + l.cantidadDisponible, 0);

    return {
      id: m.id,
      codigo: m.codigo,
      nombreGenerico: m.nombreGenerico,
      nombreComercial: m.nombreComercial,
      presentacion: m.presentacion,
      concentracion: m.concentracion,
      unidad: m.unidad,
      requiereReceta: m.requiereReceta,
      activo: m.activo,
      stockMinimo: m.stockMinimo,
      existencia,
      bajoMinimo: bajoMinimo(existencia, m.stockMinimo),
      lotes: m.lotes.map((l) => ({
        id: l.id,
        numeroLote: l.numeroLote,
        fechaVencimiento: l.fechaVencimiento,
        cantidadDisponible: l.cantidadDisponible,
        estado: l.estado,
        vencimiento: clasificarVencimiento(
          l.fechaVencimiento,
          hoy,
          this.env.DIAS_ALERTA_VENCIMIENTO,
        ),
      })),
    };
  }

  async crear(dto: CrearMedicamentoDto): Promise<MedicamentoDto> {
    const codigo = dto.codigo.trim().toUpperCase();
    if (await this.prisma.medicamento.findUnique({ where: { codigo } })) {
      throw new ConflictException({ mensaje: 'Ya existe un medicamento con ese codigo.' });
    }

    return this.prisma.medicamento.create({
      data: {
        codigo,
        nombreGenerico: dto.nombreGenerico.trim(),
        nombreComercial: dto.nombreComercial?.trim(),
        presentacion: dto.presentacion?.trim(),
        concentracion: dto.concentracion?.trim(),
        unidad: dto.unidad,
        stockMinimo: dto.stockMinimo ?? 0,
        requiereReceta: dto.requiereReceta ?? false,
      },
    });
  }

  /**
   * Ajusta la existencia minima, la receta obligatoria o el estado.
   *
   * Los tres campos se copian uno por uno en vez de pasar el objeto recibido
   * a Prisma. El DTO ya deja fuera cualquier otra cosa, pero un `data` armado
   * a mano no puede convertirse en escritura de campos arbitrarios el dia que
   * alguien afloje la validacion sin darse cuenta de que este `update` estaba
   * confiando en ella.
   */
  async actualizar(id: string, dto: ActualizarMedicamentoDto): Promise<MedicamentoDto> {
    if (!(await this.prisma.medicamento.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('No existe ese medicamento.');
    }
    return this.prisma.medicamento.update({
      where: { id },
      data: {
        ...(dto.stockMinimo === undefined ? {} : { stockMinimo: dto.stockMinimo }),
        ...(dto.activo === undefined ? {} : { activo: dto.activo }),
        ...(dto.requiereReceta === undefined ? {} : { requiereReceta: dto.requiereReceta }),
      },
    });
  }

  /**
   * Medicamentos por debajo de su existencia minima.
   *
   * Se resuelve con una agregacion y un filtro en memoria sobre el resultado
   * agregado, no recorriendo lotes: el catalogo del CAP son cientos de
   * medicamentos, no cientos de miles.
   */
  async bajoMinimo(): Promise<MedicamentoBajoMinimoDto[]> {
    const medicamentos = await this.prisma.medicamento.findMany({
      where: { activo: true, stockMinimo: { gt: 0 } },
      orderBy: { nombreGenerico: 'asc' },
    });
    if (medicamentos.length === 0) return [];

    const existencias = await this.prisma.lote.groupBy({
      by: ['medicamentoId'],
      where: { medicamentoId: { in: medicamentos.map((m) => m.id) }, estado: 'DISPONIBLE' },
      _sum: { cantidadDisponible: true },
    });
    const porMedicamento = new Map(
      existencias.map((e) => [e.medicamentoId, e._sum.cantidadDisponible ?? 0]),
    );

    return medicamentos
      .map((m) => ({
        id: m.id,
        codigo: m.codigo,
        nombreGenerico: m.nombreGenerico,
        unidad: m.unidad,
        stockMinimo: m.stockMinimo,
        existencia: porMedicamento.get(m.id) ?? 0,
      }))
      .filter((m) => bajoMinimo(m.existencia, m.stockMinimo));
  }
}
