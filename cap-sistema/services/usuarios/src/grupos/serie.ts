/**
 * A que serie de numeracion pertenece una carpeta familiar.
 *
 * El CAP numera POR BARRIO O CASERIO: hay una carpeta No.1 en El Calvario y
 * otra No.1 en San Jose. Cuando la familia no tiene barrio —las aldeas no
 * tienen lugares declarados— la serie es la de la comunidad.
 *
 * Vive en su propio archivo, y no como metodo de `GruposService`, porque lo
 * necesitan dos servicios: el de carpetas y el de pacientes, que abre una
 * carpeta dentro de la misma transaccion del alta. Importar uno desde el otro
 * cerraria un ciclo —`GruposService` ya usa `PacientesService` para calcular
 * la edad—, y `serie_id` derivada en dos sitios distintos es exactamente como
 * se desincronizaria.
 */
export function serieDe(comunidadId: string, lugarId?: string | null): string {
  // Cadena vacia, no solo nulo. `??` deja pasar el '' —«sin especificar» en un
  // desplegable viaja asi—, y entonces la serie seria '' para TODAS las
  // comunidades: una sola numeracion global donde tiene que haber una por
  // lugar. El panel hoy omite el campo cuando esta vacio, pero eso es una
  // costumbre del panel, no una garantia, y el movil es otro cliente.
  return lugarId && lugarId.trim() !== '' ? lugarId : comunidadId;
}
