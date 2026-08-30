import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../../App';
import { almacenSesion, type Perfil } from '../../../api';
import type { CatalogoFicha } from '../servicio-fichas';
import {
  borradorNinezVacio,
  cuerpoDeFichaNinez,
  edadDicha,
  edadEnMeses,
  fueraDeRangoNinez,
  librasAKilos,
  respiracionRapida,
} from './borrador-ninez';

const MEDICO: Perfil = {
  id: 'u-1',
  usuario: 'jperez',
  rol: 'MEDICO',
  debeCambiarContrasena: false,
};
const RECEPCION: Perfil = { ...MEDICO, id: 'u-4', usuario: 'rlopez', rol: 'RECEPCION' };

/** Dos años y tres meses, que es de lleno la edad de esta hoja. */
const haceMeses = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
};

const PACIENTE = {
  id: 'p-1',
  dpi: null,
  nombres: 'Ana Lucía',
  apellidos: 'Tzul Chen',
  fechaNacimiento: haceMeses(27),
  edad: 2,
  sexo: 'F',
  idioma: 'QEQCHI',
  telefono: null,
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Chilasco' },
  grupoFamiliar: null,
  lugar: { id: 'l-1', nombre: 'El Naranjo', tipo: 'CASERIO' },
  migrante: false,
  lugarOrigen: null,
  tieneAlergias: null,
  alergias: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-001200', aperturaEn: null },
};

const CATALOGO: CatalogoFicha = {
  tipoFicha: 'NINEZ',
  signosPeligro: [
    { id: 'sp-1', orden: 1, texto: 'No puede beber o tomar el pecho', pideTexto: false },
    { id: 'sp-2', orden: 2, texto: 'Vomita todo', pideTexto: false },
  ],
  antecedentes: [],
  problemas: [
    {
      id: 'pr-1',
      orden: 1,
      nombre: 'Tos o dificultad para respirar',
      etiquetaAnotacion: 'Cuánto tiempo hace',
      signos: [{ id: 's-1', orden: 1, texto: 'Tos crónica, falta apetito, pérdida de peso' }],
      diagnosticos: [{ id: 'd-1', orden: 1, texto: 'Neumonía', pideTexto: false }],
    },
    {
      id: 'pr-2',
      orden: 2,
      nombre: 'Vacunación',
      etiquetaAnotacion: null,
      signos: [{ id: 's-2', orden: 1, texto: 'Verificar en carnet, esquema vigente completo' }],
      diagnosticos: [{ id: 'd-2', orden: 1, texto: 'Esquema incompleto', pideTexto: false }],
    },
  ],
  temasConsejeria: [
    { id: 't-1', orden: 1, texto: 'Uso del medicamento' },
    { id: 't-2', orden: 2, texto: 'Alimentación de acuerdo a edad' },
  ],
};

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

function abrir(perfil: Perfil, ruta = '/pacientes/p-1/ficha-ninez') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

const esperarFicha = () => screen.findByRole('heading', { name: /Tzul Chen, Ana Lucía/ });

