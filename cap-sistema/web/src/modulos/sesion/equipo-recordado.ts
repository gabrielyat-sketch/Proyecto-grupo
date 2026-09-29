/**
 * El token del equipo recordado.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE EN `localStorage` Y NO EN MEMORIA
 * ─────────────────────────────────────────────────────────────────────────
 * Tiene que sobrevivir a cerrar el navegador: esa es justamente su razon de
 * ser. Un valor que se pierde al apagar la computadora no ahorraria ningun
 * codigo, porque en el CAP se apaga todos los dias.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE ESO NO ES UN AGUJERO
 * ─────────────────────────────────────────────────────────────────────────
 * Este token NO es una credencial. Por si solo no abre nada: quien lo lea
 * sigue necesitando el usuario y la contrasena. Lo unico que evita es el
 * segundo paso, y solo en el equipo donde ya se hizo una vez.
 *
 * Es deliberadamente distinto del token de sesion, que sigue viviendo solo en
 * memoria. Aquel SI es una credencial —abre el sistema entero— y por eso no
 * se guarda en ningun sitio que un script pueda leer.
 *
 * El servidor solo conserva el hash, caduca a los 30 dias, y lo revoca al
 * cambiar la contrasena.
 */
const CLAVE = 'cap.equipo';

/** Guarda lo que devolvio el servidor tras un codigo correcto. */
export function recordarEquipo(token: string): void {
  try {
    window.localStorage.setItem(CLAVE, token);
  } catch {
    // Modo privado o almacenamiento bloqueado: no se recuerda el equipo y
    // se volvera a pedir el codigo. Es una molestia, no un fallo, y romper
    // el login por esto seria mucho peor.
  }
}

/** Lo que hay que mandar en el login para saltarse el segundo paso. */
export function equipoRecordado(): string | undefined {
  try {
    return window.localStorage.getItem(CLAVE) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Olvidar este equipo.
 *
 * Se llama cuando el servidor deja de reconocerlo —caducó, o lo revocaron—
 * para no seguir mandando un token muerto en cada login.
 */
export function olvidarEquipo(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}
