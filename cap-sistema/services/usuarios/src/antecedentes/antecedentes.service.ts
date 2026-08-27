import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { GuardarAntecedentesDto } from './dto/guardar-antecedentes.dto';
import type {
  AntecedentesPacienteDto,
  AntecedentesObstetricosDto,
} from '../fichas/dto/respuestas.dto';

@Injectable()
export class AntecedentesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Los antecedentes que ya se le preguntaron a un paciente.
   *
   * Devuelve solo lo respondido, no el catalogo completo: la pantalla ya tiene
   * el catalogo —lo trae con la ficha— y aqui lo que necesita es saber cuales
   * de esas casillas estan marcadas.
   *
   * Un antecedente ausente significa "no se ha preguntado", que no es lo mismo
   * que "no". Para un indicador de cobertura esa diferencia importa.
   */
  async obtener(pacienteId: string): Promise<AntecedentesPacienteDto> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true },
    });
    if (!paciente) throw new NotFoundException('No existe ese paciente.');

    const [marcados, obstetricos] = await this.prisma.$transaction([
      this.prisma.antecedentePaciente.findMany({
        where: { pacienteId },
        include: { antecedente: { select: { codigo: true, texto: true, grupo: true } } },
      }),
      this.prisma.antecedentesObstetricos.findUnique({ where: { pacienteId } }),
    ]);

    return {
      pacienteId,
      marcados: marcados.map((m) => ({
        antecedenteId: m.antecedenteId,
        codigo: m.antecedente.codigo,
        texto: m.antecedente.texto,
        grupo: m.antecedente.grupo,
        respuesta: m.respuesta,
        detalle: m.detalleCifrado
          ? this.cifrado.descifrar(Buffer.from(m.detalleCifrado))
          : null,
        fecha: m.fecha,
        numero: m.numero,
        actualizadoEn: m.actualizadoEn,
      })),
      obstetricos: obstetricos ? sinMetadatos(obstetricos) : null,
    };
  }

  /**
   * Guarda o actualiza las respuestas enviadas.
   *
   * Actualizacion PARCIAL: lo que no viene en la peticion se conserva. Si
   * guardar reemplazara el conjunto completo, llenar media hoja borraria lo que
   * otro turno ya habia preguntado.
   */
  async guardar(
    pacienteId: string,
    dto: GuardarAntecedentesDto,
    usuarioId: string,
  ): Promise<AntecedentesPacienteDto> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true },
    });
    if (!paciente) throw new NotFoundException('No existe ese paciente.');

    const marcados = dto.marcados ?? [];
    if (marcados.length > 0) await this.validarContraCatalogo(marcados);

    await this.prisma.$transaction(async (tx) => {
      for (const m of marcados) {
        const detalleCifrado = m.detalle
          ? new Uint8Array(this.cifrado.cifrar(m.detalle))
          : null;

        await tx.antecedentePaciente.upsert({
          where: { pacienteId_antecedenteId: { pacienteId, antecedenteId: m.antecedenteId } },
          create: {
            pacienteId,
            antecedenteId: m.antecedenteId,
            respuesta: m.respuesta,
            detalleCifrado,
            fecha: m.fecha,
            numero: m.numero,
            registradoPor: usuarioId,
          },
          update: {
            respuesta: m.respuesta,
            detalleCifrado,
            fecha: m.fecha ?? null,
            numero: m.numero ?? null,
            registradoPor: usuarioId,
          },
        });
      }

      if (dto.obstetricos) {
        await tx.antecedentesObstetricos.upsert({
          where: { pacienteId },
          create: { pacienteId, ...dto.obstetricos, registradoPor: usuarioId },
          update: { ...dto.obstetricos, registradoPor: usuarioId },
        });
      }
    });

    return this.obtener(pacienteId);
  }

  /**
   * Comprueba que los antecedentes existan y que la respuesta sea una de las
   * que el papel ofrece para cada uno.
   *
   * "No aplica" solo esta impreso en algunos —en la ficha de adultos, unicamente
   * en SR—. Aceptarlo en todos convertiria un dato ausente en uno afirmado, y
   * un reporte de cobertura contaria como resuelto lo que nadie pregunto.
   */
  private async validarContraCatalogo(
    marcados: GuardarAntecedentesDto['marcados'] & object[],
  ): Promise<void> {
    const ids = marcados.map((m) => m.antecedenteId);

    const catalogo = await this.prisma.catalogoAntecedente.findMany({
      where: { id: { in: ids }, activo: true },
      select: { id: true, texto: true, permiteNoAplica: true },
    });

    if (catalogo.length !== new Set(ids).size) {
      throw new BadRequestException('Algun antecedente no existe en el catalogo.');
    }

    const porId = new Map(catalogo.map((c) => [c.id, c]));
    for (const m of marcados) {
      const c = porId.get(m.antecedenteId);
      if (m.respuesta === 'NO_APLICA' && c && !c.permiteNoAplica) {
        throw new BadRequestException({
          mensaje: 'Ese antecedente no admite "No aplica".',
          detalles: [c.texto],
        });
      }
    }
  }
}

/** Quita del registro los campos de control, que no son datos clinicos. */
function sinMetadatos(fila: Record<string, unknown>): AntecedentesObstetricosDto {
  const { pacienteId: _p, registradoPor: _r, actualizadoEn: _a, ...datos } = fila;
  return datos as AntecedentesObstetricosDto;
}
