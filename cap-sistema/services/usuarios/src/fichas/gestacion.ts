import { diasEntre, fechaDelDia, sumarDias } from '@cap/shared';

/**
 * Las dos cuentas del embarazo que la hoja prenatal necesita.
 *
 * La misma regla vive en `programas/src/dominio/clinico.ts`, y esta repetida a
 * proposito: son dos servicios con su propia base y su propio despliegue, y
 * compartir una libreria por dos lineas de aritmetica cuesta mas de lo que
 * ahorra. Lo que no se repite son los helpers de fechas: `diasEntre` y
 * `sumarDias` salen de `@cap/shared`, que es donde vive el manejo del huso.
 *
 * Las dos pruebas de `gestacion.spec.ts` fijan los mismos valores que fija la
 * prueba de `programas`, para que una revision de una no se lleve por delante
 * a la otra en silencio.
 */

/** Duracion estandar del embarazo en dias (regla de Naegele). */
export const DIAS_DE_GESTACION = 280;

/** Fecha probable de parto: FUR + 280 dias. */
export function fechaProbableParto(fur: Date): Date {
  return sumarDias(fur, DIAS_DE_GESTACION);
}

/**
 * Semanas COMPLETAS de gestacion en la fecha de una consulta.
 *
 * A los 6 dias son 0 semanas, no 1: el personal cuenta asi y los esquemas de
 * control se definen sobre semanas completas.
 *
 * **`instanteConsulta` es un instante, no una fecha, y por eso pasa por
 * `fechaDelDia`.** `Atencion.fecha` guarda la hora, y Purulha es UTC-6: a las
 * 19:00 de un martes en Guatemala, en UTC ya es miercoles. Contando en crudo,
 * toda consulta a partir de las 18:00 sumaba un dia y una de cada siete sumaba
 * una SEMANA entera. `programas` tuvo este mismo fallo y lo dejo escrito: "el
 * mismo embarazo reportaba 10 semanas al inscribirlo y 9 en el control de esa
 * misma noche". El CAP es un centro de atencion PERMANENTE; la consulta de las
 * ocho de la noche es rutina, no una rareza.
 *
 * La FUR **no** pasa por ahi: viene de una columna de fecha sin hora, ya es la
 * medianoche UTC de su dia, y correrla seis horas la mandaria al dia anterior.
 *
 * Devuelve null, y no 0, cuando la consulta es anterior a la FUR. Un cero ahi
 * se leeria como una lectura real —"embarazo de menos de una semana"— cuando lo
 * que ocurre es que uno de los dos datos esta mal escrito. Es el mismo criterio
 * que la grafica de peso de la ficha de ninez, que prefiere no decir nada antes
 * que decir algo sin base.
 */
export function semanasDeGestacion(fur: Date, instanteConsulta: Date): number | null {
  const dias = diasEntre(fur, fechaDelDia(instanteConsulta));
  if (dias < 0) return null;
  return Math.floor(dias / 7);
}
