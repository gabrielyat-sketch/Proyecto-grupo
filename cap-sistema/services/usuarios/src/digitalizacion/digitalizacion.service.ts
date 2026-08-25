import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoDigitalizacion } from '../../prisma/generado';

@Injectable()
export class DigitalizacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Panel de avance de la digitalizacion (seccion 10 del plan).
   *
   * Se agrupa en la base de datos con un solo GROUP BY, no trayendo las filas
   * para contarlas en memoria: con 100,000 expedientes eso seria traer
   * 100,000 registros para calcular cuatro numeros.
   */
  async resumen() {
    const porEstado = await this.prisma.registroDigitalizacion.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const conteo: Record<string, number> = {
      PENDIENTE: 0,
      EN_PROCESO: 0,
      COMPLETO: 0,
      NO_LOCALIZADO: 0,
    };
    for (const fila of porEstado) conteo[fila.estado] = fila._count._all;

    const total = Object.values(conteo).reduce((a, b) => a + b, 0);
    return {
      total,
      porEstado: conteo,
      porcentajeCompleto: total === 0 ? 0 : Math.round((conteo.COMPLETO / total) * 1000) / 10,
    };
  }

  async actualizar(
    expedienteId: string,
    estado: EstadoDigitalizacion,
    usuarioId: string,
    observaciones?: string,
  ) {
    const registro = await this.prisma.registroDigitalizacion.findUnique({
      where: { expedienteId },
    });
    if (!registro) throw new NotFoundException('No existe ese expediente.');

    return this.prisma.registroDigitalizacion.update({
      where: { expedienteId },
      data: {
        estado,
        digitalizadoPor: usuarioId,
        observaciones: observaciones?.slice(0, 500),
        ...(estado === 'EN_PROCESO' && !registro.iniciadoEn ? { iniciadoEn: new Date() } : {}),
        ...(estado === 'COMPLETO' ? { completadoEn: new Date() } : {}),
      },
    });
  }
}
