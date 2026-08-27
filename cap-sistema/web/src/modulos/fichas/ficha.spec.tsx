import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const MEDICO: Perfil = {
  id: 'u-1',
  usuario: 'jlopez',
  rol: 'MEDICO',
  debeCambiarContrasena: false,
};

const RECEPCION: Perfil = { ...MEDICO, id: 'u-2', usuario: 'mrodriguez', rol: 'RECEPCION' };

const PACIENTE = {
  id: 'p-1',
  dpi: '2547896540101',
  nombres: 'Juana Isabel',
  apellidos: 'Perez Caal',
  fechaNacimiento: '1985-04-12T00:00:00.000Z',
  edad: 41,
  sexo: 'F',
  idioma: 'QEQCHI',
  telefono: '55512345',
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Purulha Centro' },
  grupoFamiliar: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-000123', aperturaEn: '2026-01-10T00:00:00.000Z' },
};

const CATALOGO = {
  tipoFicha: 'ADULTO',
  signosPeligro: [
    { id: 'sp-1', orden: 1, texto: 'Dificultad respiratoria', pideTexto: false },
    { id: 'sp-2', orden: 2, texto: 'Otros (describir)', pideTexto: true },
  ],
  antecedentes: [
    {
      id: 'a-1',
      codigo: 'MED_DIABETES',
      grupo: 'MEDICO',
      orden: 1,
      texto: 'Diabetes',
      pideDetalle: false,
      pideFecha: false,
      pideNumero: false,
      permiteNoAplica: false,
    },
    {
      id: 'a-2',
      codigo: 'MED_MEDICAMENTOS',
      grupo: 'MEDICO',
      orden: 2,
      texto: 'Toma medicamentos',
      pideDetalle: true,
      pideFecha: false,
      pideNumero: false,
      permiteNoAplica: false,
    },
  ],
  problemas: [
    {
      id: 'pr-1',
      orden: 1,
      nombre: 'Tos o dificultad para respirar',
      signos: [{ id: 'sg-1', orden: 1, texto: 'Respiracion rapida' }],
      diagnosticos: [{ id: 'dx-1', orden: 1, texto: 'Neumonia', pideTexto: false }],
    },
    {
      id: 'pr-2',
      orden: 2,
      nombre: 'Diarrea',
      signos: [{ id: 'sg-2', orden: 1, texto: 'Ojos hundidos' }],
      diagnosticos: [{ id: 'dx-2', orden: 1, texto: 'Deshidratacion', pideTexto: false }],
    },
  ],
};

const SIN_ANTECEDENTES = { pacienteId: 'p-1', marcados: [], obstetricos: null };

let peticiones: Request[] = [];
let cuerpos: Record<string, unknown>[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({
  antecedentes = SIN_ANTECEDENTES,
  paciente = PACIENTE,
  alRegistrar,
}: {
  antecedentes?: unknown;
  paciente?: unknown;
  alRegistrar?: () => Response;
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const ruta = new URL(p.url, 'http://local').pathname;
      if (p.method !== 'GET') cuerpos.push({ ruta, cuerpo: await p.clone().json() });

      if (ruta.includes('/fichas/catalogo/')) return json(CATALOGO);
      if (ruta.endsWith('/antecedentes')) return json(antecedentes);
      if (ruta.endsWith('/fichas') && p.method === 'POST') {
        return alRegistrar
          ? alRegistrar()
          : json({ id: 'f-1', expedienteId: 'e-1', fecha: '2026-08-27T15:00:00.000Z' }, 201);
      }
      if (ruta.includes('/v1/pacientes/')) return json(paciente);
      return json({}, 404);
    }),
  );
}

const enviado = (fragmento: string) =>
  cuerpos.find((c) => String(c.ruta).endsWith(fragmento))?.cuerpo as Record<string, unknown>;

function abrir(perfil: Perfil = MEDICO) {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', '/pacientes/p-1/ficha');
  return render(<App />);
}

