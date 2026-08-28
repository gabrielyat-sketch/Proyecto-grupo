import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';

export type ExpedienteEncontrado = components['schemas']['ExpedienteEncontradoDto'];
export type Atencion = components['schemas']['AtencionDto'];
export type Ficha = components['schemas']['FichaDto'];

export interface PaginaAtenciones {
  datos: Atencion[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

/**
 * Busca un expediente por su numero.
 *
 * El numero vive cifrado en la base y se resuelve por su indice ciego, igual
 * que el DPI. Por eso la busqueda es EXACTA: no hay forma de buscar "los que
 * empiezan por 2026" sobre un campo cifrado, y fingir lo contrario obligaria a
 * descifrar los cien mil para comparar.
 */
export async function buscarExpediente(numero: string): Promise<ExpedienteEncontrado> {
  const ruta = '/v1/expedientes/buscar';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: { query: { numero } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/**
 * El historial del expediente, lo mas reciente primero.
 *
 * Paginado siempre: un paciente cronico con veinte anios de controles puede
 * tener cientos de atenciones, y cada una hay que descifrarla.
 */
export async function obtenerHistorial(
  expedienteId: string,
  pagina: number,
): Promise<PaginaAtenciones> {
  const ruta = '/v1/expedientes/{expedienteId}/atenciones';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: { path: { expedienteId }, query: { pagina } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as PaginaAtenciones;
}

/** Una ficha completa: sus problemas, signos, diagnosticos y medicamentos. */
export async function obtenerFicha(id: string): Promise<Ficha> {
  const ruta = '/v1/fichas/{id}';
  const { data, error, response } = await apiUsuarios.GET(ruta, { params: { path: { id } } });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export const NOMBRE_FICHA: Record<string, string> = {
  ADULTO: 'Adulto',
  NEONATO: 'Neonato',
  NINEZ: 'Ninez',
  PRENATAL: 'Prenatal',
};

/**
 * Presion arterial en una sola cadena, como se lee y se dice.
 *
 * "128/82" es la unidad con la que piensa quien la toma; separarla en dos
 * columnas obliga a recomponerla con la vista en cada renglon.
 */
export function presion(sistolica: number | null, diastolica: number | null): string | null {
  if (sistolica === null && diastolica === null) return null;
  return (sistolica ?? '—') + '/' + (diastolica ?? '—');
}

/**
 * El IMC, calculado aqui igual que en la ficha.
 *
 * Nunca se guarda: si viniera de la base podria estar desfasado del peso del
 * que dice venir.
 */
export function imcDe(pesoKg: string | null, tallaCm: string | null): number | null {
  if (!pesoKg || !tallaCm) return null;
  const peso = Number(pesoKg);
  const talla = Number(tallaCm);
  if (!Number.isFinite(peso) || !Number.isFinite(talla) || peso <= 0 || talla <= 0) return null;
  const metros = talla / 100;
  return Math.round((peso / (metros * metros)) * 100) / 100;
}
