import { almacenSesion, apiAuthPublico, ErrorApi, errorDeRed } from '../../api';
import type { components } from '../../api/generado/auth';

type SesionAbierta = components['schemas']['SesionAbiertaDto'];
type MfaRequerido = components['schemas']['MfaRequeridoDto'];
export type ConfiguracionMfa = components['schemas']['ConfiguracionMfaDto'];

/** Resultado de un intento de entrar. Los tres estados posibles del login. */
export type ResultadoEntrada =
  | { tipo: 'sesion' }
  | { tipo: 'pide-codigo'; tokenParcial: string }
  | { tipo: 'configurar-mfa'; tokenParcial: string };

function fallar(error: unknown, ruta: string): never {
  // openapi-fetch entrega el cuerpo del error ya interpretado; si no hay
  // cuerpo, es que el servicio no respondio.
  if (error && typeof error === 'object' && 'mensaje' in error) {
    throw new ErrorApi(400, error as ErrorApi['cuerpo']);
  }
  throw errorDeRed(ruta);
}

export async function entrar(usuario: string, contrasena: string): Promise<ResultadoEntrada> {
  const { data, error } = await apiAuthPublico.POST('/v1/auth/login', {
    body: { usuario, contrasena },
  });
  if (error || !data) fallar(error, '/v1/auth/login');

  // La union viene discriminada por mfaRequerido: TypeScript no deja leer
  // tokenAcceso sin comprobarlo antes.
  if (data.mfaRequerido) {
    const pendiente = data as MfaRequerido;
    return pendiente.configuracionPendiente
      ? { tipo: 'configurar-mfa', tokenParcial: pendiente.tokenParcial }
      : { tipo: 'pide-codigo', tokenParcial: pendiente.tokenParcial };
  }

  const abierta = data as SesionAbierta;
  almacenSesion.guardar({
    tokenAcceso: abierta.tokenAcceso,
    tokenRefresco: abierta.tokenRefresco,
    usuario: abierta.usuario,
  });
  return { tipo: 'sesion' };
}

export async function verificarCodigo(tokenParcial: string, codigo: string): Promise<void> {
  const { data, error } = await apiAuthPublico.POST('/v1/auth/mfa/verificar', {
    body: { tokenParcial, codigo },
  });
  if (error || !data) fallar(error, '/v1/auth/mfa/verificar');

  almacenSesion.guardar({
    tokenAcceso: data.tokenAcceso,
    tokenRefresco: data.tokenRefresco,
    usuario: data.usuario,
  });
}

/** Primera configuracion: devuelve el QR, el secreto y los codigos de respaldo. */
export async function configurarMfaInicial(tokenParcial: string): Promise<ConfiguracionMfa> {
  const { data, error } = await apiAuthPublico.POST('/v1/auth/mfa/configurar-inicial', {
    body: { tokenParcial },
  });
  if (error || !data) fallar(error, '/v1/auth/mfa/configurar-inicial');
  return data;
}

/** Confirma la primera configuracion. Deja la sesion abierta. */
export async function activarMfaInicial(tokenParcial: string, codigo: string): Promise<void> {
  const { data, error } = await apiAuthPublico.POST('/v1/auth/mfa/activar-inicial', {
    body: { tokenParcial, codigo },
  });
  if (error || !data) fallar(error, '/v1/auth/mfa/activar-inicial');

  almacenSesion.guardar({
    tokenAcceso: data.tokenAcceso,
    tokenRefresco: data.tokenRefresco,
    usuario: data.usuario,
  });
}

export async function salir(): Promise<void> {
  const sesion = almacenSesion.obtener();
  // Se limpia SIEMPRE, aunque la peticion falle. Si el servidor no responde y
  // dejaramos la sesion abierta en pantalla, la siguiente persona del turno
  // encontraria el panel de la anterior.
  almacenSesion.limpiar();
  if (!sesion) return;
  try {
    await apiAuthPublico.POST('/v1/auth/cerrar-sesion', {
      body: { tokenRefresco: sesion.tokenRefresco },
    });
  } catch {
    // El token de refresco expira solo; no hay nada mas que hacer aqui.
  }
}
