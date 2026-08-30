import { apiUsuarios, fallarApi } from '../../../api';
import type { components } from '../../../api/generado/usuarios';

export type CatalogoCarnet = components['schemas']['CatalogoCarnetDto'];
export type VacunaCatalogo = components['schemas']['VacunaCatalogoDto'];
export type MicronutrienteCatalogo = components['schemas']['MicronutrienteCatalogoDto'];
export type Carnet = components['schemas']['CarnetDto'];
export type GuardarCarnet = components['schemas']['GuardarCarnetDto'];
export type TramoEdad = components['schemas']['EntregaEsperadaDto']['tramo'];

/**
 * El esquema impreso: qué vacunas hay y qué dosis aplican a cada una.
 *
 * No contiene dato de ningún paciente, así que se puede guardar en caché mucho
 * tiempo: solo cambia cuando el MSPAS reimprime el formulario.
 */
export async function obtenerCatalogoCarnet(): Promise<CatalogoCarnet> {
  const ruta = '/v1/carnet/catalogo';
  const { data, error, response } = await apiUsuarios.GET(ruta);
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function obtenerCarnet(pacienteId: string): Promise<Carnet> {
  const ruta = '/v1/pacientes/{pacienteId}/carnet';
  const { data, error, response } = await apiUsuarios.GET(ruta, {
    params: { path: { pacienteId } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/**
 * Anota o corrige el carnet.
 *
 * Solo viaja lo que cambió. La página 1 se llena a lo largo de años y casi
 * nunca se toca entera: mandar el carnet completo obligaría a reenviar dosis
 * puestas hace tres años, y bastaría un fallo de red para reescribirlas.
 */
export async function guardarCarnet(
  pacienteId: string,
  cambios: GuardarCarnet,
): Promise<Carnet> {
  const ruta = '/v1/pacientes/{pacienteId}/carnet';
  const { data, error, response } = await apiUsuarios.PATCH(ruta, {
    params: { path: { pacienteId } },
    body: cambios,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}
