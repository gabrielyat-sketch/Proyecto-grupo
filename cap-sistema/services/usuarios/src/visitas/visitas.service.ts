import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ServicioCifrado, inicioDelDiaLocal } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { MarcarLlegadaDto } from './dto/visitas.dto';
import type { VisitaDto, VisitaEnEsperaDto } from './dto/visitas.dto';

@Injectable()
export class VisitasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Las visitas que quedaron abiertas de dias anteriores, cerradas.
   *
   * El CAP cierra a las cinco y la gente se va; nadie recorre la lista
   * sacando uno por uno a los que no llegaron a pasar. Esas visitas se quedan
   * ESPERANDO para siempre, y eso rompia dos cosas a la vez:
   *
   *  - El paciente quedaba BLOQUEADO. `marcarLlegada` rechaza a quien ya tiene
   *    una visita abierta —y el indice unico parcial de la base tambien—, pero
   *    `enEspera` solo lista las de hoy. La visita vieja era invisible y no se
   *    podia retirar desde ninguna pantalla: ese paciente no volvia a poder
   *    entrar a la sala de espera NUNCA.
   *  - Los indicadores de la Etapa 10 contarian como "esperando" a gente que
   *    se fue hace semanas.
   *
   * Se cierran como RETIRADA, que es lo que de verdad paso: se fueron sin que
   * los atendieran. El motivo lo dice para que nadie lo confunda con un retiro
   * que alguien anoto a mano.
   */
  private async cerrarLasDeDiasAnteriores(pacienteId?: string): Promise<number> {
    const { count } = await this.prisma.visita.updateMany({
      where: {
        estado: 'ESPERANDO',
        llegadaEn: { lt: inicioDelDiaLocal() },
        ...(pacienteId ? { pacienteId } : {}),
      },
      data: {
        estado: 'RETIRADA',
        cerradaEn: new Date(),
        motivoRetiro: 'Cerrada por el sistema: quedo abierta al terminar el dia.',
      },
    });
    return count;
  }

  /**
   * Alguien llego al CAP y espera.
   *
   * Es lo unico que el sistema no puede deducir por su cuenta: un paciente
   * registrado hace tres anios y uno que acaba de entrar por la puerta son
   * identicos en la base hasta que alguien dice "llego".
   */
  async marcarLlegada(dto: MarcarLlegadaDto, usuarioId: string): Promise<VisitaDto> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: dto.pacienteId },
      select: { id: true, fallecido: true },
    });
    if (!paciente) throw new NotFoundException('No existe ese paciente.');

    // Primero se cierra la visita que este paciente pudiera arrastrar de otro
    // dia. Si no, la comprobacion de abajo lo rechazaria por una visita que
    // nadie puede ver ni retirar, y se quedaria fuera del sistema para siempre.
    await this.cerrarLasDeDiasAnteriores(dto.pacienteId);

    const abierta = await this.prisma.visita.findFirst({
      where: { pacienteId: dto.pacienteId, estado: 'ESPERANDO' },
      select: { id: true },
    });
    if (abierta) {
      // La base tambien lo impide con un indice unico parcial. Aqui se atrapa
      // antes para poder decir algo util: quien pulso dos veces necesita saber
      // que la persona YA esta en la lista, no leer un error de restriccion.
      throw new ConflictException({
        mensaje: 'Ese paciente ya esta en la sala de espera.',
        detalles: ['visitaId:' + abierta.id],
      });
    }

    const visita = await this.prisma.visita.create({
      data: {
        pacienteId: dto.pacienteId,
        registradaPor: usuarioId,
        motivoCifrado: dto.motivo ? new Uint8Array(this.cifrado.cifrar(dto.motivo)) : null,
      },
    });

    return this.aDto(visita);
  }

  /**
   * Quienes esperan AHORA.
   *
   * Solo las llegadas de hoy. Una visita de ayer que nadie cerro no puede
   * arrastrarse a la lista de manana: la sala de espera describe este momento,
   * y una lista que acumula gente de otros dias deja de mirarse a la semana.
   *
   * En orden de llegada, que es el orden en que la gente entiende que se
   * atiende. Cualquier otro criterio habria que explicarlo a quien lleva una
   * hora sentado.
   */
  async enEspera(): Promise<VisitaEnEsperaDto[]> {
    // Barrido perezoso: aqui es donde se descubre que hay rezagadas, porque
    // es la pantalla que se abre todas las mananas. No hace falta un proceso
    // nocturno para algo que se resuelve al primer vistazo del dia.
    await this.cerrarLasDeDiasAnteriores();

    const visitas = await this.prisma.visita.findMany({
      where: { estado: 'ESPERANDO', llegadaEn: { gte: inicioDelDiaLocal() } },
      orderBy: { llegadaEn: 'asc' },
      select: {
        id: true,
        llegadaEn: true,
        motivoCifrado: true,
        paciente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            fechaNacimiento: true,
            sexo: true,
            comunidad: { select: { nombre: true } },
            expediente: { select: { numeroCifrado: true } },
          },
        },
      },
    });

    const ahora = Date.now();
    return visitas.map((v) => ({
      id: v.id,
      pacienteId: v.paciente.id,
      nombres: v.paciente.nombres,
      apellidos: v.paciente.apellidos,
      edad: edadEnAnios(v.paciente.fechaNacimiento),
      sexo: v.paciente.sexo,
      comunidad: v.paciente.comunidad.nombre,
      numeroExpediente: v.paciente.expediente
        ? this.cifrado.descifrar(Buffer.from(v.paciente.expediente.numeroCifrado))
        : null,
      llegadaEn: v.llegadaEn,
      esperandoMinutos: Math.max(0, Math.floor((ahora - v.llegadaEn.getTime()) / 60_000)),
      motivo: v.motivoCifrado ? this.cifrado.descifrar(Buffer.from(v.motivoCifrado)) : null,
    }));
  }

  /**
   * Se fue sin que lo atendieran.
   *
   * Sin esta salida, la persona se queda en la lista hasta el cierre del dia y
   * la enfermera la llama tres veces. Pasa —la gente se cansa de esperar— y
   * conviene que quede anotado por que.
   */
  async retirar(id: string, motivo: string, usuarioId: string): Promise<VisitaDto> {
    const visita = await this.prisma.visita.findUnique({ where: { id } });
    if (!visita) throw new NotFoundException('No existe esa visita.');
    if (visita.estado !== 'ESPERANDO') {
      throw new ConflictException('Esa visita ya estaba cerrada.');
    }

    const cerrada = await this.prisma.visita.update({
      where: { id },
      data: {
        estado: 'RETIRADA',
        cerradaEn: new Date(),
        cerradaPor: usuarioId,
        motivoRetiro: motivo.slice(0, 200),
      },
    });

    return this.aDto(cerrada);
  }

  private aDto(v: {
    id: string;
    pacienteId: string;
    estado: string;
    llegadaEn: Date;
    cerradaEn: Date | null;
    motivoCifrado: Uint8Array | null;
    motivoRetiro: string | null;
  }): VisitaDto {
    return {
      id: v.id,
      pacienteId: v.pacienteId,
      estado: v.estado,
      llegadaEn: v.llegadaEn,
      cerradaEn: v.cerradaEn,
      motivo: v.motivoCifrado ? this.cifrado.descifrar(Buffer.from(v.motivoCifrado)) : null,
      motivoRetiro: v.motivoRetiro,
    };
  }
}

/** Anios cumplidos. Se calcula al responder y no se guarda. */
function edadEnAnios(nacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}
