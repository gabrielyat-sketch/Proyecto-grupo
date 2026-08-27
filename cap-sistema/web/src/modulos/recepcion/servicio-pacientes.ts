import { apiUsuarios, ErrorApi, errorDeRed } from '../../api';
import type { components } from '../../api/generado/usuarios';
import type { Criterio } from './busqueda';

export type PacienteResumen = components['schemas']['PacienteResumenDto'];
export type PacienteCreado = components['schemas']['PacienteCreadoDto'];
export type Comunidad = components['schemas']['ComunidadDto'];
export type NuevoPaciente = components['schemas']['CrearPacienteDto'];

export interface PaginaPacientes {
  datos: PacienteResumen[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

function fallar(error: unknown, ruta: string): never {
  if (error && typeof error === 'object' && 'mensaje' in error) {
    throw new ErrorApi(400, error as ErrorApi['cuerpo']);
  }
  throw errorDeRed(ruta);
}

export async function buscarPacientes(
  criterio: Criterio,
  comunidadId: string | undefined,
  pagina: number,
): Promise<PaginaPacientes> {
  const { data, error } = await apiUsuarios.GET('/v1/pacientes', {
    params: {
      query: {
        ...(criterio.tipo === 'dpi' ? { dpi: criterio.dpi } : {}),
        ...(criterio.tipo === 'nombre' ? { nombre: criterio.nombre } : {}),
        ...(comunidadId ? { comunidadId } : {}),
        pagina,
      },
    },
  });
  if (error || !data) fallar(error, '/v1/pacientes');
  return data as PaginaPacientes;
}

export async function listarComunidades(): Promise<Comunidad[]> {
  const { data, error } = await apiUsuarios.GET('/v1/comunidades', { params: { query: {} } });
  if (error || !data) fallar(error, '/v1/comunidades');
  return data;
}

export async function crearPaciente(paciente: NuevoPaciente): Promise<PacienteCreado> {
  const { data, error } = await apiUsuarios.POST('/v1/pacientes', { body: paciente });
  if (error || !data) fallar(error, '/v1/pacientes');
  return data;
}
