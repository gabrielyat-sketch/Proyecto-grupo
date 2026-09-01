import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';

export type Carpeta = components['schemas']['GrupoFamiliarResumenDto'];

/**
 * Las carpetas familiares del archivero del CAP.
 *
 * El CAP no archiva por persona sino por familia: un folder de carton con un
 * numero escrito en la pestana, rotulado con el apellido y guardado por el
 * lugar donde vive. Registrar a alguien es meterlo en su carpeta.
 */

/**
 * El siguiente numero libre donde vive esta familia.
 *
 * Es lo que se le muestra a quien registra para que no tenga que ir al
 * archivero a mirar por cual van. La serie es el barrio o caserio, y la
 * comunidad cuando no hay barrio.
 */
export async function siguienteNumeroDeCarpeta(
  comunidadId: string,
  lugarId?: string,
): Promise<number> {
  const ruta = '/v1/grupos-familiares/siguiente-numero';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: { query: { comunidadId, ...(lugarId ? { lugarId } : {}) } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data.numero;
}

/**
 * Las carpetas que coinciden con un apellido en un lugar.
 *
 * Devuelve varias a proposito: dos familias del mismo apellido pueden vivir en
 * el mismo caserio sin ser parientes, y meter a alguien en la carpeta
 * equivocada mezcla dos historias clinicas. Quien registra elige.
 */
export async function buscarCarpetas(
  comunidadId: string,
  apellidos: string,
  lugarId?: string,
): Promise<Carpeta[]> {
  const ruta = '/v1/grupos-familiares';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: {
      query: {
        comunidadId,
        apellidos,
        ...(lugarId ? { lugarId } : {}),
        tamano: 25,
      },
    },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data.datos;
}

/** Como se escribe una carpeta en una sola linea. */
export function rotuloDeCarpeta(c: Carpeta): string {
  return (
    'Familia ' + c.apellidos + ' · ' + (c.lugar?.nombre ?? c.comunidad.nombre) + ' · No. ' + c.numero
  );
}