beforeEach(() => {
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

describe('la edad, que es como esta hoja decide casi todo', () => {
  it('cuenta meses cumplidos, no empezados', () => {
    const referencia = new Date(2026, 7, 30); // 30 de agosto de 2026
    expect(edadEnMeses('2026-08-30', referencia)).toBe(0);
    expect(edadEnMeses('2026-07-30', referencia)).toBe(1);
    // El dia del mes todavia no llego: el mes no esta cumplido.
    expect(edadEnMeses('2026-07-31', referencia)).toBe(0);
    expect(edadEnMeses('2024-05-30', referencia)).toBe(27);
  });

  it('no se corre un mes al partir la fecha', () => {
    // Guatemala es UTC-6: construir un Date con la cadena entera daria el dia
    // anterior, y en el borde de un mes eso cambia la edad.
    const referencia = new Date(2026, 8, 1); // 1 de septiembre
    expect(edadEnMeses('2026-08-01', referencia)).toBe(1);
  });

  it('la dice como el papel la pide: años y meses', () => {
    expect(edadDicha(0)).toBe('0 meses');
    expect(edadDicha(1)).toBe('1 mes');
    expect(edadDicha(12)).toBe('1 año');
    expect(edadDicha(27)).toBe('2 años 3 meses');
  });
});

describe('el umbral de respiración rápida', () => {
  /**
   * Los tres umbrales estan impresos en el problema 1 para compararlos a mano.
   * El sistema ya tiene la edad y las respiraciones, asi que los aplica el.
   */
  it('cambia con la edad, como dice el papel', () => {
    expect(respiracionRapida(1, 60)).toEqual({ rapida: true, umbral: 60 });
    expect(respiracionRapida(1, 59)).toEqual({ rapida: false, umbral: 60 });

    expect(respiracionRapida(6, 50)).toEqual({ rapida: true, umbral: 50 });
    expect(respiracionRapida(6, 49)).toEqual({ rapida: false, umbral: 50 });

    expect(respiracionRapida(24, 40)).toEqual({ rapida: true, umbral: 40 });
    expect(respiracionRapida(24, 39)).toEqual({ rapida: false, umbral: 40 });
  });

  it('a los dos meses justos ya no aplica el umbral de recién nacido', () => {
    expect(respiracionRapida(2, 55).umbral).toBe(50);
    expect(respiracionRapida(12, 45).umbral).toBe(40);
  });
});

describe('el peso', () => {
  /**
   * El papel captura en libras y la grafica de la etapa C las vuelve a
   * necesitar, pero el peso se guarda UNA vez y en kilos: es la columna que
   * alimenta los indicadores de desnutricion de todo el sistema.
   */
  it('se teclea en libras y viaja en kilos', () => {
    expect(librasAKilos(30)).toBe(13.61);
    expect(librasAKilos(8)).toBe(3.63);
  });

  it('avisa de lo que un niño de esta edad no puede pesar', () => {
    expect(fueraDeRangoNinez('pesoLibras', '25')).toBe(false);
    expect(fueraDeRangoNinez('pesoLibras', '2')).toBe(true);
    expect(fueraDeRangoNinez('pesoLibras', '80')).toBe(true);
  });

  it('un campo vacío no está fuera de rango: es que no se midió', () => {
    expect(fueraDeRangoNinez('pesoLibras', '')).toBe(false);
    expect(fueraDeRangoNinez('temperaturaC', '  ')).toBe(false);
  });
});

describe('lo que se envía al servidor', () => {
  const nuevo = () => borradorNinezVacio(CATALOGO);

  it('siempre viaja como ficha de NINEZ', () => {
    const b = nuevo();
    b.motivo = 'Tos de tres días';
    expect(cuerpoDeFichaNinez(b).tipoFicha).toBe('NINEZ');
  });

  it('el peso viaja convertido a kilos, no en libras', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.vitales.pesoLibras = '30';
    const cuerpo = cuerpoDeFichaNinez(b);
    expect(cuerpo.pesoKg).toBe(13.61);
    expect(cuerpo).not.toHaveProperty('pesoLibras');
  });

  it('la raya impresa de un problema viaja como anotación', () => {
    const b = nuevo();
    b.motivo = 'Tos';
    b.problemas['pr-1'] = {
      presente: true,
      signoIds: ['s-1'],
      diagnosticoIds: ['d-1'],
      otroDiagnostico: '',
      conducta: '',
      anotacion: 'Tres días',
    };
    const cuerpo = cuerpoDeFichaNinez(b);
    expect(cuerpo.problemas).toEqual([
      expect.objectContaining({ problemaId: 'pr-1', anotacion: 'Tres días' }),
    ]);
  });

  /**
   * Mandar los cuatro temas siempre guardaria filas que dicen "no se explico
   * nada", y el indicador de consejeria contaria como atendido lo que nadie
   * explico.
   */
  it('solo viajan los temas de consejería marcados', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.consejeria['t-1'] = true;
    expect(cuerpoDeFichaNinez(b).consejeriaTemas).toEqual([
      { temaId: 't-1', brindada: true },
    ]);
  });

  it('sin signos vitales no viaja ninguno', () => {
    const b = nuevo();
    b.motivo = 'Control';
    const cuerpo = cuerpoDeFichaNinez(b);
    expect(cuerpo).not.toHaveProperty('pesoKg');
    expect(cuerpo).not.toHaveProperty('temperaturaC');
    expect(cuerpo).not.toHaveProperty('respiraciones');
  });
});

// ══════════════════════ la ficha en pantalla ══════════════════════

