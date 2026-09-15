import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../../App';
import { almacenSesion, type Perfil } from '../../../api';
import type { CatalogoFicha } from '../servicio-fichas';
import {
  borradorPospartoVacio,
  borradorPrenatalVacio,
  cuerpoDeFichaPosparto,
  cuerpoDeFichaPrenatal,
} from './borrador-prenatal';

const MEDICO: Perfil = { id: 'u-1', usuario: 'jperez', rol: 'MEDICO', debeCambiarContrasena: false };
const RECEPCION: Perfil = { ...MEDICO, id: 'u-4', usuario: 'rlopez', rol: 'RECEPCION' };

const PACIENTE = {
  id: 'p-1',
  dpi: '2589631470101',
  nombres: 'Marta Elena',
  apellidos: 'Cac Xol',
  fechaNacimiento: '2001-05-14',
  edad: 25,
  sexo: 'F',
  idioma: 'ACHI',
  telefono: null,
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Purulhá Centro' },
  grupoFamiliar: null,
  lugar: null,
  migrante: false,
  lugarOrigen: null,
  tieneAlergias: null,
  alergias: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-000450', aperturaEn: null },
};

/** Los ocho signos del embarazo, resumidos a tres para las pruebas. */
const CATALOGO_PRENATAL: CatalogoFicha = {
  tipoFicha: 'PRENATAL',
  signosPeligro: [
    { id: 'sp-1', orden: 1, texto: 'Hemorragia vaginal', pideTexto: false },
    { id: 'sp-2', orden: 2, texto: 'Dolor abdominal severo (epigastralgia)', pideTexto: false },
    { id: 'sp-8', orden: 8, texto: 'Presentaciones fetales anormales', pideTexto: false },
  ],
  antecedentes: [],
  problemas: [],
  temasConsejeria: [
    { id: 't-1', orden: 1, texto: 'Alimentación durante el embarazo' },
    { id: 't-2', orden: 2, texto: 'Plan de parto' },
  ],
};

const CATALOGO_POSPARTO: CatalogoFicha = {
  tipoFicha: 'POSPARTO',
  signosPeligro: [
    { id: 'ps-1', orden: 1, texto: 'Hemorragia vaginal', pideTexto: false },
    { id: 'ps-8', orden: 8, texto: 'Coágulos con mal olor (Loquios)', pideTexto: false },
  ],
  antecedentes: [],
  problemas: [],
  temasConsejeria: [{ id: 'tp-1', orden: 1, texto: 'Lactancia materna exclusiva/MELA' }],
};

