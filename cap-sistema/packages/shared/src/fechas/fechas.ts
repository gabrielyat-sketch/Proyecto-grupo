/**
 * Fechas del calendario de Purulhá.
 *
 * Viven en la librería compartida porque **más de un servicio las necesita**:
 * `programas` cita el próximo control y `medicamentos` decide si un lote está
 * vencido. Si cada uno tuviera su copia, un arreglo habría que aplicarlo dos
 * veces — y bastaría olvidar uno para que las fechas dejaran de coincidir
 * entre servicios sin que nada fallara de forma visible.
 */

/**
 * Guatemala es UTC-6 todo el año: no aplica horario de verano. Por eso basta
 * un desfase fijo y no hace falta una biblioteca de husos horarios.
 */
export const DESFASE_GUATEMALA_HORAS = -6;

/**
 * Convierte un INSTANTE (por ejemplo `new Date()`) al día del calendario que
 * corresponde en Purulhá.
 *
 * Sin esto, algo registrado a las 19:00 en el CAP cae ya en el día siguiente
 * en UTC. No es teórico: un CAP es un Centro de Atención **Permanente** y
 * atiende de noche.
 *
 * Solo se aplica a instantes. Una fecha que ya viene sin hora — la fecha de
 * última menstruación, la fecha de vencimiento de un lote — no se toca:
 * desplazarla la correría un día.
 */
export function fechaDelDia(instante: Date): Date {
  const local = new Date(instante.getTime() + DESFASE_GUATEMALA_HORAS * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

/**
 * Suma días sobre una FECHA (sin hora). Trabaja con los componentes UTC, así
 * que no se corre por husos ni por horario de verano.
 */
export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(aUtc(fecha) + dias * 86_400_000);
}

/**
 * Días completos entre dos fechas. Positivo si `hasta` es posterior.
 *
 * Cuenta días completos, no fracciones: entre el lunes a las 23:00 y el
 * martes a la 1:00 hay 1 día, no 0.
 */
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / 86_400_000);
}

/** Milisegundos del día UTC, descartando la hora. */
function aUtc(f: Date): number {
  return Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
}
