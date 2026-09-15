import { render, screen, waitFor } from '@testing-library/react';
import { App, clienteConsultas } from '../App';
import { almacenSesion, type Perfil } from '../api';

const ENFERMERIA: Perfil = {
  id: 'u-1',
  usuario: 'jcaal',
  rol: 'ENFERMERIA',
  debeCambiarContrasena: false,
};
const FARMACIA: Perfil = { ...ENFERMERIA, id: 'u-2', usuario: 'sgomez', rol: 'FARMACIA' };

function entrarComo(perfil: Perfil, ruta: string) {
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
}

const navegacion = () => screen.getByRole('navigation', { name: /Modulos del sistema/i });

beforeEach(() => {
  almacenSesion.limpiar();
  clienteConsultas.clear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
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

/**
 * Las dos formas de «aqui no hay nada».
 *
 * Antes las dos hacian lo mismo —`Navigate to="/"`, sin una palabra— y quien
 * escribia mal una direccion aparecia de golpe en el menu de inicio sin saber
 * si habia pulsado donde no era, si el sistema fallaba o si la pantalla ya no
 * existia. Lo normal era volver a intentarlo dos o tres veces.
 */
describe('direcciones que no llevan a ninguna parte', () => {
  it('una direccion inexistente lo dice, y ensena cual se intento', async () => {
    entrarComo(ENFERMERIA, '/pantalla-que-no-existe');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Esta pantalla no existe/i })).toBeInTheDocument();
    // La direccion escrita, para poder ver la letra de mas.
    expect(screen.getByText('/pantalla-que-no-existe')).toBeInTheDocument();
  });

  /**
   * Dentro del armazon, no en una pantalla suelta: con el menu al lado se
   * puede ir a otro sitio sin volver a escribir una direccion.
   */
  it('el menu sigue ahi para poder salir', async () => {
    entrarComo(ENFERMERIA, '/pantalla-que-no-existe');
    render(<App />);

    await screen.findByRole('heading', { name: /Esta pantalla no existe/i });
    await waitFor(() => expect(navegacion()).toHaveTextContent('Recepcion'));
  });

  /**
   * Que sea el rol y no la direccion cambia lo que hay que hacer: si la
   * pantalla no existe se corrige la direccion; si es el permiso, se le pide a
   * Administracion o lo hace quien si lo tiene.
   */
  it('una pantalla que existe pero no es de su perfil lo dice, y lo distingue', async () => {
    entrarComo(FARMACIA, '/carpetas');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /no es de su perfil/i }),
    ).toBeInTheDocument();
    // Acotado al texto del aviso: «Farmacia» tambien es una opcion del menu.
    expect(screen.getByText(/el perfil de Farmacia no tiene acceso/i)).toBeInTheDocument();
    // Y NO se confunde con la otra: la pantalla existe.
    expect(screen.queryByRole('heading', { name: /no existe/i })).not.toBeInTheDocument();
  });

  it('sin sesion, una direccion inexistente lleva a entrar y no al aviso', async () => {
    // La guarda de sesion va antes: mostrar el 404 a alguien que no ha entrado
    // seria contarle que rutas tiene el sistema.
    window.history.pushState({}, '', '/pantalla-que-no-existe');
    render(<App />);

    expect(await screen.findByLabelText(/Usuario/i)).toBeInTheDocument();
  });
});
