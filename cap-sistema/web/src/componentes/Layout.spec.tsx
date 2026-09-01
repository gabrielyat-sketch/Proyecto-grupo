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
  // El menu contraido se recuerda en el navegador. Sin limpiarlo, una prueba
  // que lo contrae deja contraida a la siguiente, y falla por un motivo que no
  // tiene que ver con lo que comprueba.
  window.localStorage.clear();
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
    // Se usa un modulo que TODAVIA esta pendiente. Antes esta prueba pulsaba
    // Farmacia, y dejo de servir en cuanto Farmacia tuvo pantalla propia: la
    // pantalla real consulta al servidor, y aqui no hay ninguno levantado. Lo
    // que se comprueba es la navegacion del menu, no el modulo.
    entrarComo('MEDICO');
    render(<App />);

    await waitFor(navegacion);
    // Acotado al menu: el inicio tambien pinta una tarjeta con el mismo nombre.
    await userEvent.click(within(navegacion()).getByRole('link', { name: /Programas/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/programas'));
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

/**
 * El menu se puede contraer, y se recuerda.
 *
 * No es un adorno: en la computadora de recepcion, con una pantalla pequena,
 * la tabla de pacientes se desplaza a lo ancho y esos 248 pixeles del menu son
 * columnas que no se ven. Quien trabaja ahi tiene que poder decidirlo, y no
 * tener que decirlo otra vez cada manana.
 */
describe('contraer el menu lateral', () => {
  it('el boton de la barra lo contrae y lo vuelve a desplegar', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    render(<App />);

    const menu = await waitFor(navegacion);
    expect(menu).toHaveTextContent('Recepcion');

    await usuario.click(screen.getByRole('button', { name: 'Contraer el menu' }));

    // Contraido quedan los iconos, no los nombres.
    await waitFor(() => expect(navegacion()).not.toHaveTextContent('Recepcion'));

    // Y el boton ahora ofrece lo contrario.
    await usuario.click(await screen.findByRole('button', { name: 'Desplegar el menu' }));
    await waitFor(() => expect(navegacion()).toHaveTextContent('Recepcion'));
  });

  /**
   * Contraido, el nombre del modulo solo vive en el tooltip y en el nombre
   * accesible del enlace. Sin eso, navegar seria adivinar por el dibujo, y
   * quien usa lector de pantalla no tendria nada que leer.
   */
  it('contraido, cada opcion sigue teniendo nombre para el lector de pantalla', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    render(<App />);

    await waitFor(navegacion);
    await usuario.click(screen.getByRole('button', { name: 'Contraer el menu' }));

    await waitFor(() => {
      expect(within(navegacion()).getByRole('link', { name: /Recepcion/i })).toBeInTheDocument();
    });
  });

  it('la preferencia se recuerda al volver a entrar', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    const primera = render(<App />);

    await waitFor(navegacion);
    await usuario.click(screen.getByRole('button', { name: 'Contraer el menu' }));
    await waitFor(() => expect(navegacion()).not.toHaveTextContent('Recepcion'));

    primera.unmount();
    render(<App />);

    // Al volver, sigue contraido: la eleccion era de este puesto de trabajo.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Desplegar el menu' })).toBeInTheDocument();
    });
  });

  /**
   * Si el navegador no deja guardar —modo privado, almacenamiento bloqueado—
   * el panel se abre desplegado y sigue funcionando. Caerse al pulsar un boton
   * de la barra por no poder recordar una preferencia seria cambiar una
   * comodidad por el sistema entero.
   */
  it('sin poder guardar la preferencia, el panel abre desplegado y no se cae', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();

    const original = window.localStorage.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado');
    });

    render(<App />);
    const menu = await waitFor(navegacion);
    expect(menu).toHaveTextContent('Recepcion');

    // Y el boton sigue haciendo su trabajo aunque no se pueda recordar.
    await usuario.click(screen.getByRole('button', { name: 'Contraer el menu' }));
    await waitFor(() => expect(navegacion()).not.toHaveTextContent('Recepcion'));

    vi.restoreAllMocks();
    expect(typeof original).toBe('function');
  });
});

/**
 * El camino de vuelta al menu de tarjetas.
 *
 * Elegido un modulo no habia forma de volver: el menu lateral lista los
 * modulos, pero Inicio no es uno de ellos. La marca del panel hace ese trabajo
 * —es donde la gente ya lo busca— y por eso tiene que tener nombre accesible
 * propio: quien navega con lector de pantalla no ve el logo.
 */
describe('volver al inicio', () => {
  it('la marca del menu lleva al menu de tarjetas desde cualquier modulo', async () => {
    const perfil = entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    /*
      Se arranca en Reportes y no en Recepcion a proposito: Recepcion pide las
      comunidades al montar, aqui no hay servidor que conteste, y el fallo de
      esa peticion cierra la sesion y devuelve al login. La prueba terminaba
      comprobando la pantalla de entrar en vez del camino de vuelta. Reportes
      esta pendiente, asi que dibuja su aviso sin pedir nada.
    */
    window.history.pushState({}, '', '/reportes');
    render(<App />);

    await waitFor(navegacion);
    await usuario.click(within(navegacion()).getByRole('link', { name: 'Inicio' }));

    expect(
      await screen.findByRole('heading', { name: new RegExp('Buen dia, ' + perfil.usuario) }),
    ).toBeInTheDocument();
  });
});
