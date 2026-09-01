import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';
import type { Criterio } from './busqueda';

export type PacienteResumen = components['schemas']['PacienteResumenDto'];
export type PacienteCreado = components['schemas']['PacienteCreadoDto'];
export type Comunidad = components['schemas']['ComunidadDto'];
export type Lugar = components['schemas']['LugarResumenDto'];
export type NuevoPaciente = components['schemas']['CrearPacienteDto'];

/**
 * Como se escribe cada idioma de atencion.
 *
 * El valor guardado es un identificador —QEQCHI— y no se puede mostrar tal cual:
 * en Purulha buena parte del padron habla q'eqchi' y verlo en versalitas sin
 * apostrofo es verlo mal escrito.
 */
export const ETIQUETA_IDIOMA: Record<string, string> = {
  ESPANOL: 'Espanol',
  POQOMCHI: "Poqomchi'",
  QEQCHI: "Q'eqchi'",
  OTRO: 'Otro',
};

export interface PaginaPacientes {
  datos: PacienteResumen[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

export async function buscarPacientes(
  criterio: Criterio,
  comunidadId: string | undefined,
  pagina: number,
): Promise<PaginaPacientes> {
  const { data, error, response } = await apiUsuarios.GET('/v1/pacientes', {
    params: {
      query: {
        ...(criterio.tipo === 'dpi' ? { dpi: criterio.dpi } : {}),
        ...(criterio.tipo === 'nombre' ? { nombre: criterio.nombre } : {}),
        ...(comunidadId ? { comunidadId } : {}),
        pagina,
      },
    },
  });
  if (error || !data) fallarApi(error, '/v1/pacientes', response);
  return data as PaginaPacientes;
}

export async function listarComunidades(): Promise<Comunidad[]> {
  const { data, error, response } = await apiUsuarios.GET('/v1/comunidades', {
    params: { query: {} },
  });
  if (error || !data) fallarApi(error, '/v1/comunidades', response);
  return data;
}

export async function crearPaciente(paciente: NuevoPaciente): Promise<PacienteCreado> {
  const { data, error, response } = await apiUsuarios.POST('/v1/pacientes', { body: paciente });
  if (error || !data) fallarApi(error, '/v1/pacientes', response);
  return data;
}

/**
 * Los barrios, caseríos y aldeas de una comunidad.
 *
 * Devuelve vacío cuando el CAP todavía no ha declarado los de esa comunidad.
 * No es un error: es que nadie ha dicho aún cuáles son, y la pantalla lo dice
 * en vez de mostrar un desplegable vacío sin explicación.
 */
export async function listarLugares(comunidadId: string): Promise<Lugar[]> {
  const ruta = '/v1/comunidades/{id}/lugares';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: { path: { id: comunidadId } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/** Cómo se dice cada tipo de lugar en la pantalla. */
export const ETIQUETA_TIPO_LUGAR: Record<string, string> = {
  BARRIO: 'Barrio',
  CASERIO: 'Caserío',
  ALDEA: 'Aldea',
  OTRO: 'Otro',
};
