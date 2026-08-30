import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';

export type CatalogoFicha = components['schemas']['CatalogoFichaDto'];
export type ProblemaCatalogo = components['schemas']['ProblemaCatalogoDto'];
export type SignoPeligroCatalogo = components['schemas']['SignoPeligroCatalogoDto'];
export type AntecedenteCatalogo = components['schemas']['AntecedenteCatalogoDto'];
export type OpcionCatalogo = components['schemas']['OpcionCatalogoDto'];
export type DiagnosticoCatalogo = components['schemas']['DiagnosticoCatalogoDto'];

export type NuevaFicha = components['schemas']['CrearFichaDto'];
export type FichaCreada = components['schemas']['FichaCreadaDto'];
export type Paciente = components['schemas']['PacienteDto'];

export type AntecedentesPaciente = components['schemas']['AntecedentesPacienteDto'];
export type GuardarAntecedentes = components['schemas']['GuardarAntecedentesDto'];

export type TipoFicha = NuevaFicha['tipoFicha'];

/**
 * La estructura del formulario impreso: signos de peligro, antecedentes y la
 * matriz de problemas con sus signos y diagnosticos.
 *
 * No contiene dato de ningun paciente, asi que se puede guardar en cache mucho
 * tiempo: solo cambia cuando el MSPAS reimprime el formulario.
 */
export async function obtenerCatalogo(tipo: TipoFicha): Promise<CatalogoFicha> {
  const ruta = '/v1/fichas/catalogo/{tipo}';
  const { data, error, response } = await apiUsuarios.GET(ruta, { params: { path: { tipo } } });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function obtenerPaciente(id: string): Promise<Paciente> {
  const ruta = '/v1/pacientes/{id}';
  const { data, error, response } = await apiUsuarios.GET(ruta, { params: { path: { id } } });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function obtenerAntecedentes(pacienteId: string): Promise<AntecedentesPaciente> {
  const ruta = '/v1/pacientes/{pacienteId}/antecedentes';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: { path: { pacienteId } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/**
 * Los antecedentes se guardan APARTE de la ficha, y antes que ella.
 *
 * No es un capricho de implementacion: pertenecen al paciente, no a la consulta
 * de hoy. Que alguien tuvo diabetes sigue siendo cierto en la siguiente visita,
 * asi que vivir dentro de una ficha obligaria a volver a preguntar lo mismo
 * cada vez.
 */
export async function guardarAntecedentes(
  pacienteId: string,
  cambios: GuardarAntecedentes,
): Promise<AntecedentesPaciente> {
  const ruta = '/v1/pacientes/{pacienteId}/antecedentes';
  const { data, error, response } = await apiUsuarios.PATCH(ruta, {
    params: { path: { pacienteId } },
    body: cambios,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function registrarFicha(
  expedienteId: string,
  ficha: NuevaFicha,
): Promise<FichaCreada> {
  const ruta = '/v1/expedientes/{expedienteId}/fichas';
  const { data, error, response } = await apiUsuarios.POST(ruta, {
    params: { path: { expedienteId } },
    body: ficha,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/**
 * El servicio de salud que llena la ficha, que siempre es el mismo.
 *
 * Las cuatro hojas del MSPAS abren pidiéndolo —tipo de servicio, nombre y área
 * de salud— porque el formulario se imprime igual para todo el país. Aquí no
 * se pregunta: el sistema corre en un solo establecimiento, y una casilla que
 * solo admite una respuesta es una casilla que alguien puede equivocar.
 *
 * Si el CAP algún día comparte el sistema con otro servicio, esto deja de ser
 * una constante y pasa a ser configuración del establecimiento.
 */
export const SERVICIO_DE_SALUD = {
  /** De las seis casillas del papel —PSF, C/S «A», CENAPA, C/S «B», CAP, CAIMI—. */
  tipo: 'CAP',
  nombre: 'CAP Purulhá',
  areaDeSalud: 'Baja Verapaz',

  /**
   * La ficha del lactante y niñez pide además distrito y comunidad del
   * servicio; la del neonato no.
   *
   * ⚠️ **Nadie del CAP los ha confirmado todavía.** El distrito de salud es una
   * división administrativa del MSPAS y la comunidad del servicio no tiene por
   * qué ser la del paciente. Van en `null` a propósito: la pantalla dice que
   * están sin confirmar en vez de imprimir un dato inventado en una ficha
   * oficial.
   */
  distrito: null as string | null,
  comunidad: null as string | null,
} as const;

/** Lo que se enseña de un dato del servicio que el CAP aún no ha confirmado. */
export const SIN_CONFIRMAR = 'Pendiente de confirmar';
