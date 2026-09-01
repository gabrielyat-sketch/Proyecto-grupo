import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const RECEPCION: Perfil = {
  id: 'u-1',
  usuario: 'mrodriguez',
  rol: 'RECEPCION',
  debeCambiarContrasena: false,
};
const FARMACIA: Perfil = { ...RECEPCION, id: 'u-2', usuario: 'sgomez', rol: 'FARMACIA' };

const COMUNIDADES = [
  { id: 'c-1', nombre: 'Purulha Centro', codigo: null, distante: false, activa: true },
  { id: 'c-2', nombre: 'Caserios', codigo: null, distante: false, activa: true },
];

const LUGARES = [
  { id: 'l-1', nombre: 'El Calvario', tipo: 'BARRIO' },
  { id: 'l-2', nombre: 'San Antonio', tipo: 'BARRIO' },
];

const carpeta = (id: string, numero: number, apellidos: string, integrantes = 4) => ({
  id,
  numero,
  apellidos,
  direccion: null,
  telefono: null,
  comunidad: { id: 'c-1', nombre: 'Purulha Centro' },
  lugar: { id: 'l-1', nombre: 'El Calvario', tipo: 'BARRIO' },
  integrantes,
});

const CON_FAMILIA = {
  ...carpeta('g-1', 3, 'Lopez Ac'),
  integrantes: [
    {
      id: 'p-1',
      nombres: 'Juana Isabel',
      apellidos: 'Lopez Ac',
      fechaNacimiento: '1985-04-12T00:00:00.000Z',
      sexo: 'F',
      fallecido: false,
      edad: 41,
    },
    {
      id: 'p-2',
      nombres: 'Marcos',
      apellidos: 'Lopez Ac',
      fechaNacimiento: '2024-01-05T00:00:00.000Z',
      sexo: 'M',
      fallecido: false,
      edad: 2,
    },
  ],
};

const pagina = (datos: unknown[]) => ({
  datos,
  pagina: 1,
  tamano: 25,
  total: datos.length,
  totalPaginas: 1,
});

let peticiones: Request[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidorCon(carpetas: unknown[] = [carpeta('g-1', 3, 'Lopez Ac')]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const ruta = new URL(p.url, 'http://local').pathname;
      if (ruta.endsWith('/v1/comunidades')) return json(COMUNIDADES);
      if (ruta.includes('/lugares')) return json(LUGARES);
      if (ruta.endsWith('/v1/grupos-familiares')) return json(pagina(carpetas));
      if (ruta.includes('/v1/grupos-familiares/')) return json(CON_FAMILIA);
      return json({}, 404);
    }),
  );
}

const listados = () => peticiones.filter((p) => p.url.includes('/v1/grupos-familiares?'));
const ultimoListado = () => new URL(listados().at(-1)!.url);

function entrarComo(perfil: Perfil, ruta = '/carpetas') {
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
}

beforeEach(() => {
  peticiones = [];
  almacenSesion.limpiar();
  // El cliente de consultas es uno solo para toda la aplicacion, asi que sin
  // vaciarlo la respuesta de una prueba se reutiliza en la siguiente: la de la
  // carpeta vacia veia los cuatro integrantes de la anterior.
  clienteConsultas.clear();
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

describe('el archivero de carpetas', () => {
  it('cada fila es un folder: numero, familia y lugar', async () => {
    servidorCon();
    entrarComo(RECEPCION);
    render(<App />);

    const fila = await screen.findByRole('row', { name: /Lopez Ac/ });
    expect(within(fila).getByRole('link', { name: '3' })).toBeInTheDocument();
    expect(fila).toHaveTextContent('El Calvario');
    expect(fila).toHaveTextContent('Purulha Centro');
  });

  /**
   * El barrio solo tiene sentido dentro de una comunidad, y al cambiar de
   * comunidad el barrio anterior deja de existir en la lista: dejarlo puesto
   * devolveria cero resultados sin decir por que.
   */
  it('el barrio se elige despues de la comunidad, y filtra', async () => {
    servidorCon();
    entrarComo(RECEPCION);
    const usuario = userEvent.setup();
    render(<App />);

    await screen.findByRole('row', { name: /Lopez Ac/ });
    expect(screen.getByLabelText(/Barrio o caserio/i)).toHaveAttribute('aria-disabled', 'true');

    await usuario.click(screen.getByLabelText(/Comunidad/i));
    await usuario.click(await screen.findByRole('option', { name: 'Purulha Centro' }));
    await usuario.click(screen.getByLabelText(/Barrio o caserio/i));
    await usuario.click(await screen.findByRole('option', { name: 'El Calvario' }));

    await waitFor(() => expect(ultimoListado().searchParams.get('lugarId')).toBe('l-1'));
    expect(ultimoListado().searchParams.get('comunidadId')).toBe('c-1');
  });

  /**
   * El CAP numera por barrio y caserio: hay un No. 3 en El Calvario y otro en
   * San Jose. Quien busca «3» a secas ve varias filas y piensa que el sistema
   * esta mal, cuando lo que falta es decir de que lugar.
   */
  it('avisa de que el numero solo no identifica una carpeta', async () => {
    servidorCon([carpeta('g-1', 3, 'Lopez Ac'), carpeta('g-2', 3, 'Cal Xol')]);
    entrarComo(RECEPCION);
    const usuario = userEvent.setup();
    render(<App />);

    await screen.findByRole('row', { name: /Lopez Ac/ });
    await usuario.type(screen.getByLabelText(/No. de carpeta/i), '3');

    expect(
      await screen.findByText(/El mismo numero existe en cada barrio y caserio/i),
    ).toBeInTheDocument();
  });

  /**
   * Un folder sin nadie dentro es un numero gastado, y casi siempre un alta
   * que quedo a medias. Sin marcarlo, se queda ahi ocupando su sitio.
   */
  it('marca las carpetas que no tienen a nadie dentro', async () => {
    servidorCon([carpeta('g-1', 3, 'Lopez Ac', 0)]);
    entrarComo(RECEPCION);
    render(<App />);

    const fila = await screen.findByRole('row', { name: /Lopez Ac/ });
    expect(within(fila).getByText(/Vacia/i)).toBeInTheDocument();
  });

  it('abrir una carpeta muestra a la familia y lleva a cada expediente', async () => {
    servidorCon();
    entrarComo(RECEPCION, '/carpetas/g-1');
    render(<App />);

    expect(await screen.findByRole('heading', { name: /Familia Lopez Ac/ })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const fila = await screen.findByRole('row', { name: /Juana Isabel/ });
    expect(within(fila).getByRole('link', { name: /Ver expediente/i })).toHaveAttribute(
      'href',
      '/pacientes/p-1/expediente',
    );
  });

  /**
   * La carpeta dice quien vive con quien, que es informacion del paciente y no
   * del medicamento. El servidor tampoco se la da: ofrecer la pantalla haria
   * pensar que el sistema falla cuando devolviera un 403.
   */
  it('Farmacia no tiene la opcion en el menu', async () => {
    servidorCon();
    entrarComo(FARMACIA, '/');
    render(<App />);

    const menu = await waitFor(() =>
      screen.getByRole('navigation', { name: /Modulos del sistema/i }),
    );
    expect(menu).not.toHaveTextContent('Carpetas');
  });
});
