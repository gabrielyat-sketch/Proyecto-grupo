import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';
import { imcDe, presion } from './servicio-expedientes';

const MEDICO: Perfil = {
  id: 'u-1',
  usuario: 'jperez',
  rol: 'MEDICO',
  debeCambiarContrasena: false,
};
const RECEPCION: Perfil = { ...MEDICO, id: 'u-2', usuario: 'rlopez', rol: 'RECEPCION' };
const FARMACIA: Perfil = { ...MEDICO, id: 'u-3', usuario: 'sgomez', rol: 'FARMACIA' };

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
  expediente: { id: 'e-1', numero: 'EXP-2026-000123', aperturaEn: null },
};

const atencion = (n: number, extra: Record<string, unknown> = {}) => ({
  id: 'a-' + n,
  fecha: '2026-0' + n + '-15T10:30:00.000Z',
  registradaPor: 'u-1',
  digitalizada: false,
  tipoFicha: null,
  motivo: 'Consulta numero ' + n,
  diagnostico: null,
  tratamiento: null,
  notas: null,
  pesoKg: null,
  tallaCm: null,
  presionSistolica: null,
  presionDiastolica: null,
  temperaturaC: null,
  ...extra,
});

const FICHA = {
  id: 'a-2',
  expedienteId: 'e-1',
  tipoFicha: 'ADULTO',
  fecha: '2026-02-15T10:30:00.000Z',
  registradaPor: 'u-1',
  digitalizada: false,
  motivo: 'Tos de tres dias',
  historiaEnfermedad: 'Tos seca, sin fiebre.',
  manejoEstabilizacion: null,
  diagnostico: null,
  tratamiento: null,
  notas: null,
  consejeria: 'Signos de alarma explicados.',
  referencia: null,
  vacunaAdministrada: null,
  pesoKg: '72.50',
  tallaCm: '158.0',
  presionSistolica: 128,
  presionDiastolica: 82,
  temperaturaC: '36.8',
  pulso: 78,
  respiraciones: 18,
  circunferenciaCinturaCm: null,
  imc: 29.04,
  fechaProximaVisita: null,
  signosPeligro: [
    { signoId: 's-1', texto: 'Dificultad respiratoria', presente: true, detalle: null },
    { signoId: 's-2', texto: 'Cefalea intensa', presente: false, detalle: null },
  ],
  problemas: [
    {
      problemaId: 'pr-1',
      nombre: 'Tos o dificultad para respirar',
      presente: true,
      signos: ['Sibilancia', 'Tos cronica'],
      diagnosticos: ['Neumonia'],
      otroDiagnostico: null,
      conducta: 'Amoxicilina y control en 3 dias',
    },
    {
      problemaId: 'pr-2',
      nombre: 'Diarrea',
      presente: false,
      signos: [],
      diagnosticos: [],
      otroDiagnostico: null,
      conducta: null,
    },
  ],
  medicamentos: [{ nombre: 'Amoxicilina 500 mg', dosis: '1 cada 8 horas', dias: 7 }],
};

