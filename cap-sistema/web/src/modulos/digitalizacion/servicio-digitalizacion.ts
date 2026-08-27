import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';

export type ResumenDigitalizacion = components['schemas']['ResumenDigitalizacionDto'];
export type AvanceComunidad = components['schemas']['AvanceComunidadDto'];
export type ExpedienteEnCola = components['schemas']['ExpedienteEnColaDto'];
export type RegistroDigitalizacion = components['schemas']['RegistroDigitalizacionDto'];

export type EstadoDigitalizacion = ExpedienteEnCola['estado'];

export interface PaginaCola {
  datos: ExpedienteEnCola[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

export async function obtenerResumen(): Promise<ResumenDigitalizacion> {
  const ruta = '/v1/digitalizacion/resumen';
  const { data, error, response } = await apiUsuarios.GET(ruta);
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function obtenerComunidades(): Promise<AvanceComunidad[]> {
  const ruta = '/v1/digitalizacion/comunidades';
  const { data, error, response } = await apiUsuarios.GET(ruta);
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function obtenerCola(consulta: {
  comunidadId?: string;
  estado?: EstadoDigitalizacion;
  pagina: number;
}): Promise<PaginaCola> {
  const ruta = '/v1/digitalizacion/cola';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: {
      query: {
        ...(consulta.comunidadId ? { comunidadId: consulta.comunidadId } : {}),
        ...(consulta.estado ? { estado: consulta.estado } : {}),
        pagina: consulta.pagina,
      },
    },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as PaginaCola;
}

/**
 * Cambia el estado de una carpeta en el archivo.
 *
 * Lo hace quien la tiene en la mano: recepcion cuando no la encuentra,
 * enfermeria cuando termina de transcribirla.
 */
export async function marcarExpediente(
  expedienteId: string,
  estado: EstadoDigitalizacion,
  observaciones?: string,
): Promise<RegistroDigitalizacion> {
  const ruta = '/v1/digitalizacion/{expedienteId}';
  const { data, error, response } = await apiUsuarios.PATCH(ruta, {
    params: { path: { expedienteId } },
    body: { estado, ...(observaciones ? { observaciones } : {}) } as never,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  COMPLETO: 'Completo',
  NO_LOCALIZADO: 'No localizado',
};
