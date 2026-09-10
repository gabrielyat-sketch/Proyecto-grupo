import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../../App';
import { almacenSesion, type Perfil } from '../../../api';
import { aniosYMeses, cmAMetros, diasEntre, fechaConBarras, kgALibras, kgALibrasYOnzas } from './Hoja';

const MEDICO: Perfil = { id: 'u-1', usuario: 'jlopez', rol: 'MEDICO', debeCambiarContrasena: false };
const RECEPCION: Perfil = { ...MEDICO, id: 'u-2', usuario: 'mrodriguez', rol: 'RECEPCION' };
const DIRECTOR: Perfil = { ...MEDICO, id: 'u-3', usuario: 'ddirector', rol: 'DIRECTOR' };

const PACIENTE = {
  id: 'p-1',
  dpi: '2547896540101',
  nombres: 'Juana Isabel',
  apellidos: 'Perez Caal',
  fechaNacimiento: '1985-04-12',
  edad: 41,
  sexo: 'F',
  idioma: 'QEQCHI',
  telefono: '55512345',
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Purulha Centro' },
  grupoFamiliar: null,
  lugar: { id: 'l-1', nombre: 'Barrio El Calvario', tipo: 'BARRIO' },
  migrante: false,
  lugarOrigen: null,
  tieneAlergias: null,
  alergias: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-000123', aperturaEn: '2026-01-10T00:00:00.000Z' },
};

const NINO = {
  ...PACIENTE,
  id: 'p-2',
  nombres: 'Marcos',
  fechaNacimiento: '2024-01-05',
  edad: 2,
  sexo: 'M',
};

const catalogo = (tipoFicha: string) => ({
  tipoFicha,
  signosPeligro: [
    { id: 'sp-1', orden: 1, texto: 'Dificultad respiratoria', pideTexto: false },
    { id: 'sp-2', orden: 2, texto: 'Otros (describir)', pideTexto: true },
  ],
  antecedentes: [
    { id: 'a-1', codigo: 'MED_DIABETES', grupo: 'MEDICO', orden: 1, texto: 'Diabetes', pideDetalle: false, pideFecha: false, pideNumero: false, permiteNoAplica: false },
    { id: 'a-2', codigo: 'MED_MEDICAMENTOS', grupo: 'MEDICO', orden: 2, texto: 'Toma medicamentos', pideDetalle: true, pideFecha: false, pideNumero: false, permiteNoAplica: false },
    { id: 'a-3', codigo: 'FAM_HTA', grupo: 'FAMILIAR', orden: 1, texto: 'HTA', pideDetalle: false, pideFecha: false, pideNumero: false, permiteNoAplica: false },
    { id: 'a-4', codigo: 'HAB_FUMA', grupo: 'HABITO', orden: 1, texto: 'Fuma', pideDetalle: false, pideFecha: false, pideNumero: true, permiteNoAplica: false },
  ],
  problemas: [
    {
      id: 'pr-1',
      orden: 1,
      nombre: 'Tos o dificultad para respirar',
      etiquetaAnotacion: null,
      signos: [
        { id: 'sg-1', orden: 1, texto: 'Sibilancia' },
        { id: 'sg-2', orden: 2, texto: 'Tos cronica' },
      ],
      diagnosticos: [
        { id: 'dx-1', orden: 1, texto: 'Neumonia', pideTexto: false },
        { id: 'dx-2', orden: 2, texto: 'Resfriado', pideTexto: false },
      ],
    },
    {
      id: 'pr-2',
      orden: 2,
      nombre: 'Diarrea',
      etiquetaAnotacion: null,
      signos: [{ id: 'sg-3', orden: 1, texto: 'Ojos hundidos' }],
      diagnosticos: [{ id: 'dx-3', orden: 1, texto: 'Deshidratacion', pideTexto: false }],
    },
  ],
  temasConsejeria: [
    { id: 't-1', orden: 1, texto: 'Uso del medicamento' },
    { id: 't-2', orden: 2, texto: 'Signos generales de peligro' },
  ],
});

