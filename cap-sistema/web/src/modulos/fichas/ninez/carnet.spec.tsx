import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../../App';
import { almacenSesion, type Perfil } from '../../../api';
import type { Carnet, CatalogoCarnet } from './servicio-carnet';
import {
  dosisPendientes,
  edadDicha,
  edadRecomendadaEnMeses,
  tramosAlcanzados,
} from './carnet-ninez';

const MEDICO: Perfil = {
  id: 'u-1',
  usuario: 'jperez',
  rol: 'MEDICO',
  debeCambiarContrasena: false,
};
const RECEPCION: Perfil = { ...MEDICO, id: 'u-4', usuario: 'rlopez', rol: 'RECEPCION' };

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
  lugar: null,
  migrante: false,
  lugarOrigen: null,
  tieneAlergias: null,
  alergias: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-001200', aperturaEn: null },
};

/**
 * El catalogo recortado, pero con las tres formas que importan: una vacuna de
 * una sola dosis (BCG), una de cinco (OPV) y una que el papel deja abierta
 * (Otras).
 */
const CATALOGO: CatalogoCarnet = {
  vacunas: [
    { id: 'v-bcg', orden: 1, nombre: 'BCG', dosis: [{ orden: 1, edadRecomendada: 'RN' }] },
    {
      id: 'v-opv',
      orden: 2,
      nombre: 'OPV',
      dosis: [
        { orden: 1, edadRecomendada: '2 meses' },
        { orden: 2, edadRecomendada: '4 meses' },
        { orden: 3, edadRecomendada: '6 meses' },
        { orden: 4, edadRecomendada: '18 meses' },
        { orden: 5, edadRecomendada: '4 años' },
      ],
    },
    {
      id: 'v-otras',
      orden: 3,
      nombre: 'Otras',
      dosis: [
        { orden: 1, edadRecomendada: null },
        { orden: 2, edadRecomendada: null },
      ],
    },
  ],
  micronutrientes: [
    {
      id: 'm-vita',
      orden: 1,
      nombre: 'Vitamina "A"',
      esperadas: [
        { tramo: 'M6_A_A1', orden: 1 },
        { tramo: 'A1_A_A2', orden: 1 },
        { tramo: 'A2_A_A3', orden: 1 },
        { tramo: 'A4_A_A5', orden: 1 },
      ],
    },
    {
      id: 'm-desp',
      orden: 2,
      nombre: 'Desparasitante',
      esperadas: [
        { tramo: 'A2_A_A3', orden: 1 },
        { tramo: 'A3_A_A4', orden: 1 },
      ],
    },
  ],
};

const CARNET_VACIO: Carnet = {
  pacienteId: 'p-1',
  edadEnMeses: 27,
  vacunas: [],
  micronutrientes: [],
  datos: null,
  hogar: null,
};

