import type { components } from './generado/auth';

export type Perfil = components['schemas']['PerfilDto'];

interface Sesion {
  tokenAcceso: string;
  tokenRefresco: string;
  usuario: Perfil;
}

type Oyente = (sesion: Sesion | null) => void;

/**
 * Guarda la sesion SOLO EN MEMORIA. Nada en localStorage, nada en sessionStorage.
 *
 * Un token en localStorage lo puede leer cualquier script inyectado en la
 * pagina. En un sistema con datos clinicos eso significa que una sola falla de
 * XSS entrega el expediente completo, y el atacante se lleva un token de
 * refresco que sigue sirviendo siete dias despues.
 *
 * El costo es que recargar la pagina (F5) obliga a entrar de nuevo. En el CAP
 * eso pesa poco: las computadoras son compartidas entre turnos y la sesion se
 * cierra sola a los 15 minutos de inactividad (arquitectura §10.5).
 *
 * La solucion definitiva es la cookie HttpOnly que pide §10.1: sobrevive a la
 * recarga y ningun script puede leerla. Requiere un cambio en el servicio auth,
 * que hoy devuelve el token de refresco en el cuerpo de la respuesta.
 */
/**
 * Donde sobrevive la sesion a una recarga.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE `sessionStorage` Y NO `localStorage`
 * ─────────────────────────────────────────────────────────────────────────
 * Antes la sesion vivia SOLO en memoria, asi que pulsar F5 sacaba a la
 * persona del sistema y le obligaba a entrar de nuevo —codigo incluido—. En
 * el CAP eso pasa todo el dia: se recarga para ver si llego un paciente, se
 * abre una ficha en otra pestana, se cierra sin querer.
 *
 * `sessionStorage` es el punto medio correcto: sobrevive a la recarga y a
 * navegar, pero **muere al cerrar la pestana**. En una computadora compartida
 * entre turnos eso importa: quien se levanta y cierra el navegador no deja la
 * sesion abierta para el siguiente.
 *
 * `localStorage` sobreviviria tambien a cerrar el navegador, y ahi si seria
 * dejar una credencial completa en el disco de un equipo compartido.
 *
 * La solucion definitiva sigue siendo la cookie HttpOnly que pide §10.1, que
 * ningun script puede leer. Esto no la sustituye; quita la molestia diaria
 * mientras tanto.
 */
const CLAVE = 'cap.sesion';

function leerGuardada(): Sesion | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    // Almacenamiento bloqueado o contenido corrupto: se entra de nuevo, que
    // es lo que pasaba siempre antes de esto.
    return null;
  }
}

function escribirGuardada(sesion: Sesion | null): void {
  try {
    if (sesion) window.sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
    else window.sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin persistencia se sigue funcionando: la sesion vive en memoria como
    // antes y solo se pierde al recargar.
  }
}

class AlmacenSesion {
  private sesion: Sesion | null = leerGuardada();
  private oyentes = new Set<Oyente>();

  obtener(): Sesion | null {
    return this.sesion;
  }

  get tokenAcceso(): string | null {
    return this.sesion?.tokenAcceso ?? null;
  }

  get usuario(): Perfil | null {
    return this.sesion?.usuario ?? null;
  }

  get autenticado(): boolean {
    return this.sesion !== null;
  }

  guardar(sesion: Sesion): void {
    this.sesion = sesion;
    escribirGuardada(sesion);
    this.avisar();
  }

  /** Renueva los tokens conservando el perfil, tras rotar el de refresco. */
  renovar(tokenAcceso: string, tokenRefresco: string, usuario?: Perfil): void {
    if (!this.sesion) return;
    this.sesion = { tokenAcceso, tokenRefresco, usuario: usuario ?? this.sesion.usuario };
    escribirGuardada(this.sesion);
    this.avisar();
  }

  limpiar(): void {
    this.sesion = null;
    escribirGuardada(null);
    this.avisar();
  }

  suscribir(oyente: Oyente): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  private avisar(): void {
    for (const oyente of this.oyentes) oyente(this.sesion);
  }
}

export const almacenSesion = new AlmacenSesion();
