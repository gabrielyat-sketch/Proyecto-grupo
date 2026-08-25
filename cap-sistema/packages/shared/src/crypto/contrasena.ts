import { hash, verify, Algorithm } from '@node-rs/argon2';

/**
 * Hash de contrasenas con Argon2id.
 *
 * Se usa hash, NO cifrado: una contrasena no debe poder recuperarse en ningun
 * caso, ni siquiera por el administrador del sistema.
 *
 * Parametros segun la recomendacion de OWASP para Argon2id. Suben el costo de
 * un ataque por fuerza bruta sobre la base de datos robada, sin volver lento el
 * inicio de sesion del personal del CAP.
 *
 * Ver arquitectura-cap-purulha.md §9.3
 */
const PARAMETROS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashContrasena(contrasenaPlana: string): Promise<string> {
  if (!contrasenaPlana) {
    throw new Error('La contrasena no puede estar vacia.');
  }
  return hash(contrasenaPlana, PARAMETROS);
}

/**
 * Verifica una contrasena contra su hash.
 *
 * Devuelve false ante un hash invalido o corrupto en vez de lanzar: un registro
 * danado en la base no debe convertirse en un error 500 que revele detalles
 * internos a quien intenta entrar.
 */
export async function verificarContrasena(
  hashGuardado: string,
  contrasenaPlana: string,
): Promise<boolean> {
  if (!hashGuardado || !contrasenaPlana) return false;
  try {
    return await verify(hashGuardado, contrasenaPlana, PARAMETROS);
  } catch {
    return false;
  }
}
