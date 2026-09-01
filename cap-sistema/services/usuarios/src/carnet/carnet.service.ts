import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import {
  CarnetDto,
  CatalogoCarnetDto,
  CrecimientoDto,
  GuardarCarnetDto,
  PuntoCrecimientoDto,
  TendenciaPesoDto,
  type AbastecimientoAguaDto,
  type DisposicionExcretasDto,
  type EscolaridadMadreDto,
  type TramoEdadDto,
} from './dto/carnet.dto';

type Cifrado = Uint8Array | Buffer | null;

/** Un kilo son 2.2046 libras. La conversion vive en un solo sitio. */
const KILOS_POR_LIBRA = 0.45359237;

/**
 * La leyenda del papel, aplicada.
 *
 * Compara contra el control ANTERIOR, no contra una curva: "no crece bien,
 * pierde peso" y "no crece bien, no gano peso" son las dos formas de dejar de
 * crecer, y las dos se ven en la pendiente entre dos puntos.
 *
 * Las bandas de referencia del formulario todavia no estan: sus curvas son un
 * escaneo y de una foto no salen valores. Cuando el CAP o el MSPAS den la tabla
 * de peso para edad, se anaden SIN tocar esto, que es una lectura distinta.
 */
function tendenciaDe(diferencia: number | null): TendenciaPesoDto {
  if (diferencia === null) return TendenciaPesoDto.SIN_ANTERIOR;
  if (diferencia > 0) return TendenciaPesoDto.CRECE_BIEN;
  if (diferencia < 0) return TendenciaPesoDto.PERDIO;
  return TendenciaPesoDto.NO_GANO;
}


/**
 * El carnet del lactante y la ninez: las paginas 1 y 2 de su ficha.
 *
 * Nada de esto cuelga de una atencion. Son datos del NINO que se llenan a lo
 * largo de anos —un nino de cuatro tiene dosis puestas en diez visitas— y
 * guardarlos por consulta los perderia o los obligaria a recapturarse cada vez.
 *
 * Ver `docs/diseno-ficha-ninez.md`.
 */
