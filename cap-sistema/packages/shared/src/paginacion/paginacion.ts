/**
 * Paginacion obligatoria en todos los listados (arquitectura §8.1, §9.7).
 *
 * No es una comodidad: con 100,000 pacientes, un endpoint sin paginar funciona
 * perfecto en desarrollo con 50 registros de prueba y tumba el servidor en
 * produccion. El tope de 100 es un limite duro, no una sugerencia.
 */
export const TAMANO_PAGINA_POR_DEFECTO = 25;
export const TAMANO_PAGINA_MAXIMO = 100;

export interface ParametrosPagina {
  pagina?: number | string;
  tamano?: number | string;
}

export interface Pagina<T> {
  datos: T[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

/** Normaliza los parametros recibidos del cliente a valores seguros. */
export function normalizarPagina(p: ParametrosPagina = {}): { pagina: number; tamano: number; saltar: number } {
  const pagina = Math.max(1, Math.floor(Number(p.pagina)) || 1);
  const solicitado = Math.floor(Number(p.tamano)) || TAMANO_PAGINA_POR_DEFECTO;
  const tamano = Math.min(Math.max(1, solicitado), TAMANO_PAGINA_MAXIMO);
  return { pagina, tamano, saltar: (pagina - 1) * tamano };
}

export function crearPagina<T>(datos: T[], total: number, p: ParametrosPagina = {}): Pagina<T> {
  const { pagina, tamano } = normalizarPagina(p);
  return {
    datos,
    pagina,
    tamano,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / tamano)),
  };
}
