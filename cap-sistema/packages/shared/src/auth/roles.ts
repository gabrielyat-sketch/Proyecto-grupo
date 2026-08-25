/**
 * Roles del sistema (arquitectura §10.3).
 *
 * Estos seis roles salen del levantamiento con el personal del CAP. No se
 * agregan roles nuevos sin actualizar la matriz de permisos del documento de
 * arquitectura: un rol suelto es un agujero de autorizacion silencioso.
 */
export enum Rol {
  ADMINISTRADOR = 'ADMINISTRADOR',
  DIRECTOR = 'DIRECTOR',
  MEDICO = 'MEDICO',
  ENFERMERIA = 'ENFERMERIA',
  FARMACIA = 'FARMACIA',
  RECEPCION = 'RECEPCION',
}

/** Roles que obligatoriamente usan MFA (arquitectura §10.3). */
export const ROLES_CON_MFA_OBLIGATORIO: readonly Rol[] = [Rol.ADMINISTRADOR, Rol.DIRECTOR];

export function exigeMfa(rol: Rol): boolean {
  return ROLES_CON_MFA_OBLIGATORIO.includes(rol);
}

/** Contenido del JWT una vez validado. */
export interface UsuarioAutenticado {
  /** Identificador del usuario (claim sub). */
  id: string;
  usuario: string;
  rol: Rol;
  /** Identificador de la sesion, para poder revocarla. */
  sesionId: string;
  /** true si la sesion completo el segundo factor. */
  mfaVerificado: boolean;
}

/** Request con el usuario ya adjuntado por GuardJwt. */
export interface PeticionAutenticada {
  usuario?: UsuarioAutenticado;
  trazaId?: string;
  headers: Record<string, string | string[] | undefined>;
}
