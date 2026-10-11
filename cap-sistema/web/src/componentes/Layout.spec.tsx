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

/**
 * El nombre escrito de una opcion del menu.
 *
 * Contraido NO se desmonta, se oculta: por eso se comprueba con
 * `toBeVisible()` y no con `toBeInTheDocument()`. Ver el comentario de
 * `textoDelMenu` en el Layout.
 */
const nombreEnElMenu = (texto: string) => within(navegacion()).getByText(texto);

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

afterEach(() => {
  vi.unstubAllGlobals();
  // Y los espias. Una prueba que rompe `localStorage` y falla antes de
  // restaurarlo deja a las siguientes sin almacenamiento, y el informe acusa a
  // pruebas que no tienen nada que ver.
  vi.restoreAllMocks();
});

/**
 * La barra superior ya no existe: el CAP pidio quitarla y el diseno que dieron
 * no la tiene. Lo que llevaba no se perdio —el nombre del centro ya estaba en
 * la cabecera del menu, y el reloj y la cuenta bajaron a su pie— y estas
 * pruebas fijan justamente eso, que es lo que se rompe si alguien «limpia» el
 * pie del menu sin saber de donde vino.
 */
describe('sin barra superior', () => {
  const enTelefono = () =>
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: false,
      media: consulta,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }));

  it('no queda ninguna barra arriba', async () => {
    entrarComo('ENFERMERIA');
    render(<App />);

    await waitFor(navegacion);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByText('Centro de Atencion Permanente')).not.toBeInTheDocument();
  });

  /**
   * UN solo camino a Inicio, el del menu. Cuando el titulo de la barra tambien
   * llevaba, eran dos a diez centimetros uno de otro y habia que averiguar si
   * hacian lo mismo.
   */
  it('el logo del menu sigue siendo el camino a Inicio, y es el unico', async () => {
    entrarComo('ENFERMERIA');
    window.history.pushState({}, '', '/programas');
    render(<App />);

    await waitFor(navegacion);
    const enlaces = screen.getAllByRole('link', { name: /^Inicio$/i });
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0]).toHaveAttribute('href', '/');
    expect(enlaces[0]).toHaveTextContent('CAP Purulha');
  });

  /**
   * El reloj y la cuenta estuvieron un rato al pie del menu lateral y el CAP lo
   * rechazo: ahi compiten con la navegacion, que es lo unico que ese panel
   * deberia contener. Estan arriba a la derecha, FUERA del menu, que es donde
   * estaban cuando habia barra.
   */
  it('el reloj y la cuenta estan arriba, fuera del menu', async () => {
    entrarComo('ENFERMERIA');
    render(<App />);

    const nav = await waitFor(navegacion);
    expect(screen.getByRole('button', { name: /Cuenta de prueba/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Apariencia/i })).toBeInTheDocument();

    // Y NO dentro del panel izquierdo.
    expect(within(nav).queryByRole('button', { name: /Cuenta de prueba/i })).toBeNull();
    expect(within(nav).queryByRole('button', { name: /Apariencia/i })).toBeNull();
  });

  it('en telefono el menu se abre con el boton de afuera', async () => {
    enTelefono();
    entrarComo('ENFERMERIA');
    // La ruta se hereda de la prueba anterior, y alguna termina en /acceso:
    // sin esto se renderiza la pantalla de entrada y no hay menu que abrir.
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Abrir el menu' })).toBeInTheDocument();
  });
});


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
    //
    // Y lo DICE, en vez de devolver al inicio en silencio: quien escribio la
    // direccion a mano —o siguio un enlace que le paso un companero— tiene que
    // poder distinguir «no tengo permiso» de «me equivoque al escribir».
    entrarComo('RECEPCION');
    window.history.pushState({}, '', '/administracion');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /no es de su perfil/i }),
    ).toBeInTheDocument();
  });

  it('al pulsar una opcion se abre su pantalla', async () => {
    /*
      Se usa un modulo que TODAVIA esta pendiente.

      Ya paso dos veces: primero con Farmacia y ahora con Programas, que acaban
      de tener pantalla propia. Una pantalla real consulta al servidor y aqui no
      hay ninguno levantado, asi que la prueba dejaba de medir la navegacion del
      menu —que es lo suyo— para medir una consulta que nunca responde.

      El ultimo que queda pendiente es Reportes. Cuando tenga pantalla, esta
      prueba habra que rehacerla montando un servidor de mentira, porque ya no
      quedara ningun modulo vacio del que tirar.
    */
    // Direccion, porque Reportes es suyo y del Administrador; un medico no lo
    // tiene en el menu.
    entrarComo('DIRECTOR');
    render(<App />);

    await waitFor(navegacion);
    // Acotado al menu: el inicio tambien pinta una tarjeta con el mismo nombre.
    await userEvent.click(within(navegacion()).getByRole('link', { name: /Reportes/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/reportes'));
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
    /*
      El nombre sigue en el DOM pero OCULTO, no desmontado: desmontarlo era lo
      que hacia que «Sala de espera» se partiera en dos renglones al volver y
      la lista diera un tiron a mitad de la animacion.
    */
    await waitFor(() => expect(nombreEnElMenu('Recepcion')).not.toBeVisible());

    // Y el boton ahora ofrece lo contrario.
    await usuario.click(await screen.findByRole('button', { name: 'Desplegar el menu' }));
    await waitFor(() => expect(nombreEnElMenu('Recepcion')).toBeVisible());
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
    await waitFor(() => expect(nombreEnElMenu('Recepcion')).not.toBeVisible());

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
    await waitFor(() => expect(nombreEnElMenu('Recepcion')).not.toBeVisible());
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
/**
 * Contraido se ven solo los iconos, y un icono sin su nombre se adivina.
 * Acercar el cursor despliega el panel ENCIMA del contenido y retirarlo lo
 * vuelve a encoger. Encima y no empujando: si el area de trabajo se corriera
 * 176 pixeles cada vez que el cursor roza el borde, la tabla que se esta
 * leyendo saltaria sola.
 */
describe('el menu contraido se despliega al pasar el cursor', () => {
  it('con el cursor encima aparecen los nombres, y al salir se van', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    render(<App />);

    await waitFor(navegacion);
    await usuario.click(screen.getByRole('button', { name: 'Contraer el menu' }));

    // Contraido: del encabezado solo se ve el logo.
    await waitFor(() => expect(nombreEnElMenu('CAP Purulha')).not.toBeVisible());

    await usuario.hover(navegacion());
    await waitFor(() => expect(nombreEnElMenu('CAP Purulha')).toBeVisible());

    await usuario.unhover(navegacion());
    await waitFor(() => expect(nombreEnElMenu('CAP Purulha')).not.toBeVisible());
  });

  /**
   * Pasar el cursor NO cuenta como desplegar el menu: el boton sigue
   * ofreciendo desplegarlo. Si cambiara, bastaria rozar el borde para que la
   * preferencia guardada pareciera otra.
   */
  it('sobrevolar no cambia la preferencia', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    render(<App />);

    await waitFor(navegacion);
    await usuario.click(screen.getByRole('button', { name: 'Contraer el menu' }));
    await usuario.hover(navegacion());

    expect(
      await screen.findByRole('button', { name: 'Desplegar el menu' }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('cap.menu.contraido')).toBe('1');
  });
});

/**
 * Claro, oscuro o el del sistema. «Sistema» no es un adorno de la lista: en el
 * CAP las computadoras se comparten entre turnos y Windows ya cambia solo por
 * la tarde.
 */
describe('apariencia', () => {
  it('se puede elegir el modo, y se recuerda', async () => {
    entrarComo('ADMINISTRADOR');
    const usuario = userEvent.setup();
    render(<App />);

    await waitFor(navegacion);
    await usuario.click(screen.getByRole('button', { name: /Apariencia/i }));
    await usuario.click(await screen.findByRole('menuitem', { name: 'Modo oscuro' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('cap.modo-color')).toBe('oscuro');
    });
    expect(screen.getByRole('button', { name: /Apariencia: Modo oscuro/i })).toBeInTheDocument();
  });

  it('por omision sigue al sistema', async () => {
    entrarComo('ADMINISTRADOR');
    render(<App />);

    await waitFor(navegacion);
    expect(
      screen.getByRole('button', { name: /Apariencia: El del sistema/i }),
    ).toBeInTheDocument();
  });
});

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
