import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const ENFERMERIA: Perfil = {
  id: 'u-1',
  usuario: 'mcaal',
  rol: 'ENFERMERIA',
  debeCambiarContrasena: false,
};
const RECEPCION: Perfil = { ...ENFERMERIA, id: 'u-2', usuario: 'rlopez', rol: 'RECEPCION' };
const DIRECTOR: Perfil = { ...ENFERMERIA, id: 'u-3', usuario: 'ddirector', rol: 'DIRECTOR' };
const FARMACIA: Perfil = { ...ENFERMERIA, id: 'u-4', usuario: 'sgomez', rol: 'FARMACIA' };

const COMUNIDADES = [
  {
    comunidadId: 'c-1',
    nombre: 'Chilasco',
    distante: false,
    total: 100,
    completos: 40,
    faltantes: 55,
    noLocalizados: 5,
    porcentajeCompleto: 40,
  },
  {
    comunidadId: 'c-2',
    nombre: 'Matanzas',
    distante: true,
    total: 60,
    completos: 60,
    faltantes: 0,
    noLocalizados: 0,
    porcentajeCompleto: 100,
  },
];

const carpeta = (n: number, extra: Record<string, unknown> = {}) => ({
  expedienteId: 'e-' + n,
  pacienteId: 'p-' + n,
  numero: 'EXP-2026-00000' + n,
  nombres: 'Juana ' + n,
  apellidos: 'Perez Caal',
  edad: 40 + n,
  sexo: 'F',
  comunidad: 'Chilasco',
  estado: 'PENDIENTE',
  atencionesTranscritas: 0,
  iniciadoEn: null,
  observaciones: null,
  ...extra,
});

const cola = (datos: unknown[]) => ({
  datos,
  pagina: 1,
  tamano: 25,
  total: datos.length,
  totalPaginas: 1,
});

let peticiones: Request[] = [];
let cuerpos: { ruta: string; cuerpo: unknown }[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({
  comunidades = COMUNIDADES,
  filas = [carpeta(1), carpeta(2), carpeta(3)],
}: { comunidades?: unknown[]; filas?: unknown[] } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const url = new URL(p.url, 'http://local');
      if (p.method !== 'GET') cuerpos.push({ ruta: url.pathname, cuerpo: await p.clone().json() });

      if (url.pathname.endsWith('/digitalizacion/comunidades')) return json(comunidades);
      if (url.pathname.endsWith('/digitalizacion/cola')) {
        const comunidad = url.searchParams.get('comunidadId');
        // La comunidad 2 esta terminada: su cola de pendientes viene vacia.
        if (comunidad === 'c-2') return json(cola([]));
        return json(cola(filas));
      }
      if (url.pathname.includes('/digitalizacion/') && p.method === 'PATCH') {
        return json({ expedienteId: 'e-1', estado: 'COMPLETO' });
      }
      return json({}, 404);
    }),
  );
}

const ultimaCola = () =>
  new URL(
    peticiones.filter((p) => p.url.includes('/digitalizacion/cola')).at(-1)!.url,
    'http://local',
  );

function abrir(perfil: Perfil = ENFERMERIA) {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', '/digitalizacion');
  return render(<App />);
}

const esperarPanel = () =>
  screen.findByRole('heading', { name: 'Digitalizacion de expedientes' });

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

