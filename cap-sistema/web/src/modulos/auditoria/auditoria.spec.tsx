import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const DIRECTOR: Perfil = {
  id: 'u-1',
  usuario: 'ddirector',
  rol: 'DIRECTOR',
  debeCambiarContrasena: false,
};
const MEDICO: Perfil = { ...DIRECTOR, id: 'u-2', usuario: 'jperez', rol: 'MEDICO' };

const registro = (numero: string, extra: Record<string, unknown> = {}) => ({
  numero,
  hashPrevio: 'a'.repeat(64),
  hash: 'b'.repeat(64),
  servicio: 'usuarios',
  accion: 'MODIFICACION',
  entidad: 'expediente',
  entidadId: 'EXP-2026-000123',
  usuarioId: 'u-9',
  usuarioRol: 'MEDICO',
  motivo: null,
  valorAnterior: 'peso: 70',
  valorNuevo: 'peso: 72',
  trazaId: 't-1',
  ip: '10.0.0.5',
  registradoEn: '2026-09-17T14:30:00.000Z',
  ...extra,
});

let peticiones: Request[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({
  datos = [registro('1042')],
  verificacion = { intacta: true, revisados: 1042 } as unknown,
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const ruta = new URL(p.url, 'http://local').pathname;
      if (ruta.endsWith('/v1/registros/verificacion')) return json(verificacion);
      if (ruta.endsWith('/v1/registros')) {
        return json({ datos, pagina: 1, tamano: 25, total: datos.length, totalPaginas: 1 });
      }
      return json({}, 404);
    }),
  );
}

const consultas = () => peticiones.filter((p) => p.url.includes('/v1/registros?'));
const ultima = () => new URL(consultas().at(-1)!.url, 'http://local');

function entrarComo(perfil: Perfil, ruta = '/auditoria') {
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
}

beforeEach(() => {
  peticiones = [];
  almacenSesion.limpiar();
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

describe('la bitacora de auditoria', () => {
  it('cada fila dice que paso, sobre que y quien', async () => {
    servidor();
    entrarComo(DIRECTOR);
    render(<App />);

    const fila = await screen.findByRole('row', { name: /EXP-2026-000123/ });
    expect(fila).toHaveTextContent('Modificacion');
    expect(fila).toHaveTextContent('MEDICO');
    expect(fila).toHaveTextContent('peso: 70 → peso: 72');
  });

  /**
   * La bitacora solo crece: cada consulta a un expediente deja una entrada. Se
   * lee filtrada —por dia, por modulo, por expediente— y nunca entera.
   */
  it('filtrar por expediente pregunta solo por ese', async () => {
    servidor();
    entrarComo(DIRECTOR);
    const usuario = userEvent.setup();
    render(<App />);

    await screen.findByRole('row', { name: /EXP-2026-000123/ });
    await usuario.type(screen.getByLabelText(/Expediente o identificador/i), 'EXP-2026-000999');

    await waitFor(() =>
      expect(ultima().searchParams.get('entidadId')).toBe('EXP-2026-000999'),
    );
  });

  /**
   * Lo que distingue esta bitacora de un registro corriente: cada entrada lleva
   * el hash de la anterior, asi que borrar o modificar una rompe la cadena.
   */
  it('verificar dice que la cadena esta intacta', async () => {
    servidor();
    entrarComo(DIRECTOR);
    const usuario = userEvent.setup();
    render(<App />);

    await screen.findByRole('row', { name: /EXP-2026-000123/ });
    await usuario.click(screen.getByRole('button', { name: /Verificar la cadena/i }));

    expect(await screen.findByText(/La cadena esta intacta/i)).toBeInTheDocument();
  });

  /**
   * Si esta rota hay que decir DONDE: desde esa entrada, la bitacora no prueba
   * nada, y saber el numero es lo que permite acotar el dano.
   */
  it('si esta rota lo dice, y en que numero', async () => {
    servidor({ verificacion: { intacta: false, revisados: 317, rotoEn: '318' } });
    entrarComo(DIRECTOR);
    const usuario = userEvent.setup();
    render(<App />);

    await screen.findByRole('row', { name: /EXP-2026-000123/ });
    await usuario.click(screen.getByRole('button', { name: /Verificar la cadena/i }));

    const aviso = await screen.findByText(/La cadena esta rota/i);
    expect(aviso).toBeInTheDocument();
    expect(screen.getByText('318')).toBeInTheDocument();
  });

  /**
   * NO se verifica al abrir la pantalla: recorre la cadena entera, y con
   * cientos de miles de entradas eso seria cobrarle el trabajo caro a quien
   * viene a hacer el barato.
   */
  it('no recorre la cadena hasta que se lo piden', async () => {
    servidor();
    entrarComo(DIRECTOR);
    render(<App />);

    await screen.findByRole('row', { name: /EXP-2026-000123/ });
    expect(peticiones.filter((p) => p.url.includes('/verificacion'))).toHaveLength(0);
  });

  /**
   * La bitacora lleva los valores DESCIFRADOS: leerla entera es leer que decia
   * cada dato antes y despues. Es de Direccion y Administracion.
   */
  it('un medico no entra: la bitacora no es suya', async () => {
    servidor();
    entrarComo(MEDICO);
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /no es de su perfil/i }),
    ).toBeInTheDocument();
  });
});