describe('la hoja de consulta en pantalla', () => {
  it('dice la edad del paciente en años y meses', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    // Sale en el encabezado y en el recuadro de "Edad" de la seccion 3: las
    // dos veces a proposito, asi que hay que acotar donde se busca.
    const seccion = screen.getByRole('region', { name: '3. Datos generales del paciente' });
    expect(within(seccion).getByText('2 años 3 meses')).toBeInTheDocument();
  });

  /**
   * El papel los pone arriba del todo, antes incluso de identificar el
   * servicio: es lo primero que se mira al recibir a un nino. El orden de esta
   * hoja NO es el de las otras dos.
   */
  it('los signos de peligro son la sección 1, antes que el servicio', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos.slice(0, 3)).toEqual([
      'Evalúe signos y síntomas de peligro',
      'Identificación del servicio de salud',
      'Datos generales del paciente',
    ]);
  });

  it('marcar un signo de peligro dice qué hacer, sin adornarlo', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Vomita todo' });
    await usuario.click(within(grupo).getAllByRole('radio')[0]);

    // El papel dice "proceda de acuerdo a nivel de resolucion", no
    // "enfermedad grave" como el del neonato.
    expect(await screen.findByText(/Proceda de acuerdo a nivel de resolución/)).toBeInTheDocument();
  });

  /**
   * El distrito y la comunidad del servicio los tiene que dar el CAP. Un dato
   * inventado en una ficha oficial es peor que un hueco declarado.
   */
  it('no se inventa el distrito ni la comunidad del servicio', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    const seccion = screen.getByRole('region', {
      name: '2. Identificación del servicio de salud',
    });
    expect(within(seccion).getAllByText('Pendiente de confirmar')).toHaveLength(2);
    expect(within(seccion).getByText('CAP Purulhá')).toBeInTheDocument();
  });

  it('el peso se pide en libras, como el papel', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    const peso = screen.getByLabelText('Peso');
    expect(peso).toBeInTheDocument();
    expect(screen.getByText(/Lb · como lo pide el papel/)).toBeInTheDocument();
  });

  it('avisa de respiración rápida con el umbral que toca a esa edad', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    // 2 anos 3 meses: el umbral es 40.
    await usuario.type(screen.getByLabelText('Respiraciones'), '45');

    expect(await screen.findByText(/Respiración rápida/)).toBeInTheDocument();
    expect(screen.getByText(/40 o más/)).toBeInTheDocument();
  });

  it('por debajo del umbral lo dice también, en vez de callar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    await usuario.type(screen.getByLabelText('Respiraciones'), '30');

    expect(await screen.findByText(/Dentro del umbral/)).toBeInTheDocument();
  });

  /**
   * Cuatro de los catorce problemas llevan una raya impresa al lado. La
   * etiqueta sale del catalogo, no del codigo: una revision del MSPAS puede
   * cambiar la pregunta sin que nadie toque la pantalla.
   */
  it('un problema con raya impresa la dibuja con su etiqueta del catálogo', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.queryByLabelText('Cuánto tiempo hace')).not.toBeInTheDocument();

    const grupo = screen.getByRole('radiogroup', { name: 'Tos o dificultad para respirar' });
    await usuario.click(within(grupo).getAllByRole('radio')[0]);

    expect(await screen.findByLabelText('Cuánto tiempo hace')).toBeInTheDocument();
  });

  it('un problema sin raya no la inventa', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    const grupo = screen.getByRole('radiogroup', { name: 'Vacunación' });
    await usuario.click(within(grupo).getAllByRole('radio')[0]);

    const conducta = await screen.findAllByLabelText('Conducta');
    expect(conducta.length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('¿Cuántas veces por día?')).not.toBeInTheDocument();
  });

  it('la consejería son casillas sin fecha, no como en la del neonato', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByLabelText('1. Uso del medicamento')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha de reconsulta')).not.toBeInTheDocument();
  });

  it('sin motivo de consulta no deja guardar', async () => {
    servidor();
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByRole('button', { name: 'Guardar la ficha' })).toBeDisabled();
    expect(screen.getByText('Falta el motivo de consulta.')).toBeInTheDocument();
  });

  it('guarda la ficha con el peso ya en kilos', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarFicha();

    await usuario.type(screen.getByLabelText(/^Motivo de consulta/), 'Tos de tres días');
    await usuario.type(screen.getByLabelText('Peso'), '30');
    await usuario.click(screen.getByRole('button', { name: 'Guardar la ficha' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual(
        expect.objectContaining({
          tipoFicha: 'NINEZ',
          motivo: 'Tos de tres días',
          pesoKg: 13.61,
        }),
      );
    });
  });

  it('con un paciente mayor de cinco años avisa pero no bloquea', async () => {
    servidor({ paciente: { ...PACIENTE, fechaNacimiento: haceMeses(72) } });
    abrir(MEDICO);
    await esperarFicha();

    expect(screen.getByText(/Esta hoja llega hasta los/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Motivo de consulta/)).toBeEnabled();
  });

  it('sin expediente abierto lo dice, en vez de dejar capturar en el vacío', async () => {
    servidor({ paciente: { ...PACIENTE, expediente: null } });
    abrir(MEDICO);

    expect(await screen.findByText(/no tiene expediente abierto/)).toBeInTheDocument();
  });

  it('recepción no llena fichas clínicas', async () => {
    servidor();
    abrir(RECEPCION);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Tzul Chen, Ana Lucía/ }),
      ).not.toBeInTheDocument();
    });
  });
});
