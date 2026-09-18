import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const ENFERMERIA: Perfil = {
  id: 'u-1',
  usuario: 'mcaal',
  rol: 'ENFERMERIA',
  debeCambiarContrasena: false,
};
const FARMACIA: Perfil = { ...ENFERMERIA, id: 'u-2', usuario: 'sgomez', rol: 'FARMACIA' };

const PACIENTE = {
  id: 'p-1',
  dpi: null,
  nombres: 'Juana Isabel',
  apellidos: 'Perez Caal',
  fechaNacimiento: '1995-04-12T00:00:00.000Z',
  edad: 31,
  sexo: 'F',
  idioma: 'ESPANOL',
  telefono: null,
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Purulha Centro' },
  lugar: null,
  migrante: false,
  lugarOrigen: null,
  tieneAlergias: null,
  alergias: null,
  grupoFamiliar: null,
  expediente: null,
};

const embarazo = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  pacienteId: 'p-1',
  comunidadId: 'c-1',
  fum: '2026-02-01',
  fpp: '2026-11-08',
  riesgo: 'BAJO',
  motivoRiesgo: null,
  estado: 'ACTIVO',
  numeroGestacion: 2,
  semanasGestacion: 32,
  ultimoControl: {
    fecha: '2026-09-01',
    semanasGestacion: 30,
    proximoControl: '2026-09-29',
    alertas: [],
  },
  ...extra,
});

const pagina = (datos: unknown[]) => ({
  datos,
  pagina: 1,
  tamano: 25,
  total: datos.length,
  totalPaginas: 1,
});

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({
  embarazos = [embarazo('e-1')],
  altoRiesgo = [] as unknown[],
  hipertensos = [] as unknown[],
  atrasados = [] as unknown[],
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      const ruta = new URL(p.url, 'http://local').pathname;
      if (ruta.endsWith('/embarazo/alto-riesgo')) return json(pagina(altoRiesgo));
      if (ruta.endsWith('/hipertension/atrasados')) return json(pagina(atrasados));
      if (ruta.endsWith('/programas/embarazo')) return json(pagina(embarazos));
      if (ruta.endsWith('/programas/hipertension')) return json(pagina(hipertensos));
      if (ruta.includes('/v1/pacientes/')) return json(PACIENTE);
      return json({}, 404);
    }),
  );
}

function entrarComo(perfil: Perfil, ruta = '/programas') {
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
}

beforeEach(() => {
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

describe('seguimiento de programas', () => {
  /**
   * Los listados traen `pacienteId`, no el nombre: el servicio de programas
   * guarda el seguimiento clinico y pide los datos de la persona a `usuarios`.
   * Una lista que muestra identificadores no sirve —nadie busca a «8f3a-…» en
   * el archivero— asi que el panel resuelve el nombre por fila.
   */
  it('cada fila dice de quien es, no un identificador', async () => {
    servidor();
    entrarComo(ENFERMERIA);
    render(<App />);

    const fila = await screen.findByRole('row', { name: /Perez Caal/ });
    expect(within(fila).getByRole('link', { name: /Perez Caal, Juana Isabel/ })).toHaveAttribute(
      'href',
      '/pacientes/p-1/expediente',
    );
    expect(fila).toHaveTextContent('32');
  });

  /**
   * El alto riesgo va arriba y aparte, no como una columna mas: es lo unico de
   * la pantalla que obliga a hacer algo hoy, y mezclado entre cuarenta filas
   * ordenadas por fecha de parto se pierde.
   */
  it('el alto riesgo sale destacado arriba, con su motivo', async () => {
    servidor({
      altoRiesgo: [embarazo('e-2', { riesgo: 'ALTO', motivoRiesgo: 'Presion alta sostenida' })],
    });
    entrarComo(ENFERMERIA);
    render(<App />);

    expect(await screen.findByText(/1 embarazo de alto riesgo/i)).toBeInTheDocument();
    expect(screen.getByText('Presion alta sostenida')).toBeInTheDocument();
  });

  /**
   * «Atrasado 12 dias» dice mas que una fecha: quien lee esto esta decidiendo a
   * quien llamar hoy. Y los dias los cuenta el SERVIDOR: recalcularlos en la
   * pantalla arriesgaria que las dos cuentas digan cosas distintas.
   */
  it('en hipertension, los atrasados salen con los dias que manda el servidor', async () => {
    servidor({
      atrasados: [
        {
          programaId: 'h-1',
          pacienteId: 'p-1',
          comunidadId: 'c-1',
          proximoControl: '2026-09-01',
          diasDeAtraso: 16,
        },
      ],
    });
    entrarComo(ENFERMERIA);
    const usuario = userEvent.setup();
    render(<App />);

    await screen.findByRole('row', { name: /Perez Caal/ });
    await usuario.click(screen.getByRole('tab', { name: /Hipertension/i }));

    expect(await screen.findByText(/Atrasado 16 dias/i)).toBeInTheDocument();
  });

  it('sin nadie en seguimiento lo dice, en vez de una tabla vacia', async () => {
    servidor({ embarazos: [] });
    entrarComo(ENFERMERIA);
    render(<App />);

    expect(await screen.findByText(/No hay ningun embarazo en seguimiento/i)).toBeInTheDocument();
  });

  it('Farmacia no entra: el seguimiento clinico no es suyo', async () => {
    servidor();
    entrarComo(FARMACIA);
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /no es de su perfil/i }),
    ).toBeInTheDocument();
  });
});
