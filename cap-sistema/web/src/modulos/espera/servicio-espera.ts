import { apiUsuarios, fallarApi } from '../../api';
import type { components } from '../../api/generado/usuarios';

export type VisitaEnEspera = components['schemas']['VisitaEnEsperaDto'];
export type Visita = components['schemas']['VisitaDto'];

/**
 * Marca que un paciente llego al CAP.
 *
 * Es lo unico que el sistema no puede deducir por su cuenta: un paciente
 * registrado hace anios y uno que acaba de entrar por la puerta son identicos
 * en la base hasta que alguien lo dice.
 */
export async function marcarLlegada(pacienteId: string, motivo?: string): Promise<Visita> {
  const ruta = '/v1/visitas';
  const { data, error, response } = await apiUsuarios.POST(ruta, {
    body: { pacienteId, ...(motivo ? { motivo } : {}) },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function obtenerSalaDeEspera(): Promise<VisitaEnEspera[]> {
  const ruta = '/v1/visitas/espera';
  const { data, error, response } = await apiUsuarios.GET(ruta);
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/** Se fue sin que lo atendieran. El motivo es obligatorio. */
export async function retirarVisita(id: string, motivo: string): Promise<Visita> {
  const ruta = '/v1/visitas/{id}/retiro';
  const { data, error, response } = await apiUsuarios.PATCH(ruta, {
    params: { path: { id } },
    body: { motivo },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/**
 * Como se dice el tiempo de espera.
 *
 * En minutos hasta la hora, y despues en horas y minutos: "95 minutos" obliga a
 * dividir mentalmente para saber si alguien lleva mucho, y quien mira esta
 * lista lo hace de paso, entre paciente y paciente.
 */
export function esperaEnPalabras(minutos: number): string {
  if (minutos < 1) return 'Recien llegado';
  if (minutos < 60) return minutos + ' min';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas + ' h' + (resto > 0 ? ' ' + resto + ' min' : '');
}

/** A partir de una hora esperando, la fila deja de ser normal. */
export const ESPERA_LARGA_MINUTOS = 60;