describe('modo de digitalizacion', () => {
  it('lo primero que se ve es cuanto se lleva: es la razon de volver manana', async () => {
    servidor();
    abrir();
    await esperarPanel();

    // 100 de Chilasco mas 60 de Matanzas: 100 completos de 160.
    //
    // El porcentaje sale dos veces a proposito: arriba como total del archivo y
    // en el renglon "todas las comunidades". Aqui se comprueba el de arriba.
    const rotulo = await screen.findByText('del archivo');
    const encabezado = rotulo.closest('.MuiPaper-root') as HTMLElement;
    expect(within(encabezado).getByText('62.5%')).toBeInTheDocument();
    expect(within(encabezado).getByText('transcritos')).toBeInTheDocument();
    expect(within(encabezado).getByText('55')).toBeInTheDocument();
  });

  it('el avance se ve comunidad por comunidad, que es como se recorre el archivo', async () => {
    servidor();
    abrir();
    await esperarPanel();

    const navegacion = await screen.findByRole('navigation', { name: 'Comunidades' });
    expect(within(navegacion).getByText('Chilasco')).toBeInTheDocument();
    expect(within(navegacion).getByText('55 por transcribir de 100')).toBeInTheDocument();
    expect(within(navegacion).getByText('60 expedientes, sin pendientes')).toBeInTheDocument();
    expect(within(navegacion).getByText('Distante')).toBeInTheDocument();
  });

  it('elegir una comunidad filtra la cola de esa comunidad', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarPanel();

    // "Chilasco" tambien aparece en la columna Comunidad de la cola; el que se
    // pulsa es el de la lista lateral.
    const navegacion = await screen.findByRole('navigation', { name: 'Comunidades' });
    await usuario.click(within(navegacion).getByText('Chilasco'));
    await waitFor(() => expect(ultimaCola().searchParams.get('comunidadId')).toBe('c-1'));
  });

  it('una comunidad terminada lo dice, en vez de mostrar una tabla vacia', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir();
    await esperarPanel();

    const navegacion = await screen.findByRole('navigation', { name: 'Comunidades' });
    await usuario.click(within(navegacion).getByText('Matanzas'));
    expect(
      await screen.findByText('Esta comunidad ya esta transcrita por completo.'),
    ).toBeInTheDocument();
  });

  it('por defecto la cola trae lo que FALTA, no el archivo entero', async () => {
    servidor();
    abrir();
    await esperarPanel();

    await waitFor(() => expect(peticiones.some((p) => p.url.includes('/cola'))).toBe(true));
    expect(ultimaCola().searchParams.get('estado')).toBeNull();
  });

  it('la cola NO muestra el DPI: se trabaja con gente alrededor', async () => {
    servidor({ filas: [carpeta(1)] });
    abrir();
    await esperarPanel();

    await screen.findByText('EXP-2026-000001');
    expect(screen.queryByText(/DPI/i)).not.toBeInTheDocument();
  });

  describe('quien hace que', () => {
    it('enfermeria transcribe: ve el boton y llega a la ficha', async () => {
      servidor({ filas: [carpeta(1)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarPanel();

      await usuario.click((await screen.findAllByRole('button', { name: 'Transcribir' }))[0]);
      await waitFor(() => expect(window.location.pathname).toBe('/pacientes/p-1/ficha'));
      expect(window.location.search).toBe('?digitalizacion=1');
    });

    it('recepcion lleva el archivo pero no transcribe la ficha clinica', async () => {
      servidor({ filas: [carpeta(1)] });
      abrir(RECEPCION);
      await esperarPanel();

      await screen.findByText('EXP-2026-000001');
      expect(screen.queryByRole('button', { name: 'Transcribir' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Estado' }).length).toBeGreaterThan(0);
    });

    it('direccion mira el avance pero no toca nada', async () => {
      servidor({ filas: [carpeta(1)] });
      abrir(DIRECTOR);
      await esperarPanel();

      await screen.findByText('EXP-2026-000001');
      expect(screen.queryByRole('button', { name: 'Transcribir' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Estado' })).not.toBeInTheDocument();
    });

    it('farmacia no entra al archivo', async () => {
      servidor();
      abrir(FARMACIA);
      await waitFor(() => expect(window.location.pathname).toBe('/'));
    });
  });

  describe('captura por teclado', () => {
    it('las flechas recorren la cola y Enter abre la carpeta', async () => {
      // Es RF-08: miles de carpetas, una mano en el papel y la otra en el
      // teclado. Con el raton, cada expediente costaria un viaje de ida y
      // vuelta.
      servidor({ filas: [carpeta(1), carpeta(2), carpeta(3)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarPanel();

      await screen.findByText('EXP-2026-000001');
      const filas = screen.getAllByRole('row').filter((f) => f.getAttribute('tabindex') === '0');
      expect(filas).toHaveLength(3);

      filas[0].focus();
      await usuario.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(filas[1]);

      await usuario.keyboard('{Enter}');
      await waitFor(() => expect(window.location.pathname).toBe('/pacientes/p-2/ficha'));
    });

    it('la flecha arriba no se sale por el principio de la lista', async () => {
      servidor({ filas: [carpeta(1), carpeta(2)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarPanel();

      await screen.findByText('EXP-2026-000001');
      const filas = screen.getAllByRole('row').filter((f) => f.getAttribute('tabindex') === '0');
      filas[0].focus();
      await usuario.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(filas[0]);
    });
  });

  describe('cambiar de lista', () => {
    it('vuelve al principio, no se queda abajo', async () => {
      const irArriba = vi.fn();
      Element.prototype.scrollIntoView = irArriba;

      servidor({ filas: [carpeta(1)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarPanel();
      await screen.findByText('EXP-2026-000001');

      irArriba.mockClear();
      const navegacion = await screen.findByRole('navigation', { name: 'Comunidades' });
      await usuario.click(within(navegacion).getByText('Chilasco'));

      expect(irArriba).toHaveBeenCalled();
    });

    it('las filas anteriores se quedan mientras llegan las nuevas', async () => {
      // Antes la tabla desaparecia entera y la sustituia un indicador de carga:
      // la pagina se encogia de golpe y volvia a crecer, y el salto se sentia
      // como un tiron.
      Element.prototype.scrollIntoView = vi.fn();
      servidor({ filas: [carpeta(1)] });
      const usuario = userEvent.setup();
      abrir(ENFERMERIA);
      await esperarPanel();
      await screen.findByText('EXP-2026-000001');

      const navegacion = await screen.findByRole('navigation', { name: 'Comunidades' });
      await usuario.click(within(navegacion).getByText('Chilasco'));

      expect(screen.getByText('EXP-2026-000001')).toBeInTheDocument();
    });
  });

  describe('estado de la carpeta', () => {
    it('se abre con el estado que la carpeta tiene ahora, no con otro', async () => {
      servidor({ filas: [carpeta(1, { estado: 'EN_PROCESO' })] });
      const usuario = userEvent.setup();
      abrir(RECEPCION);
      await esperarPanel();

      await usuario.click((await screen.findAllByRole('button', { name: 'Estado' }))[0]);
      const diálogo = await screen.findByRole('dialog');
      expect(within(diálogo).getByLabelText('Estado de la carpeta')).toHaveTextContent(
        'En proceso',
      );
    });

    it('"no localizado" exige explicar que paso', async () => {
      // Un expediente que desaparece del archivo es justo lo que despues nadie
      // sabe explicar.
      servidor({ filas: [carpeta(1)] });
      const usuario = userEvent.setup();
      abrir(RECEPCION);
      await esperarPanel();

      await usuario.click((await screen.findAllByRole('button', { name: 'Estado' }))[0]);
      const diálogo = await screen.findByRole('dialog');

      await usuario.click(within(diálogo).getByLabelText('Estado de la carpeta'));
      await usuario.click(await screen.findByRole('option', { name: 'No localizado' }));

      expect(within(diálogo).getByRole('button', { name: 'Guardar' })).toBeDisabled();

      await usuario.type(within(diálogo).getByLabelText(/Que paso/), 'No esta en su cajon');
      expect(within(diálogo).getByRole('button', { name: 'Guardar' })).toBeEnabled();
    });

    it('dice cuando el estado lo pone el sistema y cuando lo decide la persona', async () => {
      servidor({ filas: [carpeta(1, { estado: 'PENDIENTE' })] });
      const usuario = userEvent.setup();
      abrir(RECEPCION);
      await esperarPanel();

      await usuario.click((await screen.findAllByRole('button', { name: 'Estado' }))[0]);
      const diálogo = await screen.findByRole('dialog');

      expect(
        within(diálogo).getByText(/Este estado lo pone el sistema solo al transcribir/),
      ).toBeInTheDocument();

      await usuario.click(within(diálogo).getByLabelText('Estado de la carpeta'));
      await usuario.click(await screen.findByRole('option', { name: 'Completo' }));
      expect(
        within(diálogo).getByText(/el sistema no sabe cuantas hojas trae la carpeta/),
      ).toBeInTheDocument();
      expect(
        within(diálogo).queryByText(/Este estado lo pone el sistema/),
      ).not.toBeInTheDocument();
    });

    it('guardar el estado lo envia y refresca el avance', async () => {
      servidor({ filas: [carpeta(1)] });
      const usuario = userEvent.setup();
      abrir(RECEPCION);
      await esperarPanel();

      await usuario.click((await screen.findAllByRole('button', { name: 'Estado' }))[0]);
      const diálogo = await screen.findByRole('dialog');
      await usuario.click(within(diálogo).getByLabelText('Estado de la carpeta'));
      await usuario.click(await screen.findByRole('option', { name: 'Completo' }));
      await usuario.click(within(diálogo).getByRole('button', { name: 'Guardar' }));

      await waitFor(() => expect(cuerpos).toHaveLength(1));
      expect(cuerpos[0].cuerpo).toEqual({ estado: 'COMPLETO' });
      // Se vuelve a pedir el avance: la carpeta cambio de estado.
      await waitFor(() =>
        expect(peticiones.filter((p) => p.url.includes('/comunidades')).length).toBeGreaterThan(1),
      );
    });
  });
});
