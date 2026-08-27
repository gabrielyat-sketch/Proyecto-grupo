import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { crearPagina, normalizarPagina, Pagina, ServicioCifrado, UsuarioAutenticado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';
import { Prisma, Registro } from '../../generado';
import {
  calcularHash,
  ContenidoRegistro,
  HASH_GENESIS,
  RegistroVerificable,
  ResultadoVerificacion,
  verificarCadena,
} from '../dominio/cadena';
import { RegistrarRegistroDto } from './dto/registrar-registro.dto';
import { ConsultarRegistrosDto } from './dto/consultar-registros.dto';

/**
 * Cerrojo consultivo que serializa las inserciones en la cadena.
 *
 * El numero es arbitrario pero fijo: identifica "la cadena de trazabilidad"
 * dentro del espacio de cerrojos de PostgreSQL. Se eligio el puerto del
 * servicio para que sea reconocible en `pg_locks` cuando alguien depure.
 */
const CERROJO_CADENA = 3007n;

/** Registro con sus valores ya descifrados, tal como sale de la API. */
export interface RegistroVisible extends Omit<Registro, 'numero' | 'valorAnterior' | 'valorNuevo'> {
  numero: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

@Injectable()
export class RegistrosService {
  private readonly logger = new Logger(RegistrosService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Agrega una entrada a la bitacora y la encadena a la anterior.
   *
   * ───────────────────────────────────────────────────────────────────────
   *  POR QUE UN CERROJO CONSULTIVO Y NO `SELECT ... FOR UPDATE`
   * ───────────────────────────────────────────────────────────────────────
   * Dos inserciones simultaneas pueden leer el mismo "ultimo registro" y
   * calcular ambas su hash sobre el mismo previo. La segunda en llegar
   * bifurcaria la cadena.
   *
   * Lo natural seria bloquear la ultima fila con `SELECT ... FOR UPDATE`, y
   * NO SE PUEDE: en PostgreSQL ese bloqueo exige privilegio UPDATE, que es
   * precisamente el que `cap_trazabilidad` no tiene y no debe tener. La
   * restriccion que protege la bitacora descarta la solucion habitual.
   *
   * `pg_advisory_xact_lock` no depende de permisos sobre la tabla, se toma
   * dentro de la transaccion y lo suelta PostgreSQL al terminarla, haya
   * commit o rollback. Nadie puede olvidarse de liberarlo.
   *
   * Y como segunda linea de defensa, `hash_previo` es UNIQUE: si alguna vez
   * el cerrojo fallara, la bifurcacion la rechaza la base de datos, no la
   * aplicacion.
   */
  async registrar(
    dto: RegistrarRegistroDto,
    usuario: UsuarioAutenticado,
    trazaId: string,
  ): Promise<RegistroVisible> {
    const registradoEn = new Date();
    const ocurridoEn = dto.ocurridoEn ? new Date(dto.ocurridoEn) : registradoEn;

    // new Uint8Array(...) y no el Buffer directo: Prisma tipa las columnas
    // Bytes como Uint8Array<ArrayBuffer>, y Buffer no encaja ahi. Mismo
    // tratamiento que en el servicio usuarios.
    const valorAnterior = dto.valorAnterior ? new Uint8Array(this.cifrado.cifrar(dto.valorAnterior)) : null;
    const valorNuevo = dto.valorNuevo ? new Uint8Array(this.cifrado.cifrar(dto.valorNuevo)) : null;

    const contenido: ContenidoRegistro = {
      servicio: dto.servicio,
      accion: dto.accion,
      entidad: dto.entidad,
      entidadId: dto.entidadId,
      usuarioId: usuario.id,
      usuarioRol: usuario.rol,
      motivo: dto.motivo ?? null,
      valorAnterior: valorAnterior ? Buffer.from(valorAnterior).toString('base64') : null,
      valorNuevo: valorNuevo ? Buffer.from(valorNuevo).toString('base64') : null,
      trazaId,
      ip: dto.ip ?? null,
      ocurridoEn,
      registradoEn,
    };

    try {
      const creado = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CERROJO_CADENA})`;

        const ultimo = await tx.registro.findFirst({
          orderBy: { numero: 'desc' },
          select: { hash: true },
        });
        const hashPrevio = ultimo?.hash ?? HASH_GENESIS;

        return tx.registro.create({
          data: {
            hashPrevio,
            hash: calcularHash(hashPrevio, contenido),
            servicio: contenido.servicio,
            accion: dto.accion,
            entidad: contenido.entidad,
            entidadId: contenido.entidadId,
            usuarioId: contenido.usuarioId,
            usuarioRol: contenido.usuarioRol,
            motivo: contenido.motivo,
            valorAnterior,
            valorNuevo,
            trazaId: contenido.trazaId,
            ip: contenido.ip,
            ocurridoEn,
            registradoEn,
          },
        });
      });

      return this.aVisible(creado);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Colision de hash_previo o de hash: dos entradas quisieron ocupar el
        // mismo eslabon. Con el cerrojo no deberia ocurrir nunca; si ocurre,
        // es una senal de que algo escribe en la tabla sin pasar por aqui.
        this.logger.error('Intento de bifurcacion de la cadena rechazado por la base de datos.');
        throw new ConflictException(
          'No se pudo encadenar el registro: otra escritura ocupo el mismo eslabon. Reintente.',
        );
      }
      throw e;
    }
  }

  /** Consulta paginada de la bitacora. */
  async consultar(filtros: ConsultarRegistrosDto): Promise<Pagina<RegistroVisible>> {
    const { tamano, saltar } = normalizarPagina(filtros);

    const where: Prisma.RegistroWhereInput = {
      servicio: filtros.servicio,
      accion: filtros.accion,
      entidad: filtros.entidad,
      entidadId: filtros.entidadId,
      usuarioId: filtros.usuarioId,
      registradoEn:
        filtros.desde || filtros.hasta
          ? {
              gte: filtros.desde ? new Date(filtros.desde) : undefined,
              lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
            }
          : undefined,
    };

    const [registros, total] = await this.prisma.$transaction([
      this.prisma.registro.findMany({ where, skip: saltar, take: tamano, orderBy: { numero: 'desc' } }),
      this.prisma.registro.count({ where }),
    ]);

    return crearPagina(
      registros.map((r) => this.aVisible(r)),
      total,
      filtros,
    );
  }

  /**
   * Recorre la cadena completa y devuelve si esta intacta.
   *
   * Se lee por lotes: la bitacora es la tabla que mas crece del sistema, y
   * cargarla entera en memoria para verificarla dejaria de funcionar
   * exactamente cuando haya suficiente historia como para que importe.
   *
   * `rotoEn` sale como texto y no como BigInt. JSON.stringify no sabe
   * serializar un BigInt: lanza. Devolverlo tal cual hacia fallar la respuesta
   * SOLO cuando la cadena estaba rota — es decir, el unico caso en el que este
   * endpoint sirve para algo.
   */
  async verificar(tamanoLote = 1000): Promise<Omit<ResultadoVerificacion, 'rotoEn'> & { rotoEn?: string }> {
    let desde = 0n;
    let esperado = HASH_GENESIS;
    let revisados = 0;

    for (;;) {
      const lote = await this.prisma.registro.findMany({
        where: { numero: { gt: desde } },
        orderBy: { numero: 'asc' },
        take: tamanoLote,
      });
      if (lote.length === 0) break;

      const resultado = verificarCadena(
        lote.map((r) => this.aVerificable(r)),
        esperado,
      );

      if (!resultado.intacta) {
        return {
          ...resultado,
          revisados: revisados + resultado.revisados,
          rotoEn: resultado.rotoEn?.toString(),
        };
      }

      revisados += lote.length;
      esperado = lote[lote.length - 1].hash;
      desde = lote[lote.length - 1].numero;
    }

    return { intacta: true, revisados };
  }

  private aVerificable(r: Registro): RegistroVerificable {
    return {
      numero: r.numero,
      hashPrevio: r.hashPrevio,
      hash: r.hash,
      servicio: r.servicio,
      accion: r.accion,
      entidad: r.entidad,
      entidadId: r.entidadId,
      usuarioId: r.usuarioId,
      usuarioRol: r.usuarioRol,
      motivo: r.motivo,
      valorAnterior: r.valorAnterior ? Buffer.from(r.valorAnterior).toString('base64') : null,
      valorNuevo: r.valorNuevo ? Buffer.from(r.valorNuevo).toString('base64') : null,
      trazaId: r.trazaId,
      ip: r.ip,
      ocurridoEn: r.ocurridoEn,
      registradoEn: r.registradoEn,
    };
  }

  /** BigInt no sobrevive a JSON.stringify; el numero sale como texto. */
  private aVisible(r: Registro): RegistroVisible {
    return {
      ...r,
      numero: r.numero.toString(),
      valorAnterior: r.valorAnterior ? this.cifrado.descifrar(Buffer.from(r.valorAnterior)) : null,
      valorNuevo: r.valorNuevo ? this.cifrado.descifrar(Buffer.from(r.valorNuevo)) : null,
    };
  }
}
