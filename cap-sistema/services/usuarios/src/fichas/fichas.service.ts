import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CLIENTE_AUDITORIA,
  ContextoAuditoria,
  IClienteAuditoria,
  registrarConsulta,
  ServicioCifrado,
} from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { CrearFichaDto, type TipoFichaDto } from './dto/crear-ficha.dto';
import { marcarCarpetaTranscrita } from '../digitalizacion/marcar-transcrito';
import { fechaProbableParto, semanasDeGestacion } from './gestacion';
import type {
  CatalogoFichaDto,
  ConsejeriaFichaDto,
  FichaCreadaDto,
  FichaDto,
  FichaNeonatoDto,
  FichaPospartoDto,
  FichaPrenatalDto,
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
    @Inject(CLIENTE_AUDITORIA) private readonly auditoria: IClienteAuditoria,
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
    const [signosPeligro, enFicha, problemas, temasConsejeria] = await this.prisma.$transaction([
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
          etiquetaAnotacion: true,
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
      this.prisma.temaConsejeria.findMany({
        where: { tipoFicha, activo: true },
        orderBy: { orden: 'asc' },
        select: { id: true, orden: true, texto: true },
      }),
    ]);

    // Un catalogo sin sembrar es un catalogo que no se puede dibujar, y hay que
    // decirlo en vez de servir una hoja vacia que alguien llenaria a medias.
    //
    // Que se comprueba depende de la ficha, y no es un capricho: TRES de las
    // cinco traen matriz de problemas y sin ella la hoja no existe —es su
    // cuerpo entero—, mientras que la prenatal y la del posparto no la tienen
    // en el papel: ahi el MSPAS deja una raya para escribirlos.
    //
    // La primera version de esto miraba solo los problemas, y daba 404 en una
    // ficha prenatal perfectamente sembrada. La segunda pedia que TODO
    // estuviera vacio, y con eso una ficha de adultos a la que le faltara la
    // matriz —una siembra a medias— pasaba por buena y se servia sin ella.
    const sinMatriz = tipoFicha === 'PRENATAL' || tipoFicha === 'POSPARTO';
    const vacio = sinMatriz
      ? signosPeligro.length === 0 && temasConsejeria.length === 0
      : problemas.length === 0;

    if (vacio) {
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
      // Vacio en la ficha de adultos, donde la consejeria es un texto libre.
      temasConsejeria,
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
    contexto: ContextoAuditoria,
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
            anotacionCifrado: this.cifrar(p.anotacion),
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
        contexto.trazaId,
      );

      // La hoja prenatal ademas se la cuenta a Programas, que es quien lleva
      // el seguimiento del embarazo: con esto el control queda registrado
      // alli sin que el personal lo capture dos veces. Va con lo que
      // Programas sabe evaluar —presion, altura uterina, frecuencia cardiaca
      // fetal— y con las semanas que anoto quien atendio, y SIN laboratorios,
      // ni problemas detectados, ni nada cifrado: el bus no es un canal
      // cifrado por campo.
      //
      // Si la paciente no esta inscrita en el programa, Programas descarta el
      // evento y lo deja anotado. Inscribirla por un efecto secundario seria
      // tomar una decision clinica que nadie pidio.
      if (dto.tipoFicha === 'PRENATAL') {
        const p = dto.prenatal;
        await this.outbox.registrar(
          tx,
          Evento.FICHA_PRENATAL_REGISTRADA,
          {
            atencionId: atencion.id,
            pacienteId: expediente.paciente.id,
            comunidadId: expediente.paciente.comunidadId,
            fecha: atencion.fecha.toISOString(),
            digitalizada: dto.digitalizada ?? false,
            pesoKg: dto.pesoKg ?? null,
            presionSistolica: dto.presionSistolica ?? null,
            presionDiastolica: dto.presionDiastolica ?? null,
            alturaUterinaCm: p?.alturaUterinaCm ?? null,
            fcf: p?.fcf ?? null,
            semanasPorFurAu: p?.semanasPorFurAu ?? null,
            conSignosDePeligro: (dto.signosPeligro ?? []).some((s) => s.presente),
            registradaPor: usuarioId,
          },
          contexto.trazaId,
        );
      }

      // Guardar la hoja SACA la carpeta de la cola.
      //
      // Antes la dejaba en "en proceso" y habia que volver a Digitalizacion,
      // buscarla otra vez entre miles y cerrarla a mano. Ver
      // `marcarCarpetaTranscrita` para el porque de completarla con la primera
      // hoja y no esperar a que se declaren todas.
      if (dto.digitalizada) {
        await marcarCarpetaTranscrita(tx, expedienteId, usuarioId);
      }

      // ── La tabla de consejeria del pie de la ficha ──────────────────
      //
      // Solo las fichas cuyo catalogo trae temas. La de adultos sigue usando
      // el texto libre de `consejeria`.
      for (const c of dto.consejeriaTemas ?? []) {
        await tx.consejeriaEnAtencion.create({
          data: {
            atencionId: atencion.id,
            temaId: c.temaId,
            brindada: c.brindada ?? true,
            // Como aaaa-mm-dd, sin construir un Date: Guatemala es UTC-6 y la
            // conversion correria la fecha al dia anterior.
            fechaReconsulta: c.fechaReconsulta
              ? new Date(c.fechaReconsulta + 'T00:00:00')
              : null,
          },
        });
      }

      // ── Lo que solo trae la ficha de menor de 28 dias ───────────────
      //
      // Se guarda unicamente cuando la ficha ES de neonato. Si llegara en una
      // ficha de adultos seria un cliente equivocado, y escribirlo dejaria una
      // fila huerfana que nadie va a leer nunca.
      if (dto.tipoFicha === 'NEONATO' && dto.neonato) {
        const n = dto.neonato;
        await tx.fichaNeonato.create({
          data: {
            atencionId: atencion.id,
            nombreMadreCifrado: this.cifrar(n.nombreMadre),
            pesoLibras: n.pesoLibras,
            pesoOnzas: n.pesoOnzas,
            perimetroBraquialCm: n.perimetroBraquialCm,
            circunferenciaCefalicaCm: n.circunferenciaCefalicaCm,
            pesoNacerLibras: n.pesoNacerLibras,
            pesoNacerOnzas: n.pesoNacerOnzas,
            lloroAlNacer: n.lloroAlNacer,
            nacioCianotico: n.nacioCianotico,
            horasTrabajoParto: n.horasTrabajoParto,
            quienAtendioParto: n.quienAtendioParto,
            quienAtendioPartoOtro: n.quienAtendioPartoOtro,
            rupturaPrematuraMembranas: n.rupturaPrematuraMembranas,
            trabajoPartoPrematuro: n.trabajoPartoPrematuro,
            partoProlongado: n.partoProlongado,
            tipoParto: n.tipoParto,
            bcg: n.bcg,
            tdMadre: n.tdMadre,
            tdMadreDosis: n.tdMadreDosis,
            lactanciaMaternaExclusiva: n.lactanciaMaternaExclusiva,
          },
        });
      }

      // ── Lo que solo trae la hoja prenatal ───────────────────────────
      //
      // Mismo criterio que el neonato: solo si la ficha ES prenatal. La hoja
      // del posparto escribe en `ficha_posparto`, que es otra tabla, asi que un
      // cuerpo con `prenatal` dentro de una ficha POSPARTO se ignora en vez de
      // dejar una fila colgada de una atencion que nadie va a leer por ahi.
      if (dto.tipoFicha === 'PRENATAL' && dto.prenatal) {
        const p = dto.prenatal;
        await tx.fichaPrenatal.create({
          data: {
            atencionId: atencion.id,
            circunferenciaBrazoCm: p.circunferenciaBrazoCm,

            examenGeneralNormal: p.examenGeneralNormal,
            examenBucodentalCifrado: this.cifrar(p.examenBucodental),

            alturaUterinaCm: p.alturaUterinaCm,
            movimientosFetales: p.movimientosFetales,
            fcf: p.fcf,
            presentacionLeopold: p.presentacionLeopold,

            trazasSangre: p.trazasSangre,
            trazasSangreDescripcionCifrado: this.cifrar(p.trazasSangreDescripcion),
            lesionesVulvares: p.lesionesVulvares,
            lesionesVulvaresDescripcionCifrado: this.cifrar(p.lesionesVulvaresDescripcion),
            flujoVaginal: p.flujoVaginal,

            hemoglobinaHematocritoCifrado: this.cifrar(p.hemoglobinaHematocrito),
            grupoRhCifrado: this.cifrar(p.grupoRh),
            orinaCifrado: this.cifrar(p.orina),
            glicemiaCifrado: this.cifrar(p.glicemia),
            vdrlCifrado: this.cifrar(p.vdrl),
            vihCifrado: this.cifrar(p.vih),
            papanicolauCifrado: this.cifrar(p.papanicolau),
            infeccionesCifrado: this.cifrar(p.infecciones),

            semanasPorFurAu: p.semanasPorFurAu,
            problemasDetectadosCifrado: this.cifrar(p.problemasDetectados),

            sulfatoFerrosoTabletas: p.sulfatoFerrosoTabletas,
            acidoFolicoTabletas: p.acidoFolicoTabletas,
            tdDosis: p.tdDosis,
          },
        });
      }

      // ── Lo que solo trae la evaluacion del posparto ─────────────────
      if (dto.tipoFicha === 'POSPARTO' && dto.posparto) {
        const s = dto.posparto;
        await tx.fichaPosparto.create({
          data: {
            atencionId: atencion.id,
            esPrimerControl: s.esPrimerControl ?? false,

            diasDespuesDelParto: s.diasDespuesDelParto,
            dondeAtendioParto: s.dondeAtendioParto,
            quienAtendioParto: s.quienAtendioParto,
            quienAtendioPartoOtro: s.quienAtendioPartoOtro,

            involucionUterinaCifrado: this.cifrar(s.involucionUterina),
            examenMamasCifrado: this.cifrar(s.examenMamas),
            heridaOperatoriaCifrado: this.cifrar(s.heridaOperatoria),
            examenGinecologicoCifrado: this.cifrar(s.examenGinecologico),

            lactanciaMaternaExclusiva: s.lactanciaMaternaExclusiva,
            motivoSinLactanciaCifrado: this.cifrar(s.motivoSinLactancia),
            problemasDetectadosCifrado: this.cifrar(s.problemasDetectados),

            sulfatoFerroso: s.sulfatoFerroso,
            sulfatoFerrosoTabletas: s.sulfatoFerrosoTabletas,
            acidoFolico: s.acidoFolico,
            acidoFolicoTabletas: s.acidoFolicoTabletas,
            td: s.td,
            tdDosis: s.tdDosis,
            otroMedicamento: s.otroMedicamento,
          },
        });
      }

      /**
       * Si el paciente estaba en la sala de espera, esta ficha lo atiende.
       *
       * Se cierra sola y no a mano: pedirle a la enfermera un paso mas justo
       * cuando ya termino y va por el siguiente es pedirle que se le olvide, y
       * una sala de espera con gente ya atendida deja de servir en dos dias.
       *
       * Va dentro de la misma transaccion que la ficha. Si se hiciera despues,
       * un fallo entre las dos dejaria a alguien esperando eternamente a pesar
       * de haber sido atendido.
       *
       * updateMany y no update porque puede no haber ninguna: la mayoria de las
       * fichas —las transcritas del papel— no vienen de una visita de hoy.
       */
      await tx.visita.updateMany({
        where: { pacienteId: expediente.paciente.id, estado: 'ESPERANDO' },
        data: {
          estado: 'ATENDIDA',
          cerradaEn: new Date(),
          cerradaPor: usuarioId,
          atencionId: atencion.id,
        },
      });

      // Una hoja del MSPAS son ~200 campos. No se copian aqui: la ficha
      // completa ya vive en el expediente, y duplicarla en una tabla
      // append-only multiplicaria la que mas crece del sistema (arquitectura
      // 9.5) por una copia que ademas nadie podria corregir nunca. Queda el
      // QUE, el QUIEN y el CUANDO, que es lo que se audita.
      await this.auditoria.registrar(
        {
          servicio: 'usuarios',
          accion: 'CREACION',
          entidad: 'ficha',
          entidadId: atencion.id,
          motivo: 'Registro de ficha clinica completa',
          valorNuevo: JSON.stringify({
            expedienteId,
            pacienteId: expediente.paciente.id,
            tipoFicha: dto.tipoFicha,
            fecha: atencion.fecha.toISOString(),
            digitalizada: dto.digitalizada ?? false,
          }),
        },
        contexto.autorizacion,
        contexto.trazaId,
      );

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
    const temas = (dto.consejeriaTemas ?? []).map((c) => c.temaId);

    // ── Nada repetido ────────────────────────────────────────────────────
    //
    // Las tres tablas tienen clave compuesta por atencion, asi que mandar el
    // mismo elemento dos veces reventaria contra la restriccion y saldria como
    // un 500. Un cuerpo mal armado es culpa de quien lo manda: 400.
    for (const [nombre, ids] of [
      ['signo de peligro', signosPeligro],
      ['problema', problemas],
      ['tema de consejeria', temas],
    ] as const) {
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Hay un ' + nombre + ' repetido en la ficha.');
      }
    }

    // ── Los temas de consejeria son de ESTA ficha ────────────────────────
    //
    // Mismo motivo que los problemas: las llaves foraneas existen, asi que la
    // base aceptaria un tema de la ficha de ninez dentro de una de neonato y el
    // error solo aparecería al leerla, con los datos ya escritos.
    if (temas.length > 0) {
      const validos = await this.prisma.temaConsejeria.count({
        where: { id: { in: temas }, tipoFicha: dto.tipoFicha },
      });
      if (validos !== temas.length) {
        throw new BadRequestException(
          'Algun tema de consejeria no pertenece a la ficha ' + dto.tipoFicha + '.',
        );
      }
    }

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
  async obtener(id: string, contexto: ContextoAuditoria): Promise<FichaDto> {
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
        consejeria: { include: { tema: { select: { texto: true, orden: true } } } },
        fichaNeonato: true,
        fichaPrenatal: true,
        fichaPosparto: true,
        // Para la FUR: las semanas de gestacion se calculan al responder y la
        // fecha vive en los antecedentes del paciente, no en la ficha.
        expediente: { select: { pacienteId: true } },
      },
    });
    if (!a) throw new NotFoundException('No existe esa ficha.');

    // Abrir una ficha descifra la hoja entera: es una consulta de expediente
    // en el sentido pleno del RF-09.
    registrarConsulta(
      this.auditoria,
      {
        servicio: 'usuarios',
        entidad: 'ficha',
        entidadId: id,
        motivo: 'Apertura de una ficha clinica',
        valorNuevo: JSON.stringify({ expedienteId: a.expedienteId, tipoFicha: a.tipoFicha }),
      },
      contexto,
    );

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
        anotacion: this.descifrar(p.anotacionCifrado),
      }));

    const consejeriaTemas: ConsejeriaFichaDto[] = a.consejeria
      .sort((x, y) => x.tema.orden - y.tema.orden)
      .map((c) => ({
        temaId: c.temaId,
        texto: c.tema.texto,
        brindada: c.brindada,
        // Como aaaa-mm-dd: la fecha se guarda sin hora y devolverla como
        // instante la correria un dia al leerla en Guatemala.
        fechaReconsulta: c.fechaReconsulta
          ? c.fechaReconsulta.toISOString().slice(0, 10)
          : null,
      }));

    const n = a.fichaNeonato;
    const neonato: FichaNeonatoDto | null = n
      ? {
          nombreMadre: this.descifrar(n.nombreMadreCifrado),
          pesoLibras: n.pesoLibras,
          pesoOnzas: n.pesoOnzas,
          // Decimal de Prisma viaja como TEXTO en JSON, no como numero.
          perimetroBraquialCm: n.perimetroBraquialCm?.toString() ?? null,
          circunferenciaCefalicaCm: n.circunferenciaCefalicaCm?.toString() ?? null,
          pesoNacerLibras: n.pesoNacerLibras,
          pesoNacerOnzas: n.pesoNacerOnzas,
          lloroAlNacer: n.lloroAlNacer,
          nacioCianotico: n.nacioCianotico,
          horasTrabajoParto: n.horasTrabajoParto,
          quienAtendioParto: n.quienAtendioParto,
          quienAtendioPartoOtro: n.quienAtendioPartoOtro,
          rupturaPrematuraMembranas: n.rupturaPrematuraMembranas,
          trabajoPartoPrematuro: n.trabajoPartoPrematuro,
          partoProlongado: n.partoProlongado,
          tipoParto: n.tipoParto,
          bcg: n.bcg,
          tdMadre: n.tdMadre,
          tdMadreDosis: n.tdMadreDosis,
          lactanciaMaternaExclusiva: n.lactanciaMaternaExclusiva,
        }
      : null;

    // Decimal de Prisma: viaja como texto en JSON. Se convierte explicito para
    // que el tipo declarado sea cierto.
    const decimal = (v: unknown) => (v === null || v === undefined ? null : String(v));

    const p = a.fichaPrenatal;
    let prenatal: FichaPrenatalDto | null = null;
    if (p) {
      // La FUR es del paciente, no de la consulta: una mujer con cuatro
      // controles tiene cuatro fichas y una sola ultima regla.
      const obstetricos = await this.prisma.antecedentesObstetricos.findUnique({
        where: { pacienteId: a.expediente.pacienteId },
        select: { fur: true },
      });
      const fur = obstetricos?.fur ?? null;
      // `a.fecha` es un instante con hora, y la cuenta es por dias de
      // calendario en Purulha. Ver `gestacion.ts`.
      const semanas = fur ? semanasDeGestacion(fur, a.fecha) : null;

      prenatal = {
        circunferenciaBrazoCm: decimal(p.circunferenciaBrazoCm),

        examenGeneralNormal: p.examenGeneralNormal,
        examenBucodental: this.descifrar(p.examenBucodentalCifrado),

        alturaUterinaCm: decimal(p.alturaUterinaCm),
        movimientosFetales: p.movimientosFetales,
        fcf: p.fcf,
        presentacionLeopold: p.presentacionLeopold,

        trazasSangre: p.trazasSangre,
        trazasSangreDescripcion: this.descifrar(p.trazasSangreDescripcionCifrado),
        lesionesVulvares: p.lesionesVulvares,
        lesionesVulvaresDescripcion: this.descifrar(p.lesionesVulvaresDescripcionCifrado),
        flujoVaginal: p.flujoVaginal,

        hemoglobinaHematocrito: this.descifrar(p.hemoglobinaHematocritoCifrado),
        grupoRh: this.descifrar(p.grupoRhCifrado),
        orina: this.descifrar(p.orinaCifrado),
        glicemia: this.descifrar(p.glicemiaCifrado),
        vdrl: this.descifrar(p.vdrlCifrado),
        vih: this.descifrar(p.vihCifrado),
        papanicolau: this.descifrar(p.papanicolauCifrado),
        infecciones: this.descifrar(p.infeccionesCifrado),

        semanasPorFurAu: p.semanasPorFurAu,
        problemasDetectados: this.descifrar(p.problemasDetectadosCifrado),

        sulfatoFerrosoTabletas: p.sulfatoFerrosoTabletas,
        acidoFolicoTabletas: p.acidoFolicoTabletas,
        tdDosis: p.tdDosis,

        // Sin FUR no hay cuenta que hacer, y ninguna de las dos se inventa.
        //
        // Las dos van juntas a proposito. La FUR es del PACIENTE y hay una
        // sola: si esa mujer se embaraza otra vez y alguien la actualiza,
        // los controles del embarazo anterior quedan apuntando a la ultima
        // regla del siguiente. Cuando eso pasa, la consulta es anterior a la
        // FUR y `semanasDeGestacion` devuelve null; la fecha probable de parto
        // tiene que callarse tambien, porque calcularla igual pondria en una
        // ficha de 2026 la fecha de parto de un embarazo de 2027 con toda la
        // pinta de haberse calculado para ella.
        semanasGestacion: semanas,
        fechaProbableParto:
          fur && semanas !== null ? fechaProbableParto(fur).toISOString().slice(0, 10) : null,
      };
    }

    const s = a.fichaPosparto;
    const posparto: FichaPospartoDto | null = s
      ? {
          esPrimerControl: s.esPrimerControl,
          diasDespuesDelParto: s.diasDespuesDelParto,
          dondeAtendioParto: s.dondeAtendioParto,
          quienAtendioParto: s.quienAtendioParto,
          quienAtendioPartoOtro: s.quienAtendioPartoOtro,

          involucionUterina: this.descifrar(s.involucionUterinaCifrado),
          examenMamas: this.descifrar(s.examenMamasCifrado),
          heridaOperatoria: this.descifrar(s.heridaOperatoriaCifrado),
          examenGinecologico: this.descifrar(s.examenGinecologicoCifrado),

          lactanciaMaternaExclusiva: s.lactanciaMaternaExclusiva,
          motivoSinLactancia: this.descifrar(s.motivoSinLactanciaCifrado),
          problemasDetectados: this.descifrar(s.problemasDetectadosCifrado),

          sulfatoFerroso: s.sulfatoFerroso,
          sulfatoFerrosoTabletas: s.sulfatoFerrosoTabletas,
          acidoFolico: s.acidoFolico,
          acidoFolicoTabletas: s.acidoFolicoTabletas,
          td: s.td,
          tdDosis: s.tdDosis,
          otroMedicamento: s.otroMedicamento,
        }
      : null;

    const medicamentos: MedicamentoFichaDto[] = a.medicamentos.map((m) => ({
      nombre: this.descifrar(m.nombreCifrado) ?? '',
      dosis: this.descifrar(m.dosisCifrado),
      dias: m.dias,
    }));

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
      consejeriaTemas,
      neonato,
      prenatal,
      posparto,
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
