import { diasEntre, fechaDelDia, sumarDias } from '@cap/shared';

/**
 * Reglas clínicas del servicio, como funciones puras.
 *
 * Están separadas de la base de datos a propósito: son lo único del sistema
 * que puede equivocarse sin que nadie lo note. Una clasificación de presión
 * mal calculada no rompe nada, no lanza ningún error, y produce indicadores
 * equivocados sobre la salud de una comunidad durante meses.
 *
 * Al ser puras se prueban exhaustivamente, incluidos los valores frontera.
 */

// ═══════════════════════════ Presión arterial ═══════════════════════════

export type Clasificacion = 'NORMAL' | 'ELEVADA' | 'ESTADIO_1' | 'ESTADIO_2' | 'CRISIS';

/**
 * Clasifica una lectura de presión arterial.
 *
 * Se calcula, no se teclea: dejarlo como campo libre produce clasificaciones
 * inconsistentes entre turnos y vuelve inservible cualquier indicador.
 *
 * Regla que importa: **manda la cifra más alta de las dos**. Una presión de
 * 118/95 es estadio 2 aunque la sistólica sea normal. Clasificar solo por
 * sistólica es el error clásico y deja pacientes sin seguimiento.
 */
export function clasificarPresion(sistolica: number, diastolica: number): Clasificacion {
  if (sistolica > 180 || diastolica > 120) return 'CRISIS';
  if (sistolica >= 140 || diastolica >= 90) return 'ESTADIO_2';
  if (sistolica >= 130 || diastolica >= 80) return 'ESTADIO_1';
  if (sistolica >= 120) return 'ELEVADA';
  return 'NORMAL';
}

/** Una lectura está en meta solo si AMBAS cifras están por debajo. */
export function estaEnMeta(
  sistolica: number,
  diastolica: number,
  metaSistolica: number,
  metaDiastolica: number,
): boolean {
  return sistolica < metaSistolica && diastolica < metaDiastolica;
}

/**
 * Cuándo debe volver el paciente hipertenso.
 *
 * A peor control, control más cercano. Una crisis no se cita en un mes.
 */
export function proximoControlHipertension(clasificacion: Clasificacion, desde: Date): Date {
  const dias =
    clasificacion === 'CRISIS' ? 1 : clasificacion === 'ESTADIO_2' ? 15 : clasificacion === 'ESTADIO_1' ? 30 : 90;
  return sumarDias(desde, dias);
}

// ═══════════════════════════ Embarazo ═══════════════════════════

/** Duración estándar del embarazo en días (regla de Naegele). */
export const DIAS_GESTACION = 280;

/**
 * Fecha probable de parto: FUM + 280 días.
 *
 * Se calcula en UTC a propósito. Con fechas locales, un embarazo registrado
 * en horario de verano puede desplazarse un día — y en obstetricia un día
 * cambia la conducta cuando la paciente llega a las 40 semanas.
 */
export function fechaProbableParto(fum: Date): Date {
  return sumarDias(fum, DIAS_GESTACION);
}

/**
 * Semanas completas de gestación a una fecha dada.
 *
 * Devuelve semanas completas, no redondeadas: a los 6 días son 0 semanas, no 1.
 * El personal cuenta así y los rangos de control se definen sobre semanas
 * completas.
 */
export function semanasGestacion(fum: Date, enFecha: Date): number {
  const dias = diasEntre(fum, enFecha);
  if (dias < 0) return 0;
  return Math.floor(dias / 7);
}

/**
 * Próximo control prenatal según la edad gestacional.
 *
 * Sigue el esquema habitual de control prenatal:
 *   hasta 28 semanas  → cada 4 semanas
 *   de 28 a 36        → cada 2 semanas
 *   desde 36          → cada semana
 *
 * En un área rural esto importa más de lo que parece: citar cada 4 semanas a
 * una mujer de 38 semanas que vive a dos horas del CAP es citarla después del
 * parto.
 */
export function proximoControlPrenatal(semanas: number, desde: Date): Date {
  const dias = semanas >= 36 ? 7 : semanas >= 28 ? 14 : 28;
  return sumarDias(desde, dias);
}

export interface DatosRiesgo {
  edad: number;
  numeroGestacion: number;
  partosPrevios: number;
  sistolica?: number | null;
  diastolica?: number | null;
}

/**
 * Clasifica el riesgo del embarazo y devuelve los motivos.
 *
 * No sustituye el criterio del personal: marca casos que **no deben pasar
 * desapercibidos**. El personal puede elevar el riesgo manualmente, pero el
 * sistema nunca lo baja por su cuenta.
 */
export function evaluarRiesgoEmbarazo(d: DatosRiesgo): { alto: boolean; motivos: string[] } {
  const motivos: string[] = [];

  if (d.edad < 15) motivos.push('Edad menor de 15 anios');
  else if (d.edad > 35) motivos.push('Edad mayor de 35 anios');

  if (d.numeroGestacion >= 5) motivos.push('Quinta gestacion o mas (gran multipara)');

  if (d.sistolica != null && d.diastolica != null) {
    const c = clasificarPresion(d.sistolica, d.diastolica);
    if (c === 'CRISIS' || c === 'ESTADIO_2') {
      motivos.push('Presion arterial elevada (' + d.sistolica + '/' + d.diastolica + ')');
    }
  }

  return { alto: motivos.length > 0, motivos };
}

/**
 * Señales de alarma de un control prenatal.
 *
 * Se guardan con el control para que queden en el historial: si el sistema
 * detectó una alarma y la paciente no volvió, eso tiene que poder verse
 * después.
 */
export function alertasControlPrenatal(c: {
  semanas: number;
  sistolica?: number | null;
  diastolica?: number | null;
  fcf?: number | null;
  edema?: boolean | null;
}): string[] {
  const alertas: string[] = [];

  if (c.sistolica != null && c.diastolica != null) {
    if (c.sistolica >= 160 || c.diastolica >= 110) {
      alertas.push('Presion arterial severamente elevada: referir de inmediato');
    } else if (c.sistolica >= 140 || c.diastolica >= 90) {
      alertas.push('Presion arterial elevada: descartar preeclampsia');
    }
  }

  // El edema aislado es frecuente y normal en el embarazo; junto con presion
  // alta deja de serlo.
  if (c.edema === true && c.sistolica != null && c.sistolica >= 140) {
    alertas.push('Edema con presion elevada: signo de alarma');
  }

  // La frecuencia cardiaca fetal solo es valorable cuando ya se ausculta.
  if (c.fcf != null && c.semanas >= 12) {
    if (c.fcf < 110) alertas.push('Frecuencia cardiaca fetal baja (bradicardia)');
    else if (c.fcf > 160) alertas.push('Frecuencia cardiaca fetal alta (taquicardia)');
  }

  if (c.semanas > 42) alertas.push('Embarazo prolongado: mas de 42 semanas');

  return alertas;
}

// ═══════════════════════════ Utilidades de fecha ═══════════════════════════

/**
 * Las fechas del calendario de Purulhá viven en @cap/shared: `medicamentos`
 * las necesita igual que este servicio para decidir si un lote está vencido.
 *
 * Se re-exportan para que el resto del módulo y sus pruebas las sigan usando
 * desde aquí, sin tener que saber de dónde vienen.
 */
export { DESFASE_GUATEMALA_HORAS, diasEntre, fechaDelDia, sumarDias } from '@cap/shared';
