import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const CON_TEMPORAL: Perfil = {
  id: 'u-1',
  usuario: 'admin',
  rol: 'ADMINISTRADOR',
  debeCambiarContrasena: true,
};

const NORMAL: Perfil = { ...CON_TEMPORAL, usuario: 'jlopez', rol: 'RECEPCION', debeCambiarContrasena: false };

function abrirSesionCon(usuario: Perfil) {
  almacenSesion.guardar({ tokenAcceso: 'token', tokenRefresco: 'refresco', usuario });
}

function responderCon(handler: (r: Request) => Response) {
  vi.stubGlobal('fetch', vi.fn(async (p: Request) => handler(p)));
}

beforeEach(() => {
  almacenSesion.limpiar();
  window.history.pushState({}, '', '/');
});

afterEach(() => vi.unstubAllGlobals());

describe('contrasena temporal', () => {
  it('con contrasena temporal, el panel NO se abre: desvia al cambio', async () => {
    abrirSesionCon(CON_TEMPORAL);
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Cambie su contrasena/i })).toBeInTheDocument(),
    );
    expect(window.location.pathname).toBe('/contrasena');
  });

  it('escribir la ruta de otra pantalla a mano tampoco lo salta', async () => {
    // El desvio vive en la guarda de ruta, no en cada pantalla: agregar una
    // pantalla nueva manana no puede abrir un hueco por descuido.
    abrirSesionCon(CON_TEMPORAL);
    window.history.pushState({}, '', '/expedientes');
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/contrasena'));
  });

  it('sin contrasena temporal, el panel se abre normal', async () => {
    abrirSesionCon(NORMAL);
    render(<App />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Buen dia/i })).toBeInTheDocument(),
    );
  });

  it('rechaza una contrasena que no cumple la politica, sin llamar al servidor', async () => {
    const llamadas = vi.fn();
    responderCon((p) => {
      llamadas(p.url);
      return new Response(null, { status: 204 });
    });
    abrirSesionCon(CON_TEMPORAL);
    render(<App />);

    await screen.findByRole('heading', { name: /Cambie su contrasena/i });
    await userEvent.type(screen.getByLabelText(/Contrasena actual/i), 'Clave-Temporal-1');
    await userEvent.type(screen.getByLabelText(/^Contrasena nueva/i), 'corta1');
    await userEvent.type(screen.getByLabelText(/Repita/i), 'corta1');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contrasena/i }));

    expect(await screen.findByText(/al menos 10 caracteres/i)).toBeInTheDocument();
    expect(llamadas).not.toHaveBeenCalled();
  });

  it('avisa cuando la confirmacion no coincide', async () => {
    abrirSesionCon(CON_TEMPORAL);
    render(<App />);

    await screen.findByRole('heading', { name: /Cambie su contrasena/i });
    await userEvent.type(screen.getByLabelText(/Contrasena actual/i), 'Clave-Temporal-1');
    await userEvent.type(screen.getByLabelText(/^Contrasena nueva/i), 'ClaveNueva2026');
    await userEvent.type(screen.getByLabelText(/Repita/i), 'ClaveNueva2027');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contrasena/i }));

    expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
  });

  it('al cambiarla se cierra la sesion y se vuelve al acceso con el aviso', async () => {
    // El servidor revoca TODAS las sesiones, incluida esta. Dejar el panel
    // abierto seria peor que inutil: fallaria solo al expirar el token.
    responderCon(() => new Response(null, { status: 204 }));
    abrirSesionCon(CON_TEMPORAL);
    render(<App />);

    await screen.findByRole('heading', { name: /Cambie su contrasena/i });
    await userEvent.type(screen.getByLabelText(/Contrasena actual/i), 'Clave-Temporal-1');
    await userEvent.type(screen.getByLabelText(/^Contrasena nueva/i), 'ClaveNueva2026');
    await userEvent.type(screen.getByLabelText(/Repita/i), 'ClaveNueva2026');
    await userEvent.click(screen.getByRole('button', { name: /Cambiar contrasena/i }));

    await waitFor(() => expect(almacenSesion.autenticado).toBe(false));
    expect(window.location.pathname).toBe('/acceso');
    expect(await screen.findByText(/Ingrese de nuevo/i)).toBeInTheDocument();
  });
});
