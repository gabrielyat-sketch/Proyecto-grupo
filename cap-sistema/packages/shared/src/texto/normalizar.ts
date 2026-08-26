/**
 * Normalizacion de texto para busqueda de personas.
 *
 * En Purulha los apellidos se escriben de formas distintas segun quien los
 * teclee: con tilde o sin ella, en mayusculas o minusculas, con espacios de
 * mas. Si la busqueda compara el texto tal cual, encontrar a alguien depende de
 * que quien registro y quien busca hayan escrito igual — y eso no pasa.
 *
 * La misma funcion se usa al GUARDAR y al BUSCAR. Es lo que garantiza que
 * ambos lados coincidan: si divergieran, la busqueda dejaria de encontrar
 * registros que si existen, en silencio.
 */

/**
 * Minusculas, sin tildes y con los espacios colapsados.
 *
 *   'Xoná  ISEM' -> 'xona isem'
 *   'Muñoz'      -> 'munoz'
 *
 * La n con virgulilla se trata como n a proposito. Media poblacion escribe
 * "Munoz" y la otra media "Muñoz"; distinguirlas solo esconde registros.
 */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    // Marcas diacriticas combinantes: es lo que queda tras descomponer 'á'.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Texto normalizado que se guarda para poder buscar: apellidos y nombres en
 * un solo campo.
 *
 * Van juntos porque el personal escribe el nombre completo de corrido —
 * "Yat Yat Ramiro Gabriel"— y con las columnas separadas eso no coincide con
 * ninguna de las dos.
 */
export function textoDeBusqueda(apellidos: string, nombres: string): string {
  return normalizarTexto(apellidos + ' ' + nombres);
}

/**
 * Palabras del criterio de busqueda.
 *
 * Se separa por espacios y tambien por comas: el personal copia el nombre tal
 * como aparece en pantalla, "Yat Yat, Ramiro Gabriel", y esa coma no debe
 * impedir encontrarlo.
 *
 * Cada palabra se buscara por su INICIO, y todas deben aparecer. Asi
 * "yat ramiro" encuentra a "Yat Yat Ramiro Gabriel" sin importar el orden, y
 * "ramiro" solo no arrastra a los miles de "Yat".
 */
export function palabrasDeBusqueda(criterio: string): string[] {
  return normalizarTexto(criterio.replace(/,/g, ' '))
    .split(' ')
    .filter((p) => p !== '');
}
