import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { CrearFichaDto, type TipoFichaDto } from './dto/crear-ficha.dto';
import type {
  CatalogoFichaDto,
  FichaCreadaDto,
  FichaDto,
  MedicamentoFichaDto,
  ProblemaFichaRegistradoDto,
  SignoPeligroFichaDto,
} from './dto/respuestas.dto';

/** Fila de Prisma con contenido cifrado opcional. */
type Cifrado = Uint8Array | null;

@Injectable()
export class FichasService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Cifra un texto opcional. Devuelve null cuando no hay nada que guardar.
   *
   * El tipo de retorno se declara con `<ArrayBuffer>` porque es lo que espera
   * Prisma para una columna Bytes; el `Uint8Array` a secas admite tambien
   * SharedArrayBuffer y no encaja.
   */
  private cifrar(valor: string | undefined): Uint8Array<ArrayBuffer> | null {
    return valor === undefined || valor === '' ? null : new Uint8Array(this.cifrado.cifrar(valor));
  }

  private descifrar(valor: Cifrado): string | null {
    return valor ? this.cifrado.descifrar(Buffer.from(valor)) : null;
  }

  /**
   * El catalogo completo de una ficha, en una sola respuesta.
   *
   * Lo consume la pantalla para dibujarse. Se sirve entero porque el formulario
   * no se puede dibujar a medias.
   */
  async catalogo(tipoFicha: TipoFichaDto): Promise<CatalogoFichaDto> {
    const [signosPeligro, enFicha, problemas] = await this.prisma.$transaction([
      this.prisma.signoPeligro.findMany({
        where: { tipoFicha, activo: true },
        orderBy: { orden: 'asc' },
        select: { id: true, orden: true, texto: true, pideTexto: true },
      }),
      this.prisma.antecedenteEnFicha.findMany({
        where: { tipoFicha, antecedente: { activo: true } },
        orderBy: { orden: 'asc' },
        select: { orden: true, antecedente: true },
      }),
      this.prisma.problemaFicha.findMany({
        where: { tipoFicha, activo: true },
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          orden: true,
          nombre: true,
          signos: {
            where: { activo: true },
            orderBy: { orden: 'asc' },
            select: { id: true, orden: true, texto: true },
          },
          diagnosticos: {
            where: { activo: true },
            orderBy: { orden: 'asc' },
            select: { id: true, orden: true, texto: true, pideTexto: true },
          },
        },
      }),
    ]);

    if (problemas.length === 0) {
      throw new NotFoundException(
        'La ficha ' + tipoFicha + ' todavia no tiene catalogo cargado en el sistema.',
      );
    }

    return {
      tipoFicha,
      signosPeligro,
      antecedentes: enFicha.map((e) => ({
        id: e.antecedente.id,
        codigo: e.antecedente.codigo,
        grupo: e.antecedente.grupo,
        orden: e.orden,
        texto: e.antecedente.texto,
        pideDetalle: e.antecedente.pideDetalle,
        pideFecha: e.antecedente.pideFecha,
        pideNumero: e.antecedente.pideNumero,
        permiteNoAplica: e.antecedente.permiteNoAplica,
      })),
      problemas,
    };
  }

  /**
   * Registra una ficha completa.
   *
   * Todo ocurre en UNA transaccion: una ficha guardada a medias —con los
   * problemas pero sin los medicamentos, o al reves— es peor que una no
   * guardada, porque parece completa cuando alguien la lea despues.
   */
  async registrar(
    expedienteId: string,
    dto: CrearFichaDto,
    usuarioId: string,
    trazaId?: string,
  ): Promise<FichaCreadaDto> {
    const expediente = await this.prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: {
        id: true,
        paciente: { select: { id: true, comunidadId: true, fechaNacimiento: true } },
      },
    });
    if (!expediente) throw new NotFoundException('No existe ese expediente.');

    const fecha = dto.fecha ?? new Date();
    if (fecha < expediente.paciente.fechaNacimiento) {
      throw new BadRequestException(
        'La atencion no puede ser anterior a la fecha de nacimiento del paciente.',
      );
    }

    await this.validarContraCatalogo(dto);

    const ficha = await this.prisma.$transaction(async (tx) => {
      const atencion = await tx.atencion.create({
        data: {
          expedienteId,
          registradaPor: usuarioId,
          fecha,
          digitalizada: dto.digitalizada ?? false,
          tipoFicha: dto.tipoFicha,

          motivoCifrado: new Uint8Array(this.cifrado.cifrar(dto.motivo)),
          historiaEnfermedadCifrado: this.cifrar(dto.historiaEnfermedad),
          manejoEstabilizacionCifrado: this.cifrar(dto.manejoEstabilizacion),
          diagnosticoCifrado: this.cifrar(dto.diagnostico),
          tratamientoCifrado: this.cifrar(dto.tratamiento),
          notasCifrado: this.cifrar(dto.notas),
          consejeriaCifrado: this.cifrar(dto.consejeria),
          referenciaCifrado: this.cifrar(dto.referencia),
          vacunaAdministradaCifrado: this.cifrar(dto.vacunaAdministrada),

          pesoKg: dto.pesoKg,
          tallaCm: dto.tallaCm,
          presionSistolica: dto.presionSistolica,
          presionDiastolica: dto.presionDiastolica,
          temperaturaC: dto.temperaturaC,
          pulso: dto.pulso,
          respiraciones: dto.respiraciones,
          circunferenciaCinturaCm: dto.circunferenciaCinturaCm,
          fechaProximaVisita: dto.fechaProximaVisita,
        },
        select: { id: true, fecha: true },
      });

      for (const s of dto.signosPeligro ?? []) {
        await tx.signoPeligroAtencion.create({
          data: {
            atencionId: atencion.id,
            signoId: s.signoId,
            presente: s.presente,
            detalleCifrado: this.cifrar(s.detalle),
          },
        });
      }

      for (const p of dto.problemas ?? []) {
        const fila = await tx.problemaAtencion.create({
          data: {
            atencionId: atencion.id,
            problemaId: p.problemaId,
            presente: p.presente,
            otroDiagnosticoCifrado: this.cifrar(p.otroDiagnostico),
            conductaCifrado: this.cifrar(p.conducta),
          },
          select: { id: true },
        });

        // Se quitan repetidos: la pantalla puede mandar el mismo signo dos
        // veces y la llave compuesta lo rechazaria, tumbando toda la ficha.
        for (const signoId of new Set(p.signoIds ?? [])) {
          await tx.signoMarcado.create({ data: { problemaAtencionId: fila.id, signoId } });
        }
        for (const diagnosticoId of new Set(p.diagnosticoIds ?? [])) {
          await tx.diagnosticoMarcado.create({
            data: { problemaAtencionId: fila.id, diagnosticoId },
          });
        }
      }

      for (const [i, m] of (dto.medicamentos ?? []).entries()) {
        await tx.medicamentoIndicado.create({
          data: {
            atencionId: atencion.id,
            orden: i + 1,
            nombreCifrado: new Uint8Array(this.cifrado.cifrar(m.nombre)),
            dosisCifrado: this.cifrar(m.dosis),
            dias: m.dias,
          },
        });
      }

      // El evento lleva signos vitales, que alimentan indicadores, pero NUNCA
      // el diagnostico ni las notas clinicas. Va DENTRO de la transaccion: si
      // se escribiera fuera, un fallo entre el COMMIT y la escritura del evento
      // dejaria el indicador desfasado de forma permanente y silenciosa.
      await this.outbox.registrar(
        tx,
        Evento.ATENCION_REGISTRADA,
        {
          atencionId: atencion.id,
          pacienteId: expediente.paciente.id,
          comunidadId: expediente.paciente.comunidadId,
          fecha: atencion.fecha.toISOString(),
          digitalizada: dto.digitalizada ?? false,
          pesoKg: dto.pesoKg ?? null,
          tallaCm: dto.tallaCm ?? null,
          presionSistolica: dto.presionSistolica ?? null,
          presionDiastolica: dto.presionDiastolica ?? null,
          registradaPor: usuarioId,
        },
        trazaId,
      );

      // Lo que el panel de digitalizacion cuenta como avance. Sin esto, una
      // jornada entera de transcripcion dejaria el contador en cero y el
      // personal no veria progresar lo que si esta haciendo, que es
      // exactamente como se abandona una digitalizacion (riesgo R-6).
      if (dto.digitalizada) {
        await tx.registroDigitalizacion.updateMany({
          where: { expedienteId },
          data: { atencionesTranscritas: { increment: 1 } },
        });

        // La primera hoja transcrita mueve la carpeta a "en proceso" y sella
        // quien y cuando la empezo. Es el unico de los cuatro estados que el
        // sistema puede deducir por si mismo: los otros dependen de mirar el
        // papel, y por eso los declara una persona.
        await tx.registroDigitalizacion.updateMany({
          where: { expedienteId, estado: 'PENDIENTE' },
          data: { estado: 'EN_PROCESO', iniciadoEn: new Date(), digitalizadoPor: usuarioId },
        });
      }

      return atencion;
    });

    return { id: ficha.id, expedienteId, fecha: ficha.fecha };
  }

  /**
   * Comprueba que los identificadores enviados pertenezcan a ESTA ficha.
   *
   * Sin esto, un cliente equivocado podria guardar en una ficha de adultos un
   * problema de la ficha de neonatos. La base lo aceptaria —las llaves foraneas
   * existen— y el error solo aparecería al leer la ficha, con los datos ya
   * escritos.
   */
  private async validarContraCatalogo(dto: CrearFichaDto): Promise<void> {
    const signosPeligro = (dto.signosPeligro ?? []).map((s) => s.signoId);
    const problemas = (dto.problemas ?? []).map((p) => p.problemaId);

    if (signosPeligro.length > 0) {
      const validos = await this.prisma.signoPeligro.count({
        where: { id: { in: signosPeligro }, tipoFicha: dto.tipoFicha },
      });
      if (validos !== new Set(signosPeligro).size) {
        throw new BadRequestException(
          'Algun signo de peligro no pertenece a la ficha ' + dto.tipoFicha + '.',
        );
      }
    }

    if (problemas.length === 0) return;

    const validos = await this.prisma.problemaFicha.findMany({
      where: { id: { in: problemas }, tipoFicha: dto.tipoFicha },
      select: {
        id: true,
        signos: { select: { id: true } },
        diagnosticos: { select: { id: true } },
      },
    });

    if (validos.length !== new Set(problemas).size) {
      throw new BadRequestException(
        'Algun problema no pertenece a la ficha ' + dto.tipoFicha + '.',
      );
    }

    const porProblema = new Map(validos.map((p) => [p.id, p]));
    for (const p of dto.problemas ?? []) {
      const catalogo = porProblema.get(p.problemaId);
      if (!catalogo) continue;

      const signosValidos = new Set(catalogo.signos.map((s) => s.id));
      for (const id of p.signoIds ?? []) {
        if (!signosValidos.has(id)) {
          throw new BadRequestException('Un signo marcado no pertenece a su problema.');
        }
      }

      const diagnosticosValidos = new Set(catalogo.diagnosticos.map((d) => d.id));
      for (const id of p.diagnosticoIds ?? []) {
        if (!diagnosticosValidos.has(id)) {
          throw new BadRequestException('Un diagnostico marcado no pertenece a su problema.');
        }
      }
    }
  }

  /** Una ficha completa, con el texto descifrado y el catalogo resuelto. */
  async obtener(id: string): Promise<FichaDto> {
    const a = await this.prisma.atencion.findUnique({
      where: { id },
      include: {
        signosPeligro: { include: { signo: { select: { texto: true, orden: true } } } },
        problemas: {
          include: {
            problema: { select: { nombre: true, orden: true } },
            signos: { include: { signo: { select: { texto: true, orden: true } } } },
            diagnosticos: { include: { diagnostico: { select: { texto: true, orden: true } } } },
          },
        },
        medicamentos: { orderBy: { orden: 'asc' } },
      },
    });
    if (!a) throw new NotFoundException('No existe esa ficha.');

    const signosPeligro: SignoPeligroFichaDto[] = a.signosPeligro
      .sort((x, y) => x.signo.orden - y.signo.orden)
      .map((s) => ({
        signoId: s.signoId,
        texto: s.signo.texto,
        presente: s.presente,
        detalle: this.descifrar(s.detalleCifrado),
      }));

    const problemas: ProblemaFichaRegistradoDto[] = a.problemas
      .sort((x, y) => x.problema.orden - y.problema.orden)
      .map((p) => ({
        problemaId: p.problemaId,
        nombre: p.problema.nombre,
        presente: p.presente,
        signos: p.signos
          .sort((x, y) => x.signo.orden - y.signo.orden)
          .map((s) => s.signo.texto),
        diagnosticos: p.diagnosticos
          .sort((x, y) => x.diagnostico.orden - y.diagnostico.orden)
          .map((d) => d.diagnostico.texto),
        otroDiagnostico: this.descifrar(p.otroDiagnosticoCifrado),
        conducta: this.descifrar(p.conductaCifrado),
      }));

    const medicamentos: MedicamentoFichaDto[] = a.medicamentos.map((m) => ({
      nombre: this.descifrar(m.nombreCifrado) ?? '',
      dosis: this.descifrar(m.dosisCifrado),
      dias: m.dias,
    }));

    // Decimal de Prisma: viaja como texto en JSON. Se convierte explicito para
    // que el tipo declarado sea cierto.
    const decimal = (v: unknown) => (v === null || v === undefined ? null : String(v));

    return {
      id: a.id,
      expedienteId: a.expedienteId,
      tipoFicha: a.tipoFicha,
      fecha: a.fecha,
      registradaPor: a.registradaPor,
      digitalizada: a.digitalizada,

      motivo: this.descifrar(a.motivoCifrado),
      historiaEnfermedad: this.descifrar(a.historiaEnfermedadCifrado),
      manejoEstabilizacion: this.descifrar(a.manejoEstabilizacionCifrado),
      diagnostico: this.descifrar(a.diagnosticoCifrado),
      tratamiento: this.descifrar(a.tratamientoCifrado),
      notas: this.descifrar(a.notasCifrado),
      consejeria: this.descifrar(a.consejeriaCifrado),
      referencia: this.descifrar(a.referenciaCifrado),
      vacunaAdministrada: this.descifrar(a.vacunaAdministradaCifrado),

      pesoKg: decimal(a.pesoKg),
      tallaCm: decimal(a.tallaCm),
      presionSistolica: a.presionSistolica,
      presionDiastolica: a.presionDiastolica,
      temperaturaC: decimal(a.temperaturaC),
      pulso: a.pulso,
      respiraciones: a.respiraciones,
      circunferenciaCinturaCm: decimal(a.circunferenciaCinturaCm),
      imc: calcularImc(a.pesoKg, a.tallaCm),

      fechaProximaVisita: a.fechaProximaVisita,
      signosPeligro,
      problemas,
      medicamentos,
    };
  }
}

/**
 * Indice de masa corporal: peso en kilos entre la talla en metros al cuadrado.
 *
 * Se calcula al responder y no se guarda. En el papel es el campo que mas se
 * equivoca al sacarse a mano, y almacenarlo permitiria que quedara desfasado
 * del peso del que dice venir.
 */
export function calcularImc(pesoKg: unknown, tallaCm: unknown): number | null {
  const peso = Number(pesoKg);
  const talla = Number(tallaCm);
  if (!Number.isFinite(peso) || !Number.isFinite(talla) || peso <= 0 || talla <= 0) return null;

  const metros = talla / 100;
  return Math.round((peso / (metros * metros)) * 100) / 100;
}