const FICHA_BASE = {
  id: 'a-1',
  expedienteId: 'e-1',
  tipoFicha: 'ADULTO',
  fecha: '2026-09-10T15:30:00.000Z',
  registradaPor: 'u-1',
  digitalizada: false,
  motivo: 'Tos de una semana',
  historiaEnfermedad: 'Empezo con fiebre.\nLuego tos seca.',
  manejoEstabilizacion: null,
  diagnostico: null,
  tratamiento: null,
  notas: null,
  consejeria: 'Tomar liquidos',
  referencia: null,
  vacunaAdministrada: null,
  pesoKg: '68.0',
  tallaCm: '160.0',
  presionSistolica: 120,
  presionDiastolica: 80,
  temperaturaC: '37.2',
  pulso: 76,
  respiraciones: 18,
  circunferenciaCinturaCm: '88.0',
  imc: 26.56,
  fechaProximaVisita: '2026-09-24',
  signosPeligro: [
    { signoId: 'sp-1', texto: 'Dificultad respiratoria', presente: true, detalle: null },
    { signoId: 'sp-2', texto: 'Otros (describir)', presente: false, detalle: null },
  ],
  problemas: [
    {
      problemaId: 'pr-1',
      nombre: 'Tos o dificultad para respirar',
      presente: true,
      signos: ['Tos cronica'],
      diagnosticos: ['Resfriado'],
      otroDiagnostico: null,
      conducta: null,
      anotacion: null,
    },
    {
      problemaId: 'pr-2',
      nombre: 'Diarrea',
      presente: false,
      signos: [],
      diagnosticos: [],
      otroDiagnostico: null,
      conducta: null,
      anotacion: null,
    },
  ],
  medicamentos: [{ nombre: 'Amoxicilina 500 mg', dosis: '1 cada 8 horas', dias: 7 }],
  consejeriaTemas: [],
  neonato: null,
  prenatal: null,
  posparto: null,
};

const ANTECEDENTES = {
  pacienteId: 'p-1',
  marcados: [
    { antecedenteId: 'a-1', codigo: 'MED_DIABETES', texto: 'Diabetes', grupo: 'MEDICO', respuesta: 'SI', detalle: null, fecha: null, numero: null, actualizadoEn: '2026-01-01T00:00:00.000Z' },
    { antecedenteId: 'a-2', codigo: 'MED_MEDICAMENTOS', texto: 'Toma medicamentos', grupo: 'MEDICO', respuesta: 'SI', detalle: 'Metformina', fecha: null, numero: null, actualizadoEn: '2026-01-01T00:00:00.000Z' },
  ],
  obstetricos: { fur: '2026-03-01', gestas: 3, partos: 2, abortos: 0, tamizajeCervix: 'PAPANICOLAU', tamizajeNormal: true, rhPositivo: true, tipoSangre: 'O' },
};

const CARNET = {
  pacienteId: 'p-2',
  edadEnMeses: 32,
  vacunas: [{ vacunaId: 'v-1', orden: 1, fecha: '2024-01-06', edadEnMeses: 0 }],
  micronutrientes: [],
  datos: {
    lugarNacimiento: 'Purulha',
    acompananteNombre: 'Rosa Caal',
    madreNombre: 'Rosa Caal',
    madreEdad: 29,
    madreOcupacion: 'Ama de casa',
    madreSabeLeer: true,
    madreEscolaridad: 'PRIMARIA_1_3',
    padreNombre: null,
    padreEdad: null,
    padreOcupacion: null,
    padreSabeLeer: null,
    hijosTotal: 3,
    hijosVivos: 3,
    hijosMuertos: 0,
  },
  hogar: { agua: 'POZO', aguaOtro: null, excretas: 'LETRINA' },
};

const CATALOGO_CARNET = {
  vacunas: [
    { id: 'v-1', orden: 1, nombre: 'BCG', dosis: [{ orden: 1, edadRecomendada: 'RN' }] },
    { id: 'v-2', orden: 2, nombre: 'Pentavalente', dosis: [{ orden: 1, edadRecomendada: '2 meses' }, { orden: 2, edadRecomendada: '4 meses' }, { orden: 3, edadRecomendada: '6 meses' }] },
  ],
  micronutrientes: [],
};

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

let peticiones: Request[] = [];

