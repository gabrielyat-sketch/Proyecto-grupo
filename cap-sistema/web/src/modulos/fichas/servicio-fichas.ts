import { apiUsuarios, fallarApi } from '../../api';
import { almacenSesion } from '../../api/sesion-almacen';
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
 * El servicio de salud que llena la ficha.
 *
 * Las cuatro hojas del MSPAS abren pidiéndolo —tipo de servicio, nombre y área
 * de salud— porque el formulario se imprime igual para todo el país.
 *
 * El TIPO ya no es fijo: el CAP pidió (30 sep 2026) marcar la casilla a mano
 * en cada ficha, porque el establecimiento puede cambiar. Ver
 * `CASILLAS_SERVICIO`. `tipo` queda como lo que imprimen las fichas guardadas
 * antes de ese cambio, que eran todas del CAP.
 */
export const SERVICIO_DE_SALUD = {
  /** Lo que se asume en las fichas anteriores a la casilla. */
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

// ─────────────────────── servicio y quien atiende ───────────────────────

export type TipoServicio = components['schemas']['TipoServicioSalud'];

/** Una casilla del establecimiento: el valor que se guarda y cómo se imprime. */
export interface CasillaServicio {
  valor: TipoServicio;
  texto: string;
}

/**
 * Las casillas de «Identificación del establecimiento de salud», en el orden
 * del papel.
 *
 * Las hojas de adultos y prenatal traen nueve; las de neonato y niñez, seis y
 * en otro orden. Se copian tal cual para que la pantalla y la hoja impresa se
 * lean igual.
 */
export const CASILLAS_SERVICIO: Record<'COMPLETAS' | 'NINOS', readonly CasillaServicio[]> = {
  COMPLETAS: [
    { valor: 'PS', texto: 'PS' },
    { valor: 'PSF', texto: 'PSF' },
    { valor: 'CS_B', texto: 'C/S "B"' },
    { valor: 'CENAPA', texto: 'CENAPA' },
    { valor: 'CS_A', texto: 'C/S "A"' },
    { valor: 'CAP', texto: 'CAP' },
    { valor: 'CAIMI', texto: 'CAIMI' },
    { valor: 'CUM', texto: 'CUM' },
    { valor: 'HOSPITAL', texto: 'HOSPITAL' },
  ],
  NINOS: [
    { valor: 'PSF', texto: 'PSF' },
    { valor: 'CS_A', texto: 'C/S "A"' },
    { valor: 'CENAPA', texto: 'CENAPA' },
    { valor: 'CS_B', texto: 'C/S "B"' },
    { valor: 'CAP', texto: 'CAP' },
    { valor: 'CAIMI', texto: 'CAIMI' },
  ],
};

/**
 * El texto impreso de la casilla guardada.
 *
 * Las fichas anteriores a la casilla no la tienen: eran todas del CAP, y así
 * se siguen imprimiendo, igual que antes del cambio.
 */
export function textoDelServicio(tipo: string | null | undefined): string {
  if (!tipo) return SERVICIO_DE_SALUD.tipo;
  return CASILLAS_SERVICIO.COMPLETAS.find((c) => c.valor === tipo)?.texto ?? tipo;
}

/** El rol dicho como cargo, para «Nombre y cargo de la persona que atendió». */
const CARGO_DEL_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administración',
  DIRECTOR: 'Dirección',
  MEDICO: 'Médico',
  ENFERMERIA: 'Enfermería',
  FARMACIA: 'Farmacia',
  RECEPCION: 'Recepción',
};

/**
 * «Nombre y cargo de la persona que atendió», ya escrito con quien tiene la
 * sesión abierta.
 *
 * Es solo el valor inicial: la casilla se puede corregir, porque a veces
 * captura una persona lo que atendió otra —la digitalización del papel es
 * justo eso—. Una sesión abierta antes de que el perfil trajera el nombre
 * no lo tiene, y entonces se ofrece el usuario.
 */
export function quienAtiendePorDefecto(): string {
  const perfil = almacenSesion.usuario;
  if (!perfil) return '';
  const nombre = [perfil.nombres, perfil.apellidos].filter(Boolean).join(' ').trim() || perfil.usuario;
  const cargo = CARGO_DEL_ROL[perfil.rol];
  return cargo ? nombre + ' — ' + cargo : nombre;
}
