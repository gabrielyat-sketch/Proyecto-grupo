import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * La cadena de hash de la bitacora (arquitectura §9.5).
 *
 *     hash_n = SHA256( hash_(n-1) || contenido_n )
 *
 * Aqui no hay base de datos ni Nest a proposito: es la pieza que decide si la
 * bitacora vale como evidencia, y tiene que poder probarse y releerse sola. El
 * script `infra/scripts/verificar-cadena.ts` importa exactamente estas mismas
 * funciones; si la verificacion usara una copia del calculo, una divergencia
 * entre las dos pasaria desapercibida justo cuando importa.
 */

/** Hash previo del primer registro: no hay nada antes que el. */
export const HASH_GENESIS = '0'.repeat(64);

/** Contenido de un registro, tal como entra en el hash. */
export interface ContenidoRegistro {
  servicio: string;
  accion: string;
  entidad: string;
  entidadId: string;
  usuarioId: string;
  usuarioRol: string;
  motivo: string | null;
  /** Ya cifrados, en base64. Ver `contenidoCanonico` para el por que. */
  valorAnterior: string | null;
  valorNuevo: string | null;
  trazaId: string;
  ip: string | null;
  ocurridoEn: Date;
  registradoEn: Date;
}

/**
 * Serializacion canonica del contenido.
 *
 * Dos propiedades que no son negociables:
 *
 * 1. **Orden fijo y explicito.** Un `JSON.stringify` sobre un objeto depende
 *    del orden de insercion de las claves. Si alguien reordena los campos del
 *    modelo, todos los hashes cambiarian y la cadena entera quedaria "rota"
 *    sin que nadie hubiera tocado un dato. El arreglo posicional lo evita.
 *
 * 2. **Sobre el texto CIFRADO, no el claro.** `valorAnterior` y `valorNuevo`
 *    llegan aqui ya cifrados, tal como se guardan. Asi la verificacion de la
 *    cadena demuestra integridad sin necesitar LLAVE_DATOS: el CAP puede
 *    auditar la bitacora sin descifrar un solo dato de paciente.
 *
 * Las fechas van en ISO-8601 UTC con milisegundos, que es la precision con la
 * que Prisma las guarda y las devuelve. Con mas precision, el valor releido no
 * coincidiria con el escrito y la verificacion fallaria sobre datos intactos.
 */
export function contenidoCanonico(c: ContenidoRegistro): string {
  return JSON.stringify([
    c.servicio,
    c.accion,
    c.entidad,
    c.entidadId,
    c.usuarioId,
    c.usuarioRol,
    c.motivo,
    c.valorAnterior,
    c.valorNuevo,
    c.trazaId,
    c.ip,
    c.ocurridoEn.toISOString(),
    c.registradoEn.toISOString(),
  ]);
}

/** SHA-256 de `hashPrevio || contenido canonico`, en hexadecimal minusculo. */
export function calcularHash(hashPrevio: string, contenido: ContenidoRegistro): string {
  return createHash('sha256')
    .update(hashPrevio, 'utf8')
    .update(contenidoCanonico(contenido), 'utf8')
    .digest('hex');
}

/** Resultado de recorrer la cadena. */
export interface ResultadoVerificacion {
  intacta: boolean;
  revisados: number;
  /** Numero del primer registro que no cuadra. */
  rotoEn?: bigint;
  motivo?: string;
}

/** Un registro tal como se relee de la base para verificarlo. */
export interface RegistroVerificable extends ContenidoRegistro {
  numero: bigint;
  hashPrevio: string;
  hash: string;
}

/**
 * Recorre la cadena en orden y devuelve donde se rompe, si se rompe.
 *
 * Detecta las tres formas de romperla:
 * - un contenido alterado (el hash recalculado no coincide con el guardado),
 * - un registro desaparecido (el enlace `hashPrevio` no apunta al anterior),
 * - una cadena que no empieza donde debe.
 *
 * Se detiene en el primer fallo: a partir de ahi todo lo posterior es
 * consecuencia, y listar mil registros "rotos" esconde el unico que importa.
 *
 * `hashInicial` permite verificar la cadena por lotes sin cargarla entera en
 * memoria: cada lote arranca donde termino el anterior, y el enlace entre los
 * dos se comprueba igual que cualquier otro.
 */
export function verificarCadena(
  registros: RegistroVerificable[],
  hashInicial: string = HASH_GENESIS,
): ResultadoVerificacion {
  let esperado = hashInicial;

  for (const [indice, r] of registros.entries()) {
    if (r.hashPrevio !== esperado) {
      return {
        intacta: false,
        revisados: indice,
        rotoEn: r.numero,
        motivo:
          'El registro ' + r.numero + ' dice venir despues de ' + r.hashPrevio.slice(0, 12) +
          '..., pero el anterior de la cadena termina en ' + esperado.slice(0, 12) + '...' +
          ' Falta un registro, o se altero el anterior.',
      };
    }

    const recalculado = calcularHash(r.hashPrevio, r);
    if (recalculado !== r.hash) {
      return {
        intacta: false,
        revisados: indice,
        rotoEn: r.numero,
        motivo:
          'El contenido del registro ' + r.numero + ' no corresponde a su hash. ' +
          'Guardado: ' + r.hash.slice(0, 12) + '... Recalculado: ' + recalculado.slice(0, 12) + '...',
      };
    }

    esperado = r.hash;
  }

  return { intacta: true, revisados: registros.length };
}

/** Datos que cubre la firma de la raiz diaria. */
export interface RaizDiaria {
  /** Dia en formato AAAA-MM-DD, hora local de Guatemala. */
  dia: string;
  numeroDesde: bigint;
  numeroHasta: bigint;
  cantidad: number;
  hashFinal: string;
}

/**
 * Firma HMAC-SHA256 de la raiz del dia.
 *
 * La llave vive FUERA de la base de datos. Sin ella, quien tuviera control
 * total de PostgreSQL podria reescribir la cadena completa y recalcular todos
 * los hashes: quedaria perfectamente coherente. Lo que no podria es volver a
 * firmar las raices, y ahi es donde se nota.
 */
export function firmarRaiz(llaveHex: string, raiz: RaizDiaria): string {
  return createHmac('sha256', Buffer.from(llaveHex, 'hex'))
    .update(
      JSON.stringify([raiz.dia, raiz.numeroDesde.toString(), raiz.numeroHasta.toString(), raiz.cantidad, raiz.hashFinal]),
      'utf8',
    )
    .digest('hex');
}

/**
 * Comprueba la firma de una raiz.
 *
 * Comparacion en tiempo constante: un `===` sobre cadenas termina en el primer
 * caracter distinto, y ese tiempo filtra informacion sobre la firma correcta.
 */
export function firmaRaizValida(llaveHex: string, raiz: RaizDiaria, firma: string): boolean {
  const esperada = Buffer.from(firmarRaiz(llaveHex, raiz), 'hex');
  const recibida = Buffer.from(firma, 'hex');
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
