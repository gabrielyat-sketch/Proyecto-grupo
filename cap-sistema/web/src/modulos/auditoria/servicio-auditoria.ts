import { apiTrazabilidad, fallarApi } from '../../api';
import type { components } from '../../api/generado/trazabilidad';

export type Registro = components['schemas']['RegistroDto'];
export type Verificacion = components['schemas']['VerificacionDto'];
export type RaizDiaria = components['schemas']['RaizDiariaDto'];

export interface FiltroBitacora {
  servicio?: string;
  accion?: string;
  entidad?: string;
  entidadId?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
  pagina?: number;
}

export interface PaginaBitacora {
  datos: Registro[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

/**
 * La bitacora, lo mas reciente primero.
 *
 * Es una lista que solo crece: cada consulta a un expediente, cada ficha
 * guardada y cada cuenta creada deja una entrada. Por eso se lee siempre
 * filtrada —por dia, por persona, por expediente— y nunca entera.
 */
export async function consultarBitacora(filtro: FiltroBitacora): Promise<PaginaBitacora> {
  const ruta = '/v1/registros';
  const { data, error, response } = await apiTrazabilidad.GET(ruta, {
    params: {
      query: {
        ...(filtro.servicio ? { servicio: filtro.servicio } : {}),
        ...(filtro.accion ? { accion: filtro.accion } : {}),
        ...(filtro.entidad ? { entidad: filtro.entidad } : {}),
        ...(filtro.entidadId ? { entidadId: filtro.entidadId } : {}),
        ...(filtro.usuarioId ? { usuarioId: filtro.usuarioId } : {}),
        ...(filtro.desde ? { desde: filtro.desde } : {}),
        ...(filtro.hasta ? { hasta: filtro.hasta } : {}),
        pagina: filtro.pagina ?? 1,
      },
    } as never,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as PaginaBitacora;
}

/**
 * Recorre la cadena y dice si esta intacta.
 *
 * No necesita las llaves de descifrado: el hash cubre el texto cifrado, asi
 * que comprueba que nadie toco nada sin llegar a leer ningun diagnostico. Esa
 * es la propiedad que la hace util para auditar.
 */
export async function verificarCadena(): Promise<Verificacion> {
  const ruta = '/v1/registros/verificacion';
  const { data, error, response } = await apiTrazabilidad.GET(ruta, {});
  if (error || !data) fallarApi(error, ruta, response);
  return data as Verificacion;
}

/** Los cierres diarios: el sello de cada jornada. */
export async function listarRaices(pagina = 1): Promise<{ datos: RaizDiaria[]; totalPaginas: number }> {
  const ruta = '/v1/raices';
  const { data, error, response } = await apiTrazabilidad.GET(ruta, {
    params: { query: { pagina } } as never,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as { datos: RaizDiaria[]; totalPaginas: number };
}

/** Como se dice cada accion en la pantalla. */
export const ETIQUETA_ACCION: Record<string, string> = {
  CONSULTA: 'Consulta',
  CREACION: 'Creacion',
  MODIFICACION: 'Modificacion',
  ELIMINACION: 'Eliminacion',
  IMPRESION: 'Impresion',
  EXPORTACION: 'Exportacion',
};

/** Y cada servicio, con el nombre del modulo y no el del proceso. */
export const ETIQUETA_SERVICIO: Record<string, string> = {
  usuarios: 'Expedientes y fichas',
  auth: 'Cuentas y acceso',
  programas: 'Programas',
  medicamentos: 'Farmacia',
};
