import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';
import { ultimoAccesoEnPalabras } from './servicio-cuentas';

const ADMIN: Perfil = {
  id: 'u-admin',
  usuario: 'admin',
  rol: 'ADMINISTRADOR',
  debeCambiarContrasena: false,
};
const MEDICO: Perfil = { ...ADMIN, id: 'u-1', usuario: 'jperez', rol: 'MEDICO' };
const DIRECTOR: Perfil = { ...ADMIN, id: 'u-6', usuario: 'ddirector', rol: 'DIRECTOR' };

const cuenta = (extra: Record<string, unknown> = {}) => ({
  id: 'c-1',
  usuario: 'mcaal',
  nombres: 'Maria',
  apellidos: 'Caal Xol',
  rol: 'ENFERMERIA',
  activo: true,
  debeCambiarContrasena: false,
  ultimoAcceso: '2026-08-27T14:00:00.000Z',
  creadoEn: '2026-01-10T10:00:00.000Z',
  ...extra,
});

/** La propia cuenta de quien esta administrando. */
const MI_CUENTA = cuenta({
  id: 'u-admin',
  usuario: 'admin',
  nombres: 'Ana',
  apellidos: 'Administradora',
  rol: 'ADMINISTRADOR',
});

const paginaDe = (datos: unknown[]) => ({
  datos,
  pagina: 1,
  tamano: 25,
  total: datos.length,
  totalPaginas: 1,
});

