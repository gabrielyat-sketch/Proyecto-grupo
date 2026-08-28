import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../../App';
import { almacenSesion, type Perfil } from '../../../api';
import type { CatalogoFicha } from '../servicio-fichas';
import {
  bloqueDelSigno,
  borradorNeonatoVacio,
  cuerpoDeFichaNeonato,
  edadEnDias,
  fueraDeRangoNeonato,
  signosGravesMarcados,
} from './borrador-neonato';

const MEDICO: Perfil = {
  id: 'u-1',
  usuario: 'jperez',
  rol: 'MEDICO',
  debeCambiarContrasena: false,
};
const RECEPCION: Perfil = { ...MEDICO, id: 'u-4', usuario: 'rlopez', rol: 'RECEPCION' };

/** Nacido hace ocho días, para que la ficha sea la que corresponde. */
const haceDias = (n: number) => {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

const PACIENTE = {
  id: 'p-1',
  dpi: null,
  nombres: 'Bebé',
  apellidos: 'Caal Xol',
  fechaNacimiento: haceDias(8),
  edad: 0,
  sexo: 'M',
  idioma: 'QEQCHI',
  telefono: null,
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Chilasco' },
  grupoFamiliar: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-000900', aperturaEn: null },
};

const CATALOGO: CatalogoFicha = {
  tipoFicha: 'NEONATO',
  signosPeligro: [
    { id: 'sp-1', orden: 1, texto: 'No respira', pideTexto: false },
    { id: 'sp-8', orden: 8, texto: 'Pesa menos de 5 libras 8 onzas', pideTexto: false },
    { id: 'sp-21', orden: 21, texto: 'Enrojecimiento del ombligo', pideTexto: false },
    { id: 'sp-24', orden: 24, texto: 'Labio leporino', pideTexto: false },
  ],
  antecedentes: [
    {
      id: 'a-1',
      codigo: 'MAT_DIABETES',
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
      codigo: 'MAT_MEDICAMENTO',
      grupo: 'MEDICO',
      orden: 2,
      texto: 'Toma o tomó algún medicamento',
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
      nombre: 'Diarrea',
      signos: [{ id: 's-1', orden: 1, texto: 'Ojos hundidos' }],
      diagnosticos: [{ id: 'd-1', orden: 1, texto: 'Diarrea con DHE', pideTexto: false }],
    },
  ],
  temasConsejeria: [
    { id: 't-1', orden: 1, texto: 'Técnica de amamantamiento' },
    { id: 't-2', orden: 2, texto: 'Cuidados del cordón umbilical' },
  ],
};

let peticiones: Request[] = [];
let cuerpos: unknown[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({ paciente = PACIENTE as unknown } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      if (p.method !== 'GET') cuerpos.push(await p.clone().json());
      const ruta = new URL(p.url, 'http://local').pathname;

      if (ruta.includes('/fichas/catalogo/')) return json(CATALOGO);
      if (ruta.endsWith('/fichas')) return json({ id: 'a-9', expedienteId: 'e-1' }, 201);
      if (ruta.includes('/v1/pacientes/')) return json(paciente);
      if (ruta.includes('/atenciones')) {
        return json({ datos: [], pagina: 1, tamano: 25, total: 0, totalPaginas: 0 });
      }
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil, ruta = '/pacientes/p-1/ficha-neonato') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

const esperarFicha = () =>
  screen.findByRole('heading', { name: /Ficha clínica para menor de 28 días/ });

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

// ══════════════════════ las reglas del papel ══════════════════════

describe('los tres bloques de signos de peligro', () => {
  /**
   * El papel los imprime en tres recuadros con conductas distintas, y el
   * modelo de datos solo distingue por orden.
   */
  it('reparte los signos segun su orden en el formulario', () => {
    expect(bloqueDelSigno(1)).toBe('PELIGRO');
    expect(bloqueDelSigno(20)).toBe('PELIGRO');
    expect(bloqueDelSigno(21)).toBe('INFECCION');
    expect(bloqueDelSigno(23)).toBe('INFECCION');
    expect(bloqueDelSigno(24)).toBe('MALFORMACION');
    expect(bloqueDelSigno(27)).toBe('MALFORMACION');
  });

  /** Con uno solo de los veinte primeros, el papel manda referir. */
  it('solo los veinte primeros cuentan como enfermedad grave', () => {
    const b = borradorNeonatoVacio(CATALOGO);
    b.signosPeligro['sp-21'].presente = true;
    b.signosPeligro['sp-24'].presente = true;
    expect(signosGravesMarcados(b, CATALOGO)).toEqual([]);

    b.signosPeligro['sp-8'].presente = true;
    expect(signosGravesMarcados(b, CATALOGO)).toEqual(['Pesa menos de 5 libras 8 onzas']);
  });
});

describe('la edad en dias', () => {
  it('cuenta los dias, que es como los pide el formulario', () => {
    const referencia = new Date(2026, 7, 28);
    expect(edadEnDias('2026-08-20', referencia)).toBe(8);
    expect(edadEnDias('2026-08-28', referencia)).toBe(0);
  });

  /**
   * Guatemala es UTC-6: construir un Date con la cadena entera la interpreta
   * como medianoche UTC y la fecha se corre al dia anterior.
   */
  it('no se corre un dia al partir la fecha', () => {
    const referencia = new Date(2026, 7, 28);
    expect(edadEnDias('2026-08-01T00:00:00.000Z', referencia)).toBe(27);
  });
});

describe('los rangos del examen fisico', () => {
  it('avisa de lo que un recien nacido no puede tener', () => {
    expect(fueraDeRangoNeonato('temperaturaC', '36.5')).toBe(false);
    expect(fueraDeRangoNeonato('temperaturaC', '45')).toBe(true);
    expect(fueraDeRangoNeonato('pesoOnzas', '15')).toBe(false);
    // Dieciseis onzas son una libra.
    expect(fueraDeRangoNeonato('pesoOnzas', '16')).toBe(true);
  });

  it('un campo vacio no esta fuera de rango: es que no se midio', () => {
    expect(fueraDeRangoNeonato('pulso', '')).toBe(false);
  });
});

describe('lo que se envia al servidor', () => {
  it('el peso viaja en libras y onzas, no convertido a kilos', () => {
    const b = borradorNeonatoVacio(CATALOGO);
    b.motivo = 'Control';
    b.examen.pesoLibras = '6';
    b.examen.pesoOnzas = '4';

    const cuerpo = cuerpoDeFichaNeonato(b);
    expect(cuerpo.neonato).toMatchObject({ pesoLibras: 6, pesoOnzas: 4 });
    expect(cuerpo).not.toHaveProperty('pesoKg');
  });

  /**
   * Mandar los seis siempre guardaria cuatro filas que dicen "no se hizo
   * nada", y el indicador contaria como atendido lo que nadie explico.
   */
  it('solo viajan los temas de consejeria con algo que decir', () => {
    const b = borradorNeonatoVacio(CATALOGO);
    b.motivo = 'Control';
    b.consejeria['t-1'] = { brindada: true, fechaReconsulta: '2026-09-15' };

    const cuerpo = cuerpoDeFichaNeonato(b);
    expect(cuerpo.consejeriaTemas).toHaveLength(1);
    expect(cuerpo.consejeriaTemas?.[0]).toEqual({
      temaId: 't-1',
      brindada: true,
      fechaReconsulta: '2026-09-15',
    });
  });

  it('sin nada del neonato, el bloque no viaja', () => {
    const b = borradorNeonatoVacio(CATALOGO);
    b.motivo = 'Control';
    expect(cuerpoDeFichaNeonato(b)).not.toHaveProperty('neonato');
  });

  it('siempre viaja como ficha de NEONATO', () => {
    const b = borradorNeonatoVacio(CATALOGO);
    b.motivo = 'Control';
    expect(cuerpoDeFichaNeonato(b).tipoFicha).toBe('NEONATO');
  });
});

// ══════════════════════════ la pantalla ══════════════════════════

describe('la ficha en pantalla', () => {
  it('dice la edad del paciente en dias, como el formulario', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByText(/8 días de nacido/)).toBeInTheDocument();
  });

  it('separa los tres recuadros del papel, con su conducta', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(await screen.findByText('Evalué signos de peligro')).toBeInTheDocument();
    expect(screen.getByText('Evaluar infección')).toBeInTheDocument();
    expect(screen.getByText('Evaluar malformaciones')).toBeInTheDocument();
    expect(screen.getByText(/Refiera a donde corresponda/)).toBeInTheDocument();
  });

  /**
   * Con uno solo marcado el neonato se refiere. La pantalla lo dice en el
   * momento, no al final: el personal no deberia tener que recordarlo.
   */
  it('avisa de enfermedad grave en cuanto se marca un signo de los veinte', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.queryByText('Tiene enfermedad grave')).not.toBeInTheDocument();

    const grupo = screen.getByRole('radiogroup', { name: 'No respira' });
    await usuario.click(within(grupo).getAllByRole('radio')[0]);

    const titulo = await screen.findByText('Tiene enfermedad grave');
    // Acotado al aviso: la conducta tambien esta impresa junto al recuadro de
    // los signos, y las dos apariciones son correctas.
    const aviso = titulo.closest('.MuiAlert-root') as HTMLElement;
    expect(within(aviso).getByText(/refiera INMEDIATAMENTE/i)).toBeInTheDocument();
    // Y dice cual se marco, no solo que hay uno.
    expect(within(aviso).getByText('No respira')).toBeInTheDocument();
  });

  it('marcar un signo de infeccion NO dispara el aviso de enfermedad grave', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Enrojecimiento del ombligo' });
    await usuario.click(within(grupo).getAllByRole('radio')[0]);

    await waitFor(() => {
      expect(screen.queryByText('Tiene enfermedad grave')).not.toBeInTheDocument();
    });
  });

  it('el peso se pide en libras y onzas', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByLabelText('Peso (libras)')).toBeInTheDocument();
    expect(screen.getByLabelText('Peso (onzas)')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Peso \(kg\)/)).not.toBeInTheDocument();
  });

  it('sin motivo de consulta no deja guardar', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByRole('button', { name: 'Guardar la ficha' })).toBeDisabled();
    expect(screen.getByText(/Falta el motivo de consulta/)).toBeInTheDocument();
  });

  it('guarda la ficha con el peso en libras y onzas', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    // Se pega en vez de teclear: `type` redibuja la ficha entera en cada
    // pulsacion, y con treinta campos y sus grupos de casillas eso empuja la
    // prueba por encima del limite cuando la suite corre en paralelo.
    await usuario.click(screen.getByLabelText(/Motivo de consulta/));
    await usuario.paste('Control');
    await usuario.click(screen.getByLabelText('Peso (libras)'));
    await usuario.paste('6');
    await usuario.click(screen.getByLabelText('Peso (onzas)'));
    await usuario.paste('4');
    await usuario.click(screen.getByRole('button', { name: 'Guardar la ficha' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual(
        expect.objectContaining({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          neonato: expect.objectContaining({ pesoLibras: 6, pesoOnzas: 4 }),
        }),
      );
    });
  });

  it('el numero de dosis de Td solo aparece si la madre la recibio', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.queryByLabelText(/N.º de dosis/)).not.toBeInTheDocument();

    const grupo = screen.getByRole('radiogroup', { name: 'Td en la madre' });
    await usuario.click(within(grupo).getAllByRole('radio')[0]);

    expect(await screen.findByLabelText(/N.º de dosis/)).toBeInTheDocument();
  });

  /** El papel lo dice: "NO = investigue y oriente". */
  it('si no hay lactancia materna exclusiva, dice que investigue', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Lactancia materna exclusiva' });
    // La segunda casilla es "No".
    await usuario.click(within(grupo).getAllByRole('radio')[1]);

    expect(await screen.findByText('Investigue y oriente.')).toBeInTheDocument();
  });

  it('la consejeria es una tabla con fecha de reconsulta, no un texto', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByLabelText('Técnica de amamantamiento')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Fecha de reconsulta')).toHaveLength(2);
  });

  /**
   * El CAP transcribe expedientes de papel: una ficha de hace tres años se
   * llena con la edad que el nino tenia entonces. Se avisa y se deja seguir.
   */
  it('con un paciente mayor de 28 dias avisa pero no bloquea', async () => {
    servidor({ paciente: { ...PACIENTE, fechaNacimiento: haceDias(90) } });
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByText(/Esta ficha es para menores de/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo de consulta/)).toBeEnabled();
  });

  it('sin expediente abierto lo dice, en vez de dejar capturar en el vacio', async () => {
    servidor({ paciente: { ...PACIENTE, expediente: null } });
    abrir(MEDICO);

    expect(await screen.findByText(/no tiene expediente abierto/)).toBeInTheDocument();
  });

  it('recepcion no llena fichas clinicas', async () => {
    servidor();
    abrir(RECEPCION);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /menor de 28 días/ }),
      ).not.toBeInTheDocument();
    });
  });
});
