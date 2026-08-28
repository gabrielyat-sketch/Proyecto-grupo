import { apiMedicamentos, fallarApi } from '../../api';
import type { components } from '../../api/generado/medicamentos';
import type { MedicamentoDetalle, Pagina } from './servicio-farmacia';

export type Entrega = components['schemas']['EntregaDto'];
export type MedicamentoEntregado = components['schemas']['MedicamentoEntregadoDto'];
export type RegistrarEntrega = components['schemas']['RegistrarEntregaDto'];

/** Una línea del despacho, tal como se va armando en la pantalla. */
export interface LineaDespacho {
  medicamentoId: string;
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  /**
   * Lo que de verdad se puede entregar de este medicamento hoy.
   *
   * NO es el campo `existencia` del catálogo. Ese suma todos los lotes en
   * estado DISPONIBLE **incluidos los vencidos**, y la selección FEFO nunca
   * toma de un lote vencido. Un medicamento con 45 tabletas vencidas figura
   * con existencia 45 y no se puede entregar ni una.
   */
  disponible: number;
}

/**
 * Registra la entrega.
 *
 * Se llama UNA vez y no se reintenta. El cliente de API renueva el token
 * *antes* de enviar y nunca reintenta tras un 401, precisamente para que esta
 * petición no llegue dos veces: una entrega repetida descuenta el inventario
 * dos veces por medicamento que salió una sola.
 */
export async function registrarEntrega(cuerpo: RegistrarEntrega): Promise<Entrega> {
  const ruta = '/v1/entregas';
  const { data, error, response } = await apiMedicamentos.POST(ruta, { body: cuerpo });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function listarEntregas(
  pagina: number,
  pacienteId?: string,
): Promise<Pagina<Entrega>> {
  const ruta = '/v1/entregas';
  const { data, error, response } = await apiMedicamentos.GET(ruta, {
    params: { query: { pagina, ...(pacienteId ? { pacienteId } : {}) } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as Pagina<Entrega>;
}

/**
 * Cuánto se puede entregar hoy de un medicamento.
 *
 * Suma solo los lotes disponibles que NO están vencidos, que es exactamente lo
 * que va a mirar la selección FEFO del servidor. Calcularlo aquí permite avisar
 * antes de enviar, en vez de dejar que el servidor devuelva un 409 después de
 * que la persona ya escribió la receta entera.
 */
export function existenciaEntregable(medicamento: MedicamentoDetalle): number {
  return medicamento.lotes
    .filter((l) => l.estado === 'DISPONIBLE' && l.vencimiento !== 'VENCIDO')
    .reduce((suma, l) => suma + l.cantidadDisponible, 0);
}

/**
 * Los roles que registran una entrega.
 *
 * Copiado del `@Roles` de `POST /v1/entregas`. El médico ve el historial —le
 * sirve saber si su paciente recogió el tratamiento— pero no despacha.
 */
export const PUEDE_ENTREGAR: readonly string[] = ['FARMACIA', 'ADMINISTRADOR'];

/** Los roles que consultan el historial, del `@Roles` del `GET`. */
export const PUEDE_VER_ENTREGAS: readonly string[] = [
  'FARMACIA',
  'ADMINISTRADOR',
  'DIRECTOR',
  'MEDICO',
];

/** Fecha y hora de una entrega, como se lee en un comprobante. */
export function fechaHora(valor: string | Date): string {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  return fecha.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