let peticiones: Request[] = [];
let cuerpos: unknown[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({
  cuentas = [cuenta()] as unknown[],
  usuarioRepetido = false,
}: { cuentas?: unknown[]; usuarioRepetido?: boolean } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      if (p.method !== 'GET') {
        const texto = await p.clone().text();
        cuerpos.push(texto === '' ? null : JSON.parse(texto));
      }
      const url = new URL(p.url, 'http://local');
      const ruta = url.pathname;

      if (ruta.endsWith('/restablecer-contrasena')) {
        return json({ usuario: 'mcaal', contrasenaTemporal: 'Kp7mQx2vTn9Rda' }, 201);
      }
      if (ruta.endsWith('/v1/usuarios')) {
        if (p.method === 'POST') {
          return usuarioRepetido
            ? json(
                {
                  codigo: 'CONFLICTO',
                  mensaje: 'Ya existe una cuenta con ese nombre de usuario.',
                  trazaId: 'x',
                  ruta,
                  fecha: '2026-08-28T00:00:00.000Z',
                },
                409,
              )
            : json({ ...cuenta({ id: 'c-9', usuario: 'nuevo' }), contrasenaTemporal: 'Ab3kQm7xPz2Wdc' }, 201);
        }
        const buscar = url.searchParams.get('buscar');
        const rol = url.searchParams.get('rol');
        let filtradas = cuentas as { usuario: string; rol: string }[];
        if (buscar) filtradas = filtradas.filter((c) => c.usuario.includes(buscar.toLowerCase()));
        if (rol) filtradas = filtradas.filter((c) => c.rol === rol);
        return json(paginaDe(filtradas));
      }
      if (/\/v1\/usuarios\/[^/]+$/.test(ruta)) return json(cuenta());
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil, ruta = '/administracion') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

const esperarPanel = () => screen.findByRole('heading', { name: 'Administracion' });

beforeEach(() => {
  peticiones = [];
  cuerpos = [];
  clienteConsultas.clear();
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('min-width'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ══════════════════════ como se dicen las cosas ══════════════════════

describe('el ultimo acceso', () => {
  /**
   * "Nunca ha entrado" es el dato que mas importa: una cuenta creada hace
   * semanas que nadie uso suele ser una cuenta cuya contrasena temporal se
   * perdio, no alguien de vacaciones.
   */
  it('dice cuando la cuenta nunca ha entrado', () => {
    expect(ultimoAccesoEnPalabras(null)).toBe('Nunca ha entrado');
  });

  it('cuenta los dias mientras son pocos', () => {
    const ayer = new Date(Date.now() - 86_400_000);
    expect(ultimoAccesoEnPalabras(ayer)).toBe('Ayer');
    const haceUnaSemana = new Date(Date.now() - 7 * 86_400_000);
    expect(ultimoAccesoEnPalabras(haceUnaSemana)).toBe('Hace 7 dias');
  });

  it('pasado un mes da la fecha, que ya es mas util que el conteo', () => {
    const hace100dias = new Date(Date.now() - 100 * 86_400_000);
    expect(ultimoAccesoEnPalabras(hace100dias)).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

// ═══════════════════════════ la lista ═══════════════════════════

describe('lista de cuentas', () => {
  it('muestra a cada persona con su usuario y su rol', async () => {
    servidor();
    abrir(ADMIN);
    await esperarPanel();

    expect(await screen.findByText('Caal Xol, Maria')).toBeInTheDocument();
    expect(screen.getByText('mcaal')).toBeInTheDocument();
    expect(screen.getByText('Enfermeria')).toBeInTheDocument();
  });

  it('marca los roles que exigen segundo factor', async () => {
    servidor({ cuentas: [cuenta({ rol: 'DIRECTOR' }), cuenta({ id: 'c-2', rol: 'RECEPCION' })] });
    abrir(ADMIN);
    await esperarPanel();

    const filas = await screen.findAllByRole('row');
    const director = filas.find((f) => within(f).queryByText('Director'));
    const recepcion = filas.find((f) => within(f).queryByText('Recepcion'));
    expect(within(director as HTMLElement).getByText('2FA')).toBeInTheDocument();
    expect(within(recepcion as HTMLElement).queryByText('2FA')).not.toBeInTheDocument();
  });

  /**
   * Es la senal de que a alguien se le entrego una contrasena temporal y
   * todavia no la ha usado.
   */
  it('avisa de las cuentas que no han cambiado su contrasena temporal', async () => {
    servidor({ cuentas: [cuenta({ debeCambiarContrasena: true })] });
    abrir(ADMIN);
    await esperarPanel();

    expect(await screen.findByText('Contrasena sin cambiar')).toBeInTheDocument();
  });

  it('senala cual es la cuenta de quien esta administrando', async () => {
    servidor({ cuentas: [MI_CUENTA, cuenta()] });
    abrir(ADMIN);
    await esperarPanel();

    const fila = (await screen.findByText('Administradora, Ana')).closest('tr') as HTMLElement;
    expect(within(fila).getByText('Usted')).toBeInTheDocument();
  });

  it('filtra por rol', async () => {
    servidor({ cuentas: [cuenta({ rol: 'ENFERMERIA' }), cuenta({ id: 'c-2', rol: 'FARMACIA', usuario: 'sgomez' })] });
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await screen.findByText('mcaal');

    await usuario.click(screen.getByLabelText('Rol'));
    await usuario.click(await screen.findByRole('option', { name: 'Farmacia' }));

    await waitFor(() => expect(screen.queryByText('mcaal')).not.toBeInTheDocument());
    expect(screen.getByText('sgomez')).toBeInTheDocument();
  });

  it('lo dice cuando la busqueda no encuentra a nadie', async () => {
    servidor({ cuentas: [] });
    abrir(ADMIN);
    await esperarPanel();

    expect(await screen.findByText(/Ninguna cuenta coincide/)).toBeInTheDocument();
  });
});

// ═══════════════════════ crear una cuenta ═══════════════════════

describe('crear una cuenta', () => {
  it('no pide contrasena: la genera el sistema', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(screen.getByRole('button', { name: /Nueva cuenta/ }));

    expect(screen.queryByLabelText(/Contrasena/)).not.toBeInTheDocument();
    expect(screen.getByText(/la genera el sistema/)).toBeInTheDocument();
  });

  it('explica que hace cada rol al elegirlo', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(screen.getByRole('button', { name: /Nueva cuenta/ }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/No entra al historial clinico/)).toBeInTheDocument();
  });

  it('avisa cuando el rol elegido exige segundo factor', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(screen.getByRole('button', { name: /Nueva cuenta/ }));

    const dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByLabelText('Rol'));
    await usuario.click(await screen.findByRole('option', { name: 'Director' }));

    expect(await within(dialogo).findByText(/exige segundo factor/)).toBeInTheDocument();
  });

  it('manda el usuario en minusculas, como lo guarda el servidor', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(screen.getByRole('button', { name: /Nueva cuenta/ }));

    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText(/Usuario/), 'JLopez');
    await usuario.type(within(dialogo).getByLabelText(/Nombres/), 'Juana');
    await usuario.type(within(dialogo).getByLabelText(/Apellidos/), 'Lopez Chub');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual({
        usuario: 'jlopez',
        nombres: 'Juana',
        apellidos: 'Lopez Chub',
        rol: 'RECEPCION',
      });
    });
  });

  it('explica el conflicto cuando el usuario ya existe', async () => {
    servidor({ usuarioRepetido: true });
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(screen.getByRole('button', { name: /Nueva cuenta/ }));

    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText(/Usuario/), 'mcaal');
    await usuario.type(within(dialogo).getByLabelText(/Nombres/), 'Otra');
    await usuario.type(within(dialogo).getByLabelText(/Apellidos/), 'Persona');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText(/Ya existe una cuenta con ese nombre/)).toBeInTheDocument();
  });
});

// ═════════════════════ la contrasena temporal ═════════════════════

