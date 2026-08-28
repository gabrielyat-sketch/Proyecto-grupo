import { apiMedicamentos, fallarApi } from '../../api';
import type { components } from '../../api/generado/medicamentos';

export type MedicamentoConExistencia = components['schemas']['MedicamentoConExistenciaDto'];
export type MedicamentoDetalle = components['schemas']['MedicamentoDetalleDto'];
export type Medicamento = components['schemas']['MedicamentoDto'];
export type MedicamentoBajoMinimo = components['schemas']['MedicamentoBajoMinimoDto'];
export type LoteDelMedicamento = components['schemas']['LoteDelMedicamentoDto'];
export type LotePorVencer = components['schemas']['LotePorVencerDto'];
export type LoteVencido = components['schemas']['LoteVencidoDto'];
export type CrearMedicamento = components['schemas']['CrearMedicamentoDto'];
export type ActualizarMedicamento = components['schemas']['ActualizarMedicamentoDto'];
export type IngresarLote = components['schemas']['IngresarLoteDto'];

/** Forma de las respuestas paginadas del servicio. */
export interface Pagina<T> {
  datos: T[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

/**
 * Quien puede hacer qué en farmacia.
 *
 * Copiado de los `@Roles` de cada controlador del servicio, no inventado aquí.
 * Igual que en el menú: ofrecerle a alguien un botón que el servidor le va a
 * negar con un 403 le hace creer que el sistema falla, cuando en realidad está
 * haciendo lo correcto. El control de acceso real sigue estando en el guard del
 * backend; esto solo decide qué se dibuja.
 */
export const PUEDE_ADMINISTRAR: readonly string[] = ['FARMACIA', 'ADMINISTRADOR'];

/**
 * Las alertas de lote son de farmacia, no de quien receta.
 *
 * `GET /v1/lotes/por-vencer` y `/vencidos` los guarda el controlador para
 * Farmacia, Administrador y Director. El médico consulta existencias —para no
 * recetar lo que no hay— pero el vencimiento del estante no es asunto suyo.
 */
export const PUEDE_VER_LOTES: readonly string[] = ['FARMACIA', 'ADMINISTRADOR', 'DIRECTOR'];

export const puede = (rol: string | undefined, permiso: readonly string[]): boolean =>
  rol !== undefined && permiso.includes(rol);

// ─────────────────────────────── catálogo ───────────────────────────────

/**
 * El catálogo con la existencia total de cada medicamento.
 *
 * La búsqueda sí es por prefijo, al revés que la del expediente: aquí el
 * nombre viaja en claro —un medicamento no es un dato personal— y el servidor
 * la resuelve con un índice sobre `nombre_generico`. Por eso puede buscar
 * mientras se escribe, y por eso el servidor exige al menos dos letras.
 */
export async function listarCatalogo(
  buscar: string,
  pagina: number,
  incluirInactivos = false,
): Promise<Pagina<MedicamentoConExistencia>> {
  const ruta = '/v1/medicamentos';
  const { data, error, response } = await apiMedicamentos.GET(ruta, {
    params: {
      query: {
        ...(buscar.length >= 2 ? { buscar } : {}),
        ...(incluirInactivos ? { incluirInactivos: 'true' } : {}),
        pagina,
      },
    },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as Pagina<MedicamentoConExistencia>;
}

export async function obtenerMedicamento(id: string): Promise<MedicamentoDetalle> {
  const ruta = '/v1/medicamentos/{id}';
  const { data, error, response } = await apiMedicamentos.GET(ruta, {
    params: { path: { id } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function crearMedicamento(cuerpo: CrearMedicamento): Promise<Medicamento> {
  const ruta = '/v1/medicamentos';
  const { data, error, response } = await apiMedicamentos.POST(ruta, { body: cuerpo });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function actualizarMedicamento(
  id: string,
  cuerpo: ActualizarMedicamento,
): Promise<Medicamento> {
  const ruta = '/v1/medicamentos/{id}';
  const { data, error, response } = await apiMedicamentos.PATCH(ruta, {
    params: { path: { id } },
    body: cuerpo,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

// ──────────────────────────────── lotes ────────────────────────────────

export async function ingresarLote(
  medicamentoId: string,
  cuerpo: IngresarLote,
): Promise<components['schemas']['LoteDto']> {
  const ruta = '/v1/medicamentos/{medicamentoId}/lotes';
  const { data, error, response } = await apiMedicamentos.POST(ruta, {
    params: { path: { medicamentoId } },
    body: cuerpo,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function listarPorVencer(pagina: number): Promise<Pagina<LotePorVencer>> {
  const ruta = '/v1/lotes/por-vencer';
  const { data, error, response } = await apiMedicamentos.GET(ruta, {
    params: { query: { pagina } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as Pagina<LotePorVencer>;
}

export async function listarVencidos(pagina: number): Promise<Pagina<LoteVencido>> {
  const ruta = '/v1/lotes/vencidos';
  const { data, error, response } = await apiMedicamentos.GET(ruta, {
    params: { query: { pagina } },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as Pagina<LoteVencido>;
}

export async function darDeBajaLote(
  id: string,
  motivo: string,
): Promise<components['schemas']['LoteDto']> {
  const ruta = '/v1/lotes/{id}/baja';
  const { data, error, response } = await apiMedicamentos.PATCH(ruta, {
    params: { path: { id } },
    body: { motivo },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function listarBajoMinimo(): Promise<MedicamentoBajoMinimo[]> {
  const ruta = '/v1/medicamentos/bajo-minimo';
  const { data, error, response } = await apiMedicamentos.GET(ruta);
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

// ─────────────────────────── cómo se presenta ───────────────────────────

/**
 * Cómo se dice cada unidad en la pantalla.
 *
 * `JARABE_ML` en la base es "ml" en el mostrador. Mostrar la constante del
 * enum obligaría al personal a traducirla mentalmente en cada renglón.
 */
export const ETIQUETA_UNIDAD: Record<string, string> = {
  TABLETA: 'tabletas',
  CAPSULA: 'capsulas',
  JARABE_ML: 'ml',
  AMPOLLA: 'ampollas',
  FRASCO: 'frascos',
  SOBRE: 'sobres',
  UNIDAD: 'unidades',
  GRAMO: 'gramos',
};

export const ETIQUETA_ESTADO_LOTE: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  AGOTADO: 'Agotado',
  VENCIDO: 'Vencido',
  DADO_DE_BAJA: 'Dado de baja',
};

/** Existencia con su unidad: "320 tabletas", no "320". */
export function conUnidad(cantidad: number, unidad: string): string {
  return cantidad + ' ' + (ETIQUETA_UNIDAD[unidad] ?? unidad.toLowerCase());
}

/**
 * Las fechas llegan como `aaaa-mm-dd` y se muestran sin construir un `Date`
 * a partir de la cadena entera.
 *
 * Guatemala es UTC-6: `new Date('2027-08-31')` se interpreta como medianoche
 * UTC, que en Purulhá es todavía el 30 de agosto. Un lote parecería vencer un
 * día antes de lo impreso en la caja. Se parte la cadena y se arma la fecha en
 * hora local.
 */
export function fechaCorta(valor: string | Date | null | undefined): string {
  if (!valor) return '—';
  const texto = typeof valor === 'string' ? valor : valor.toISOString();
  const [anio, mes, dia] = texto.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return '—';
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Cuánto falta para vencer, dicho como lo diría una persona.
 *
 * "en 3 meses" y "en 12 días" se entienden de un vistazo; "en 87 días" obliga a
 * dividir. Por debajo de dos meses se dice en días, porque ahí la diferencia
 * entre 20 y 50 días sí cambia lo que hay que hacer con ese lote.
 */
export function faltanPara(dias: number): string {
  if (dias < 0) return 'Vencido';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence manana';
  if (dias < 60) return 'En ' + dias + ' dias';
  const meses = Math.round(dias / 30);
  return 'En ' + meses + ' meses';
}

/** Días transcurridos desde el vencimiento, dichos igual. */
export function vencidoHace(dias: number): string {
  if (dias <= 0) return 'Vence hoy';
  if (dias === 1) return 'Vencio ayer';
  if (dias < 60) return 'Hace ' + dias + ' dias';
  const meses = Math.round(dias / 30);
  return 'Hace ' + meses + ' meses';
}

/**
 * Qué tan urgente es un lote por vencer.
 *
 * El corte en 30 días no es decorativo: por debajo de un mes ya no da tiempo
 * a devolverlo al proveedor ni a redistribuirlo a otro servicio de salud, así
 * que lo único que queda es usarlo o perderlo.
 */
export const URGENTE_DIAS = 30;
