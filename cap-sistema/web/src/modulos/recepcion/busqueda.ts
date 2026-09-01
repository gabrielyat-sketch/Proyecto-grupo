/**
 * Interpreta lo que recepcion escribio en la caja de busqueda.
 *
 * Hay una sola caja, no dos. Quien atiende tiene al paciente enfrente y usa lo
 * que la persona traiga: a veces el DPI, casi siempre el apellido. Obligarle a
 * elegir primero "buscar por DPI" o "buscar por nombre" agrega una decision
 * antes de poder escribir, y esa decision se equivoca a diario.
 *
 * La regla es la del backend: por DPI la busqueda es exacta sobre el indice
 * ciego; por nombre es por INICIO de apellido o nombre, nunca por texto
 * contenido, porque un LIKE '%texto%' no puede usar indice y recorreria la
 * tabla entera.
 */

export type Criterio =
  | { tipo: 'dpi'; dpi: string }
  | { tipo: 'nombre'; nombre: string }
  | { tipo: 'vacio' }
  | { tipo: 'corto' };

/** Solo digitos, espacios o guiones: es un intento de DPI. */
const PARECE_DPI = /^[0-9][0-9\s-]*$/;

export function interpretarBusqueda(texto: string): Criterio {
  const limpio = texto.trim();
  if (limpio === '') return { tipo: 'vacio' };

  if (PARECE_DPI.test(limpio)) {
    // Se quitan espacios y guiones: el DPI viene escrito de muchas formas en
    // los documentos y el indice ciego se calcula sobre los digitos solos.
    const digitos = limpio.replace(/[\s-]/g, '');
    // Menos de 8 digitos casi siempre es una escritura a medias, y disparar la
    // consulta con eso solo devuelve nada y confunde.
    return digitos.length >= 8 ? { tipo: 'dpi', dpi: digitos } : { tipo: 'corto' };
  }

  // El backend exige 2 letras como minimo para no recorrer media tabla.
  return limpio.length >= 2 ? { tipo: 'nombre', nombre: limpio } : { tipo: 'corto' };
}

/** Explica por que no se busco todavia. null cuando el criterio si sirve. */
export function motivoSinBuscar(criterio: Criterio): string | null {
  switch (criterio.tipo) {
    case 'vacio':
      return null;
    case 'corto':
      return 'Escriba al menos 2 letras, o los 8 primeros digitos del DPI.';
    default:
      return null;
  }
}
