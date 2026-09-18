import { apiProgramas, fallarApi } from '../../api';
import type { components } from '../../api/generado/programas';

export type Embarazo = components['schemas']['ProgramaEmbarazoResumenDto'];
export type Hipertenso = components['schemas']['ProgramaHipertensionResumenDto'];
export type HipertensoAtrasado = components['schemas']['HipertensoAtrasadoDto'];

interface Pagina<T> {
  datos: T[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

export type PaginaEmbarazos = Pagina<Embarazo>;
export type PaginaHipertensos = Pagina<Hipertenso>;

/** Los embarazos en seguimiento, ordenados por fecha probable de parto. */
export async function listarEmbarazos(pagina = 1): Promise<PaginaEmbarazos> {
  const ruta = '/v1/programas/embarazo';
  const { data, error, response } = await apiProgramas.GET(ruta, {
    params: { query: { pagina } } as never,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as PaginaEmbarazos;
}

/**
 * Los de alto riesgo.
 *
 * Es su propio endpoint y no un filtro del listado porque es OTRA pregunta: el
 * listado responde «a quien le toca control», y este responde «a quien no
 * puedo dejar que se me pase». Quien abre el programa por la manana mira este.
 */
export async function embarazosDeAltoRiesgo(): Promise<Embarazo[]> {
  const ruta = '/v1/programas/embarazo/alto-riesgo';
  const { data, error, response } = await apiProgramas.GET(ruta, {});
  if (error || !data) fallarApi(error, ruta, response);
  // Viene paginado como los demas listados, aunque aqui solo interese la
  // primera pagina: el alto riesgo del CAP cabe de sobra en veinticinco.
  return (data as PaginaEmbarazos).datos;
}

export async function listarHipertensos(pagina = 1): Promise<PaginaHipertensos> {
  const ruta = '/v1/programas/hipertension';
  const { data, error, response } = await apiProgramas.GET(ruta, {
    params: { query: { pagina } } as never,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as PaginaHipertensos;
}

/** Quienes ya pasaron su fecha de proximo control. */
export async function hipertensosAtrasados(): Promise<HipertensoAtrasado[]> {
  const ruta = '/v1/programas/hipertension/atrasados';
  const { data, error, response } = await apiProgramas.GET(ruta, {});
  if (error || !data) fallarApi(error, ruta, response);
  return (data as Pagina<HipertensoAtrasado>).datos;
}

/** Como se dice cada clasificacion de presion en la pantalla. */
export const ETIQUETA_PRESION: Record<string, string> = {
  NORMAL: 'Normal',
  ELEVADA: 'Elevada',
  ESTADIO_1: 'Estadio 1',
  ESTADIO_2: 'Estadio 2',
  CRISIS: 'Crisis',
};

export const ETIQUETA_ESTADO: Record<string, string> = {
  ACTIVO: 'Activo',
  EGRESADO: 'Egresado',
  ABANDONO: 'Abandono',
  FALLECIDO: 'Fallecido',
  TRASLADADO: 'Trasladado',
};

/**
 * Cuantos dias pasaron desde una fecha; negativo si todavia no llega.
 *
 * Solo para el listado general, donde lo unico que hay es la fecha del proximo
 * control. La lista de atrasados NO usa esto: el servidor ya manda
 * `diasDeAtraso` hecho, y calcularlo otra vez aqui seria arriesgarse a que las
 * dos cuentas digan cosas distintas.
 */
export function diasDesde(iso: string): number {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  const hoy = new Date();
  const soloHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((soloHoy.getTime() - d.getTime()) / 86_400_000);
}
