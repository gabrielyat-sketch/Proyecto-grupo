import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CLIENTE_AUDITORIA,
  type ContextoAuditoria,
  crearPagina,
  type IClienteAuditoria,
  normalizarPagina,
  Pagina,
  palabrasDeBusqueda,
  ServicioCifrado,
  textoDeBusqueda,
} from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { serieDe } from '../grupos/serie';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { Evento, OutboxService } from '../eventos/outbox.service';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { BuscarPacientesDto } from './dto/buscar-pacientes.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { PacienteResumenDto } from './dto/respuestas.dto';

/** Forma de una fila del listado, tal como la devuelve el select RESUMEN. */
interface FilaResumen {
  id: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date;
  sexo: string;
  idioma: string;
  fallecido: boolean;
  comunidad: { id: string; nombre: string };
  expediente: { id: string; numeroCifrado: Uint8Array } | null;
}

/** Columnas del listado. Nunca incluye dpiCifrado ni dpiIndice. */
const RESUMEN = {
  id: true,
  nombres: true,
  apellidos: true,
  fechaNacimiento: true,
  sexo: true,
  idioma: true,
  fallecido: true,
  comunidad: { select: { id: true, nombre: true } },
  expediente: { select: { id: true, numeroCifrado: true } },
} as const;

