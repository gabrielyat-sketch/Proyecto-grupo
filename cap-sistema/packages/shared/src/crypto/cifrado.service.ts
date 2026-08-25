import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/**
 * Cifrado de campos sensibles y busqueda sobre ellos.
 *
 * El problema que resuelve: un campo cifrado con AES-GCM produce un resultado
 * distinto cada vez que se cifra el mismo valor. Eso es deseable, pero significa
 * que la columna deja de poder buscarse e indexarse. Si el DPI del paciente se
 * guarda solo cifrado, la busqueda de recepcion deja de funcionar.
 *
 * La solucion es guardar dos columnas: el valor cifrado (que solo se descifra
 * para mostrarlo a un usuario autorizado) y un indice ciego, que es un HMAC del
 * valor. El HMAC siempre da el mismo resultado para el mismo valor, asi que se
 * puede indexar y consultar, y no es reversible.
 *
 * Ver arquitectura-cap-purulha.md §9.3
 */

const ALGORITMO = 'aes-256-gcm';
const LONGITUD_LLAVE = 32; // 256 bits
const LONGITUD_IV = 12; // 96 bits, el tamano recomendado para GCM
const LONGITUD_TAG = 16; // 128 bits

/**
 * Normaliza un valor antes de calcular su indice ciego.
 *
 * Sin esto, el mismo DPI escrito como "1234 56789 0101" y "1234567890101"
 * produciria dos indices distintos y el paciente aparaceria duplicado o no
 * se encontraria. Se aplica SOLO al indice: el valor que se cifra y se muestra
 * al usuario conserva su formato original.
 */
export function normalizarParaIndice(valor: string): string {
  return valor.trim().replace(/[\s\-.]/g, '').toUpperCase();
}

export class ServicioCifrado {
  private readonly llaveDatos: Buffer;
  private readonly llaveIndice: Buffer;

  /**
   * @param llaveDatosHex  LLAVE_DATOS  — 64 caracteres hexadecimales (32 bytes)
   * @param llaveIndiceHex LLAVE_INDICE — 64 caracteres hexadecimales (32 bytes)
   *
   * Las llaves llegan por variable de entorno y viven fuera de la base de datos.
   * Si estuvieran junto a los datos que protegen, el cifrado no protegeria nada.
   */
  constructor(llaveDatosHex: string, llaveIndiceHex: string) {
    this.llaveDatos = ServicioCifrado.leerLlave(llaveDatosHex, 'LLAVE_DATOS');
    this.llaveIndice = ServicioCifrado.leerLlave(llaveIndiceHex, 'LLAVE_INDICE');

    if (this.llaveDatos.equals(this.llaveIndice)) {
      throw new Error(
        'LLAVE_DATOS y LLAVE_INDICE no pueden ser iguales: reutilizar la misma ' +
          'llave para cifrar y para indexar debilita ambas funciones.',
      );
    }
  }

  private static leerLlave(hex: string, nombre: string): Buffer {
    if (!hex) {
      throw new Error(nombre + ' no esta definida. El servicio no puede arrancar sin ella.');
    }
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error(nombre + ' debe ser hexadecimal.');
    }
    const llave = Buffer.from(hex, 'hex');
    if (llave.length !== LONGITUD_LLAVE) {
      throw new Error(
        nombre + ' debe medir ' + LONGITUD_LLAVE + ' bytes (' + LONGITUD_LLAVE * 2 +
          ' caracteres hex), pero mide ' + llave.length + '.',
      );
    }
    return llave;
  }

  /**
   * Cifra un valor. El resultado nunca es igual dos veces, aunque el valor lo sea.
   * Formato del buffer devuelto: [iv (12) | tag (16) | datos cifrados].
   */
  cifrar(textoPlano: string): Buffer {
    const iv = randomBytes(LONGITUD_IV);
    const cifrador = createCipheriv(ALGORITMO, this.llaveDatos, iv);
    const cifrado = Buffer.concat([cifrador.update(textoPlano, 'utf8'), cifrador.final()]);
    return Buffer.concat([iv, cifrador.getAuthTag(), cifrado]);
  }

  /**
   * Descifra un valor producido por cifrar().
   *
   * Si el dato fue alterado en la base, GCM lo detecta y lanza. Eso es deliberado:
   * es preferible fallar a devolver un dato clinico manipulado.
   */
  descifrar(paquete: Buffer): string {
    if (paquete.length < LONGITUD_IV + LONGITUD_TAG) {
      throw new Error('El dato cifrado esta incompleto o corrupto.');
    }
    const iv = paquete.subarray(0, LONGITUD_IV);
    const tag = paquete.subarray(LONGITUD_IV, LONGITUD_IV + LONGITUD_TAG);
    const datos = paquete.subarray(LONGITUD_IV + LONGITUD_TAG);

    const descifrador = createDecifradorSeguro(this.llaveDatos, iv, tag);
    return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString('utf8');
  }

  /**
   * Calcula el indice ciego de un valor: HMAC-SHA256 con la llave de indice.
   *
   * Determinista a proposito — es lo que permite la busqueda:
   *   SELECT * FROM paciente WHERE dpi_indice = $1
   *
   * No es reversible: quien obtenga la base de datos no puede deducir el DPI a
   * partir del indice, porque la llave vive fuera de la base.
   */
  indiceCiego(valor: string): Buffer {
    return createHmac('sha256', this.llaveIndice)
      .update(normalizarParaIndice(valor), 'utf8')
      .digest();
  }
}

function createDecifradorSeguro(llave: Buffer, iv: Buffer, tag: Buffer) {
  const descifrador = createDecipheriv(ALGORITMO, llave, iv);
  descifrador.setAuthTag(tag);
  return descifrador;
}
