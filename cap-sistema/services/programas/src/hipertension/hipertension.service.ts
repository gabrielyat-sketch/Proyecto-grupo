import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { crearPagina, normalizarPagina, ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { CLIENTE_PACIENTES, IClientePacientes } from '../pacientes/cliente-pacientes';
import { Evento, OutboxService } from '../eventos/outbox.service';
import {
  clasificarPresion,
  estaEnMeta,
  fechaDelDia,
  proximoControlHipertension,
} from '../dominio/clinico';
import { InscribirHipertensionDto } from './dto/inscribir.dto';
import { RegistrarControlHipertensionDto } from './dto/registrar-control.dto';

@Injectable()
export class HipertensionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(CLIENTE_PACIENTES) private readonly pacientes: IClientePacientes,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  async inscribir(
    dto: InscribirHipertensionDto,
    usuarioId: string,
    autorizacion: string,
    trazaId?: string,
  ) {
    const paciente = await this.pacientes.obtener(dto.pacienteId, autorizacion, trazaId);

    // Un paciente no puede estar dos veces ACTIVO en el mismo programa. Si
    // egreso y recae, si puede volver a inscribirse.
    const activo = await this.prisma.programaHipertension.findFirst({
      where: { pacienteId: dto.pacienteId, estado: 'ACTIVO' },
      select: { id: true },
    });
    if (activo) {
      throw new ConflictException({
        mensaje: 'El paciente ya esta inscrito y activo en el programa de hipertension.',
        detalles: ['programaId:' + activo.id],
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const programa = await tx.programaHipertension.create({
        data: {
          pacienteId: dto.pacienteId,
          comunidadId: paciente.comunidad.id,
          metaSistolica: dto.metaSistolica ?? 140,
          metaDiastolica: dto.metaDiastolica ?? 90,
          inscritoPor: usuarioId,
        },
      });

      await this.outbox.registrar(
        tx,
        Evento.HIPERTENSION_INSCRITO,
        {
          programaId: programa.id,
          pacienteId: programa.pacienteId,
          comunidadId: programa.comunidadId,
          edad: paciente.edad,
          sexo: paciente.sexo,
          inscritoPor: usuarioId,
        },
        trazaId,
      );

      return programa;
    });
  }

  async listar(consulta: { estado?: string; comunidadId?: string; pagina?: number; tamano?: number }) {
    const { tamano, saltar } = normalizarPagina(consulta);
    const where = {
      ...(consulta.estado ? { estado: consulta.estado as never } : {}),
      ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.programaHipertension.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { fechaIngreso: 'desc' },
        select: {
          id: true,
          pacienteId: true,
          comunidadId: true,
          fechaIngreso: true,
          estado: true,
          metaSistolica: true,
          metaDiastolica: true,
          // El ultimo control se trae con la misma consulta. Pedirlo aparte
          // por cada programa seria el clasico N+1 de esta pantalla.
          controles: {
            orderBy: { fecha: 'desc' },
            take: 1,
            select: {
              fecha: true,
              sistolica: true,
              diastolica: true,
              clasificacion: true,
              enMeta: true,
              proximoControl: true,
            },
          },
        },
      }),
      this.prisma.programaHipertension.count({ where }),
    ]);

    return crearPagina(
      datos.map(({ controles, ...p }) => ({ ...p, ultimoControl: controles[0] ?? null })),
      total,
      consulta,
    );
  }

  async obtener(id: string) {
    const p = await this.prisma.programaHipertension.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('No existe esa inscripcion.');
    return p;
  }

  async registrarControl(
    programaId: string,
    dto: RegistrarControlHipertensionDto,
    usuarioId: string,
    trazaId?: string,
  ) {
    const programa = await this.obtener(programaId);
    if (programa.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se pueden registrar controles en una inscripcion que ya no esta activa.',
      );
    }
    if (dto.sistolica <= dto.diastolica) {
      throw new BadRequestException(
        'La presion sistolica debe ser mayor que la diastolica. Revise las cifras.',
      );
    }

    const fecha = dto.fecha ?? new Date();
    const clasificacion = clasificarPresion(dto.sistolica, dto.diastolica);
    const enMeta = estaEnMeta(
      dto.sistolica,
      dto.diastolica,
      programa.metaSistolica,
      programa.metaDiastolica,
    );

    return this.prisma.$transaction(async (tx) => {
      const control = await tx.controlHipertension.create({
        data: {
          programaId,
          fecha,
          sistolica: dto.sistolica,
          diastolica: dto.diastolica,
          clasificacion,
          enMeta,
          pesoKg: dto.pesoKg,
          adherencia: dto.adherencia,
          observacionesCifrado: dto.observaciones
            ? new Uint8Array(this.cifrado.cifrar(dto.observaciones))
            : null,
          // fechaDelDia: la cita se calcula sobre el dia del calendario en
          // Purulha, no sobre el instante UTC (ver clinico.ts).
          proximoControl: proximoControlHipertension(clasificacion, fechaDelDia(fecha)),
          registradoPor: usuarioId,
        },
      });

      // El evento lleva cifras, no observaciones clinicas.
      await this.outbox.registrar(
        tx,
        Evento.HIPERTENSION_CONTROL,
        {
          controlId: control.id,
          programaId,
          pacienteId: programa.pacienteId,
          comunidadId: programa.comunidadId,
          fecha: control.fecha.toISOString(),
          sistolica: control.sistolica,
          diastolica: control.diastolica,
          clasificacion,
          enMeta,
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return this.descifrar(control);
    });
  }

  async listarControles(programaId: string, consulta: { pagina?: number; tamano?: number }) {
    await this.obtener(programaId);
    const { tamano, saltar } = normalizarPagina(consulta);

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.controlHipertension.findMany({
        where: { programaId },
        skip: saltar,
        take: tamano,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.controlHipertension.count({ where: { programaId } }),
    ]);

    return crearPagina(datos.map((c) => this.descifrar(c)), total, consulta);
  }

  async egresar(id: string, motivo: string, estado: 'EGRESADO' | 'ABANDONO' | 'FALLECIDO' | 'TRASLADADO') {
    const p = await this.obtener(id);
    if (p.estado !== 'ACTIVO') {
      throw new BadRequestException('Esa inscripcion ya no esta activa.');
    }
    return this.prisma.programaHipertension.update({
      where: { id },
      data: { estado, fechaEgreso: new Date(), motivoEgreso: motivo.slice(0, 200) },
    });
  }

  /**
   * Pacientes que ya pasaron su fecha de proximo control.
   *
   * Es el requerimiento SHOULD de alertas por paciente sin control en el plazo
   * esperado. Se resuelve con una consulta y no recorriendo programas en
   * memoria.
   */
  async atrasados(consulta: { pagina?: number; tamano?: number }) {
    const { tamano, saltar } = normalizarPagina(consulta);
    const hoy = new Date();

    const filas = await this.prisma.$queryRaw<
      { id: string; paciente_id: string; comunidad_id: string; proximo_control: Date; dias: number }[]
    >`
      SELECT p.id,
             p.paciente_id,
             p.comunidad_id,
             c.proximo_control,
             (CURRENT_DATE - c.proximo_control) AS dias
      FROM programas.programa_hipertension p
      JOIN LATERAL (
        SELECT proximo_control
        FROM programas.control_hipertension
        WHERE programa_id = p.id
        ORDER BY fecha DESC
        LIMIT 1
      ) c ON TRUE
      WHERE p.estado = 'ACTIVO'
        AND c.proximo_control < ${hoy}
      ORDER BY c.proximo_control ASC
      LIMIT ${tamano} OFFSET ${saltar}
    `;

    const [{ total }] = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT count(*) AS total
      FROM programas.programa_hipertension p
      JOIN LATERAL (
        SELECT proximo_control
        FROM programas.control_hipertension
        WHERE programa_id = p.id
        ORDER BY fecha DESC
        LIMIT 1
      ) c ON TRUE
      WHERE p.estado = 'ACTIVO' AND c.proximo_control < ${hoy}
    `;

    return crearPagina(
      filas.map((f) => ({
        programaId: f.id,
        pacienteId: f.paciente_id,
        comunidadId: f.comunidad_id,
        proximoControl: f.proximo_control,
        diasDeAtraso: Number(f.dias),
      })),
      Number(total),
      consulta,
    );
  }

  private descifrar(c: { observacionesCifrado: Uint8Array | null; [k: string]: unknown }) {
    const { observacionesCifrado, ...resto } = c;
    return {
      ...resto,
      observaciones: observacionesCifrado
        ? this.cifrado.descifrar(Buffer.from(observacionesCifrado))
        : null,
    };
  }
}
