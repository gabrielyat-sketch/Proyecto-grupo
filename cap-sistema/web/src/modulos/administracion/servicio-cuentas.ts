import { apiAuth, fallarApi } from '../../api';
import type { components } from '../../api/generado/auth';
import { ROLES, type Rol } from '../../navegacion/menu';

export type Cuenta = components['schemas']['CuentaDto'];
export type CuentaCreada = components['schemas']['CuentaCreadaDto'];
export type ContrasenaRestablecida = components['schemas']['ContrasenaRestablecidaDto'];
export type CrearCuenta = components['schemas']['CrearUsuarioDto'];
export type ActualizarCuenta = components['schemas']['ActualizarUsuarioDto'];

export interface PaginaCuentas {
  datos: Cuenta[];
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
}

export async function listarCuentas(
  buscar: string,
  rol: string,
  pagina: number,
): Promise<PaginaCuentas> {
  const ruta = '/v1/usuarios';
  const { data, error, response } = await apiAuth.GET(ruta, {
    params: {
      query: {
        ...(buscar.trim() ? { buscar: buscar.trim() } : {}),
        ...(rol ? { rol: rol as never } : {}),
        pagina,
      },
    },
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data as PaginaCuentas;
}

/**
 * Da de alta una cuenta y devuelve su contraseña temporal.
 *
 * Esa contraseña **solo existe en claro en esta respuesta**. No se guarda en
 * ningún lado: si se pierde, la única salida es restablecerla. Por eso la
 * pantalla la muestra en un diálogo que no se cierra de cualquier manera.
 */
export async function crearCuenta(cuerpo: CrearCuenta): Promise<CuentaCreada> {
  const ruta = '/v1/usuarios';
  const { data, error, response } = await apiAuth.POST(ruta, { body: cuerpo });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

export async function actualizarCuenta(id: string, cuerpo: ActualizarCuenta): Promise<Cuenta> {
  const ruta = '/v1/usuarios/{id}';
  const { data, error, response } = await apiAuth.PATCH(ruta, {
    params: { path: { id } },
    body: cuerpo,
  });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

/**
 * Genera una contraseña temporal nueva.
 *
 * Hace tres cosas a la vez, y las tres importan: cambia la contraseña, **cierra
 * todas las sesiones** de esa persona y **le quita el bloqueo** por intentos
 * fallidos. Hoy es la única forma de desbloquear una cuenta.
 */
export async function restablecerContrasena(id: string): Promise<ContrasenaRestablecida> {
  const ruta = '/v1/usuarios/{id}/restablecer-contrasena';
  const { data, error, response } = await apiAuth.POST(ruta, { params: { path: { id } } });
  if (error || !data) fallarApi(error, ruta, response);
  return data;
}

// ─────────────────────────── cómo se presenta ───────────────────────────

/** Los seis roles, como se escriben en pantalla. */
export const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  DIRECTOR: 'Director',
  MEDICO: 'Medico',
  ENFERMERIA: 'Enfermeria',
  FARMACIA: 'Farmacia',
  RECEPCION: 'Recepcion',
};

/** Qué hace cada rol, para elegirlo sin tener que saberse la arquitectura. */
export const QUE_HACE_EL_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administra cuentas y ve todo el sistema. Exige segundo factor.',
  DIRECTOR: 'Consulta indicadores y reportes, sin capturar. Exige segundo factor.',
  MEDICO: 'Atiende, llena fichas clinicas y consulta existencias.',
  ENFERMERIA: 'Atiende, llena fichas y transcribe el archivo de papel.',
  FARMACIA: 'Inventario y entrega de medicamentos. No entra al historial clinico.',
  RECEPCION: 'Registra pacientes y marca llegadas. No entra al historial clinico.',
};

export const LISTA_ROLES: readonly Rol[] = ROLES;

/**
 * Los roles con segundo factor obligatorio (arquitectura §10.3).
 *
 * No por capricho: son las dos cuentas que pueden ver el sistema entero.
 */
export const EXIGEN_MFA: readonly string[] = ['ADMINISTRADOR', 'DIRECTOR'];

/**
 * Cuándo entró por última vez, dicho como lo diría una persona.
 *
 * "Nunca ha entrado" es el dato que más importa de esta columna: una cuenta
 * creada hace tres semanas que nadie usó suele ser una cuenta cuya contraseña
 * temporal se perdió, no alguien de vacaciones.
 */
export function ultimoAccesoEnPalabras(valor: string | Date | null): string {
  if (!valor) return 'Nunca ha entrado';
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  const dias = Math.floor((Date.now() - fecha.getTime()) / 86_400_000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 30) return 'Hace ' + dias + ' dias';
  return fecha.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
