import createClient, { type Middleware } from 'openapi-fetch';
import type { paths as RutasAuth } from './generado/auth';
import type { paths as RutasUsuarios } from './generado/usuarios';
import type { paths as RutasProgramas } from './generado/programas';
import type { paths as RutasMedicamentos } from './generado/medicamentos';
import { almacenSesion } from './sesion-almacen';
import { estaVigente } from './token';

/**
 * Un cliente por servicio, tipado contra su contrato.
 *
 * Las rutas base son relativas a proposito. En desarrollo las reescribe el proxy
 * de Vite hacia los puertos 3001-3004; en produccion las resuelve el gateway de
 * nginx. El codigo del frontend es el mismo en los dos casos.
 */
/**
 * Se ancla al origen de la propia pagina. El resultado es el mismo que una ruta
 * relativa —siempre apunta a donde esta servido el panel—, pero queda absoluta.
 *
 * Hace falta porque el constructor `Request` de Node exige URL absoluta, y las
 * pruebas corren sobre Node aunque simulen un navegador. Con rutas relativas
 * fallaban con ERR_INVALID_URL sin que hubiera nada mal en el codigo.
 */
const ORIGEN = typeof window === 'undefined' ? '' : window.location.origin;

const BASES = {
  auth: ORIGEN + '/api/auth',
  usuarios: ORIGEN + '/api/usuarios',
  programas: ORIGEN + '/api/programas',
  medicamentos: ORIGEN + '/api/medicamentos',
} as const;

/**
 * Cliente sin middleware, exclusivo para renovar la sesion.
 *
 * Si el refresco pasara por el middleware, un 401 al renovar dispararia otro
 * refresco, y ese otro, y asi. Este cliente rompe el ciclo.
 */
const clienteSinSesion = createClient<RutasAuth>({
  baseUrl: BASES.auth,
  fetch: (peticion) => fetch(peticion),
});

/**
 * Una sola renovacion a la vez.
 *
 * El panel lanza varias peticiones en paralelo al abrir una pantalla. Si el
 * token vencio, todas intentarian renovar a la vez; como el token de refresco es
 * ROTATORIO, la segunda llegaria con uno ya usado y el servidor —que detecta
 * reutilizacion— revocaria la sesion entera. El usuario perderia la sesion
 * justo por haber abierto una pantalla con dos consultas.
 */
let renovacionEnCurso: Promise<boolean> | null = null;

async function renovarSesion(): Promise<boolean> {
  const sesion = almacenSesion.obtener();
  if (!sesion) return false;

  const { data, error } = await clienteSinSesion.POST('/v1/auth/refrescar', {
    body: { tokenRefresco: sesion.tokenRefresco },
  });

  if (error || !data) {
    almacenSesion.limpiar();
    return false;
  }

  almacenSesion.renovar(data.tokenAcceso, data.tokenRefresco, data.usuario);
  return true;
}

function renovar(): Promise<boolean> {
  renovacionEnCurso ??= renovarSesion().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
}

const conSesion: Middleware = {
  async onRequest({ request }) {
    const sesion = almacenSesion.obtener();
    if (!sesion) return request;

    // Se renueva ANTES de enviar, no despues de un 401. Reintentar una peticion
    // ya enviada obliga a rearmar el cuerpo, y con un POST de entrega de
    // medicamentos eso arriesga registrarla dos veces.
    if (!estaVigente(sesion.tokenAcceso)) {
      await renovar();
    }

    const token = almacenSesion.tokenAcceso;
    if (token) request.headers.set('Authorization', 'Bearer ' + token);
    return request;
  },

  async onResponse({ response }) {
    // Un 401 con un token que acaba de renovarse significa que la sesion ya no
    // vale: cuenta desactivada, rol cambiado o sesion revocada por el
    // administrador. No se reintenta; se cierra.
    if (response.status === 401 && almacenSesion.autenticado) {
      almacenSesion.limpiar();
    }
    return response;
  },
};

function crear<T extends object>(base: string) {
  const cliente = createClient<T>({ baseUrl: base, fetch: (peticion) => fetch(peticion) });
  cliente.use(conSesion);
  return cliente;
}

export const apiAuth = crear<RutasAuth>(BASES.auth);
export const apiUsuarios = crear<RutasUsuarios>(BASES.usuarios);
export const apiProgramas = crear<RutasProgramas>(BASES.programas);
export const apiMedicamentos = crear<RutasMedicamentos>(BASES.medicamentos);

/** Para el login y el MFA, que ocurren cuando todavia no hay sesion. */
export { clienteSinSesion as apiAuthPublico };
