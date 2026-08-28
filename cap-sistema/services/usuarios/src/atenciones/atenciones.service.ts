import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { crearPagina, normalizarPagina, ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { RegistrarAtencionDto } from './dto/registrar-atencion.dto';

@Injectable()
export class AtencionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Historial del expediente, lo mas reciente primero.
   *
   * Paginado siempre: un expediente de un paciente cronico con veinte anos de
   * controles puede tener cientos de atenciones, y cada una hay que
   * descifrarla.
   */
  async listar(expedienteId: string, consulta: { pagina?: number; tamano?: number }) {
    if (!(await this.prisma.expediente.findUnique({ where: { id: expedienteId }, select: { id: true } }))) {
      throw new NotFoundException('No existe ese expediente.');
    }

    const { tamano, saltar } = normalizarPagina(consulta);

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.atencion.findMany({
        where: { expedienteId },
        skip: saltar,
        take: tamano,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.atencion.count({ where: { expedienteId } }),
    ]);

    return crearPagina(datos.map((a) => this.descifrar(a)), total, consulta);
  }

  async registrar(
    expedienteId: string,
    dto: RegistrarAtencionDto,
    usuarioId: string,
    trazaId?: string,
  ) {
    const expediente = await this.prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: { id: true, paciente: { select: { id: true, comunidadId: true, fechaNacimiento: true } } },
    });
    if (!expediente) throw new NotFoundException('No existe ese expediente.');

    if (dto.fecha && dto.fecha < expediente.paciente.fechaNacimiento) {
      throw new BadRequestException(
        'La atencion no puede ser anterior a la fecha de nacimiento del paciente.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atencion = await tx.atencion.create({
        data: {
          expedienteId,
          registradaPor: usuarioId,
          fecha: dto.fecha ?? new Date(),
          digitalizada: dto.digitalizada ?? false,
          motivoCifrado: new Uint8Array(this.cifrado.cifrar(dto.motivo)),
          diagnosticoCifrado: dto.diagnostico
            ? new Uint8Array(this.cifrado.cifrar(dto.diagnostico))
            : null,
          tratamientoCifrado: dto.tratamiento
            ? new Uint8Array(this.cifrado.cifrar(dto.tratamiento))
            : null,
          notasCifrado: dto.notas ? new Uint8Array(this.cifrado.cifrar(dto.notas)) : null,
          pesoKg: dto.pesoKg,
          tallaCm: dto.tallaCm,
          presionSistolica: dto.presionSistolica,
          presionDiastolica: dto.presionDiastolica,
          temperaturaC: dto.temperaturaC,
        },
      });

      // El evento lleva signos vitales, que alimentan indicadores, pero NUNCA
      // el diagnostico ni las notas clinicas.
      await this.outbox.registrar(
        tx,
        Evento.ATENCION_REGISTRADA,
        {
          atencionId: atencion.id,
          pacienteId: expediente.paciente.id,
          comunidadId: expediente.paciente.comunidadId,
          fecha: atencion.fecha.toISOString(),
          digitalizada: atencion.digitalizada,
          pesoKg: dto.pesoKg ?? null,
          tallaCm: dto.tallaCm ?? null,
          presionSistolica: dto.presionSistolica ?? null,
          presionDiastolica: dto.presionDiastolica ?? null,
          registradaPor: usuarioId,
        },
        trazaId,
      );

      if (dto.digitalizada) {
        await tx.registroDigitalizacion.updateMany({
          where: { expedienteId },
          data: { atencionesTranscritas: { increment: 1 } },
        });
      }

      return this.descifrar(atencion);
    });
  }

  private descifrar(a: {
    id: string;
    fecha: Date;
    registradaPor: string;
    digitalizada: boolean;
    tipoFicha: string | null;
    motivoCifrado: Uint8Array;
    diagnosticoCifrado: Uint8Array | null;
    tratamientoCifrado: Uint8Array | null;
    notasCifrado: Uint8Array | null;
    pesoKg: unknown;
    tallaCm: unknown;
    presionSistolica: number | null;
    presionDiastolica: number | null;
    temperaturaC: unknown;
  }) {
    const abrir = (v: Uint8Array | null) => (v ? this.cifrado.descifrar(Buffer.from(v)) : null);
    // Prisma devuelve Decimal, y JSON.stringify ya lo convertia a texto. Hacerlo
    // explicito no cambia la respuesta: hace que el tipo declarado sea cierto.
    const decimal = (v: unknown) => (v === null || v === undefined ? null : String(v));
    return {
      id: a.id,
      fecha: a.fecha,
      registradaPor: a.registradaPor,
      digitalizada: a.digitalizada,
      tipoFicha: a.tipoFicha,
      motivo: abrir(a.motivoCifrado),
      diagnostico: abrir(a.diagnosticoCifrado),
      tratamiento: abrir(a.tratamientoCifrado),
      notas: abrir(a.notasCifrado),
      pesoKg: decimal(a.pesoKg),
      tallaCm: decimal(a.tallaCm),
      presionSistolica: a.presionSistolica,
      presionDiastolica: a.presionDiastolica,
      temperaturaC: decimal(a.temperaturaC),
    };
  }
}