@Injectable()
export class PacientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
    @Inject(CLIENTE_AUDITORIA) private readonly auditoria: IClienteAuditoria,
  ) {}

  /**
   * Busqueda de recepcion. Es el camino critico del sistema: debe responder en
   * menos de 2 segundos con 100,000 pacientes (arquitectura §9.7).
   *
   * Por DPI: HMAC del valor y busqueda por igualdad sobre una columna indexada
   * y unica. Es una lectura de indice, no cambia de costo aunque la base
   * crezca.
   *
   * Por nombre: busqueda por INICIO de apellido o nombre, no por texto
   * contenido. Un LIKE '%texto%' no puede usar indice y obliga a recorrer la
   * tabla entera; ademas el personal de archivo busca por el principio del
   * apellido, que es como estan ordenadas las carpetas de papel.
   */
  async buscar(consulta: BuscarPacientesDto): Promise<Pagina<PacienteResumenDto>> {
    const { tamano, saltar } = normalizarPagina(consulta);

    if (!consulta.dpi && !consulta.nombre && !consulta.comunidadId) {
      throw new BadRequestException(
        'Indique al menos un criterio: DPI, nombre o comunidad.',
      );
    }

    const where: Record<string, unknown> = {};

    if (consulta.dpi) {
      where.dpiIndice = this.cifrado.indiceCiego(consulta.dpi);
    }

    if (consulta.nombre) {
      // Cada palabra debe aparecer, empezando alguna palabra del nombre
      // completo. Asi "yat ramiro" encuentra a "Yat Yat Ramiro Gabriel" sin
      // importar el orden, y "ramiro" solo no arrastra a los miles de "Yat".
      //
      // Dos patrones por palabra: al principio del texto, o despues de un
      // espacio. Buscar por texto CONTENIDO en cualquier posicion encontraria
      // "ana" dentro de "Juana", que no es lo que el personal espera.
      const palabras = palabrasDeBusqueda(consulta.nombre);
      if (palabras.length > 0) {
        where.AND = palabras.map((palabra) => ({
          OR: [
            { nombreBusqueda: { startsWith: palabra } },
            { nombreBusqueda: { contains: ' ' + palabra } },
          ],
        }));
      }
    }

    if (consulta.comunidadId) {
      where.comunidadId = consulta.comunidadId;
    }

    const [datos, total] = await this.prisma.$transaction([
      this.prisma.paciente.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
        select: RESUMEN,
      }),
      this.prisma.paciente.count({ where }),
    ]);

    return crearPagina(datos.map((p) => this.aResumen(p)), total, consulta);
  }

  async obtener(id: string) {
    const p = await this.prisma.paciente.findUnique({
      where: { id },
      include: {
        comunidad: { select: { id: true, nombre: true } },
        lugar: { select: { id: true, nombre: true, tipo: true } },
        // La carpeta se identifica por su numero DENTRO de su lugar: el
        // «No. 3» de El Calvario no es el de San Jose, asi que el numero solo
        // no dice nada y el lugar viaja con el.
        grupoFamiliar: {
          select: {
            id: true,
            numero: true,
            apellidos: true,
            lugar: { select: { id: true, nombre: true, tipo: true } },
          },
        },
        expediente: { select: { id: true, numeroCifrado: true, aperturaEn: true } },
      },
    });
    if (!p) throw new NotFoundException('No existe ese paciente.');

    return {
      id: p.id,
      dpi: p.dpiCifrado ? this.cifrado.descifrar(Buffer.from(p.dpiCifrado)) : null,
      nombres: p.nombres,
      apellidos: p.apellidos,
      fechaNacimiento: p.fechaNacimiento,
      edad: PacientesService.edad(p.fechaNacimiento),
      sexo: p.sexo,
      idioma: p.idioma,
      telefono: p.telefono,
      fallecido: p.fallecido,
      comunidad: p.comunidad,
      lugar: p.lugar,
      migrante: p.migrante,
      lugarOrigen: p.lugarOrigen,
      tieneAlergias: p.tieneAlergias,
      alergias: p.alergiasCifrado
        ? this.cifrado.descifrar(Buffer.from(p.alergiasCifrado))
        : null,
      grupoFamiliar: p.grupoFamiliar,
      expediente: p.expediente
        ? {
            id: p.expediente.id,
            numero: this.cifrado.descifrar(Buffer.from(p.expediente.numeroCifrado)),
            aperturaEn: p.expediente.aperturaEn,
          }
        : null,
    };
  }

  /**
   * Crea el paciente, su expediente y el registro de digitalizacion en UNA
   * transaccion, junto con el evento de la bandeja de salida. Un paciente sin
   * expediente no sirve para nada, asi que no puede quedar a medias.
   */
  async crear(dto: CrearPacienteDto, usuarioId: string, trazaId?: string) {
    if (!(await this.prisma.comunidad.findUnique({ where: { id: dto.comunidadId } }))) {
      throw new BadRequestException('La comunidad indicada no existe.');
    }

    // El lugar tiene que ser de ESA comunidad. Sin esto se podria registrar a
    // alguien en el "Barrio El Centro" de otro municipio, y el listado por
    // lugar dejaria de significar nada.
    if (dto.lugarId) {
      const lugar = await this.prisma.lugarPoblado.findUnique({
        where: { id: dto.lugarId },
        select: { comunidadId: true },
      });
      if (!lugar) throw new BadRequestException('El lugar indicado no existe.');
      if (lugar.comunidadId !== dto.comunidadId) {
        throw new BadRequestException('Ese lugar no pertenece a la comunidad indicada.');
      }
    }

    // El CUI o DPI es obligatorio, asi que el indice existe siempre y el
    // control de duplicados se hace en todas las altas, no solo en las que
    // traian el dato.
    const dpiIndice = this.cifrado.indiceCiego(dto.dpi);

    const repetido = await this.prisma.paciente.findUnique({
      where: { dpiIndice: new Uint8Array(dpiIndice) },
      select: { id: true },
    });
    if (repetido) {
      // El id va en detalles y no como campo suelto: el formato de error es
      // uno solo en los ocho servicios, y el frontend lo usa para ofrecer
      // "abrir el expediente existente" en vez de dejar al usuario atascado.
      throw new ConflictException({
        mensaje: 'Ya existe un paciente registrado con ese DPI.',
        detalles: ['pacienteId:' + repetido.id],
      });
    }

    const numero = dto.numeroExpediente?.trim() || (await this.siguienteNumeroExpediente());
    const numeroIndice = this.cifrado.indiceCiego(numero);

    if (
      await this.prisma.expediente.findUnique({
        where: { numeroIndice: new Uint8Array(numeroIndice) },
        select: { id: true },
      })
    ) {
      /*
        Hay DOS numeraciones en esta pantalla y se confunden.

        La de la CARPETA se repite en cada lugar: hay un folder No.1 en El
        Calvario y otro en San Jose. La del EXPEDIENTE es unica en todo el CAP.
        Quien registra escribe el numero del folder en las dos casillas, la
        segunda choca contra el expediente de otra comunidad, y el mensaje —que
        solo decia «ya existe un expediente con ese numero»— se lee como si el
        numero de carpeta estuviera ocupado. De ahi sale el «choca siempre,
        venga de donde venga». Asi que el mensaje dice cual de las dos es.
      */
      throw new ConflictException(
        'Ya hay un expediente con el numero ' + numero + '. ' +
          'Cuidado: este es el NUMERO DE EXPEDIENTE, no el de la carpeta. ' +
          'El de la carpeta se repite en cada comunidad; el de expediente es ' +
          'unico en todo el CAP. Si el paciente es nuevo, deje esa casilla ' +
          'vacia y el sistema le asigna uno.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      /*
        La carpeta, si hay que abrirla, DENTRO de la transaccion.

        Fuera de ella, un alta que falle despues dejaria un folder vacio con su
        numero ya gastado, y el siguiente que registre a esa familia veria el
        numero tomado sin nadie dentro. El numero de la pestana no es un
        correlativo que se pueda desperdiciar: es un sitio en el archivero.
      */
      let grupoFamiliarId = dto.grupoFamiliarId;
      if (dto.carpetaNueva) {
        const serieId = serieDe(dto.comunidadId, dto.lugarId);
        const numero =
          dto.carpetaNueva.numero ??
          ((
            await tx.grupoFamiliar.aggregate({
              where: { serieId },
              _max: { numero: true },
            })
          )._max.numero ?? 0) + 1;

        /*
          El numero podria estar ocupado, y eso NO es un error interno.

          Antes se iba directo al `create` y la restriccion de la base saltaba
          como P2002, que el filtro traduce a un 500 con «Ocurrio un error
          inesperado». A quien registra le sale un error tecnico donde lo que
          pasa es concreto y tiene arreglo: ese numero de folder ya lo tiene
          otra familia, hay que poner otro. Lo comprueba el mismo `grupos`
          cuando se abre una carpeta suelta; faltaba aqui.
        */
        const ocupada = await tx.grupoFamiliar.findUnique({
          where: { serieId_numero: { serieId, numero } },
          select: { apellidos: true },
        });
        if (ocupada) {
          throw new ConflictException(
            'El numero ' + numero + ' ya lo tiene la carpeta de la familia ' +
              ocupada.apellidos + '. Escriba otro numero de folder.',
          );
        }

        const carpeta = await tx.grupoFamiliar.create({
          data: {
            numero,
            apellidos: dto.carpetaNueva.apellidos.trim(),
            esposo: dto.carpetaNueva.esposo?.trim() || null,
            esposa: dto.carpetaNueva.esposa?.trim() || null,
            serieId,
            comunidadId: dto.comunidadId,
            lugarId: dto.lugarId ?? null,
          },
          select: { id: true },
        });
        grupoFamiliarId = carpeta.id;
      }

      const paciente = await tx.paciente.create({
        data: {
          dpiCifrado: new Uint8Array(this.cifrado.cifrar(dto.dpi)),
          dpiIndice: new Uint8Array(dpiIndice),
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          nombreBusqueda: textoDeBusqueda(dto.apellidos, dto.nombres),
          fechaNacimiento: dto.fechaNacimiento,
          sexo: dto.sexo,
          idioma: dto.idioma ?? 'ESPANOL',
          comunidadId: dto.comunidadId,
          grupoFamiliarId,
          telefono: dto.telefono?.trim(),
          lugarId: dto.lugarId,
          migrante: dto.migrante ?? false,
          lugarOrigen: dto.lugarOrigen?.trim(),
          esposo: dto.esposo.trim(),
          // Sin enviarlo queda en null: "no se ha preguntado", que no es lo
          // mismo que "no tiene".
          tieneAlergias: dto.tieneAlergias,
          alergiasCifrado: dto.alergias?.trim()
            ? new Uint8Array(this.cifrado.cifrar(dto.alergias.trim()))
            : null,
        },
      });

      const expediente = await tx.expediente.create({
        data: {
          pacienteId: paciente.id,
          numeroCifrado: new Uint8Array(this.cifrado.cifrar(numero)),
          numeroIndice: new Uint8Array(numeroIndice),
        },
      });

      /**
       * El estado con el que nace el expediente en el archivo.
       *
       * Viene de papel  -> PENDIENTE: existe una carpeta y nadie la ha
       *                    transcrito todavia. Antes nacia EN_PROCESO, y eso
       *                    hacia que "en proceso" no significara nada: TODO lo
       *                    que faltaba figuraba como empezado desde el primer
       *                    minuto, aunque nadie lo hubiera abierto, y
       *                    "pendiente" era un estado que el sistema no producia
       *                    jamas.
       * No viene de papel -> COMPLETO: es un paciente que se registra hoy y no
       *                    hay ninguna hoja vieja que pasar al sistema.
       *
       * A EN_PROCESO se pasa solo, al transcribir la primera ficha de la
       * carpeta. Eso el sistema SI lo sabe.
       */
      await tx.registroDigitalizacion.create({
        data: {
          expedienteId: expediente.id,
          estado: dto.digitalizado ? 'PENDIENTE' : 'COMPLETO',
          digitalizadoPor: null,
          iniciadoEn: null,
          completadoEn: dto.digitalizado ? null : new Date(),
        },
      });

      // El evento NO lleva DPI ni nombre: el bus no es un canal cifrado por
      // campo y los indicadores no necesitan identificar a la persona.
      await this.outbox.registrar(
        tx,
        Evento.PACIENTE_CREADO,
        {
          pacienteId: paciente.id,
          comunidadId: paciente.comunidadId,
          sexo: paciente.sexo,
          anioNacimiento: paciente.fechaNacimiento.getFullYear(),
          registradoPor: usuarioId,
        },
        trazaId,
      );

      return { id: paciente.id, numeroExpediente: numero, expedienteId: expediente.id };
    });
  }

  /**
   * Corregir los datos de un paciente.
   *
   * **Queda en la bitacora, con el antes y el despues.** Corregir el nombre de
   * una persona en su expediente no es lo mismo que corregir un dato de
   * inventario: si manana el nombre no coincide con el del DPI, la unica forma
   * de saber quien lo cambio y que decia antes es que este escrito. Por eso la
   * auditoria de MODIFICACION es obligatoria —si trazabilidad no responde, el
   * cambio NO se guarda— y no una anotacion de cortesia.
   *
   * Lo que NO se deja cambiar aqui: DPI, fecha de nacimiento y sexo. Un error
   * en esos tres no es una correccion de tecleo, es otra persona; se resuelve
   * dando de baja el registro equivocado, no editandolo encima.
   */
  async actualizar(id: string, dto: ActualizarPacienteDto, contexto: ContextoAuditoria) {
    // Se traen los nombres actuales, no solo el id: si cambia uno solo de los
    // dos campos, el texto de busqueda debe recalcularse con AMBOS valores
    // finales. Recalcularlo con la mitad dejaria al paciente inencontrable.
    const actual = await this.prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        idioma: true,
        comunidadId: true,
        grupoFamiliarId: true,
        telefono: true,
        fallecido: true,
      },
    });
    if (!actual) {
      throw new NotFoundException('No existe ese paciente.');
    }
    if (dto.comunidadId && !(await this.prisma.comunidad.findUnique({ where: { id: dto.comunidadId } }))) {
      throw new BadRequestException('La comunidad indicada no existe.');
    }

    await this.prisma.paciente.update({
      where: { id },
      data: {
        ...(dto.nombres !== undefined ? { nombres: dto.nombres.trim() } : {}),
        ...(dto.apellidos !== undefined ? { apellidos: dto.apellidos.trim() } : {}),
        ...(dto.idioma !== undefined ? { idioma: dto.idioma } : {}),
        ...(dto.comunidadId !== undefined ? { comunidadId: dto.comunidadId } : {}),
        ...(dto.grupoFamiliarId !== undefined ? { grupoFamiliarId: dto.grupoFamiliarId } : {}),
        ...(dto.telefono !== undefined ? { telefono: dto.telefono.trim() } : {}),
        ...(dto.fallecido !== undefined ? { fallecido: dto.fallecido } : {}),
        ...(dto.nombres !== undefined || dto.apellidos !== undefined
          ? {
              nombreBusqueda: textoDeBusqueda(
                dto.apellidos ?? actual.apellidos,
                dto.nombres ?? actual.nombres,
              ),
            }
          : {}),
      },
    });

    // Solo los campos que de verdad cambiaron: guardar el registro entero
    // llenaria la bitacora de ruido y escondería el cambio que importa.
    const cambios: Record<string, { antes: unknown; despues: unknown }> = {};
    for (const campo of [
      'nombres',
      'apellidos',
      'idioma',
      'comunidadId',
      'grupoFamiliarId',
      'telefono',
      'fallecido',
    ] as const) {
      const nuevo = dto[campo];
      if (nuevo !== undefined && nuevo !== actual[campo]) {
        cambios[campo] = { antes: actual[campo], despues: nuevo };
      }
    }

    await this.auditoria.registrar(
      {
        servicio: 'usuarios',
        accion: 'MODIFICACION',
        entidad: 'paciente',
        entidadId: id,
        valorAnterior: JSON.stringify(
          Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, v.antes])),
        ),
        valorNuevo: JSON.stringify(
          Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, v.despues])),
        ),
      },
      contexto.autorizacion,
      contexto.trazaId,
    );

    return this.obtener(id);
  }

  /**
   * Dar de baja a un paciente registrado por error.
   *
   * **Solo si no tiene nada clinico encima.** Un paciente al que ya se
   * atendio, se vacuno o se le abrio una ficha NO se borra: eso es un
   * expediente medico, y un expediente medico no se tira aunque el nombre
   * este mal escrito. Para ese caso existe `actualizar`, o marcarlo como
   * fallecido. Lo que esta funcion resuelve es lo otro: el registro duplicado
   * o el que se creo con los datos de la persona equivocada y todavia no
   * tiene nada dentro.
   *
   * El servidor lo comprueba, no la pantalla. La pantalla puede esconder el
   * boton; solo el servidor puede impedir que la peticion llegue a la base.
   *
   * **Queda en la bitacora antes de borrar nada.** La auditoria de ELIMINACION
   * es de las que no se pueden saltar: si trazabilidad no responde, el borrado
   * no ocurre. Un borrado sin rastro es exactamente lo que la bitacora existe
   * para impedir.
   */
  async eliminar(id: string, contexto: ContextoAuditoria) {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        fechaNacimiento: true,
        comunidadId: true,
        expediente: { select: { id: true, _count: { select: { atenciones: true } } } },
        _count: {
          select: {
            visitas: true,
            vacunas: true,
            micronutrientes: true,
            antecedentes: true,
          },
        },
      },
    });
    if (!paciente) {
      throw new NotFoundException('No existe ese paciente.');
    }

    const atenciones = paciente.expediente?._count.atenciones ?? 0;
    const rastro = [
      ['atenciones', atenciones],
      ['visitas', paciente._count.visitas],
      ['vacunas', paciente._count.vacunas],
      ['entregas de micronutrientes', paciente._count.micronutrientes],
      ['antecedentes', paciente._count.antecedentes],
    ].filter(([, n]) => (n as number) > 0);

    if (rastro.length > 0) {
      const detalle = rastro.map(([que, n]) => `${n} ${que}`).join(', ');
      throw new ConflictException(
        `Este paciente ya tiene historial clinico (${detalle}) y no se puede borrar. ` +
          'Si los datos estan mal, corrijalos; si la persona fallecio, marquela como fallecida.',
      );
    }

    await this.auditoria.registrar(
      {
        servicio: 'usuarios',
        accion: 'ELIMINACION',
        entidad: 'paciente',
        entidadId: id,
        valorAnterior: JSON.stringify({
          nombres: paciente.nombres,
          apellidos: paciente.apellidos,
          fechaNacimiento: paciente.fechaNacimiento.toISOString().slice(0, 10),
          comunidadId: paciente.comunidadId,
          // El numero de expediente va cifrado en la base; el id basta para
          // rastrearlo y no obliga a descifrar solo para auditar.
          expedienteId: paciente.expediente?.id ?? null,
        }),
      },
      contexto.autorizacion,
      contexto.trazaId,
    );

    // El expediente y su registro de digitalizacion van primero: cuelgan del
    // paciente y la base no deja dejar huerfanos.
    await this.prisma.$transaction(async (tx) => {
      if (paciente.expediente) {
        await tx.registroDigitalizacion.deleteMany({
          where: { expedienteId: paciente.expediente.id },
        });
        await tx.expediente.delete({ where: { id: paciente.expediente.id } });
      }
      await tx.paciente.delete({ where: { id } });
    });

    return { id, borrado: true };
  }

  /**
   * Correlativo del expediente. Usa una secuencia de PostgreSQL y no
   * MAX(numero) + 1 por dos motivos: el numero esta cifrado, asi que no se
   * puede calcular un maximo sobre el; y dos altas simultaneas darian el mismo
   * numero.
   */
  private async siguienteNumeroExpediente(): Promise<string> {
    const filas = await this.prisma.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('usuarios.expediente_correlativo') AS nextval
    `;
    const n = Number(filas[0].nextval);
    return 'EXP-' + new Date().getFullYear() + '-' + String(n).padStart(6, '0');
  }

  private aResumen(p: FilaResumen) {
    return {
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      fechaNacimiento: p.fechaNacimiento,
      edad: PacientesService.edad(p.fechaNacimiento),
      sexo: p.sexo,
      idioma: p.idioma,
      fallecido: p.fallecido,
      comunidad: p.comunidad,
      expediente: p.expediente
        ? {
            id: p.expediente.id,
            numero: this.cifrado.descifrar(Buffer.from(p.expediente.numeroCifrado)),
          }
        : null,
    };
  }

  static edad(fechaNacimiento: Date): number {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const mes = hoy.getMonth() - fechaNacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;
    return edad;
  }
}