describe('la contrasena temporal', () => {
  /** Abre el alta y la completa hasta que sale la contrasena. */
  async function crearCuenta(usuario: ReturnType<typeof userEvent.setup>) {
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(screen.getByRole('button', { name: /Nueva cuenta/ }));
    const alta = screen.getByRole('dialog');
    await usuario.type(within(alta).getByLabelText(/Usuario/), 'nuevo');
    await usuario.type(within(alta).getByLabelText(/Nombres/), 'Nueva');
    await usuario.type(within(alta).getByLabelText(/Apellidos/), 'Persona');
    await usuario.click(within(alta).getByRole('button', { name: 'Crear cuenta' }));
    return screen.findByText('Cuenta creada');
  }

  it('se muestra al crear la cuenta', async () => {
    servidor();
    const usuario = userEvent.setup();
    await crearCuenta(usuario);

    expect(screen.getByLabelText('Contrasena temporal')).toHaveTextContent('Ab3kQm7xPz2Wdc');
  });

  it('avisa de que no se puede volver a consultar', async () => {
    servidor();
    const usuario = userEvent.setup();
    await crearCuenta(usuario);

    expect(screen.getByText(/no se puede volver a consultar/)).toBeInTheDocument();
  });

  /**
   * Si esta ventana se cierra sin que nadie anote la contrasena, la unica
   * salida es restablecerla otra vez. Por eso hay que confirmar.
   */
  it('no deja cerrar hasta confirmar que se anoto', async () => {
    servidor();
    const usuario = userEvent.setup();
    await crearCuenta(usuario);

    const cerrar = screen.getByRole('button', { name: 'Cerrar' });
    expect(cerrar).toBeDisabled();

    await usuario.click(screen.getByLabelText(/Ya la anote/));
    expect(cerrar).toBeEnabled();
  });

  it('tampoco se cierra con Escape', async () => {
    servidor();
    const usuario = userEvent.setup();
    await crearCuenta(usuario);

    await usuario.keyboard('{Escape}');

    expect(screen.getByText('Cuenta creada')).toBeInTheDocument();
  });
});

// ═══════════════════════ editar una cuenta ═══════════════════════

describe('editar una cuenta', () => {
  it('el nombre de usuario no se edita', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByLabelText(/Nombres/)).toBeInTheDocument();
    expect(within(dialogo).queryByLabelText(/^Usuario/)).not.toBeInTheDocument();
  });

  it('avisa de que desactivar cierra la sesion de esa persona', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));

    const dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByLabelText('Cuenta activa'));

    expect(await within(dialogo).findByText(/su sesion se cierra de inmediato/)).toBeInTheDocument();
  });

  /**
   * El servidor los rechaza con un 400: el CAP podria quedarse sin ninguna
   * cuenta capaz de administrar el sistema. La pantalla lo impide antes.
   */
  it('sobre la propia cuenta no deja desactivarse ni cambiarse el rol', async () => {
    servidor({ cuentas: [MI_CUENTA] });
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByLabelText(/no puede desactivar su propia cuenta/i)).toBeDisabled();
    expect(within(dialogo).getByText(/no puede cambiar su propio rol/i)).toBeInTheDocument();
  });

  it('sobre otra cuenta si deja cambiar el rol', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: 'Editar' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByLabelText('Rol')).not.toHaveAttribute('aria-disabled', 'true');
  });
});

// ════════════════════ restablecer la contrasena ════════════════════

describe('restablecer la contrasena', () => {
  it('pide confirmar y explica lo que va a pasar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: /Restablecer contrasena/ }));

    expect(screen.getByText(/Su sesion se cierra de inmediato/)).toBeInTheDocument();
  });

  /**
   * Hoy es la unica forma de desbloquear una cuenta: el servicio pone
   * bloqueadoHasta en null al restablecer, y no hay ningun otro endpoint que
   * lo haga.
   */
  it('dice que tambien desbloquea la cuenta', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: /Restablecer contrasena/ }));

    expect(screen.getByText(/tambien la desbloquea/)).toBeInTheDocument();
  });

  it('muestra la contrasena nueva al confirmar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: /Restablecer contrasena/ }));
    await usuario.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(await screen.findByText('Contrasena restablecida')).toBeInTheDocument();
    expect(screen.getByLabelText('Contrasena temporal')).toHaveTextContent('Kp7mQx2vTn9Rda');
  });

  it('cancelar no manda nada al servidor', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(ADMIN);
    await esperarPanel();
    await usuario.click(await screen.findByRole('button', { name: /Restablecer contrasena/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    const envios = peticiones.filter((p) => p.url.includes('restablecer'));
    expect(envios).toHaveLength(0);
  });
});

// ═════════════════════════ quien entra ═════════════════════════

describe('quien entra a administracion', () => {
  it('el medico no entra', async () => {
    servidor();
    abrir(MEDICO);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Administracion' })).not.toBeInTheDocument();
    });
  });

  it('el director tampoco: ve el sistema pero no administra cuentas', async () => {
    servidor();
    abrir(DIRECTOR);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Administracion' })).not.toBeInTheDocument();
    });
  });

  it('y no aparece en su menu', async () => {
    servidor();
    abrir(DIRECTOR, '/');

    const navegacion = await screen.findByRole('navigation', { name: /Modulos del sistema/i });
    expect(navegacion).not.toHaveTextContent('Administracion');
  });
});