const paginaDe = (datos: unknown[]) => ({
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

function servidor({
  historial = [atencion(1)],
  expedienteBuscado = null as unknown,
  paciente = PACIENTE,
  ficha = FICHA,
}: {
  historial?: unknown[];
  expedienteBuscado?: unknown;
  paciente?: unknown;
  ficha?: unknown;
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const url = new URL(p.url, 'http://local');

      if (url.pathname.endsWith('/expedientes/buscar')) {
        return expedienteBuscado
          ? json(expedienteBuscado)
          : json(
              {
                codigo: 'NO_ENCONTRADO',
                mensaje: 'No existe un expediente con ese numero.',
                trazaId: 'x',
                ruta: url.pathname,
                fecha: '2026-08-27T00:00:00.000Z',
              },
              404,
            );
      }
      if (url.pathname.endsWith('/atenciones')) return json(paginaDe(historial));
      if (url.pathname.includes('/v1/fichas/')) return json(ficha);
      if (url.pathname.includes('/v1/pacientes/')) return json(paciente);
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil, ruta: string) {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

beforeEach(() => {
  peticiones = [];
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

describe('calculos del expediente', () => {
  it('la presion se dice como se lee, no en dos columnas', () => {
    expect(presion(128, 82)).toBe('128/82');
    expect(presion(null, null)).toBeNull();
    expect(presion(128, null)).toBe('128/—');
  });

  it('el IMC sale de peso y talla, que viajan como texto', () => {
    expect(imcDe('72.50', '158.0')).toBe(29.04);
    expect(imcDe(null, '158')).toBeNull();
    expect(imcDe('72', '0')).toBeNull();
  });
});

describe('buscar un expediente por su numero', () => {
  it('no busca mientras se escribe: la busqueda es exacta', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(RECEPCION, '/expedientes');

    await usuario.type(
      await screen.findByLabelText(/Numero de expediente/),
      'EXP-2026-000123',
    );
    expect(peticiones.filter((p) => p.url.includes('/buscar'))).toHaveLength(0);

    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() =>
      expect(peticiones.filter((p) => p.url.includes('/buscar')).length).toBe(1),
    );
  });

  it('un numero que no existe lo dice, y explica por que', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(RECEPCION, '/expedientes');

    await usuario.type(await screen.findByLabelText(/Numero de expediente/), 'EXP-9999-999999');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText(/la busqueda es exacta/)).toBeInTheDocument();
  });

  it('encontrado, lleva al expediente del paciente', async () => {
    servidor({
      expedienteBuscado: {
        id: 'e-1',
        numero: 'EXP-2026-000123',
        aperturaEn: null,
        paciente: {
          id: 'p-1',
          nombres: 'Juana Isabel',
          apellidos: 'Perez Caal',
          fechaNacimiento: '1985-04-12T00:00:00.000Z',
          sexo: 'F',
          comunidad: { id: 'c-1', nombre: 'Purulha Centro' },
        },
        digitalizacion: {
          estado: 'COMPLETO',
          digitalizadoPor: null,
          iniciadoEn: null,
          completadoEn: null,
          atencionesTranscritas: 3,
          observaciones: null,
        },
      },
    });
    const usuario = userEvent.setup();
    abrir(RECEPCION, '/expedientes');

    await usuario.type(await screen.findByLabelText(/Numero de expediente/), 'EXP-2026-000123');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Perez Caal, Juana Isabel')).toBeInTheDocument();
    expect(screen.getByText(/Transcrito/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir el expediente' })).toHaveAttribute(
      'href',
      '/pacientes/p-1/expediente',
    );
  });
});

describe('el expediente de un paciente', () => {
  const esperar = () => screen.findByRole('heading', { name: 'Perez Caal, Juana Isabel' });

  it('muestra al paciente y su numero de expediente', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    expect(screen.getByText('EXP-2026-000123')).toBeInTheDocument();
    expect(screen.getByText(/41 anos/)).toBeInTheDocument();
  });

  it('los signos vitales se leen sin abrir nada', async () => {
    // Un expediente de papel se hojea y los numeros se leen de corrido: es asi
    // como se ve que la presion viene subiendo tres controles seguidos.
    servidor({
      historial: [
        atencion(1, {
          pesoKg: '72.50',
          tallaCm: '158.0',
          presionSistolica: 128,
          presionDiastolica: 82,
        }),
      ],
    });
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    expect(await screen.findByText('72.50 kg')).toBeInTheDocument();
    expect(screen.getByText('128/82')).toBeInTheDocument();
    // El IMC se calcula, no viene de la base.
    expect(screen.getByText('29.04')).toBeInTheDocument();
  });

  it('distingue una ficha de una atencion breve', async () => {
    servidor({ historial: [atencion(1), atencion(2, { tipoFicha: 'ADULTO' })] });
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    expect(await screen.findByText('Ficha Adulto')).toBeInTheDocument();
    // Solo la ficha ofrece abrirse.
    expect(screen.getAllByRole('button', { name: 'Ver la ficha completa' })).toHaveLength(1);
  });

  it('la ficha completa se pide al abrirla, no antes', async () => {
    servidor({ historial: [atencion(2, { tipoFicha: 'ADULTO' })] });
    const usuario = userEvent.setup();
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    await screen.findByText('Ficha Adulto');
    expect(peticiones.filter((p) => p.url.includes('/v1/fichas/'))).toHaveLength(0);

    await usuario.click(screen.getByRole('button', { name: 'Ver la ficha completa' }));

    expect(await screen.findByText('Tos o dificultad para respirar')).toBeInTheDocument();
    expect(peticiones.filter((p) => p.url.includes('/v1/fichas/'))).toHaveLength(1);
  });

  it('la ficha muestra solo lo que se marco, no el catalogo entero', async () => {
    servidor({ historial: [atencion(2, { tipoFicha: 'ADULTO' })] });
    const usuario = userEvent.setup();
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    await usuario.click(await screen.findByRole('button', { name: 'Ver la ficha completa' }));
    await screen.findByText('Tos o dificultad para respirar');

    // El signo de peligro presente si; el ausente no.
    expect(screen.getByText('Dificultad respiratoria')).toBeInTheDocument();
    expect(screen.queryByText('Cefalea intensa')).not.toBeInTheDocument();
    // El problema marcado si; el no marcado no.
    expect(screen.queryByText('Diarrea')).not.toBeInTheDocument();

    expect(screen.getByText(/Sibilancia · Tos cronica/)).toBeInTheDocument();
    expect(screen.getByText(/Amoxicilina 500 mg/)).toBeInTheDocument();
  });

  it('un expediente sin atenciones lo dice', async () => {
    servidor({ historial: [] });
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    expect(
      await screen.findByText(/todavia no tiene ninguna atencion registrada/),
    ).toBeInTheDocument();
  });

  /**
   * La ficha de menor de 28 dias guarda cosas que ninguna otra tiene: el
   * nombre de la madre, el peso al nacer, quien atendio el parto. El servidor
   * las guardaba desde el primer dia, pero esta pantalla solo pintaba los
   * campos comunes, asi que media ficha se escribia y no se podia volver a
   * leer. Desde fuera eso no se distingue de que no se guardara.
   */
  it('la ficha de neonato muestra a la madre y el parto', async () => {
    servidor({
      // Con tipo de ficha: es lo que hace que la atencion se pueda desplegar.
      historial: [atencion(1, { tipoFicha: 'NEONATO' })],
      ficha: {
        ...FICHA,
        tipoFicha: 'NEONATO',
        neonato: {
          nombreMadre: 'Juana Isabel Perez Caal',
          pesoLibras: 6,
          pesoOnzas: 4,
          perimetroBraquialCm: null,
          circunferenciaCefalicaCm: '34.0',
          pesoNacerLibras: 5,
          pesoNacerOnzas: 12,
          lloroAlNacer: true,
          nacioCianotico: false,
          horasTrabajoParto: 9,
          quienAtendioParto: 'COMADRONA',
          quienAtendioPartoOtro: null,
          rupturaPrematuraMembranas: false,
          trabajoPartoPrematuro: false,
          partoProlongado: null,
          tipoParto: 'EUTOCICO',
          bcg: true,
          tdMadre: true,
          tdMadreDosis: 2,
        },
      },
    });
    const usuario = userEvent.setup();
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    await usuario.click(await screen.findByRole('button', { name: /Ver la ficha completa/i }));

    expect(await screen.findByText('Juana Isabel Perez Caal')).toBeInTheDocument();
    expect(screen.getByText('5 lb 12 oz')).toBeInTheDocument();
    expect(screen.getByText('Comadrona')).toBeInTheDocument();
  });

  /**
   * La ruta estaba escrita a mano —`/ficha` para todo el mundo— asi que desde
   * el expediente de un recien nacido se abria la de adolescente, adulto y
   * adulto mayor. Es el TERCER sitio donde aparecio el mismo error: ya lo tuvo
   * el boton de atender de la sala de espera. Por eso el criterio vive en un
   * unico lugar, `ficha-por-edad`.
   */
  it('«Nueva ficha» abre la que toca por edad, no siempre la de adultos', async () => {
    const haceDias = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d.toISOString();
    };
    servidor({
      paciente: { ...PACIENTE, edad: 0, fechaNacimiento: haceDias(3) },
    });
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    expect(await screen.findByRole('link', { name: /Nueva ficha/i })).toHaveAttribute(
      'href',
      '/pacientes/p-1/ficha-neonato',
    );
  });

  it('marca las atenciones transcritas del papel', async () => {
    servidor({ historial: [atencion(1, { digitalizada: true })] });
    abrir(MEDICO, '/pacientes/p-1/expediente');
    await esperar();

    expect(await screen.findByText('Del papel')).toBeInTheDocument();
  });

  describe('quien ve el historial', () => {
    it('Recepcion ve al paciente pero NO sus diagnosticos', async () => {
      // Puede encontrar al paciente y ver su numero de expediente, pero el
      // historial clinico no es suyo. Es la misma restriccion del servidor.
      servidor();
      abrir(RECEPCION, '/pacientes/p-1/expediente');
      await esperar();

      expect(
        await screen.findByText('El historial clinico no esta disponible para su rol'),
      ).toBeInTheDocument();
      expect(peticiones.filter((p) => p.url.includes('/atenciones'))).toHaveLength(0);
    });

    it('Farmacia tampoco', async () => {
      servidor();
      abrir(FARMACIA, '/pacientes/p-1/expediente');
      await esperar();

      expect(
        await screen.findByText('El historial clinico no esta disponible para su rol'),
      ).toBeInTheDocument();
    });

    it('el Medico si, y ademas puede abrir una ficha nueva', async () => {
      servidor();
      abrir(MEDICO, '/pacientes/p-1/expediente');
      await esperar();

      expect(await screen.findByText('Consulta numero 1')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Nueva ficha' })).toHaveAttribute(
        'href',
        '/pacientes/p-1/ficha',
      );
    });

    it('a un paciente fallecido no se le ofrece ficha nueva', async () => {
      servidor({ paciente: { ...PACIENTE, fallecido: true } });
      abrir(MEDICO, '/pacientes/p-1/expediente');
      await esperar();

      expect(screen.getByText('Fallecido')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Nueva ficha' })).not.toBeInTheDocument();
    });
  });
});
