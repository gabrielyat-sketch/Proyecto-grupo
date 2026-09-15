import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { crearPagina, normalizarPagina, type Pagina, ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { EstadoDigitalizacion, Prisma } from '../../generado';
import { ConsultarColaDto } from './dto/consultar-cola.dto';
import {
  AvanceComunidadDto,
  ConteoPorEstadoDto,
  ExpedienteEnColaDto,
} from './dto/respuestas.dto';

/** Los dos estados que significan "todavia falta". */
const FALTANTES: EstadoDigitalizacion[] = ['PENDIENTE', 'EN_PROCESO'];

@Injectable()
export class DigitalizacionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Panel de avance de la digitalizacion (seccion 10 del plan).
   *
   * Se agrupa en la base de datos con un solo GROUP BY, no trayendo las filas
   * para contarlas en memoria: con 100,000 expedientes eso seria traer
   * 100,000 registros para calcular cuatro numeros.
   */
  async resumen() {
    const porEstado = await this.prisma.registroDigitalizacion.groupBy({
      by: ['estado'],
      _count: { _all: true },
    });

    const conteo: ConteoPorEstadoDto = {
      PENDIENTE: 0,
      EN_PROCESO: 0,
      COMPLETO: 0,
      NO_LOCALIZADO: 0,
    };
    for (const fila of porEstado) conteo[fila.estado] = fila._count._all;

    const total = Object.values(conteo).reduce((a, b) => a + b, 0);
    return {
      total,
      porEstado: conteo,
      porcentajeCompleto: total === 0 ? 0 : Math.round((conteo.COMPLETO / total) * 1000) / 10,
    };
  }

  /**
   * Avance por comunidad.
   *
   * Va en SQL directo porque Prisma no agrupa a traves de relaciones, y la
   * alternativa —traer los expedientes para contarlos en memoria— serian
   * 100,000 filas para calcular una tabla de veinte renglones.
   *
   * Ordenado por nombre y no por lo que falta: el archivo de papel se recorre
   * en un orden que decide el personal, no el sistema. Los numeros estan a la
   * vista para que elijan; adivinar su estrategia y reordenarles la lista solo
   * les haria buscar cada vez donde quedo la comunidad de ayer.
   */
  async porComunidad(): Promise<AvanceComunidadDto[]> {
    const filas = await this.prisma.$queryRaw<
      {
        comunidadId: string;
        nombre: string;
        distante: boolean;
        total: bigint;
        completos: bigint;
        faltantes: bigint;
        noLocalizados: bigint;
      }[]
    >`
      -- Se parte del CATALOGO de comunidades, no de los expedientes.
      --
      -- Antes la lista salia de agrupar los registros de digitalizacion, asi
      -- que una comunidad sin ninguna carpeta pendiente simplemente no existia
      -- en la pantalla. Eso cerraba un circulo: para llegar a los caserios hay
      -- que elegir «Caserios», y «Caserios» no aparecia hasta que alguien de un
      -- caserio estuviera ya en la cola. No se podia empezar.
      --
      -- El conteo se sigue calculando aparte, sobre registro_digitalizacion,
      -- que es la tabla pequena. Sacarlo con LEFT JOIN encadenado desde
      -- comunidad obligaria a recorrer el padron entero de pacientes para
      -- pintar una barra lateral.
      SELECT c.id                              AS "comunidadId",
             c.nombre                          AS "nombre",
             c.distante                        AS "distante",
             COALESCE(a.total, 0)              AS "total",
             COALESCE(a.completos, 0)          AS "completos",
             COALESCE(a.faltantes, 0)          AS "faltantes",
             COALESCE(a."noLocalizados", 0)    AS "noLocalizados"
      FROM usuarios.comunidad c
      LEFT JOIN (
        SELECT p.comunidad_id                                                  AS "comunidadId",
               count(*)                                                        AS "total",
               count(*) FILTER (WHERE r.estado = 'COMPLETO')                   AS "completos",
               count(*) FILTER (WHERE r.estado IN ('PENDIENTE','EN_PROCESO'))  AS "faltantes",
               count(*) FILTER (WHERE r.estado = 'NO_LOCALIZADO')              AS "noLocalizados"
        FROM usuarios.registro_digitalizacion r
        JOIN usuarios.expediente e ON e.id = r.expediente_id
        JOIN usuarios.paciente   p ON p.id = e.paciente_id
        GROUP BY p.comunidad_id
      ) a ON a."comunidadId" = c.id
      WHERE c.activa = true
      ORDER BY c.nombre
    `;

    return filas.map((f) => {
      const total = Number(f.total);
      const completos = Number(f.completos);
      return {
        comunidadId: f.comunidadId,
        nombre: f.nombre,
        distante: f.distante,
        total,
        completos,
        faltantes: Number(f.faltantes),
        noLocalizados: Number(f.noLocalizados),
        porcentajeCompleto: total === 0 ? 0 : Math.round((completos / total) * 1000) / 10,
      };
    });
  }

  /**
   * La cola de trabajo: que carpeta toca transcribir.
   *
   * Sin filtro de estado devuelve lo que FALTA —pendientes y en proceso—, que
   * es lo que se pregunta al sentarse a trabajar. Los completos y los no
   * localizados se piden a proposito, para revisarlos.
   *
   * El orden es por apellido dentro de la comunidad, que es como estan las
   * carpetas en el archivo: buscarlas en otro orden obligaria a recorrer el
   * cajon entero por cada expediente.
   */
  async cola(consulta: ConsultarColaDto): Promise<Pagina<ExpedienteEnColaDto>> {
    const { tamano, saltar } = normalizarPagina(consulta);

    const where: Prisma.RegistroDigitalizacionWhereInput = {
      estado: consulta.estado ? consulta.estado : { in: FALTANTES },
      ...(consulta.comunidadId || consulta.lugarId
        ? {
            expediente: {
              paciente: {
                ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
                ...(consulta.lugarId ? { lugarId: consulta.lugarId } : {}),
              },
            },
          }
        : {}),
    };

    const [total, filas] = await this.prisma.$transaction([
      this.prisma.registroDigitalizacion.count({ where }),
      this.prisma.registroDigitalizacion.findMany({
        where,
        skip: saltar,
        take: tamano,
        orderBy: { expediente: { paciente: { apellidos: 'asc' } } },
        select: {
          expedienteId: true,
          estado: true,
          atencionesTranscritas: true,
          iniciadoEn: true,
          observaciones: true,
          expediente: {
            select: {
              numeroCifrado: true,
              paciente: {
                select: {
                  id: true,
                  nombres: true,
                  apellidos: true,
                  fechaNacimiento: true,
                  sexo: true,
                  comunidad: { select: { nombre: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const datos = filas.map((f) => ({
      expedienteId: f.expedienteId,
      pacienteId: f.expediente.paciente.id,
      numero: this.cifrado.descifrar(Buffer.from(f.expediente.numeroCifrado)),
      nombres: f.expediente.paciente.nombres,
      apellidos: f.expediente.paciente.apellidos,
      edad: edadEnAnios(f.expediente.paciente.fechaNacimiento),
      sexo: f.expediente.paciente.sexo,
      comunidad: f.expediente.paciente.comunidad.nombre,
      estado: f.estado,
      atencionesTranscritas: f.atencionesTranscritas,
      iniciadoEn: f.iniciadoEn,
      observaciones: f.observaciones,
    }));

    return crearPagina(datos, total, consulta);
  }

  async actualizar(
    expedienteId: string,
    estado: EstadoDigitalizacion,
    usuarioId: string,
    observaciones?: string,
  ) {
    const registro = await this.prisma.registroDigitalizacion.findUnique({
      where: { expedienteId },
    });
    if (!registro) throw new NotFoundException('No existe ese expediente.');

    return this.prisma.registroDigitalizacion.update({
      where: { expedienteId },
      data: {
        estado,
        digitalizadoPor: usuarioId,
        observaciones: observaciones?.slice(0, 500),
        ...(estado === 'EN_PROCESO' && !registro.iniciadoEn ? { iniciadoEn: new Date() } : {}),
        ...(estado === 'COMPLETO' ? { completadoEn: new Date() } : {}),
      },
    });
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