let cuerpos: Record<string, unknown>[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({ fur = null as string | null } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      if (p.method !== 'GET') cuerpos.push(await p.clone().json());
      const ruta = new URL(p.url, 'http://local').pathname;

      if (ruta.includes('/fichas/catalogo/POSPARTO')) return json(CATALOGO_POSPARTO);
      if (ruta.includes('/fichas/catalogo/')) return json(CATALOGO_PRENATAL);
      if (ruta.endsWith('/fichas')) return json({ id: 'a-9', expedienteId: 'e-1' }, 201);
      // Antes que `/v1/pacientes/`, que tambien casaria con esta ruta.
      if (ruta.includes('/antecedentes')) {
        return json({
          pacienteId: 'p-1',
          marcados: [],
          obstetricos: fur ? { fur, gestas: 2 } : null,
        });
      }
      if (ruta.includes('/v1/pacientes/')) return json(PACIENTE);
      if (ruta.includes('/atenciones')) {
        return json({ datos: [], pagina: 1, tamano: 25, total: 0, totalPaginas: 0 });
      }
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

const esperarHoja = () => screen.findByRole('heading', { name: /Cac Xol, Marta Elena/ });

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

// ══════════════════ lo que viaja al servidor ══════════════════

describe('el cuerpo de la hoja prenatal', () => {
  it('no manda lo que nadie respondio', () => {
    const cuerpo = cuerpoDeFichaPrenatal({
      ...borradorPrenatalVacio(CATALOGO_PRENATAL),
      motivo: 'Control prenatal',
    });

    expect(cuerpo.tipoFicha).toBe('PRENATAL');
    // Una hoja en blanco no lleva bloque: mandarlo con veinte nulos haria que
    // cada control guardara veinte "no se pregunto".
    expect(cuerpo.prenatal).toBeUndefined();
    expect(cuerpo.consejeriaTemas).toBeUndefined();
  });

  it('distingue una casilla en NO de una sin responder', () => {
    const borrador = borradorPrenatalVacio(CATALOGO_PRENATAL);
    const cuerpo = cuerpoDeFichaPrenatal({
      ...borrador,
      motivo: 'Control',
      hoja: { ...borrador.hoja, flujoVaginal: false },
    });

    // El "no" viaja; lo no preguntado no aparece siquiera.
    expect(cuerpo.prenatal?.flujoVaginal).toBe(false);
    expect(cuerpo.prenatal).not.toHaveProperty('trazasSangre');
  });

  it('solo viajan los temas de consejeria marcados', () => {
    const borrador = borradorPrenatalVacio(CATALOGO_PRENATAL);
    const cuerpo = cuerpoDeFichaPrenatal({
      ...borrador,
      motivo: 'Control',
      consejeriaTemas: { 't-1': true, 't-2': false },
    });

    expect(cuerpo.consejeriaTemas).toEqual([{ temaId: 't-1', brindada: true }]);
    // La consejeria de texto libre es de la ficha de adultos: aqui son casillas.
    expect(cuerpo.consejeria).toBeUndefined();
  });
});

describe('el cuerpo de la evaluacion del posparto', () => {
  it('dice siempre si es el primer control, marcado o no', () => {
    const cuerpo = cuerpoDeFichaPosparto({
      ...borradorPospartoVacio(CATALOGO_POSPARTO),
      motivo: 'Control posparto',
    });
    expect(cuerpo.posparto?.esPrimerControl).toBe(false);
  });

  it('no manda las cinco preguntas del primer control si no es el primero', () => {
    const borrador = borradorPospartoVacio(CATALOGO_POSPARTO);
    const cuerpo = cuerpoDeFichaPosparto({
      ...borrador,
      motivo: 'Control posparto',
      hoja: {
        ...borrador.hoja,
        esPrimerControl: false,
        // Alguien las lleno, cambio de opinion y desmarco la casilla.
        diasDespuesDelParto: '8',
        dondeAtendioParto: 'CAP Purulhá',
      },
    });

    // Guardarlas dejaria un dato en una hoja que no las pregunta, donde nadie
    // volveria a mirarlo.
    expect(cuerpo.posparto).not.toHaveProperty('diasDespuesDelParto');
    expect(cuerpo.posparto).not.toHaveProperty('dondeAtendioParto');
  });

  it('las manda cuando si es el primero', () => {
    const borrador = borradorPospartoVacio(CATALOGO_POSPARTO);
    const cuerpo = cuerpoDeFichaPosparto({
      ...borrador,
      motivo: 'Primer control posparto',
      hoja: { ...borrador.hoja, esPrimerControl: true, diasDespuesDelParto: '8' },
    });

    expect(cuerpo.posparto?.diasDespuesDelParto).toBe(8);
  });

  it('el numero de tabletas y la casilla de SI/NO caben a la vez', () => {
    const borrador = borradorPospartoVacio(CATALOGO_POSPARTO);
    const cuerpo = cuerpoDeFichaPosparto({
      ...borrador,
      motivo: 'Control',
      hoja: { ...borrador.hoja, sulfatoFerroso: true, acidoFolicoTabletas: '30' },
    });

    // La pagina 3 marca, la 4 cuenta. Ninguna se deduce de la otra.
    expect(cuerpo.posparto?.sulfatoFerroso).toBe(true);
    expect(cuerpo.posparto).not.toHaveProperty('sulfatoFerrosoTabletas');
    expect(cuerpo.posparto?.acidoFolicoTabletas).toBe(30);
    expect(cuerpo.posparto).not.toHaveProperty('acidoFolico');
  });
});

// ══════════════════ la hoja prenatal en pantalla ══════════════════

describe('la hoja prenatal', () => {
  it('trae los signos de peligro del embarazo y avisa al marcar uno', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-prenatal');
    await esperarHoja();

    expect(screen.getByText(/1\. Hemorragia vaginal/)).toBeInTheDocument();
    expect(screen.getByText(/8\. Presentaciones fetales anormales/)).toBeInTheDocument();

    // El selector es un grupo de radios rotulado con el texto del papel.
    const casilla = screen.getByRole('radiogroup', { name: 'Hemorragia vaginal' });
    await userEvent.click(within(casilla).getByRole('radio', { name: 'Si' }));

    await waitFor(() =>
      expect(screen.getByText(/Trate o refiera de acuerdo al nivel de resolución/)).toBeVisible(),
    );
  });

  it('no dibuja matriz de problemas, porque el papel no la trae', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-prenatal');
    await esperarHoja();

    // En su lugar, la raya que el MSPAS deja impresa.
    expect(screen.getByLabelText(/Problemas detectados/)).toBeInTheDocument();
    expect(screen.queryByText(/Revisión de problemas/)).not.toBeInTheDocument();
  });

  it('la raya de «describa» solo aparece cuando la respuesta es que sí', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-prenatal');
    await esperarHoja();

    expect(screen.queryByLabelText(/^Describa$/)).not.toBeInTheDocument();

    const casilla = screen.getByRole('radiogroup', { name: 'Trazas de sangre o manchado' });
    await userEvent.click(within(casilla).getByRole('radio', { name: 'Si' }));

    await waitFor(() => expect(screen.getAllByLabelText(/^Describa$/).length).toBe(1));
  });

  it('enseña las semanas calculadas al lado de las que se escriben, sin rellenarlas', async () => {
    // El papel admite estimarlas por altura uterina, asi que el sistema no
    // decide por quien atiende: pone su cuenta al lado.
    servidor({ fur: '2026-01-01' });
    abrir(MEDICO, '/pacientes/p-1/ficha-prenatal');
    await esperarHoja();

    await waitFor(() =>
      expect(screen.getByText(/Por la FUR del expediente: \d+ semanas/)).toBeVisible(),
    );
    expect(screen.getByLabelText(/Semanas de embarazo por FUR y\/o AU/)).toHaveValue('');
  });

  it('sin FUR registrada dice que no puede calcularlas, en vez de poner un cero', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-prenatal');
    await esperarHoja();

    await waitFor(() =>
      expect(screen.getByText(/Sin FUR registrada, el sistema no puede calcularlas/)).toBeVisible(),
    );
  });

  it('Recepción no puede abrirla', async () => {
    servidor();
    abrir(RECEPCION, '/pacientes/p-1/ficha-prenatal');

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /Cac Xol/ })).not.toBeInTheDocument(),
    );
  });
});

