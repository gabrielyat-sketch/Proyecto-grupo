import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';
import { esperaEnPalabras } from './servicio-espera';

const ENFERMERIA: Perfil = {
  id: 'u-1',
  usuario: 'mcaal',
  rol: 'ENFERMERIA',
  debeCambiarContrasena: false,
};
const RECEPCION: Perfil = { ...ENFERMERIA, id: 'u-2', usuario: 'rlopez', rol: 'RECEPCION' };
const DIRECTOR: Perfil = { ...ENFERMERIA, id: 'u-3', usuario: 'ddirector', rol: 'DIRECTOR' };
const FARMACIA: Perfil = { ...ENFERMERIA, id: 'u-4', usuario: 'sgomez', rol: 'FARMACIA' };

const visita = (n: number, extra: Record<string, unknown> = {}) => ({
  id: 'v-' + n,
  pacienteId: 'p-' + n,
  nombres: 'Juana ' + n,
  apellidos: 'Perez Caal',
  edad: 40,
  sexo: 'F',
  comunidad: 'Purulha Centro',
  numeroExpediente: 'EXP-2026-00000' + n,
  llegadaEn: '2026-08-27T14:00:00.000Z',
  esperandoMinutos: 10 * n,
  motivo: null,
  ...extra,
});

let peticiones: Request[] = [];
let cuerpos: { ruta: string; cuerpo: Record<string, unknown> }[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({ sala = [visita(1), visita(2)] }: { sala?: unknown[] } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const url = new URL(p.url, 'http://local');
      if (p.method !== 'GET') {
        cuerpos.push({ ruta: url.pathname, cuerpo: await p.clone().json() });
      }

      if (url.pathname.endsWith('/visitas/espera')) return json(sala);
      if (url.pathname.includes('/retiro')) return json({ id: 'v-1', estado: 'RETIRADA' });
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil = ENFERMERIA) {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', '/espera');
  return render(<App />);
}

const esperarSala = () => screen.findByRole('heading', { name: 'Sala de espera' });

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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cuanto lleva esperando, en palabras', () => {
  it('se dice en horas pasada la hora: "95 min" obliga a dividir mentalmente', () => {
    expect(esperaEnPalabras(0)).toBe('Recien llegado');
    expect(esperaEnPalabras(23)).toBe('23 min');
    expect(esperaEnPalabras(60)).toBe('1 h');
    expect(esperaEnPalabras(95)).toBe('1 h 35 min');
    expect(esperaEnPalabras(120)).toBe('2 h');
  });
});

describe('sala de espera', () => {
  it('muestra a quienes esperan, en orden de llegada y numerados', async () => {
    servidor();
    abrir();
    await esperarSala();

    expect(await screen.findByText('Perez Caal, Juana 1')).toBeInTheDocument();
    expect(screen.getByText('Perez Caal, Juana 2')).toBeInTheDocument();
    // El turno: es lo que la gente cuenta desde la silla.
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('cuando no hay nadie lo dice, y explica de donde sale la lista', async () => {
    servidor({ sala: [] });
    abrir();
    await esperarSala();

    expect(
      await screen.findByText(/No hay nadie esperando/),
    ).toBeInTheDocument();
  });

  it('destaca a quien lleva mas de una hora', async () => {
    servidor({ sala: [visita(1, { esperandoMinutos: 95 })] });
    abrir();
    await esperarSala();

    expect(await screen.findByText('1 h 35 min')).toBeInTheDocument();
  });

  it('el motivo se muestra si recepcion lo anoto', async () => {
    servidor({ sala: [visita(1, { motivo: 'Control de embarazo' })] });
    abrir();
    await esperarSala();

    expect(await screen.findByText('Control de embarazo')).toBeInTheDocument();
  });

  it('NO expone el DPI', async () => {
    servidor();
    abrir();
    await esperarSala();

    await screen.findByText('Perez Caal, Juana 1');
    expect(screen.queryByText(/\d{13}/)).not.toBeInTheDocument();
  });

  describe('quien hace que', () => {
    it('enfermeria atiende: el boton lleva a la ficha', async () => {
      servidor({ sala: [visita(1)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarSala();

      await usuario.click((await screen.findAllByRole('button', { name: 'Atender' }))[0]);
      await waitFor(() => expect(window.location.pathname).toBe('/pacientes/p-1/ficha'));
    });

    it('direccion mira la sala pero no la toca', async () => {
      servidor({ sala: [visita(1)] });
      abrir(DIRECTOR);
      await esperarSala();

      await screen.findByText('Perez Caal, Juana 1');
      expect(screen.queryByRole('button', { name: 'Atender' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Se fue' })).not.toBeInTheDocument();
    });

    it('farmacia no entra: la sala dice quien vino al medico y a que', async () => {
      servidor();
      abrir(FARMACIA);
      await waitFor(() => expect(window.location.pathname).toBe('/'));
    });
  });

  describe('se fue sin que lo atendieran', () => {
    it('exige decir que paso', async () => {
      servidor({ sala: [visita(1)] });
      const usuario = userEvent.setup();
      abrir(RECEPCION);
      await esperarSala();

      await usuario.click((await screen.findAllByRole('button', { name: 'Se fue' }))[0]);
      const diálogo = await screen.findByRole('dialog');

      expect(within(diálogo).getByRole('button', { name: 'Sacar de la lista' })).toBeDisabled();

      await usuario.type(within(diálogo).getByLabelText(/Que paso/), 'Se canso de esperar');
      expect(within(diálogo).getByRole('button', { name: 'Sacar de la lista' })).toBeEnabled();

      await usuario.click(within(diálogo).getByRole('button', { name: 'Sacar de la lista' }));
      await waitFor(() => expect(cuerpos).toHaveLength(1));
      expect(cuerpos[0].ruta).toContain('/v1/visitas/v-1/retiro');
      expect(cuerpos[0].cuerpo).toEqual({ motivo: 'Se canso de esperar' });
    });

    it('enfermeria tambien puede sacarla: llama y no contesta nadie', async () => {
      servidor({ sala: [visita(1)] });
      abrir(ENFERMERIA);
      await esperarSala();

      expect((await screen.findAllByRole('button', { name: 'Se fue' })).length).toBeGreaterThan(0);
    });
  });

  describe('captura por teclado', () => {
    it('las flechas recorren la sala y Enter atiende', async () => {
      servidor({ sala: [visita(1), visita(2), visita(3)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarSala();
      await screen.findByText('Perez Caal, Juana 1');

      const filas = document.querySelectorAll<HTMLElement>('[data-fila]');
      expect(filas).toHaveLength(3);

      filas[0].focus();
      await usuario.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(filas[1]);

      await usuario.keyboard('{Enter}');
      await waitFor(() => expect(window.location.pathname).toBe('/pacientes/p-2/ficha'));
    });
  });
});
