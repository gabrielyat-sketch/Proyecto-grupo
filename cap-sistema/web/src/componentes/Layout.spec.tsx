import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { almacenSesion, type Perfil } from '../api';

function entrarComo(rol: Perfil['rol']): Perfil {
  const usuario: Perfil = { id: 'u-1', usuario: 'prueba', rol, debeCambiarContrasena: false };
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario });
  return usuario;
}

const navegacion = () => screen.getByRole('navigation', { name: /Modulos del sistema/i });

beforeEach(() => {
  almacenSesion.limpiar();
  window.history.pushState({}, '', '/');
  // Pantalla ancha: el menu lateral queda fijo y visible.
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('min-width'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('layout con menu por rol', () => {
  it('Recepcion no ve Programas ni Administracion', async () => {
    entrarComo('RECEPCION');
    render(<App />);

    const menu = await waitFor(navegacion);
    expect(menu).toHaveTextContent('Recepcion');
    expect(menu).toHaveTextContent('Digitalizacion');
    expect(menu).not.toHaveTextContent('Programas');
    expect(menu).not.toHaveTextContent('Administracion');
  });

  it('Farmacia ve su modulo pero no Digitalizacion ni Reportes', async () => {
    entrarComo('FARMACIA');
    render(<App />);

    const menu = await waitFor(navegacion);
    expect(menu).toHaveTextContent('Farmacia');
    expect(menu).not.toHaveTextContent('Digitalizacion');
    expect(menu).not.toHaveTextContent('Reportes');
  });

  it('el Administrador ve el menu completo', async () => {
    entrarComo('ADMINISTRADOR');
    render(<App />);

    const menu = await waitFor(navegacion);
    for (const etiqueta of ['Recepcion', 'Expedientes', 'Programas', 'Farmacia', 'Administracion']) {
      expect(menu).toHaveTextContent(etiqueta);
    }
  });

  it('el rol se muestra en pantalla: se sabe con que cuenta se esta trabajando', async () => {
    entrarComo('ENFERMERIA');
    render(<App />);

    await waitFor(() => expect(navegacion()).toHaveTextContent('Enfermeria'));
  });

  it('escribir a mano la ruta de otro rol devuelve al inicio', async () => {
    // Es comodidad, no seguridad: el backend responde 403 igual. Pero evita
    // pintar una pantalla que solo mostraria errores.
    entrarComo('RECEPCION');
    window.history.pushState({}, '', '/administracion');
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('al pulsar una opcion se abre su pantalla', async () => {
    entrarComo('FARMACIA');
    render(<App />);

    await waitFor(navegacion);
    // Acotado al menu: el inicio tambien pinta una tarjeta con el mismo nombre.
    await userEvent.click(within(navegacion()).getByRole('link', { name: /Farmacia/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/farmacia'));
    expect(screen.getByText(/aun no esta construido/i)).toBeInTheDocument();
  });

  it('el menu de cuenta permite cerrar sesion', async () => {
    entrarComo('MEDICO');
    render(<App />);

    await waitFor(navegacion);
    await userEvent.click(screen.getByRole('button', { name: /Cuenta de prueba/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesion/i }));

    await waitFor(() => expect(almacenSesion.autenticado).toBe(false));
  });
});