const esperarFicha = () =>
  screen.findByRole('heading', { name: /Perez Caal, Juana Isabel/ });

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
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ficha clinica de adultos', () => {
  it('dibuja las diez secciones en el orden del formulario impreso', async () => {
    servidor();
    abrir();
    await esperarFicha();

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual([
      'Identificacion y datos generales',
      'Signos y sintomas de peligro',
      'Manejo, motivo de consulta e historia',
      'Antecedentes',
      'Examen fisico',
      'Revision de problemas',
      'Conducta y tratamiento',
      'Consejeria',
    ]);
  });

  it('muestra los datos del paciente sin pedir que se reescriban', async () => {
    servidor();
    abrir();
    await esperarFicha();

    expect(screen.getByText('41 anos')).toBeInTheDocument();
    expect(screen.getAllByText('EXP-2026-000123').length).toBeGreaterThan(0);
  });

  it('una casilla si/no es UNA sola parada de tabulador, no tres', async () => {
    // Es lo que hace viable transcribir cientos de hojas: con tres paradas por
    // pregunta, recorrer la ficha costaria el triple de pulsaciones.
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Dificultad respiratoria' });
    const casillas = within(grupo).getAllByRole('radio');
    expect(casillas).toHaveLength(2);
    expect(casillas.filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);

    casillas[0].focus();
    await usuario.keyboard('s');
    expect(casillas[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('la tecla N responde que no, y Suprimir vuelve a dejarlo sin preguntar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Dificultad respiratoria' });
    const [si, no] = within(grupo).getAllByRole('radio');

    si.focus();
    await usuario.keyboard('n');
    expect(no).toHaveAttribute('aria-checked', 'true');

    await usuario.keyboard('{Delete}');
    expect(no).toHaveAttribute('aria-checked', 'false');
    expect(si).toHaveAttribute('aria-checked', 'false');
  });

  it('la fila de un problema se abre al marcarla y no antes', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    expect(screen.queryByText('Respiracion rapida')).not.toBeInTheDocument();

    const grupo = screen.getByRole('radiogroup', { name: 'Tos o dificultad para respirar' });
    within(grupo).getAllByRole('radio')[0].focus();
    await usuario.keyboard('s');

    expect(await screen.findByText('Respiracion rapida')).toBeInTheDocument();
    // La fila que no se marco sigue cerrada.
    expect(screen.queryByText('Ojos hundidos')).not.toBeInTheDocument();
  });

  it('el "cual" de un antecedente aparece solo al responder que si', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    expect(screen.queryByLabelText('Cual')).not.toBeInTheDocument();

    const grupo = screen.getByRole('radiogroup', { name: 'Toma medicamentos' });
    within(grupo).getAllByRole('radio')[0].focus();
    await usuario.keyboard('s');

    expect(await screen.findByLabelText('Cual')).toBeInTheDocument();
  });

  it('calcula el indice de masa corporal mientras se escribe', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    await usuario.type(screen.getByLabelText('Peso'), '72.5');
    await usuario.type(screen.getByLabelText('Talla'), '158');

    expect(await screen.findByText('29.04')).toBeInTheDocument();
    expect(screen.getByText('Sobrepeso')).toBeInTheDocument();
  });

  it('no deja guardar sin el motivo de la consulta', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    await usuario.click(screen.getAllByRole('button', { name: 'Guardar ficha' })[0]);

    expect(await screen.findByText('Revise esto antes de guardar')).toBeInTheDocument();
    expect(cuerpos.filter((c) => String(c.ruta).endsWith('/fichas'))).toHaveLength(0);
  });

  it('guarda la ficha y los antecedentes por separado, antecedentes primero', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    await usuario.type(screen.getByLabelText(/Motivo de la consulta/), 'Tos de tres dias');

    const grupo = screen.getByRole('radiogroup', { name: 'Diabetes' });
    within(grupo).getAllByRole('radio')[0].focus();
    await usuario.keyboard('s');

    await usuario.click(screen.getAllByRole('button', { name: 'Guardar ficha' })[0]);
    await screen.findByText('Ficha registrada');

    const rutas = cuerpos.map((c) => String(c.ruta));
    expect(rutas.findIndex((r) => r.endsWith('/antecedentes'))).toBeLessThan(
      rutas.findIndex((r) => r.endsWith('/fichas')),
    );

    expect(enviado('/antecedentes').marcados).toEqual([
      { antecedenteId: 'a-1', respuesta: 'SI' },
    ]);
    expect(enviado('/fichas')).toMatchObject({
      tipoFicha: 'ADULTO',
      motivo: 'Tos de tres dias',
    });
  });

  it('Ctrl+Enter guarda sin ir al boton', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    await usuario.type(screen.getByLabelText(/Motivo de la consulta/), 'Control');
    await usuario.keyboard('{Control>}{Enter}{/Control}');

    await screen.findByText('Ficha registrada');
  });

  it('un error del servidor deja la ficha en pantalla, con lo escrito intacto', async () => {
    servidor({
      alRegistrar: () =>
        json(
          {
            codigo: 'ERROR_INTERNO',
            mensaje: 'No se pudo registrar la ficha.',
            trazaId: 'abc-123',
            ruta: '/v1/expedientes/e-1/fichas',
            fecha: '2026-08-27T15:00:00.000Z',
          },
          500,
        ),
    });
    const usuario = userEvent.setup();
    abrir();
    await esperarFicha();

    await usuario.type(screen.getByLabelText(/Motivo de la consulta/), 'Tos de tres dias');
    await usuario.click(screen.getAllByRole('button', { name: 'Guardar ficha' })[0]);

    expect(await screen.findByText('No se pudo registrar la ficha.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo de la consulta/)).toHaveValue('Tos de tres dias');
    expect(screen.queryByText('Ficha registrada')).not.toBeInTheDocument();
  });

  it('lo respondido en visitas anteriores llega ya marcado', async () => {
    servidor({
      antecedentes: {
        pacienteId: 'p-1',
        marcados: [
          {
            antecedenteId: 'a-1',
            codigo: 'MED_DIABETES',
            texto: 'Diabetes',
            grupo: 'MEDICO',
            respuesta: 'SI',
            detalle: null,
            fecha: null,
            numero: null,
            actualizadoEn: '2026-03-01T10:00:00.000Z',
          },
        ],
        obstetricos: null,
      },
    });
    abrir();
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Diabetes' });
    expect(within(grupo).getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('avisa cuando la edad del paciente no corresponde a esta ficha', async () => {
    servidor({ paciente: { ...PACIENTE, edad: 4, nombres: 'Pedro' } });
    abrir();

    expect(
      await screen.findByText('Esta ficha no corresponde a la edad del paciente'),
    ).toBeInTheDocument();
  });

  it('sin expediente abierto no se puede registrar la ficha', async () => {
    servidor({ paciente: { ...PACIENTE, expediente: null } });
    abrir();

    expect(
      await screen.findByText('Este paciente no tiene expediente abierto'),
    ).toBeInTheDocument();
  });

  it('los antecedentes gineco-obstetricos no se piden a un paciente hombre', async () => {
    servidor({ paciente: { ...PACIENTE, sexo: 'M', nombres: 'Pedro' } });
    abrir();
    await screen.findByRole('heading', { name: /Perez Caal, Pedro/ });

    expect(screen.queryByLabelText('Gestas')).not.toBeInTheDocument();
  });

  it('Recepcion no entra a la ficha: no es suya', async () => {
    servidor();
    abrir(RECEPCION);

    // La guarda por rol la devuelve al inicio.
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByText('Revision de problemas')).not.toBeInTheDocument();
  });
});
