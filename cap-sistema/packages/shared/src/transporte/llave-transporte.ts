import { createECDH, createCipheriv, createDecipheriv, hkdfSync, randomBytes, type ECDH } from 'node:crypto';

/**
 * Criptografia del cifrado de transporte (ver `transporte.ts`).
 *
 * Esquema, el mismo de `web/src/api/cifrado.ts`; si uno cambia, el otro tambien:
 *
 *   - ECDH P-256 entre una llave efimera del navegador (una por pestana) y la
 *     llave fija del servidor. El secreto compartido es la coordenada x del
 *     punto, 32 bytes: lo que devuelven tanto `ECDH.computeSecret` de Node como
 *     `deriveBits(…, 256)` de WebCrypto.
 *   - HKDF-SHA256 de ese secreto a una llave AES-256-GCM.
 *   - Cada mensaje: IV de 12 bytes al azar + texto cifrado + etiqueta de 16,
 *     en base64url. La etiqueta hace que cualquier cambio en el camino —un
 *     solo caracter editado en un proxy— se detecte y se rechace.
 */

const CURVA = 'prime256v1';
const SAL_HKDF = Buffer.from('sicap-transporte-v1');
const INFO_AES = Buffer.from('aes-256-gcm');

/**
 * La llave privada del servidor se DERIVA de JWT_SECRET en lugar de ser un
 * secreto nuevo.
 *
 * Los cinco servicios necesitan la misma, y JWT_SECRET ya es identico en los
 * cinco (secretos/comun.env). Un secreto nuevo obligaria a editar comun.env en
 * el servidor antes de desplegar, y olvidarlo dejaria el sistema sin arrancar.
 * HKDF es de un solo sentido: conocer esta llave no revela JWT_SECRET.
 */
export function derivarLlaveServidor(jwtSecret: string): ECDH {
  // Una llave P-256 valida es cualquier numero entre 1 y el orden de la curva;
  // 32 bytes al azar caen fuera con probabilidad ~2^-32. El contador solo
  // existe para que ese caso no tumbe el servicio.
  for (let intento = 0; intento < 16; intento++) {
    const privada = Buffer.from(
      hkdfSync('sha256', jwtSecret, SAL_HKDF, 'llave-privada-ecdh-p256:' + intento, 32),
    );
    const ecdh = createECDH(CURVA);
    try {
      ecdh.setPrivateKey(privada);
      return ecdh;
    } catch {
      // fuera de rango: se prueba con el siguiente contador
    }
  }
  throw new Error('No se pudo derivar la llave de transporte.');
}

/** Llave publica del servidor, sin comprimir (65 bytes), en base64url. */
export function llavePublicaServidor(ecdh: ECDH): string {
  return ecdh.getPublicKey().toString('base64url');
}

/** Llave AES compartida con un navegador, a partir de su llave publica. */
export function llaveCompartida(ecdh: ECDH, publicaCliente: Buffer): Buffer {
  // computeSecret lanza si el punto no esta en la curva: una llave inventada
  // en un proxy no llega a usarse.
  const secreto = ecdh.computeSecret(publicaCliente);
  return Buffer.from(hkdfSync('sha256', secreto, SAL_HKDF, INFO_AES, 32));
}

export function cifrar(llave: Buffer, texto: string, contexto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', llave, iv);
  cifrador.setAAD(Buffer.from(contexto));
  const cuerpo = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  return Buffer.concat([iv, cuerpo, cifrador.getAuthTag()]).toString('base64url');
}

/**
 * Descifra y verifica. Lanza si el mensaje fue alterado, si se cifro con otra
 * llave o si se cifro para otro `contexto` (un cuerpo pegado en otra peticion).
 */
export function descifrar(llave: Buffer, mensaje: string, contexto: string): string {
  const datos = Buffer.from(mensaje, 'base64url');
  if (datos.length < 12 + 16) throw new Error('mensaje demasiado corto');
  const descifrador = createDecipheriv('aes-256-gcm', llave, datos.subarray(0, 12));
  descifrador.setAAD(Buffer.from(contexto));
  descifrador.setAuthTag(datos.subarray(datos.length - 16));
  return Buffer.concat([descifrador.update(datos.subarray(12, datos.length - 16)), descifrador.final()]).toString(
    'utf8',
  );
}