let cuerpos: unknown[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({ carnet = CARNET_VACIO }: { carnet?: Carnet } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      if (p.method !== 'GET') cuerpos.push(await p.clone().json());
      const ruta = new URL(p.url, 'http://local').pathname;

      if (ruta.endsWith('/carnet/catalogo')) return json(CATALOGO);
      if (ruta.endsWith('/carnet')) return json(carnet);
      if (ruta.includes('/v1/pacientes/')) return json(PACIENTE);
      if (ruta.includes('/atenciones')) {
        return json({ datos: [], pagina: 1, tamano: 25, total: 0, totalPaginas: 0 });
      }
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil, ruta = '/pacientes/p-1/carnet') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

const esperarCarnet = () => screen.findByRole('heading', { name: /Tzul Chen, Ana Lucía/ });

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

describe('la edad recomendada de una dosis', () => {
  it('entiende como el papel la escribe', () => {
    expect(edadRecomendadaEnMeses('RN')).toBe(0);
    expect(edadRecomendadaEnMeses('2 meses')).toBe(2);
    expect(edadRecomendadaEnMeses('18 meses')).toBe(18);
    expect(edadRecomendadaEnMeses('4 años')).toBe(48);
  });

  /**
   * La fila de SPR dice solo "meses", sin numero, y las de Neumococo, Hb y
   * Otras vienen sin edad. Inventarles una convertiria un hueco del formulario
   * en un aviso falso.
   */
  it('devuelve null cuando el papel no dice cuando, en vez de adivinar', () => {
    expect(edadRecomendadaEnMeses('meses')).toBeNull();
    expect(edadRecomendadaEnMeses(null)).toBeNull();
    expect(edadRecomendadaEnMeses('')).toBeNull();
  });
});

describe('las dosis que faltan', () => {
  /**
   * Es lo unico que lo digital hace aqui y el papel no puede. En la hoja
   * impresa, saber esto exige leer cien celdas y restar fechas a mano.
   */
  it('cuenta solo las que ya le tocaban y no estan puestas', () => {
    const faltan = dosisPendientes(CATALOGO, CARNET_VACIO);
    const nombres = faltan.map((f) => f.vacuna + ' ' + f.dosis);

    // Tiene 27 meses: le tocan BCG (RN) y las cuatro primeras de OPV.
    expect(nombres).toContain('BCG 1');
    expect(nombres).toContain('OPV 4');
    // La quinta es a los 4 anos: todavia no le toca.
    expect(nombres).not.toContain('OPV 5');
  });

  it('una dosis ya puesta deja de faltar', () => {
    const conBcg: Carnet = {
      ...CARNET_VACIO,
      vacunas: [{ vacunaId: 'v-bcg', orden: 1, fecha: '2024-05-01', edadEnMeses: 0 }],
    };
    expect(dosisPendientes(CATALOGO, conBcg).map((f) => f.vacuna)).not.toContain('BCG');
  });

  it('las que el papel deja sin esquema no se cuentan como pendientes', () => {
    // "Otras" no dice cuando toca, asi que no se puede decir que falte.
    expect(dosisPendientes(CATALOGO, CARNET_VACIO).map((f) => f.vacuna)).not.toContain('Otras');
  });

  it('sin fecha de nacimiento no se inventa nada', () => {
    const sinEdad: Carnet = { ...CARNET_VACIO, edadEnMeses: null };
    expect(dosisPendientes(CATALOGO, sinEdad)).toEqual([]);
  });
});

describe('los tramos de micronutrientes', () => {
  it('solo los que el niño ya alcanzó', () => {
    expect(tramosAlcanzados(27)).toEqual(['M6_A_A1', 'A1_A_A2', 'A2_A_A3']);
    expect(tramosAlcanzados(3)).toEqual([]);
    expect(tramosAlcanzados(59)).toHaveLength(5);
  });
});

describe('la edad dicha como el papel', () => {
  it('en años y meses', () => {
    expect(edadDicha(27)).toBe('2 años 3 meses');
    expect(edadDicha(12)).toBe('1 año');
    expect(edadDicha(0)).toBe('0 meses');
  });
});

// ══════════════════════ el carnet en pantalla ══════════════════════

describe('el carnet en pantalla', () => {
  it('dice qué dosis le faltan al niño para su edad', async () => {
    servidor();
    abrir(MEDICO);
    await esperarCarnet();

    expect(await screen.findByText(/Faltan .* dosis para su edad/)).toBeInTheDocument();
    expect(screen.getByText(/BCG · dosis 1 · tocaba a los RN/)).toBeInTheDocument();
  });

  /**
   * Las celdas sombreadas del papel. BCG tiene UNA dosis; ofrecer las otras
   * cuatro dejaria anotar una tercera que no existe.
   */
  it('no ofrece las casillas que el formulario sombrea', async () => {
    servidor();
    abrir(MEDICO);
    await esperarCarnet();

    expect(await screen.findByLabelText('BCG · dosis 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('BCG · dosis 2')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('BCG · dosis 3')).not.toBeInTheDocument();

    // OPV si tiene las cinco.
    expect(screen.getByLabelText('OPV · dosis 5')).toBeInTheDocument();
  });

  it('anotar una fecha la manda sola, sin botón de guardar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarCarnet();

    const casilla = await screen.findByLabelText('OPV · dosis 1');
    await usuario.type(casilla, '2024-05-12');

    await waitFor(() => {
      expect(cuerpos).toContainEqual({
        vacunas: [{ vacunaId: 'v-opv', orden: 1, fecha: '2024-05-12' }],
      });
    });
  });

  /** En el papel se tacha. Aqui no habria otra forma de corregir. */
  it('borrar la fecha manda null, que es como se corrige una casilla', async () => {
    servidor({
      carnet: {
        ...CARNET_VACIO,
        vacunas: [{ vacunaId: 'v-bcg', orden: 1, fecha: '2024-05-01', edadEnMeses: 0 }],
      },
    });
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarCarnet();

    await usuario.clear(await screen.findByLabelText('BCG · dosis 1'));

    await waitFor(() => {
      expect(cuerpos).toContainEqual({
        vacunas: [{ vacunaId: 'v-bcg', orden: 1, fecha: null }],
      });
    });
  });

  it('la dosis puesta dice a qué edad se puso, no la recomendada', async () => {
    servidor({
      carnet: {
        ...CARNET_VACIO,
        vacunas: [{ vacunaId: 'v-opv', orden: 1, fecha: '2024-07-01', edadEnMeses: 2 }],
      },
    });
    abrir(MEDICO);
    await esperarCarnet();

    expect(await screen.findByText('A los 2 meses')).toBeInTheDocument();
  });

  it('solo enseña los tramos de micronutrientes que el niño alcanzó', async () => {
    servidor();
    abrir(MEDICO);
    await esperarCarnet();

    // Tiene 27 meses.
    expect(await screen.findByLabelText('Vitamina "A" · 2 a < 3 años · 1')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Vitamina "A" · 4 a < 5 años · 1'),
    ).not.toBeInTheDocument();
  });

  /**
   * El agua y las excretas son de la CASA, no del nino. La pantalla lo dice
   * porque quien la llena tiene que saber que el dato va a aparecer en la
   * ficha de sus hermanos.
   */
  it('avisa de que el agua y las excretas se comparten con los hermanos', async () => {
    servidor();
    abrir(MEDICO);
    await esperarCarnet();

    expect(
      await screen.findByText(/son de la casa, no del niño/),
    ).toBeInTheDocument();
  });

  it('guarda un dato de los padres al salir del campo, no en cada tecla', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(MEDICO);
    await esperarCarnet();

    const campo = await screen.findByLabelText('Nombre y apellidos de la madre');
    await usuario.type(campo, 'Marta Caal');
    // Mientras se escribe no se manda nada: seria una peticion por letra.
    expect(cuerpos).toHaveLength(0);

    await usuario.tab();

    await waitFor(() => {
      expect(cuerpos).toContainEqual({ datos: { madreNombre: 'Marta Caal' } });
    });
  });

  it('lleva a la hoja de consulta con un botón, no escribiendo la dirección', async () => {
    servidor();
    abrir(MEDICO);
    await esperarCarnet();

    const enlace = await screen.findByRole('link', { name: 'Hoja de consulta' });
    expect(enlace).toHaveAttribute('href', '/pacientes/p-1/ficha-ninez');
  });

  it('recepción no entra al carnet', async () => {
    servidor();
    abrir(RECEPCION);

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: /Tzul Chen, Ana Lucía/ }),
      ).not.toBeInTheDocument();
    });
  });
});