function servidor({
  ficha = FICHA_BASE as unknown,
  paciente = PACIENTE as unknown,
  antecedentes = ANTECEDENTES as unknown,
}: { ficha?: unknown; paciente?: unknown; antecedentes?: unknown } = {}) {
  const tipo = (ficha as { tipoFicha: string | null }).tipoFicha;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const ruta = new URL(p.url, 'http://local').pathname;
      if (ruta.includes('/fichas/catalogo/')) return json(catalogo(tipo ?? 'ADULTO'));
      if (/\/v1\/fichas\/[^/]+$/.test(ruta)) return json(ficha);
      if (ruta.endsWith('/antecedentes')) return json(antecedentes);
      if (ruta.endsWith('/carnet/catalogo')) return json(CATALOGO_CARNET);
      if (ruta.endsWith('/carnet')) return json(CARNET);
      if (ruta.includes('/v1/pacientes/')) return json(paciente);
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil = MEDICO, pacienteId = 'p-1') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', '/pacientes/' + pacienteId + '/fichas/a-1/imprimir');
  return render(<App />);
}

const esperarHoja = (nombre: RegExp) => screen.findByRole('region', { name: nombre });

/** El texto de una casilla marcada con X, para saber que se marco. */
const marcada = (contenedor: HTMLElement, nombre: string | RegExp) =>
  within(contenedor).getByRole('checkbox', { name: nombre }).getAttribute('aria-checked') === 'true';

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
  vi.stubGlobal('print', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ═══════════════════════ como se escribe en el papel ═══════════════════════

describe('como se escribe en el papel', () => {
  it('las fechas van con barras, como la raya del formulario', () => {
    expect(fechaConBarras('2026-09-10')).toBe('10 / 09 / 2026');
    expect(fechaConBarras(null)).toBe('/ /');
  });

  /**
   * El sistema guarda kilos y centimetros —son las unidades con las que
   * calcula el IMC— pero la hoja de adultos pide libras y metros, y la del
   * neonato libras y onzas. Se convierte al imprimir, no se cambia el dato.
   */
  it('el peso sale en libras y la talla en metros, que es lo que pide la hoja', () => {
    expect(kgALibras('68.0')).toBe('149.9');
    expect(cmAMetros('160.0')).toBe('1.60');
    expect(kgALibras(null)).toBeNull();
  });

  it('para el neonato, libras y onzas enteras', () => {
    expect(kgALibrasYOnzas('3.2')).toEqual({ lb: '7', oz: '1' });
  });

  it('la edad del neonato se cuenta en dias y la del nino en anios y meses', () => {
    expect(diasEntre('2026-09-01', '2026-09-10T15:30:00.000Z')).toBe(9);
    expect(aniosYMeses('2024-01-05', '2026-09-10T15:30:00.000Z')).toEqual({ anios: 2, meses: 8 });
  });
});

// ═══════════════════════════ la hoja de adultos ═══════════════════════════

describe('la ficha de adulto impresa', () => {
  it('sale en dos hojas con las secciones del papel, numeradas en romano', async () => {
    servidor();
    abrir();

    const hoja1 = await esperarHoja(/Ficha clínica, hoja 1/);
    expect(within(hoja1).getByRole('heading', { name: /I\.\s*Identificación del establecimiento/ })).toBeInTheDocument();
    expect(within(hoja1).getByRole('heading', { name: /VIII\.\s*Examen físico/ })).toBeInTheDocument();
    const hoja2 = screen.getByRole('region', { name: /Ficha clínica, hoja 2/ });
    expect(within(hoja2).getByRole('heading', { name: /IX\.\s*Revisión de problemas/ })).toBeInTheDocument();
    expect(within(hoja2).getByRole('heading', { name: /X\.\s*Consejería/ })).toBeInTheDocument();
  });

  it('lleva al paciente, su expediente y la fecha de la consulta', async () => {
    servidor();
    abrir();

    const hoja1 = await esperarHoja(/hoja 1/);
    expect(within(hoja1).getByText('Juana Isabel Perez Caal')).toBeInTheDocument();
    expect(within(hoja1).getByText('EXP-2026-000123')).toBeInTheDocument();
    expect(within(hoja1).getByText('12 / 04 / 1985')).toBeInTheDocument();
    expect(within(hoja1).getByText('Barrio El Calvario, Purulha Centro')).toBeInTheDocument();
  });

  it('marca el CAP como establecimiento y el sexo del paciente', async () => {
    servidor();
    abrir();

    const hoja1 = await esperarHoja(/hoja 1/);
    expect(marcada(hoja1, 'CAP')).toBe(true);
    expect(marcada(hoja1, 'CAIMI')).toBe(false);
    expect(marcada(hoja1, 'F')).toBe(true);
    expect(marcada(hoja1, 'M')).toBe(false);
  });

  /**
   * Un signo que no se contesto no lleva NO: en un formulario clinico, un NO
   * que nadie marco es un dato falso.
   */
  it('los signos de peligro llevan SI o NO segun la ficha, y nada si no se contesto', async () => {
    servidor({
      ficha: { ...FICHA_BASE, signosPeligro: [FICHA_BASE.signosPeligro[0]] },
    });
    abrir();

    const hoja1 = await esperarHoja(/hoja 1/);
    expect(marcada(hoja1, 'SI Dificultad respiratoria')).toBe(true);
    expect(marcada(hoja1, 'NO Dificultad respiratoria')).toBe(false);
    expect(marcada(hoja1, 'SI Otros (describir)')).toBe(false);
    expect(marcada(hoja1, 'NO Otros (describir)')).toBe(false);
  });

  it('el motivo y la historia van sobre sus renglones, con sus saltos de linea', async () => {
    servidor();
    abrir();

    const hoja1 = await esperarHoja(/hoja 1/);
    expect(within(hoja1).getByText('Tos de una semana')).toBeInTheDocument();
    expect(within(hoja1).getByText(/Empezo con fiebre/)).toHaveTextContent('Luego tos seca');
  });

  it('los antecedentes son del paciente: Diabetes SI y el medicamento con su cual', async () => {
    servidor();
    abrir();

    const hoja1 = await esperarHoja(/hoja 1/);
    const diabetes = within(hoja1).getByLabelText('Diabetes');
    expect(marcada(diabetes, 'SI')).toBe(true);
    expect(within(hoja1).getByText('Metformina')).toBeInTheDocument();
    // Lo que no se ha registrado queda con las dos casillas vacias.
    const fuma = within(hoja1).getByLabelText('Fuma');
    expect(marcada(fuma, 'SI')).toBe(false);
    expect(marcada(fuma, 'NO')).toBe(false);
  });

  it('el examen fisico sale en las unidades del papel: libras y metros', async () => {
    servidor();
    abrir();

    const hoja1 = await esperarHoja(/hoja 1/);
    expect(within(hoja1).getByText('149.9')).toBeInTheDocument();
    expect(within(hoja1).getByText('1.60')).toBeInTheDocument();
    expect(within(hoja1).getByText('120/80')).toBeInTheDocument();
    expect(within(hoja1).getByText('26.56')).toBeInTheDocument();
  });

  /**
   * La matriz lista TODOS los problemas del catalogo, no solo los presentes:
   * es lo que la hace parecer el formulario y no un resumen. Lo marcado va
   * subrayado, que es lo que el papel pide.
   */
  it('la matriz lista todos los problemas y subraya lo que la ficha marco', async () => {
    servidor();
    abrir();

    const hoja2 = await esperarHoja(/hoja 2/);
    expect(within(hoja2).getByText(/1\. Tos o dificultad/)).toBeInTheDocument();
    expect(within(hoja2).getByText(/2\. Diarrea/)).toBeInTheDocument();

    expect(within(hoja2).getByText('Tos cronica')).toHaveClass('hoja-opcion--marcada');
    expect(within(hoja2).getByText('Sibilancia')).not.toHaveClass('hoja-opcion--marcada');
    expect(within(hoja2).getByText('Resfriado')).toHaveClass('hoja-opcion--marcada');
    expect(within(hoja2).getByText('Neumonia')).not.toHaveClass('hoja-opcion--marcada');
  });

  it('la columna de conducta lleva el medicamento con su dosis y sus dias, y la proxima visita', async () => {
    servidor();
    abrir();

    const hoja2 = await esperarHoja(/hoja 2/);
    expect(within(hoja2).getByText('Amoxicilina 500 mg')).toBeInTheDocument();
    expect(within(hoja2).getByText('1 cada 8 horas')).toBeInTheDocument();
    expect(within(hoja2).getByText('7')).toBeInTheDocument();
    expect(within(hoja2).getByText('24 / 09 / 2026')).toBeInTheDocument();
    expect(within(hoja2).getByText('Tomar liquidos')).toBeInTheDocument();
  });

  it('la firma queda en blanco: se firma a mano', async () => {
    servidor();
    abrir();

    const hoja2 = await esperarHoja(/hoja 2/);
    expect(within(hoja2).getByText(/Nombre y cargo de la persona que atendió/)).toBeInTheDocument();
    expect(within(hoja2).queryByText('u-1')).not.toBeInTheDocument();
  });

  it('el boton manda a imprimir y el titulo de la pestana nombra la ficha y al paciente', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarHoja(/hoja 1/);

    expect(document.title).toBe('Ficha Adulto - Perez Caal, Juana Isabel');
    await usuario.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('una atencion sin ficha oficial lo dice en vez de imprimir una hoja vacia', async () => {
    servidor({ ficha: { ...FICHA_BASE, tipoFicha: null } });
    abrir();

    expect(await screen.findByText(/no se registro con una ficha oficial/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeDisabled();
  });
});

// ═══════════════════════════ las otras tres hojas ═══════════════════════════

describe('la ficha del menor de 28 dias impresa', () => {
  const FICHA_NEONATO = {
    ...FICHA_BASE,
    tipoFicha: 'NEONATO',
    pesoKg: null,
    problemas: [{ ...FICHA_BASE.problemas[0], conducta: 'Amoxicilina 50 mg/kg' }],
    consejeriaTemas: [{ temaId: 't-1', texto: 'Uso del medicamento', brindada: true, fechaReconsulta: '2026-09-13' }],
    neonato: {
      nombreMadre: 'Rosa Caal',
      pesoLibras: 7,
      pesoOnzas: 4,
      perimetroBraquialCm: '10.5',
      circunferenciaCefalicaCm: '34.0',
      pesoNacerLibras: 6,
      pesoNacerOnzas: 12,
      lloroAlNacer: true,
      nacioCianotico: false,
      horasTrabajoParto: 11,
      quienAtendioParto: 'CT',
      quienAtendioPartoOtro: null,
      rupturaPrematuraMembranas: false,
      trabajoPartoPrematuro: false,
      partoProlongado: true,
      tipoParto: 'NORMAL',
      bcg: true,
      tdMadre: true,
      tdMadreDosis: 2,
      lactanciaMaternaExclusiva: true,
    },
  };
  const RECIEN_NACIDO = { ...NINO, fechaNacimiento: '2026-09-01', edad: 0 };

  it('la primera hoja es de la madre y del parto, con la edad en dias', async () => {
    servidor({ ficha: FICHA_NEONATO, paciente: RECIEN_NACIDO });
    abrir(MEDICO, 'p-2');

    const hoja1 = await esperarHoja(/menor de 28 días, hoja 1/);
    expect(within(hoja1).getByText('Rosa Caal')).toBeInTheDocument();
    expect(within(hoja1).getByText('9')).toBeInTheDocument();
    expect(marcada(hoja1, 'CT')).toBe(true);
    expect(marcada(hoja1, 'MD')).toBe(false);
    expect(marcada(hoja1, 'Parto prolongado')).toBe(true);
    expect(marcada(hoja1, 'Normal')).toBe(true);
    const bcg = within(hoja1).getByLabelText('BCG:');
    expect(marcada(bcg, 'SI')).toBe(true);
  });

  it('la revision de problemas lleva el tratamiento en su fila y la consejeria con su reconsulta', async () => {
    servidor({ ficha: FICHA_NEONATO, paciente: RECIEN_NACIDO });
    abrir(MEDICO, 'p-2');

    const hoja2 = await esperarHoja(/menor de 28 días, hoja 2/);
    expect(within(hoja2).getByText('Amoxicilina 50 mg/kg')).toBeInTheDocument();
    expect(within(hoja2).getByText('13 / 09 / 2026')).toBeInTheDocument();
    expect(marcada(hoja2, 'Uso del medicamento')).toBe(true);
    expect(marcada(hoja2, 'Signos generales de peligro')).toBe(false);
  });
});

describe('la ficha del lactante y ninez impresa', () => {
  const FICHA_NINEZ = { ...FICHA_BASE, tipoFicha: 'NINEZ', pesoKg: '12.5', tallaCm: '88.0' };

  it('la primera hoja sale del carnet: padres, casa y vacunas, con la edad en anios y meses', async () => {
    servidor({ ficha: FICHA_NINEZ, paciente: NINO });
    abrir(MEDICO, 'p-2');

    const hoja1 = await esperarHoja(/lactante y niñez, hoja 1/);
    expect(within(hoja1).getByText('Marcos Perez Caal')).toBeInTheDocument();
    expect(within(hoja1).getAllByText('Rosa Caal').length).toBeGreaterThan(0);
    expect(marcada(hoja1, '1° a 3° Primaria')).toBe(true);
    expect(marcada(hoja1, 'Pozo')).toBe(true);
    expect(marcada(hoja1, 'Letrina')).toBe(true);
    expect(within(hoja1).getByText('BCG')).toBeInTheDocument();
    expect(within(hoja1).getByText(/06 \/ 01 \/ 2024/)).toBeInTheDocument();
    // 2 anios y 8 meses el dia de la consulta.
    expect(within(hoja1).getByText('2')).toBeInTheDocument();
    expect(within(hoja1).getByText('8')).toBeInTheDocument();
  });

  it('la hoja de consulta lleva el peso en libras y la consejeria en casillas', async () => {
    servidor({
      ficha: {
        ...FICHA_NINEZ,
        consejeriaTemas: [{ temaId: 't-2', texto: 'Signos generales de peligro', brindada: true, fechaReconsulta: null }],
      },
      paciente: NINO,
    });
    abrir(MEDICO, 'p-2');

    const hoja = await esperarHoja(/hoja de consulta/);
    expect(within(hoja).getByText('27.6')).toBeInTheDocument();
    expect(marcada(hoja, 'Signos generales de peligro')).toBe(true);
    expect(marcada(hoja, 'Uso del medicamento')).toBe(false);
  });
});

describe('la ficha prenatal y la del posparto impresas', () => {
  const PRENATAL = {
    ...FICHA_BASE,
    tipoFicha: 'PRENATAL',
    consejeriaTemas: [{ temaId: 't-1', texto: 'Uso del medicamento', brindada: true, fechaReconsulta: null }],
    prenatal: {
      circunferenciaBrazoCm: '24.0',
      examenGeneralNormal: true,
      examenBucodental: 'Caries en molar',
      alturaUterinaCm: '22.0',
      movimientosFetales: true,
      fcf: 140,
      presentacionLeopold: null,
      trazasSangre: false,
      trazasSangreDescripcion: null,
      lesionesVulvares: false,
      lesionesVulvaresDescripcion: null,
      flujoVaginal: null,
      hemoglobinaHematocrito: '11.2 / 34',
      grupoRh: 'O+',
      orina: 'Normal',
      glicemia: '88',
      vdrl: 'No reactivo',
      vih: 'Negativo',
      papanicolau: null,
      infecciones: null,
      semanasPorFurAu: 24,
      problemasDetectados: 'Anemia leve',
      sulfatoFerrosoTabletas: 30,
      acidoFolicoTabletas: 30,
      tdDosis: 1,
      semanasGestacion: 24,
      fechaProbableParto: '2026-12-06',
    },
  };

  it('la hoja 2 lleva el control de hoy en su columna, encabezada con la fecha', async () => {
    servidor({ ficha: PRENATAL });
    abrir();

    const hoja2 = await esperarHoja(/prenatal, hoja 2/);
    expect(within(hoja2).getByText('06 / 12 / 2026')).toBeInTheDocument();
    expect(within(hoja2).getByText('11.2 / 34')).toBeInTheDocument();
    expect(within(hoja2).getByText('Anemia leve')).toBeInTheDocument();
    expect(within(hoja2).getByText('Control 2')).toBeInTheDocument();
    expect(within(hoja2).getByText('Uso del medicamento')).toBeInTheDocument();
  });

  it('en la hoja 1 el motivo marca Embarazo y los antecedentes obstetricos van completos', async () => {
    servidor({ ficha: PRENATAL });
    abrir();

    const hoja1 = await esperarHoja(/prenatal, hoja 1/);
    expect(marcada(hoja1, 'Embarazo')).toBe(true);
    expect(marcada(hoja1, 'Posparto')).toBe(false);
    expect(within(hoja1).getByText('01 / 03 / 2026')).toBeInTheDocument();
    expect(marcada(hoja1, 'Papanicolau')).toBe(true);
    expect(marcada(hoja1, 'RH (+)')).toBe(true);
  });

  it('el primer control posparto sale en su propia hoja', async () => {
    servidor({
      ficha: {
        ...FICHA_BASE,
        tipoFicha: 'POSPARTO',
        posparto: {
          esPrimerControl: true,
          diasDespuesDelParto: 5,
          dondeAtendioParto: 'En casa',
          quienAtendioParto: 'CT',
          quienAtendioPartoOtro: null,
          involucionUterina: 'Adecuada',
          examenMamas: 'Sin masas',
          heridaOperatoria: null,
          examenGinecologico: 'Loquios normales',
          lactanciaMaternaExclusiva: true,
          motivoSinLactancia: null,
          problemasDetectados: null,
          sulfatoFerroso: true,
          sulfatoFerrosoTabletas: 30,
          acidoFolico: false,
          acidoFolicoTabletas: null,
          td: null,
          tdDosis: null,
          otroMedicamento: null,
        },
      },
    });
    abrir();

    const hoja = await esperarHoja(/posparto, primer control/);
    expect(within(hoja).getByText('Comadrona tradicional')).toBeInTheDocument();
    expect(within(hoja).getByText('En casa')).toBeInTheDocument();
    expect(within(hoja).getByText('Loquios normales')).toBeInTheDocument();
    expect(within(hoja).getByText('30')).toBeInTheDocument();
  });

  it('un control posterior sale en la tabla de controles', async () => {
    servidor({
      ficha: {
        ...FICHA_BASE,
        tipoFicha: 'POSPARTO',
        posparto: {
          esPrimerControl: false,
          diasDespuesDelParto: 40,
          dondeAtendioParto: null,
          quienAtendioParto: null,
          quienAtendioPartoOtro: null,
          involucionUterina: 'Completa',
          examenMamas: null,
          heridaOperatoria: null,
          examenGinecologico: null,
          lactanciaMaternaExclusiva: false,
          motivoSinLactancia: 'Trabaja fuera',
          problemasDetectados: null,
          sulfatoFerroso: null,
          sulfatoFerrosoTabletas: 30,
          acidoFolico: null,
          acidoFolicoTabletas: null,
          td: null,
          tdDosis: null,
          otroMedicamento: null,
        },
      },
    });
    abrir();

    const hoja = await esperarHoja(/Controles posparto/);
    expect(within(hoja).getByText('Completa')).toBeInTheDocument();
    expect(within(hoja).getByText('Trabaja fuera')).toBeInTheDocument();
    expect(within(hoja).getByText('Control 3')).toBeInTheDocument();
  });
});

// ═══════════════════════════════ quien imprime ═══════════════════════════════

describe('quien imprime', () => {
  it('recepcion no entra: no ve el historial, asi que tampoco lo imprime', async () => {
    servidor();
    abrir(RECEPCION);

    expect(await screen.findByText('Esta pantalla no es de su perfil')).toBeInTheDocument();
    expect(peticiones.filter((p) => p.url.includes('/v1/fichas/'))).toHaveLength(0);
  });

  it('el director si: lee las fichas aunque no las llene', async () => {
    servidor();
    abrir(DIRECTOR);
    expect(await esperarHoja(/hoja 1/)).toBeInTheDocument();
  });
});
