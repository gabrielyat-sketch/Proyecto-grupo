/**
 * Cierre de sesion por inactividad (arquitectura §10.5).
 *
 * Las computadoras del CAP se comparten entre turnos. Sin esto, la persona del
 * turno siguiente se sienta y encuentra abierta la sesion de la anterior, con
 * acceso a los expedientes bajo un nombre que no es el suyo. Eso ademas rompe
 * la trazabilidad: la auditoria registraria las consultas a nombre de quien ya
 * se fue.
 */

const MINUTOS_POR_DEFECTO = 15;

function minutosConfigurados(): number {
  const crudo = import.meta.env?.VITE_MINUTOS_INACTIVIDAD;
  const n = Number(crudo);
  // Un valor mal escrito en el .env no puede desactivar el cierre en silencio.
  if (!Number.isFinite(n) || n <= 0) return MINUTOS_POR_DEFECTO;
  return n;
}

export const MINUTOS_INACTIVIDAD = minutosConfigurados();
export const LIMITE_MS = MINUTOS_INACTIVIDAD * 60_000;

/**
 * Aviso previo de un minuto.
 *
 * Cerrar sin avisar le borraria a alguien media ficha a medio llenar. El aviso
 * da tiempo a guardar, y sobre todo a entender que paso: una sesion que
 * desaparece sin explicacion se interpreta como que "el sistema falla".
 */
export const SEGUNDOS_AVISO = 60;
export const AVISO_MS = SEGUNDOS_AVISO * 1_000;

export type Fase = 'activo' | 'aviso' | 'expirado';

export interface EstadoInactividad {
  fase: Fase;
  /** Segundos que faltan para el cierre. Solo tiene sentido en fase 'aviso'. */
  segundosRestantes: number;
}

/**
 * Traduce el tiempo sin actividad a una de las tres fases.
 *
 * Se calcula a partir de una marca de tiempo, no contando pulsos de un
 * temporizador: si la computadora se suspende o el navegador ralentiza la
 * pestana en segundo plano —que es lo normal—, un contador de pulsos se
 * atrasaria y la sesion seguiria abierta mas de la cuenta.
 */
export function estadoInactividad(
  msSinActividad: number,
  limiteMs: number = LIMITE_MS,
  avisoMs: number = AVISO_MS,
): EstadoInactividad {
  if (msSinActividad >= limiteMs) {
    return { fase: 'expirado', segundosRestantes: 0 };
  }

  const msRestantes = limiteMs - msSinActividad;
  if (msRestantes <= avisoMs) {
    return { fase: 'aviso', segundosRestantes: Math.ceil(msRestantes / 1_000) };
  }

  return { fase: 'activo', segundosRestantes: Math.ceil(msRestantes / 1_000) };
}