@Injectable()
export class CarnetService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  private cifrar(valor: string | undefined): Uint8Array<ArrayBuffer> | null {
    return valor === undefined || valor.trim() === ''
      ? null
      : new Uint8Array(this.cifrado.cifrar(valor.trim()));
  }

  private descifrar(valor: Cifrado): string | null {
    return valor ? this.cifrado.descifrar(Buffer.from(valor)) : null;
  }

  /**
   * Una fecha de la base como `aaaa-mm-dd`.
   *
   * Sin pasar por la zona horaria del proceso: la columna es `DATE` y en
   * Guatemala —UTC-6— convertirla a instante y volver la correria un dia.
   */
  private comoFecha(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /**
   * Meses cumplidos entre dos fechas.
   *
   * La ficha pide la edad al lado de cada dosis. NO se guarda: se calcula, y
   * asi no puede contradecir a la fecha de nacimiento.
   */
  private mesesCumplidos(nacimiento: Date, referencia: Date): number {
    const meses =
      (referencia.getUTCFullYear() - nacimiento.getUTCFullYear()) * 12 +
      (referencia.getUTCMonth() - nacimiento.getUTCMonth());
    return Math.max(0, referencia.getUTCDate() < nacimiento.getUTCDate() ? meses - 1 : meses);
  }

  /**
   * El esquema impreso: que vacunas hay y que dosis aplican a cada una.
   *
   * No lleva dato de ningun paciente, asi que la pantalla lo puede guardar en
   * cache mucho tiempo: solo cambia cuando el MSPAS reimprime el formulario.
   */
  async catalogo(): Promise<CatalogoCarnetDto> {
    const [vacunas, micronutrientes] = await Promise.all([
      this.prisma.catalogoVacuna.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          orden: true,
          nombre: true,
          dosis: {
            orderBy: { orden: 'asc' },
            select: { orden: true, edadRecomendada: true },
          },
        },
      }),
      this.prisma.catalogoMicronutriente.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          orden: true,
          nombre: true,
          esperadas: {
            orderBy: [{ tramo: 'asc' }, { orden: 'asc' }],
            select: { tramo: true, orden: true },
          },
        },
      }),
    ]);

    if (vacunas.length === 0) {
      throw new NotFoundException(
        'El carnet no tiene catalogo cargado. Se siembra con: npm run carnet:ninez -w @cap/usuarios',
      );
    }

    return {
      vacunas: vacunas.map((v) => ({
        ...v,
        dosis: v.dosis.map((d) => ({ orden: d.orden, edadRecomendada: d.edadRecomendada })),
      })),
      micronutrientes: micronutrientes.map((m) => ({
        ...m,
        esperadas: m.esperadas.map((e) => ({ tramo: e.tramo as TramoEdadDto, orden: e.orden })),
      })),
    };
  }

  /** El carnet de un nino: lo que ya se le anoto. */
  async obtener(pacienteId: string): Promise<CarnetDto> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true, fechaNacimiento: true, grupoFamiliarId: true },
    });
    if (!paciente) throw new NotFoundException('El paciente no existe.');

    const [vacunas, micronutrientes, datos, hogar] = await Promise.all([
      this.prisma.vacunaAplicada.findMany({
        where: { pacienteId },
        orderBy: [{ vacunaId: 'asc' }, { orden: 'asc' }],
        select: { vacunaId: true, orden: true, fecha: true },
      }),
      this.prisma.micronutrienteEntregado.findMany({
        where: { pacienteId },
        orderBy: [{ micronutrienteId: 'asc' }, { tramo: 'asc' }, { orden: 'asc' }],
        select: { micronutrienteId: true, tramo: true, orden: true, fecha: true },
      }),
      this.prisma.datosNinezPaciente.findUnique({ where: { pacienteId } }),
      paciente.grupoFamiliarId
        ? this.prisma.datosDelHogar.findUnique({
            where: { grupoFamiliarId: paciente.grupoFamiliarId },
          })
        : null,
    ]);

    const nacimiento = paciente.fechaNacimiento;

    return {
      pacienteId,
      edadEnMeses: nacimiento ? this.mesesCumplidos(nacimiento, new Date()) : null,
      vacunas: vacunas.map((v) => ({
        vacunaId: v.vacunaId,
        orden: v.orden,
        fecha: this.comoFecha(v.fecha),
        edadEnMeses: nacimiento ? this.mesesCumplidos(nacimiento, v.fecha) : null,
      })),
      micronutrientes: micronutrientes.map((m) => ({
        micronutrienteId: m.micronutrienteId,
        tramo: m.tramo as TramoEdadDto,
        orden: m.orden,
        fecha: this.comoFecha(m.fecha),
      })),
      datos: datos
        ? {
            lugarNacimiento: datos.lugarNacimiento,
            acompananteNombre: this.descifrar(datos.acompananteNombreCifrado),
            madreNombre: this.descifrar(datos.madreNombreCifrado),
            madreEdad: datos.madreEdad,
            madreOcupacion: this.descifrar(datos.madreOcupacionCifrado),
            madreSabeLeer: datos.madreSabeLeer,
            madreEscolaridad: datos.madreEscolaridad as EscolaridadMadreDto | null,
            padreNombre: this.descifrar(datos.padreNombreCifrado),
            padreEdad: datos.padreEdad,
            padreOcupacion: this.descifrar(datos.padreOcupacionCifrado),
            padreSabeLeer: datos.padreSabeLeer,
            hijosTotal: datos.hijosTotal,
            hijosVivos: datos.hijosVivos,
            hijosMuertos: datos.hijosMuertos,
          }
        : null,
      hogar: hogar
        ? {
            agua: hogar.agua as AbastecimientoAguaDto | null,
            aguaOtro: hogar.aguaOtro,
            excretas: hogar.excretas as DisposicionExcretasDto | null,
          }
        : null,
    };
  }

  /**
   * Guarda lo que venga y deja lo demas como estaba.
   *
   * Todo en UNA transaccion: un carnet guardado a medias —con las vacunas pero
   * sin los micronutrientes— es peor que uno no guardado, porque parece
   * completo cuando alguien lo lea despues.
   */
  async guardar(
    pacienteId: string,
    dto: GuardarCarnetDto,
    usuarioId: string,
  ): Promise<CarnetDto> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true, comunidadId: true, grupoFamiliarId: true },
    });
    if (!paciente) throw new NotFoundException('El paciente no existe.');

    await this.validarContraCatalogo(dto);

    await this.prisma.$transaction(async (tx) => {
      // ── Las dosis puestas ────────────────────────────────────────────
      for (const v of dto.vacunas ?? []) {
        const donde = {
          pacienteId_vacunaId_orden: { pacienteId, vacunaId: v.vacunaId, orden: v.orden },
        };
        // fecha en null BORRA: es como se corrige una casilla mal anotada,
        // que en el papel se hace tachando.
        if (v.fecha === null || v.fecha === undefined) {
          await tx.vacunaAplicada.deleteMany({
            where: { pacienteId, vacunaId: v.vacunaId, orden: v.orden },
          });
          continue;
        }
        const fecha = new Date(v.fecha);
        await tx.vacunaAplicada.upsert({
          where: donde,
          create: {
            pacienteId,
            vacunaId: v.vacunaId,
            orden: v.orden,
            fecha,
            registradoPor: usuarioId,
          },
          update: { fecha, registradoPor: usuarioId },
        });
      }

      // ── Las entregas hechas ──────────────────────────────────────────
      for (const m of dto.micronutrientes ?? []) {
        if (m.fecha === null || m.fecha === undefined) {
          await tx.micronutrienteEntregado.deleteMany({
            where: {
              pacienteId,
              micronutrienteId: m.micronutrienteId,
              tramo: m.tramo,
              orden: m.orden,
            },
          });
          continue;
        }
        const fecha = new Date(m.fecha);
        await tx.micronutrienteEntregado.upsert({
          where: {
            pacienteId_micronutrienteId_tramo_orden: {
              pacienteId,
              micronutrienteId: m.micronutrienteId,
              tramo: m.tramo,
              orden: m.orden,
            },
          },
          create: {
            pacienteId,
            micronutrienteId: m.micronutrienteId,
            tramo: m.tramo,
            orden: m.orden,
            fecha,
            registradoPor: usuarioId,
          },
          update: { fecha, registradoPor: usuarioId },
        });
      }

      // ── Los padres y el lugar de nacimiento ──────────────────────────
      const d = dto.datos;
      if (d) {
        const campos = {
          ...(d.lugarNacimiento !== undefined
            ? { lugarNacimiento: d.lugarNacimiento.trim() || null }
            : {}),
          ...(d.acompananteNombre !== undefined
            ? { acompananteNombreCifrado: this.cifrar(d.acompananteNombre) }
            : {}),
          ...(d.madreNombre !== undefined
            ? { madreNombreCifrado: this.cifrar(d.madreNombre) }
            : {}),
          ...(d.madreEdad !== undefined ? { madreEdad: d.madreEdad } : {}),
          ...(d.madreOcupacion !== undefined
            ? { madreOcupacionCifrado: this.cifrar(d.madreOcupacion) }
            : {}),
          ...(d.madreSabeLeer !== undefined ? { madreSabeLeer: d.madreSabeLeer } : {}),
          ...(d.madreEscolaridad !== undefined ? { madreEscolaridad: d.madreEscolaridad } : {}),
          ...(d.padreNombre !== undefined
            ? { padreNombreCifrado: this.cifrar(d.padreNombre) }
            : {}),
          ...(d.padreEdad !== undefined ? { padreEdad: d.padreEdad } : {}),
          ...(d.padreOcupacion !== undefined
            ? { padreOcupacionCifrado: this.cifrar(d.padreOcupacion) }
            : {}),
          ...(d.padreSabeLeer !== undefined ? { padreSabeLeer: d.padreSabeLeer } : {}),
          ...(d.hijosTotal !== undefined ? { hijosTotal: d.hijosTotal } : {}),
          ...(d.hijosVivos !== undefined ? { hijosVivos: d.hijosVivos } : {}),
          ...(d.hijosMuertos !== undefined ? { hijosMuertos: d.hijosMuertos } : {}),
        };

        await tx.datosNinezPaciente.upsert({
          where: { pacienteId },
          create: { pacienteId, registradoPor: usuarioId, ...campos },
          update: { registradoPor: usuarioId, ...campos },
        });
      }

      // ── El agua y las excretas, que son de la CASA ───────────────────
      const h = dto.hogar;
      if (h) {
        /*
          La carpeta tiene que existir; aqui ya no se crea sola.

          Antes se creaba al vuelo, con un codigo inventado a partir del id del
          paciente, porque no habia ninguna pantalla que abriera carpetas y sin
          eso la seccion del hogar no habria servido para nada.

          Ahora recepcion las abre, y el numero de la carpeta es el que esta
          escrito en la pestana del folder del archivero. Que el sistema
          inventara uno al guardar el agua y las excretas pondria un numero que
          no existe en ningun archivero, y el dia que alguien busque el folder
          fisico no va a estar. Mas vale pedirla que fabricarla.
        */
        const grupoId = paciente.grupoFamiliarId;
        if (!grupoId) {
          throw new BadRequestException(
            'Para guardar los datos del hogar hay que asignarle antes una carpeta familiar a este paciente.',
          );
        }

        const campos = {
          ...(h.agua !== undefined ? { agua: h.agua } : {}),
          ...(h.aguaOtro !== undefined ? { aguaOtro: h.aguaOtro.trim() || null } : {}),
          ...(h.excretas !== undefined ? { excretas: h.excretas } : {}),
        };

        await tx.datosDelHogar.upsert({
          where: { grupoFamiliarId: grupoId },
          create: { grupoFamiliarId: grupoId, registradoPor: usuarioId, ...campos },
          update: { registradoPor: usuarioId, ...campos },
        });
      }
    });

    return this.obtener(pacienteId);
  }


  /**
   * La serie de pesos para la grafica de peso para edad.
   *
   * **No se captura nada nuevo: se dibuja con lo que ya hay.** Cada atencion
   * guarda el peso, y la grafica son esos pesos puestos en el tiempo. Es de las
   * pocas partes del sistema donde lo digital hace algo que el papel no puede.
   *
   * Va en su propio endpoint y no reutiliza el historial de atenciones porque
   * ese descifra motivo, diagnostico y tratamiento de cada visita. Para dibujar
   * una grafica no hace falta nada de eso, y descifrar el expediente entero
   * para sacar una linea es pagar caro y exponer de mas.
   *
   * El peso se guarda en KILOS —es la columna que alimenta los indicadores de
   * desnutricion— y aqui sale en LIBRAS, que es como el papel dibuja la
   * grafica y como el personal lo lee.
   */
  async crecimiento(pacienteId: string): Promise<CrecimientoDto> {
    const paciente = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { id: true, fechaNacimiento: true, expediente: { select: { id: true } } },
    });
    if (!paciente) throw new NotFoundException('El paciente no existe.');

    if (!paciente.expediente) return { pacienteId, puntos: [] };

    const pesos = await this.prisma.atencion.findMany({
      where: { expedienteId: paciente.expediente.id, pesoKg: { not: null } },
      orderBy: { fecha: 'asc' },
      select: { fecha: true, pesoKg: true },
    });

    const nacimiento = paciente.fechaNacimiento;
    const puntos: PuntoCrecimientoDto[] = [];
    let anterior: number | null = null;

    for (const p of pesos) {
      // `Decimal` de Prisma: se convierte una sola vez, aqui.
      const libras = Math.round((Number(p.pesoKg) / KILOS_POR_LIBRA) * 10) / 10;
      const diferencia =
        anterior === null ? null : Math.round((libras - anterior) * 10) / 10;

      puntos.push({
        fecha: this.comoFecha(p.fecha),
        pesoLibras: libras,
        edadEnMeses: nacimiento ? this.mesesCumplidos(nacimiento, p.fecha) : null,
        tendencia: tendenciaDe(diferencia),
        diferenciaLibras: diferencia,
      });
      anterior = libras;
    }

    return { pacienteId, puntos };
  }

  /**
   * Que la casilla exista en el papel.
   *
   * Sin esto se podria anotar una tercera dosis de BCG, que el formulario no
   * tiene: sus otras cuatro casillas estan sombreadas. Y un reporte de
   * cobertura contaria una dosis que nadie puso nunca.
   */
  private async validarContraCatalogo(dto: GuardarCarnetDto): Promise<void> {
    if (dto.vacunas?.length) {
      const ids = [...new Set(dto.vacunas.map((v) => v.vacunaId))];
      const permitidas = await this.prisma.dosisRecomendada.findMany({
        where: { vacunaId: { in: ids } },
        select: { vacunaId: true, orden: true, vacuna: { select: { nombre: true } } },
      });
      const llave = (vacunaId: string, orden: number) => vacunaId + '#' + orden;
      const validas = new Set(permitidas.map((p) => llave(p.vacunaId, p.orden)));

      for (const v of dto.vacunas) {
        if (!validas.has(llave(v.vacunaId, v.orden))) {
          const nombre = permitidas.find((p) => p.vacunaId === v.vacunaId)?.vacuna.nombre;
          throw new BadRequestException(
            nombre
              ? 'La dosis ' + v.orden + ' no existe para ' + nombre + ' en el formulario.'
              : 'La vacuna ' + v.vacunaId + ' no esta en el catalogo.',
          );
        }
      }
    }

    if (dto.micronutrientes?.length) {
      const ids = [...new Set(dto.micronutrientes.map((m) => m.micronutrienteId))];
      const permitidas = await this.prisma.entregaEsperada.findMany({
        where: { micronutrienteId: { in: ids } },
        select: {
          micronutrienteId: true,
          tramo: true,
          orden: true,
          micronutriente: { select: { nombre: true } },
        },
      });
      const llave = (id: string, tramo: string, orden: number) => id + '#' + tramo + '#' + orden;
      const validas = new Set(
        permitidas.map((p) => llave(p.micronutrienteId, p.tramo, p.orden)),
      );

      for (const m of dto.micronutrientes) {
        if (!validas.has(llave(m.micronutrienteId, m.tramo, m.orden))) {
          const nombre = permitidas.find(
            (p) => p.micronutrienteId === m.micronutrienteId,
          )?.micronutriente.nombre;
          throw new BadRequestException(
            nombre
              ? 'La entrega ' + m.orden + ' no existe para ' + nombre + ' en ese tramo de edad.'
              : 'El micronutriente ' + m.micronutrienteId + ' no esta en el catalogo.',
          );
        }
      }
    }
  }
}
