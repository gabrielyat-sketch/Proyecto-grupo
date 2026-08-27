import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';
import type { Criterio } from './busqueda';

export type PacienteResumen = components['schemas']['PacienteResumenDto'];
export type PacienteCreado = components['schemas']['PacienteCreadoDto'];
export type Comunidad = components['schemas']['ComunidadDto'];
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
