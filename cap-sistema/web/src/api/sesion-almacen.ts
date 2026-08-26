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
class AlmacenSesion {
  private sesion: Sesion | null = null;
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
    this.avisar();
  }

  /** Renueva los tokens conservando el perfil, tras rotar el de refresco. */
  renovar(tokenAcceso: string, tokenRefresco: string, usuario?: Perfil): void {
    if (!this.sesion) return;
    this.sesion = { tokenAcceso, tokenRefresco, usuario: usuario ?? this.sesion.usuario };
    this.avisar();
  }

  limpiar(): void {
    this.sesion = null;
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
