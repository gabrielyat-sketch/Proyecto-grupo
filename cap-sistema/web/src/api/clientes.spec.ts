import { apiUsuarios } from './clientes';
import { almacenSesion, type Perfil } from './sesion-almacen';

const USUARIO: Perfil = {
  id: 'u-1',
  usuario: 'jlopez',
  rol: 'RECEPCION',
  debeCambiarContrasena: false,
};

function jwt(segundosDeVida: number): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_');
  return (
    b64({ alg: 'HS256' }) +
    '.' +
    b64({ exp: Math.floor(Date.now() / 1000) + segundosDeVida }) +
    '.firmafalsa'
  );
}

const VIGENTE = jwt(900);
const VENCIDO = jwt(-10);

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

let peticiones: Request[] = [];

/** Devuelve la cabecera Authorization de la enesima peticion registrada. */
const autorizacionDe = (i: number) => peticiones[i]?.headers.get('Authorization');
const rutaDe = (i: number) => new URL(peticiones[i].url, 'http://local').pathname;

beforeEach(() => {
  peticiones = [];
  almacenSesion.limpiar();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function responderCon(handler: (r: Request) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      peticiones.push(entrada);
      return handler(entrada);
    }),
  );
}

describe('cliente de API', () => {
  it('sin sesion no manda cabecera de autorizacion', async () => {
    responderCon(() => json({ datos: [], pagina: 1, tamano: 25, total: 0, totalPaginas: 1 }));

    await apiUsuarios.GET('/v1/comunidades', {});

    expect(autorizacionDe(0)).toBeNull();
  });

  it('con sesion vigente manda el token tal cual, sin renovar', async () => {
    almacenSesion.guardar({ tokenAcceso: VIGENTE, tokenRefresco: 'r-1', usuario: USUARIO });
    responderCon(() => json([]));

    await apiUsuarios.GET('/v1/comunidades', {});

    expect(peticiones).toHaveLength(1);
    expect(autorizacionDe(0)).toBe('Bearer ' + VIGENTE);
  });

  it('renueva ANTES de enviar cuando el token ya vencio', async () => {
    almacenSesion.guardar({ tokenAcceso: VENCIDO, tokenRefresco: 'r-1', usuario: USUARIO });
    const NUEVO = jwt(900);

    responderCon((r) =>
      new URL(r.url, 'http://local').pathname.endsWith('/v1/auth/refrescar')
        ? json({ tokenAcceso: NUEVO, tokenRefresco: 'r-2', usuario: USUARIO })
        : json([]),
    );

    await apiUsuarios.GET('/v1/comunidades', {});

    expect(rutaDe(0)).toBe('/api/auth/v1/auth/refrescar');
    // La peticion real sale con el token NUEVO, no con el vencido.
    expect(autorizacionDe(1)).toBe('Bearer ' + NUEVO);
    expect(almacenSesion.obtener()?.tokenRefresco).toBe('r-2');
  });

  it('varias peticiones a la vez producen UNA sola renovacion', async () => {
    // El token de refresco es rotatorio y el servidor detecta reutilizacion: dos
    // renovaciones en paralelo revocarian la sesion entera. El usuario la
    // perderia solo por abrir una pantalla que hace dos consultas.
    almacenSesion.guardar({ tokenAcceso: VENCIDO, tokenRefresco: 'r-1', usuario: USUARIO });

    responderCon((r) =>
      new URL(r.url, 'http://local').pathname.endsWith('/v1/auth/refrescar')
        ? json({ tokenAcceso: jwt(900), tokenRefresco: 'r-2', usuario: USUARIO })
        : json([]),
    );

    await Promise.all([
      apiUsuarios.GET('/v1/comunidades', {}),
      apiUsuarios.GET('/v1/comunidades', {}),
      apiUsuarios.GET('/v1/comunidades', {}),
    ]);

    const refrescos = peticiones.filter((p) => p.url.includes('/v1/auth/refrescar'));
    expect(refrescos).toHaveLength(1);
    expect(peticiones).toHaveLength(4);
  });

  it('si la renovacion falla, la sesion se cierra', async () => {
    almacenSesion.guardar({ tokenAcceso: VENCIDO, tokenRefresco: 'r-vencido', usuario: USUARIO });

    responderCon((r) =>
      new URL(r.url, 'http://local').pathname.endsWith('/v1/auth/refrescar')
        ? json({ codigo: 'NO_AUTENTICADO', mensaje: 'Sesion revocada.' }, 401)
        : json([]),
    );

    await apiUsuarios.GET('/v1/comunidades', {});

    expect(almacenSesion.autenticado).toBe(false);
  });

  it('un 401 con token vigente cierra la sesion: la cuenta ya no vale', async () => {
    // Pasa cuando el administrador desactiva la cuenta o le cambia el rol: el
    // servidor revoca las sesiones y el token, aunque no haya expirado, deja de
    // servir. No tiene sentido reintentar.
    almacenSesion.guardar({ tokenAcceso: VIGENTE, tokenRefresco: 'r-1', usuario: USUARIO });
    responderCon(() => json({ codigo: 'NO_AUTENTICADO', mensaje: 'Sesion revocada.' }, 401));

    await apiUsuarios.GET('/v1/comunidades', {});

    expect(almacenSesion.autenticado).toBe(false);
  });
});
