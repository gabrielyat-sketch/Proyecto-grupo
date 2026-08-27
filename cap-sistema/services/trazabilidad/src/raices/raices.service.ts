import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { crearPagina, DESFASE_GUATEMALA_HORAS, fechaDelDia, normalizarPagina, Pagina } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ENTORNO, Entorno } from '../config/entorno';
import { RaizDiaria } from '../../generado';
import { firmaRaizValida, firmarRaiz } from '../dominio/cadena';

/** Raiz tal como sale de la API: BigInt no sobrevive a JSON. */
export interface RaizVisible {
  dia: string;
  numeroDesde: string;
  numeroHasta: string;
  cantidad: number;
  hashFinal: string;
  firma: string;
  generadaEn: Date;
  /** Resultado de comprobar la firma con LLAVE_RAIZ_TRAZA. */
  firmaValida: boolean;
}

/**
 * Hash raiz diario firmado (arquitectura §9.5).
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  QUE PROBLEMA RESUELVE, QUE LA CADENA POR SI SOLA NO RESUELVE
 * ─────────────────────────────────────────────────────────────────────────
 * La cadena detecta que alguien altero UN registro. No detecta que alguien
 * con control total de PostgreSQL borre la tabla entera y la vuelva a escribir
 * desde cero: la cadena nueva seria perfectamente coherente consigo misma.
 *
 * La raiz diaria cierra ese hueco. Se firma con una llave que NO esta en la
 * base de datos, asi que quien reescriba la tabla no puede volver a firmar los
 * dias anteriores. Al verificar, las firmas viejas ya no cuadran.
 *
 * Por eso §9.5 pide ademas copiarla al almacenamiento de respaldos: si la raiz
 * vive solo aqui, quien borre la bitacora borra tambien la prueba.
 */
@Injectable()
export class RaicesService {
  private readonly logger = new Logger(RaicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENTORNO) private readonly env: Entorno,
  ) {}

  /**
   * Cierra un dia: calcula su raiz y la firma.
   *
   * Idempotente por necesidad, no por elegancia: la tabla tampoco admite
   * UPDATE, asi que un segundo cierre del mismo dia no puede "corregir" nada.
   * Si ya existe, se devuelve la que hay.
   *
   * No cierra el dia en curso. Un dia todavia puede recibir registros, y una
   * raiz firmada sobre un dia abierto quedaria invalidada por el siguiente
   * registro que entrara — y pareceria una alteracion.
   */
  async cerrarDia(diaTexto?: string): Promise<RaizVisible> {
    const hoy = fechaDelDia(new Date());
    const dia = diaTexto ? this.aDia(diaTexto) : new Date(hoy.getTime() - 86_400_000);

    if (dia.getTime() >= hoy.getTime()) {
      throw new BadRequestException(
        'No se cierra un dia que todavia puede recibir registros. El ultimo que se ' +
          'puede cerrar es ayer.',
      );
    }

    const existente = await this.prisma.raizDiaria.findUnique({ where: { dia } });
    if (existente) return this.aVisible(existente);

    // El dia local de Purulha en instantes UTC: Guatemala es UTC-6 todo el
    // anio, sin horario de verano.
    const inicio = new Date(dia.getTime() - DESFASE_GUATEMALA_HORAS * 3_600_000);
    const fin = new Date(inicio.getTime() + 86_400_000);

    const registros = await this.prisma.registro.findMany({
      where: { registradoEn: { gte: inicio, lt: fin } },
      orderBy: { numero: 'asc' },
      select: { numero: true, hash: true },
    });

    if (registros.length === 0) {
      throw new BadRequestException(
        'El ' + this.aTexto(dia) + ' no tiene registros. Un dia sin actividad no genera raiz.',
      );
    }

    const datos = {
      dia: this.aTexto(dia),
      numeroDesde: registros[0].numero,
      numeroHasta: registros[registros.length - 1].numero,
      cantidad: registros.length,
      hashFinal: registros[registros.length - 1].hash,
    };

    try {
      const creada = await this.prisma.raizDiaria.create({
        data: { ...datos, dia, firma: firmarRaiz(this.env.LLAVE_RAIZ_TRAZA, datos) },
      });
      this.logger.log(
        'Raiz del ' + datos.dia + ' firmada: ' + datos.cantidad + ' registros.',
      );
      return this.aVisible(creada);
    } catch {
      // Dos cierres simultaneos del mismo dia. Gana el primero; el segundo
      // devuelve lo que quedo, que es exactamente lo mismo.
      const yaEsta = await this.prisma.raizDiaria.findUnique({ where: { dia } });
      if (yaEsta) return this.aVisible(yaEsta);
      throw new ConflictException('No se pudo firmar la raiz del ' + datos.dia + '.');
    }
  }

  /** Lista las raices firmadas, de la mas reciente a la mas antigua. */
  async listar(filtros: { pagina?: number; tamano?: number } = {}): Promise<Pagina<RaizVisible>> {
    const { tamano, saltar } = normalizarPagina(filtros);
    const [raices, total] = await this.prisma.$transaction([
      this.prisma.raizDiaria.findMany({ skip: saltar, take: tamano, orderBy: { dia: 'desc' } }),
      this.prisma.raizDiaria.count(),
    ]);
    return crearPagina(raices.map((r) => this.aVisible(r)), total, filtros);
  }

  private aVisible(r: RaizDiaria): RaizVisible {
    const datos = {
      dia: this.aTexto(r.dia),
      numeroDesde: r.numeroDesde,
      numeroHasta: r.numeroHasta,
      cantidad: r.cantidad,
      hashFinal: r.hashFinal,
    };
    return {
      ...datos,
      numeroDesde: r.numeroDesde.toString(),
      numeroHasta: r.numeroHasta.toString(),
      firma: r.firma,
      generadaEn: r.generadaEn,
      firmaValida: firmaRaizValida(this.env.LLAVE_RAIZ_TRAZA, datos, r.firma),
    };
  }

  /** AAAA-MM-DD, que es como se guarda y como se firma. */
  private aTexto(dia: Date): string {
    return dia.toISOString().slice(0, 10);
  }

  private aDia(texto: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      throw new BadRequestException('El dia se indica como AAAA-MM-DD.');
    }
    const dia = new Date(texto + 'T00:00:00.000Z');
    if (Number.isNaN(dia.getTime())) {
      throw new BadRequestException('El dia ' + texto + ' no existe en el calendario.');
    }
    return dia;
  }
}