// ══════════════════ la hoja del posparto en pantalla ══════════════════

describe('la evaluación del posparto', () => {
  it('trae SUS signos de peligro, no los del embarazo', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-posparto');
    await esperarHoja();

    expect(screen.getByText(/8\. Coágulos con mal olor \(Loquios\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Presentaciones fetales anormales/)).not.toBeInTheDocument();
  });

  it('las cinco preguntas del primer control aparecen solo si se marca', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-posparto');
    await esperarHoja();

    expect(screen.queryByLabelText(/Días después del parto/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /primer.*control posparto/i }));
    await waitFor(() => expect(screen.getByLabelText(/Días después del parto/)).toBeVisible());
    expect(screen.getByLabelText(/Dónde fue atendido el parto/)).toBeVisible();

    await userEvent.click(screen.getByRole('checkbox', { name: /primer.*control posparto/i }));
    await waitFor(() =>
      expect(screen.queryByLabelText(/Días después del parto/)).not.toBeInTheDocument(),
    );
  });

  it('el «¿por qué no?» aparece cuando la lactancia exclusiva es que no', async () => {
    servidor();
    abrir(MEDICO, '/pacientes/p-1/ficha-posparto');
    await esperarHoja();

    expect(screen.queryByLabelText(/¿Por qué no\?/)).not.toBeInTheDocument();

    const casilla = screen.getByRole('radiogroup', { name: 'Lactancia materna exclusiva' });
    await userEvent.click(within(casilla).getByRole('radio', { name: 'No' }));

    await waitFor(() => expect(screen.getByLabelText(/¿Por qué no\?/)).toBeVisible());
  });
});
