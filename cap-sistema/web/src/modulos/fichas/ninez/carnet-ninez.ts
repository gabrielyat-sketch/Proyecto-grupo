import type { Carnet, CatalogoCarnet, TramoEdad, VacunaCatalogo } from './servicio-carnet';

/**
 * La lógica del carnet del lactante y niñez: páginas 1 y 2 del papel.
 *
 * Lo que hace lo digital aquí y el papel no puede es **decir lo que falta**.
 * En la hoja impresa, saber si a un niño de dos años le falta el refuerzo de
 * OPV exige leer una tabla de cien celdas y restar fechas a mano. Aquí sale
 * solo.
 */

/** Cómo se llama cada tramo en el papel. */
export const ETIQUETA_TRAMO: Record<TramoEdad, string> = {
  M6_A_A1: '6 m a < 1 año',
  A1_A_A2: '1 a < 2 años',
  A2_A_A3: '2 a < 3 años',
  A3_A_A4: '3 a < 4 años',
  A4_A_A5: '4 a < 5 años',
};

/** Los tramos en el orden en que el papel los imprime. */
export const TRAMOS: readonly TramoEdad[] = [
  'M6_A_A1',
  'A1_A_A2',
  'A2_A_A3',
  'A3_A_A4',
  'A4_A_A5',
];

/** El mes en que empieza cada tramo. Sale de su propio nombre. */
export const INICIO_DEL_TRAMO: Record<TramoEdad, number> = {
  M6_A_A1: 6,
  A1_A_A2: 12,
  A2_A_A3: 24,
  A3_A_A4: 36,
  A4_A_A5: 48,
};

/** Cómo se nombran las cinco columnas de la tabla de vacunas. */
export const COLUMNAS_DOSIS = ['Primero', 'Segundo', 'Tercero', 'Refuerzo', 'Refuerzo'];

/**
 * La edad recomendada de una dosis, en meses.
 *
 * El catálogo la guarda como el papel la imprime —«RN», «2 meses», «18 meses»,
 * «4 años»— porque ese es el texto del formulario. Aquí se traduce para poder
 * comparar contra la edad del niño.
 *
 * Devuelve `null` cuando no se puede saber, y eso NO es un fallo: la fila de
 * SPR dice solo «meses», sin número, y las de Neumococo, Hb y Otras vienen sin
 * edad. Inventarles una convertiría un hueco del formulario en un aviso falso.
 */
export function edadRecomendadaEnMeses(texto: string | null): number | null {
  if (!texto) return null;
  const t = texto.trim().toLowerCase();
  if (t === 'rn') return 0;

  const meses = t.match(/^(\d+)\s*mes/);
  if (meses) return Number(meses[1]);

  const anios = t.match(/^(\d+)\s*a[ñn]o/);
  if (anios) return Number(anios[1]) * 12;

  return null;
}

/** Una casilla del esquema, con lo que se sabe de ella. */
export interface CasillaVacuna {
  vacunaId: string;
  orden: number;
  /** El texto impreso: «2 meses», «RN». Null en las que el papel deja abiertas. */
  edadRecomendada: string | null;
  /** La fecha anotada, como `aaaa-mm-dd`. Vacío si no se ha puesto. */
  fecha: string;
  /** Meses cumplidos el día de la dosis. Null si no hay fecha o no hay nacimiento. */
  edadEnMeses: number | null;
}

/**
 * Las dosis que ya le tocaban y no están puestas.
 *
 * Solo cuenta las que tienen edad recomendada **legible** y que el niño ya
 * pasó. Una dosis sin fecha cuya edad no se puede leer no se cuenta: no se
 * sabe si toca.
 */
export function dosisPendientes(
  catalogo: CatalogoCarnet,
  carnet: Carnet,
): { vacuna: string; dosis: number; edadRecomendada: string }[] {
  const edad = carnet.edadEnMeses;
  if (edad === null) return [];

  const puesta = new Set(carnet.vacunas.map((v) => v.vacunaId + '#' + v.orden));
  const pendientes: { vacuna: string; dosis: number; edadRecomendada: string }[] = [];

  for (const v of catalogo.vacunas) {
    for (const d of v.dosis) {
      const toca = edadRecomendadaEnMeses(d.edadRecomendada);
      if (toca === null || edad < toca) continue;
      if (puesta.has(v.id + '#' + d.orden)) continue;
      pendientes.push({
        vacuna: v.nombre,
        dosis: d.orden,
        edadRecomendada: d.edadRecomendada as string,
      });
    }
  }
  return pendientes;
}

/**
 * Los tramos de micronutrientes que al niño ya le tocaron.
 *
 * Un niño de dos años no tiene por qué mostrar las casillas de cuatro: en el
 * papel están impresas porque la hoja acompaña al niño cinco años, pero en
 * pantalla ofrecerlas invita a llenarlas antes de tiempo.
 */
export function tramosAlcanzados(edadEnMeses: number | null): TramoEdad[] {
  if (edadEnMeses === null) return [...TRAMOS];
  return TRAMOS.filter((t) => edadEnMeses >= INICIO_DEL_TRAMO[t]);
}

/** Las casillas de una vacuna, ya cruzadas con lo que el niño tiene puesto. */
export function casillasDe(vacuna: VacunaCatalogo, carnet: Carnet): CasillaVacuna[] {
  return vacuna.dosis.map((d) => {
    const puesta = carnet.vacunas.find((v) => v.vacunaId === vacuna.id && v.orden === d.orden);
    return {
      vacunaId: vacuna.id,
      orden: d.orden,
      edadRecomendada: d.edadRecomendada,
      fecha: puesta?.fecha ?? '',
      edadEnMeses: puesta?.edadEnMeses ?? null,
    };
  });
}

/** La fecha anotada de una entrega de micronutriente, si la hay. */
export function fechaEntrega(
  carnet: Carnet,
  micronutrienteId: string,
  tramo: TramoEdad,
  orden: number,
): string {
  return (
    carnet.micronutrientes.find(
      (m) =>
        m.micronutrienteId === micronutrienteId && m.tramo === tramo && m.orden === orden,
    )?.fecha ?? ''
  );
}

/** «2 años 3 meses», que es como el papel dice la edad. */
export function edadDicha(meses: number): string {
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anios > 0) partes.push(anios + (anios === 1 ? ' año' : ' años'));
  if (resto > 0 || anios === 0) partes.push(resto + (resto === 1 ? ' mes' : ' meses'));
  return partes.join(' ');
}
