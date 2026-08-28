import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  crearPagina,
  normalizarPagina,
  Pagina,
  palabrasDeBusqueda,
  ServicioCifrado,
  textoDeBusqueda,
} from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
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
        grupoFamiliar: { select: { id: true, codigo: true } },
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

    const dpiIndice = dto.dpi ? this.cifrado.indiceCiego(dto.dpi) : null;

    if (dpiIndice) {
      const existe = await this.prisma.paciente.findUnique({
        where: { dpiIndice: new Uint8Array(dpiIndice) },
        select: { id: true },
      });
      if (existe) {
        // El id va en detalles y no como campo suelto: el formato de error es
        // uno solo en los ocho servicios, y el frontend lo usa para ofrecer
        // "abrir el expediente existente" en vez de dejar al usuario atascado.
        throw new ConflictException({
          mensaje: 'Ya existe un paciente registrado con ese DPI.',
          detalles: ['pacienteId:' + existe.id],
        });
      }
    }

    const numero = dto.numeroExpediente?.trim() || (await this.siguienteNumeroExpediente());
    const numeroIndice = this.cifrado.indiceCiego(numero);

    if (
      await this.prisma.expediente.findUnique({
        where: { numeroIndice: new Uint8Array(numeroIndice) },
        select: { id: true },
      })
    ) {
      throw new ConflictException('Ya existe un expediente con ese numero.');
    }

    return this.prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.create({
        data: {
          dpiCifrado: dto.dpi ? new Uint8Array(this.cifrado.cifrar(dto.dpi)) : null,
          dpiIndice: dpiIndice ? new Uint8Array(dpiIndice) : null,
          nombres: dto.nombres.trim(),
          apellidos: dto.apellidos.trim(),
          nombreBusqueda: textoDeBusqueda(dto.apellidos, dto.nombres),
          fechaNacimiento: dto.fechaNacimiento,
          sexo: dto.sexo,
          idioma: dto.idioma ?? 'ESPANOL',
          comunidadId: dto.comunidadId,
          grupoFamiliarId: dto.grupoFamiliarId,
          telefono: dto.telefono?.trim(),
          lugarId: dto.lugarId,
          migrante: dto.migrante ?? false,
          lugarOrigen: dto.lugarOrigen?.trim(),
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

  async actualizar(id: string, dto: ActualizarPacienteDto) {
    // Se traen los nombres actuales, no solo el id: si cambia uno solo de los
    // dos campos, el texto de busqueda debe recalcularse con AMBOS valores
    // finales. Recalcularlo con la mitad dejaria al paciente inencontrable.
    const actual = await this.prisma.paciente.findUnique({
      where: { id },
      select: { id: true, nombres: true, apellidos: true },
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

    return this.obtener(id);
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
