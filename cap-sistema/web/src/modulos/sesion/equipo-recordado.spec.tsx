import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const DIRECTOR: Perfil = {
  id: 'u-1',
  usuario: 'ddirector',
  rol: 'DIRECTOR',
  debeCambiarContrasena: false,
};

const SESION = {
  mfaRequerido: false,
  tokenAcceso: 'acceso',
  tokenRefresco: 'refresco',
  usuario: DIRECTOR,
};

let peticiones: Request[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * @param pideCodigo  si el login responde con segundo factor pendiente
 * @param devuelve    token de equipo que el servidor manda tras el codigo
 */
function servidor({ pideCodigo = true, devuelve = undefined as string | undefined } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const ruta = new URL(p.url, 'http://local').pathname;

      if (ruta.endsWith('/auth/login')) {
        return pideCodigo
          ? json({ mfaRequerido: true, configuracionPendiente: false, tokenParcial: 'parcial' })
          : json(SESION);
      }
      if (ruta.endsWith('/auth/mfa/verificar')) {
        return json(devuelve ? { ...SESION, tokenDispositivo: devuelve } : SESION);
      }
      return json({}, 404);
    }),
  );
}

async function entrar(usuario = userEvent.setup()) {
  await usuario.type(await screen.findByLabelText(/Usuario/i), 'ddirector');
  await usuario.type(screen.getByLabelText("Contrasena"), 'clave-de-prueba');
  await usuario.click(screen.getByRole('button', { name: /Entrar/i }));
  return usuario;
}

const cuerpoDe = async (p: Request) => JSON.parse(await p.clone().text());

beforeEach(() => {
  peticiones = [];
  almacenSesion.limpiar();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.pushState({}, '', '/');
});

afterEach(() => vi.unstubAllGlobals());

/**
 * Pedir el código en CADA entrada no protege más: la primera vez del día ya
 * demostró que el teléfono está en manos de quien dice ser. Lo que sí produce
 * es que en una clínica donde se entra y sale varias veces al día la gente
 * busque cómo saltárselo —dejar la sesión abierta, compartir la cuenta— y ahí
 * sí se pierde todo. Así que se cobra una vez por equipo y por mes.
 */
describe('recordar el equipo', () => {
  it('tras el codigo, guarda el token que manda el servidor', async () => {
    servidor({ devuelve: 'token-del-equipo' });
    render(<App />);
    const usuario = await entrar();

    await usuario.type(await screen.findByLabelText(/Codigo de verificacion/i), '123456');
    await usuario.click(screen.getByRole('button', { name: /Verificar/i }));

    await waitFor(() => expect(window.localStorage.getItem('cap.equipo')).toBe('token-del-equipo'));
  });

  it('la casilla viene marcada, y al desmarcarla no se recuerda nada', async () => {
    servidor({ devuelve: undefined });
    render(<App />);
    const usuario = await entrar();

    const casilla = await screen.findByRole('checkbox', {
      name: /No volver a pedirlo en este equipo/i,
    });
    expect(casilla).toBeChecked();

    await usuario.click(casilla);
    await usuario.type(screen.getByLabelText(/Codigo de verificacion/i), '123456');
    await usuario.click(screen.getByRole('button', { name: /Verificar/i }));

    await waitFor(() => {
      const v = peticiones.find((p) => p.url.includes('/mfa/verificar'));
      expect(v).toBeDefined();
    });
    const v = peticiones.find((p) => p.url.includes('/mfa/verificar'))!;
    expect(await cuerpoDe(v)).toMatchObject({ recordarEquipo: false });
    expect(window.localStorage.getItem('cap.equipo')).toBeNull();
  });

  it('en el siguiente login manda el token, y ya no se pide codigo', async () => {
    window.localStorage.setItem('cap.equipo', 'token-del-equipo');
    servidor({ pideCodigo: false });
    render(<App />);
    await entrar();

    await waitFor(() => {
      const login = peticiones.find((p) => p.url.includes('/auth/login'));
      expect(login).toBeDefined();
    });
    const login = peticiones.find((p) => p.url.includes('/auth/login'))!;
    expect(await cuerpoDe(login)).toMatchObject({ tokenDispositivo: 'token-del-equipo' });

    // Sin paso de codigo: se entro directo.
    expect(screen.queryByLabelText(/Codigo de verificacion/i)).not.toBeInTheDocument();
  });

  /**
   * Si el servidor pide código pese a que mandamos un token, ese token ya no
   * vale —caducó o lo revocaron—. Seguir mandándolo en cada login solo
   * ensuciaría las peticiones.
   */
  it('si el servidor lo ignora, se deja de guardar', async () => {
    window.localStorage.setItem('cap.equipo', 'token-viejo');
    servidor({ pideCodigo: true });
    render(<App />);
    await entrar();

    await screen.findByLabelText(/Codigo de verificacion/i);
    expect(window.localStorage.getItem('cap.equipo')).toBeNull();
  });
});

/**
 * Antes la sesión vivía solo en memoria: pulsar F5 sacaba a la persona del
 * sistema y la obligaba a entrar de nuevo, con código incluido. En el CAP eso
 * pasa todo el día.
 */
describe('la sesion sobrevive a recargar', () => {
  it('se guarda al entrar y se recupera al volver a montar', async () => {
    servidor({ pideCodigo: false });
    render(<App />);
    await entrar();

    await waitFor(() => expect(window.sessionStorage.getItem('cap.sesion')).not.toBeNull());
    const guardada = JSON.parse(window.sessionStorage.getItem('cap.sesion')!);
    expect(guardada.usuario.usuario).toBe('ddirector');
    expect(guardada.tokenAcceso).toBe('acceso');
  });

  it('cerrar sesion la borra: no queda nada para el siguiente turno', async () => {
    servidor({ pideCodigo: false });
    render(<App />);
    await entrar();
    await waitFor(() => expect(window.sessionStorage.getItem('cap.sesion')).not.toBeNull());

    almacenSesion.limpiar();
    expect(window.sessionStorage.getItem('cap.sesion')).toBeNull();
  });
});
