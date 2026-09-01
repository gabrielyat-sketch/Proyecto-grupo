import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { crearPagina, normalizarPagina, type Pagina, ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { CLIENTE_PACIENTES, IClientePacientes } from '../pacientes/cliente-pacientes';
import { Evento, OutboxService } from '../eventos/outbox.service';
import {
  alertasControlPrenatal,
  evaluarRiesgoEmbarazo,
  fechaDelDia,
  fechaProbableParto,
  proximoControlPrenatal,
  semanasGestacion,
} from '../dominio/clinico';
import { InscribirEmbarazoDto } from './dto/inscribir.dto';
import { RegistrarControlPrenatalDto } from './dto/registrar-control.dto';
import {
  ControlPrenatalDto,
  EmbarazoInscritoDto,
  ProgramaEmbarazoBaseDto,
  ProgramaEmbarazoDto,
  ProgramaEmbarazoResumenDto,
} from './dto/respuestas.dto';

/** Un embarazo no dura mas de esto; una FUM mas antigua es un error de captura. */
const DIAS_MAXIMOS_DESDE_FUM = 320;

/**
 * Semanas de gestacion al dia de HOY EN PURULHA.
 *
 * Todas las semanas del servicio pasan por aqui. Cuando un endpoint usaba
 * `new Date()` directo y otro `fechaDelDia`, el mismo embarazo reportaba 10
 * semanas al inscribirlo y 9 en el control de esa misma noche: despues de las
 * 18:00 locales ya es el dia siguiente en UTC.
 */
function semanasHoy(fum: Date): number {
  return semanasGestacion(fum, fechaDelDia(new Date()));
}

@Injectable()
export class EmbarazoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(CLIENTE_PACIENTES) private readonly pacientes: IClientePacientes,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  async inscribir(
    dto: InscribirEmbarazoDto,
    usuarioId: string,
    autorizacion: string,
    trazaId?: string,
  ): Promise<EmbarazoInscritoDto> {
    const paciente = await this.pacientes.obtener(dto.pacienteId, autorizacion, trazaId);

    if (paciente.sexo !== 'F') {
      throw new BadRequestException('Solo se puede inscribir a una paciente de sexo femenino.');
    }

    const dias = Math.floor((Date.now() - dto.fum.getTime()) / 86_400_000);
    if (dias > DIAS_MAXIMOS_DESDE_FUM) {
      throw new BadRequestException(
        'La fecha de ultima menstruacion indica mas de 45 semanas. Revise el dato.',
      );
    }

    const activo = await this.prisma.programaEmbarazo.findFirst({
      where: { pacienteId: dto.pacienteId, estado: 'ACTIVO' },
      select: { id: true },
    });
    if (activo) {
      throw new ConflictException({
        mensaje: 'La paciente ya tiene un embarazo activo en seguimiento.',
        detalles: ['programaId:' + activo.id],
      });
    }

    const riesgo = evaluarRiesgoEmbarazo({
      edad: paciente.edad,
      numeroGestacion: dto.numeroGestacion ?? 1,
      partosPrevios: dto.partosPrevios ?? 0,
    });

    return this.prisma.$transaction(async (tx) => {
      const programa = await tx.programaEmbarazo.create({
        data: {
          pacienteId: dto.pacienteId,
          comunidadId: paciente.comunidad.id,
          fum: dto.fum,
          fpp: fechaProbableParto(dto.fum),
          numeroGestacion: dto.numeroGestacion ?? 1,
          partosPrevios: dto.partosPrevios ?? 0,
          riesgo: riesgo.alto ? 'ALTO' : 'BAJO',
          motivoRiesgo: riesgo.alto ? riesgo.motivos.join('; ').slice(0, 300) : null,
          inscritoPor: usuarioId,
        },
      });

      await this.outbox.registrar(
        tx,
        Evento.EMBARAZO_INSCRITO,
        {
          programaId: programa.id,
          pacienteId: programa.pacienteId,
          comunidadId: programa.comunidadId,
          edad: paciente.edad,
          riesgo: programa.riesgo,
          semanasAlInscribir: semanasHoy(dto.fum),
          inscritoPor: usuarioId,
        },
        trazaId,
      );

      return {
        ...programa,
        semanasGestacion: semanasHoy(programa.fum),
        motivosRiesgo: riesgo.motivos,
      };
    });
  }

  async listar(consulta: {
    estado?: string;
    riesgo?: string;
    comunidadId?: string;
    pagina?: number;
    tamano?: number;
  }): Promise<Pagina<ProgramaEmbarazoResumenDto>> {
    const { tamano, saltar } = normalizarPagina(consulta);
    const where = {
      ...(consulta.estado ? { estado: consulta.estado as never } : {}),
      ...(consulta.riesgo ? { riesgo: consulta.riesgo as never } : {}),
      ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
    };

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.programaEmbarazo.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { fpp: 'asc' },
        select: {
          id: true,
          pacienteId: true,
          comunidadId: true,
          fum: true,
          fpp: true,
          riesgo: true,
          motivoRiesgo: true,
          estado: true,
          numeroGestacion: true,
          controles: {
            orderBy: { fecha: 'desc' },
            take: 1,
            select: { fecha: true, semanasGestacion: true, proximoControl: true, alertas: true },
          },
        },
      }),
      this.prisma.programaEmbarazo.count({ where }),
    ]);

    const hoy = fechaDelDia(new Date());
    return crearPagina(
      datos.map(({ controles, ...p }) => ({
        ...p,
        semanasGestacion: semanasGestacion(p.fum, hoy),
        ultimoControl: controles[0] ?? null,
      })),
      total,
      consulta,
    );
  }

  async obtener(id: string): Promise<ProgramaEmbarazoDto> {
    const p = await this.prisma.programaEmbarazo.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('No existe ese seguimiento de embarazo.');
    return { ...p, semanasGestacion: semanasHoy(p.fum) };
  }

  async registrarControl(
    programaId: string,
    dto: RegistrarControlPrenatalDto,
    usuarioId: string,
    trazaId?: string,
  ): Promise<ControlPrenatalDto> {
    const programa = await this.prisma.programaEmbarazo.findUnique({ where: { id: programaId } });
    if (!programa) throw new NotFoundException('No existe ese seguimiento de embarazo.');
    if (programa.estado !== 'ACTIVO') {
      throw new BadRequestException('Ese seguimiento ya fue cerrado.');
    }

    const fecha = dto.fecha ?? new Date();
    if (fecha < programa.fum) {
      throw new BadRequestException('El control no puede ser anterior a la fecha de ultima menstruacion.');
    }

    const semanas = semanasGestacion(programa.fum, fechaDelDia(fecha));
    const alertas = alertasControlPrenatal({
      semanas,
      sistolica: dto.sistolica,
      diastolica: dto.diastolica,
      fcf: dto.fcf,
      edema: dto.edema,
    });

    return this.prisma.$transaction(async (tx) => {
      const control = await tx.controlPrenatal.create({
        data: {
          programaId,
          fecha,
          semanasGestacion: semanas,
          pesoKg: dto.pesoKg,
          sistolica: dto.sistolica,
          diastolica: dto.diastolica,
          alturaUterinaCm: dto.alturaUterinaCm,
          fcf: dto.fcf,
          edema: dto.edema,
          alertas,
          observacionesCifrado: dto.observaciones
            ? new Uint8Array(this.cifrado.cifrar(dto.observaciones))
            : null,
          proximoControl: proximoControlPrenatal(semanas, fechaDelDia(fecha)),
          registradoPor: usuarioId,
        },
      });

      // Si el control detecta presion elevada, el embarazo pasa a alto riesgo
      // y ya no vuelve a bajar solo. El sistema nunca reduce un riesgo por su
      // cuenta: eso es criterio del personal.
      if (alertas.length > 0 && programa.riesgo === 'BAJO') {
        await tx.programaEmbarazo.update({
          where: { id: programaId },
          data: {
            riesgo: 'ALTO',
            motivoRiesgo: [programa.motivoRiesgo, ...alertas].filter(Boolean).join('; ').slice(0, 300),
          },
        });
      }

      await this.outbox.registrar(
        tx,
        Evento.PRENATAL_CONTROL,
        {
          controlId: control.id,
          programaId,
          pacienteId: programa.pacienteId,
          comunidadId: programa.comunidadId,
          fecha: control.fecha.toISOString(),
          semanasGestacion: semanas,
          sistolica: dto.sistolica ?? null,
          diastolica: dto.diastolica ?? null,
          conAlertas: alertas.length > 0,
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return this.descifrar(control);
    });
  }

  async listarControles(
    programaId: string,
    consulta: { pagina?: number; tamano?: number },
  ): Promise<Pagina<ControlPrenatalDto>> {
    await this.obtener(programaId);
    const { tamano, saltar } = normalizarPagina(consulta);

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.controlPrenatal.findMany({
        where: { programaId },
        skip: saltar,
        take: tamano,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.controlPrenatal.count({ where: { programaId } }),
    ]);

    return crearPagina(datos.map((c) => this.descifrar(c)), total, consulta);
  }

  async cerrar(
    id: string,
    resultado: string,
    fechaCierre?: Date,
  ): Promise<ProgramaEmbarazoBaseDto> {
    const p = await this.prisma.programaEmbarazo.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('No existe ese seguimiento de embarazo.');
    if (p.estado !== 'ACTIVO') throw new BadRequestException('Ese seguimiento ya fue cerrado.');

    return this.prisma.programaEmbarazo.update({
      where: { id },
      data: {
        estado: 'EGRESADO',
        resultado: resultado as never,
        fechaCierre: fechaCierre ?? new Date(),
      },
    });
  }

  /** Igual que en hipertension: tipo de salida concreto, no un indice abierto. */
  private descifrar(c: {
    id: string;
    programaId: string;
    fecha: Date;
    semanasGestacion: number;
    pesoKg: unknown;
    sistolica: number | null;
    diastolica: number | null;
    alturaUterinaCm: unknown;
    fcf: number | null;
    edema: boolean | null;
    observacionesCifrado: Uint8Array | null;
    alertas: string[];
    proximoControl: Date | null;
    registradoPor: string;
  }): ControlPrenatalDto {
    const decimal = (v: unknown) => (v === null || v === undefined ? null : String(v));
    return {
      id: c.id,
      programaId: c.programaId,
      fecha: c.fecha,
      semanasGestacion: c.semanasGestacion,
      pesoKg: decimal(c.pesoKg),
      sistolica: c.sistolica,
      diastolica: c.diastolica,
      alturaUterinaCm: decimal(c.alturaUterinaCm),
      fcf: c.fcf,
      edema: c.edema,
      alertas: c.alertas,
      proximoControl: c.proximoControl,
      registradoPor: c.registradoPor,
      observaciones: c.observacionesCifrado
        ? this.cifrado.descifrar(Buffer.from(c.observacionesCifrado))
        : null,
    };
  }
}
