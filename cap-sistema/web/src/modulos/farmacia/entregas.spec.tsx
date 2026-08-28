import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';
import { existenciaEntregable } from './servicio-entregas';

const FARMACIA: Perfil = {
  id: 'u-3',
  usuario: 'sgomez',
  rol: 'FARMACIA',
  debeCambiarContrasena: false,
};
const MEDICO: Perfil = { ...FARMACIA, id: 'u-1', usuario: 'jperez', rol: 'MEDICO' };
const RECEPCION: Perfil = { ...FARMACIA, id: 'u-4', usuario: 'rlopez', rol: 'RECEPCION' };

const PACIENTE = {
  id: 'p-1',
  nombres: 'Juana Isabel',
  apellidos: 'Perez Caal',
  fechaNacimiento: '1985-04-12T00:00:00.000Z',
  edad: 41,
  sexo: 'F',
  idioma: 'QEQCHI',
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Chilasco' },
  grupoFamiliar: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-000123', aperturaEn: null },
};

const AMOXICILINA = {
  id: 'm-1',
  codigo: 'AMOX500',
  nombreGenerico: 'Amoxicilina',
  nombreComercial: 'Amoxil',
  presentacion: 'Caja de 100 tabletas',
  concentracion: '500 mg',
  unidad: 'TABLETA',
  requiereReceta: true,
  activo: true,
  stockMinimo: 200,
  existencia: 320,
  bajoMinimo: false,
};

/** El detalle: dos lotes vigentes, 120 + 200. */
const DETALLE = {
  ...AMOXICILINA,
  lotes: [
    {
      id: 'l-1',
      numeroLote: 'L-4471',
      fechaVencimiento: '2026-10-15',
      cantidadDisponible: 120,
      estado: 'DISPONIBLE',
      vencimiento: 'POR_VENCER',
    },
    {
      id: 'l-2',
      numeroLote: 'L-9902',
      fechaVencimiento: '2028-03-30',
      cantidadDisponible: 200,
      estado: 'DISPONIBLE',
      vencimiento: 'VIGENTE',
    },
  ],
};

/**
 * El caso que el catalogo no distingue: 45 unidades, todas vencidas. El
 * catalogo dice existencia 45; FEFO no entrega ni una.
 */
const SOLO_VENCIDO = {
  ...AMOXICILINA,
  id: 'm-2',
  codigo: 'IBU400',
  nombreGenerico: 'Ibuprofeno',
  nombreComercial: null,
  concentracion: '400 mg',
  existencia: 45,
  lotes: [
    {
      id: 'l-8',
      numeroLote: 'L-1200',
      fechaVencimiento: '2026-07-31',
      cantidadDisponible: 45,
      estado: 'DISPONIBLE',
      vencimiento: 'VENCIDO',
    },
  ],
};

const ENTREGA = {
  id: 'ent-1',
  pacienteId: 'p-1',
  comunidadId: 'c-1',
  fecha: '2026-08-28T14:30:00.000Z',
  registradoPor: 'u-3',
  observaciones: null,
  medicamentos: [
    {
      codigo: 'AMOX500',
      nombre: 'Amoxicilina',
      unidad: 'TABLETA',
      numeroLote: 'L-4471',
      fechaVencimiento: '2026-10-15',
      cantidad: 20,
    },
  ],
};

const paginaDe = (datos: unknown[]) => ({
  datos,
  pagina: 1,
  tamano: 25,
  total: datos.length,
  totalPaginas: 1,
});

let peticiones: Request[] = [];
let cuerpos: unknown[] = [];

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json' },
  });
}

function servidor({
  pacientes = [PACIENTE] as unknown[],
  detalles = [DETALLE, SOLO_VENCIDO] as { id: string; nombreGenerico: string }[],
  entregas = [] as unknown[],
  sinExistencia = false,
  lento = false,
}: {
  pacientes?: unknown[];
  detalles?: { id: string; nombreGenerico: string }[];
  entregas?: unknown[];
  /** El servidor rechaza la entrega por falta de existencia. */
  sinExistencia?: boolean;
  /** El POST no responde: sirve para comprobar el estado "registrando". */
  lento?: boolean;
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      if (p.method !== 'GET') cuerpos.push(await p.clone().json());
      const url = new URL(p.url, 'http://local');
      const ruta = url.pathname;

      if (ruta.endsWith('/v1/entregas')) {
        if (p.method === 'POST') {
          if (lento) await new Promise(() => {});
          return sinExistencia
            ? json(
                {
                  codigo: 'CONFLICTO',
                  mensaje: 'No hay existencia suficiente para completar la entrega.',
                  detalles: ['Amoxicilina: faltan 5 de 20'],
                  trazaId: 'x',
                  ruta,
                  fecha: '2026-08-28T00:00:00.000Z',
                },
                409,
              )
            : json(ENTREGA, 201);
        }
        return json(paginaDe(entregas));
      }
      if (ruta.endsWith('/v1/medicamentos/bajo-minimo')) return json([]);
      if (ruta.endsWith('/v1/lotes/por-vencer')) return json(paginaDe([]));
      if (ruta.endsWith('/v1/lotes/vencidos')) return json(paginaDe([]));
      if (ruta.endsWith('/v1/medicamentos')) {
        const buscar = url.searchParams.get('buscar');
        const filtrado = buscar
          ? detalles.filter((m) =>
              m.nombreGenerico.toLowerCase().startsWith(buscar.toLowerCase()),
            )
          : detalles;
        return json(paginaDe(filtrado));
      }
      if (/\/v1\/medicamentos\/[^/]+$/.test(ruta)) {
        const id = ruta.split('/').pop();
        const encontrado = detalles.find((m) => m.id === id);
        return encontrado ? json(encontrado) : json({}, 404);
      }
      if (ruta.endsWith('/v1/pacientes')) return json(paginaDe(pacientes));
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil, ruta = '/farmacia/entrega') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

/** Elige al paciente de prueba y deja la pantalla lista para la receta. */
async function conPaciente(usuario: ReturnType<typeof userEvent.setup>) {
  abrir(FARMACIA);
  await screen.findByRole('heading', { name: 'Registrar entrega' });
  await usuario.type(screen.getByLabelText(/^Paciente/), 'Perez');
  await usuario.click(await screen.findByRole('button', { name: 'Elegir' }));
  await screen.findByText('Perez Caal, Juana Isabel');
}

/** Agrega un medicamento a la receta por su nombre. */
async function agregar(
  usuario: ReturnType<typeof userEvent.setup>,
  nombre: string,
  cantidad: string,
) {
  await usuario.type(screen.getByLabelText(/^Medicamento/), nombre);
  await usuario.click(await screen.findByRole('option', { name: new RegExp(nombre) }));
  await waitFor(() => expect(screen.getByLabelText(/^Cantidad/)).toBeEnabled());
  await usuario.type(screen.getByLabelText(/^Cantidad/), cantidad);
}

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

// ═══════════════════ lo que de verdad se puede entregar ═══════════════════

describe('existencia entregable', () => {
  /**
   * El campo `existencia` del catalogo suma TODOS los lotes disponibles,
   * vencidos incluidos, y FEFO nunca toma de un lote vencido. Un medicamento
   * con 45 tabletas vencidas figura con 45 y no se puede entregar ni una.
   */
  it('no cuenta los lotes vencidos, que es lo que FEFO va a mirar', () => {
    expect(existenciaEntregable(DETALLE as never)).toBe(320);
    expect(existenciaEntregable(SOLO_VENCIDO as never)).toBe(0);
  });

  it('tampoco cuenta los lotes que ya no estan disponibles', () => {
    const conAgotado = {
      ...DETALLE,
      lotes: [{ ...DETALLE.lotes[0], estado: 'AGOTADO', cantidadDisponible: 0 }, DETALLE.lotes[1]],
    };
    expect(existenciaEntregable(conAgotado as never)).toBe(200);
  });
});

// ═════════════════════════ armar la receta ═════════════════════════

describe('registrar una entrega', () => {
  it('sin paciente y sin medicamentos no deja registrar', async () => {
    servidor();
    abrir(FARMACIA);
    await screen.findByRole('heading', { name: 'Registrar entrega' });

    expect(screen.getByRole('button', { name: 'Registrar entrega' })).toBeDisabled();
  });

  it('elegir al paciente lo fija arriba, con su comunidad', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);

    expect(screen.getByText(/41 anios/)).toHaveTextContent('Chilasco');
  });

  it('con paciente pero sin medicamentos sigue sin poder registrarse', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);

    expect(screen.getByRole('button', { name: 'Registrar entrega' })).toBeDisabled();
    expect(screen.getByText(/Todavia no hay ningun medicamento/)).toBeInTheDocument();
  });

  it('agrega un medicamento a la receta con su cantidad', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));

    expect(await screen.findByText('20 tabletas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar entrega' })).toBeEnabled();
  });

  it('quitar una linea la saca de la receta', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');

    await usuario.click(screen.getByRole('button', { name: /Quitar Amoxicilina/ }));

    expect(screen.queryByText('20 tabletas')).not.toBeInTheDocument();
  });

  /**
   * El servidor devuelve 400 si el mismo medicamento aparece dos veces —hay que
   * sumar las cantidades en una linea— y descubrirlo al final, con la receta ya
   * escrita, es peor que impedirlo al anadirlo.
   */
  it('no ofrece un medicamento que ya esta en la receta', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');

    await usuario.type(screen.getByLabelText(/^Medicamento/), 'Amoxicilina');

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Amoxicilina/ })).not.toBeInTheDocument();
    });
  });

  it('avisa antes de enviar cuando la cantidad supera lo disponible', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '400');

    expect(await screen.findByText(/Solo hay 320 tabletas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar/ })).toBeDisabled();
  });

  it('avisa cuando toda la existencia esta vencida, aunque el catalogo diga 45', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);

    await usuario.type(screen.getByLabelText(/^Medicamento/), 'Ibuprofeno');
    await usuario.click(await screen.findByRole('option', { name: /Ibuprofeno/ }));

    expect(await screen.findByText(/No hay existencia vigente de Ibuprofeno/)).toBeInTheDocument();
  });
});

// ═════════════════════════ el envio ═════════════════════════

describe('el envio de la entrega', () => {
  it('manda el paciente y las lineas, sin mas', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');

    await usuario.click(screen.getByRole('button', { name: 'Registrar entrega' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual({
        pacienteId: 'p-1',
        lineas: [{ medicamentoId: 'm-1', cantidad: 20 }],
      });
    });
  });

  /**
   * Una entrega repetida descuenta el inventario dos veces por medicamento que
   * salio una sola. El boton se desactiva mientras la peticion esta en curso.
   */
  it('el boton se desactiva mientras se registra: no se envia dos veces', async () => {
    servidor({ lento: true });
    // pointerEventsCheck en 0 para poder FORZAR el segundo clic. Por defecto
    // userEvent se niega a pulsar un boton con pointer-events: none y lanza,
    // que es precisamente la proteccion que se quiere comprobar: aqui se salta
    // esa comprobacion para demostrar que ni forzandolo se envia dos veces.
    const usuario = userEvent.setup({ pointerEventsCheck: 0 });
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');

    await usuario.click(screen.getByRole('button', { name: 'Registrar entrega' }));

    const boton = await screen.findByRole('button', { name: 'Registrando...' });
    expect(boton).toBeDisabled();

    await usuario.click(boton);
    await usuario.click(boton);
    const envios = peticiones.filter((p) => p.method === 'POST' && p.url.includes('/v1/entregas'));
    expect(envios).toHaveLength(1);
  });

  it('al terminar muestra el comprobante con el lote del que salio cada cosa', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');
    await usuario.click(screen.getByRole('button', { name: 'Registrar entrega' }));

    expect(await screen.findByText('Entrega registrada')).toBeInTheDocument();
    expect(screen.getByText('L-4471')).toBeInTheDocument();
    expect(screen.getByText(/lo eligio el sistema/)).toBeInTheDocument();
  });

  it('el comprobante deja de ofrecer el boton de registrar', async () => {
    servidor();
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');
    await usuario.click(screen.getByRole('button', { name: 'Registrar entrega' }));
    await screen.findByText('Entrega registrada');

    expect(screen.queryByRole('button', { name: 'Registrar entrega' })).not.toBeInTheDocument();
  });

  /**
   * Es todo o nada: una entrega a medias deja al paciente con parte del
   * tratamiento y descuenta inventario por algo que no resolvio la receta.
   */
  it('si el servidor dice que no alcanza, explica cuanto falto y no entrega nada', async () => {
    servidor({ sinExistencia: true });
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');
    await usuario.click(screen.getByRole('button', { name: 'Registrar entrega' }));

    expect(await screen.findByText(/No se entrego nada/)).toBeInTheDocument();
    expect(screen.getByText('Amoxicilina: faltan 5 de 20')).toBeInTheDocument();
    // La receta sigue en pantalla para corregirla, no se pierde.
    expect(screen.getByText('20 tabletas')).toBeInTheDocument();
  });

  it('tras un rechazo se puede reintentar: el boton vuelve a estar activo', async () => {
    servidor({ sinExistencia: true });
    const usuario = userEvent.setup();
    await conPaciente(usuario);
    await agregar(usuario, 'Amoxicilina', '20');
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }));
    await screen.findByText('20 tabletas');
    await usuario.click(screen.getByRole('button', { name: 'Registrar entrega' }));
    await screen.findByText(/No se entrego nada/);

    expect(screen.getByRole('button', { name: 'Registrar entrega' })).toBeEnabled();
  });
});

// ═════════════════════════ quien hace que ═════════════════════════

describe('quien despacha y quien mira', () => {
  it('farmacia ve el boton de registrar entrega en el inventario', async () => {
    servidor();
    abrir(FARMACIA, '/farmacia');
    await screen.findByRole('heading', { name: 'Farmacia' });

    expect(await screen.findByRole('link', { name: /Registrar entrega/ })).toBeInTheDocument();
  });

  it('el medico ve el historial de entregas pero no despacha', async () => {
    servidor();
    abrir(MEDICO, '/farmacia');
    await screen.findByRole('heading', { name: 'Farmacia' });

    expect(await screen.findByRole('tab', { name: 'Entregas' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Registrar entrega/ })).not.toBeInTheDocument();
  });

  it('el medico que escribe la direccion a mano no entra al despacho', async () => {
    servidor();
    abrir(MEDICO, '/farmacia/entrega');

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Registrar entrega' }),
      ).not.toBeInTheDocument();
    });
  });

  it('recepcion no entra a farmacia en absoluto', async () => {
    servidor();
    abrir(RECEPCION, '/farmacia/entrega');

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Registrar entrega' }),
      ).not.toBeInTheDocument();
    });
  });
});

// ═════════════════════════ el historial ═════════════════════════

describe('historial de entregas', () => {
  it('lo dice cuando no hay ninguna, en vez de mostrar una tabla vacia', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia');
    await screen.findByRole('heading', { name: 'Farmacia' });

    await usuario.click(await screen.findByRole('tab', { name: 'Entregas' }));

    expect(await screen.findByText(/Todavia no se ha registrado ninguna/)).toBeInTheDocument();
  });

  /**
   * Una receta de varios medicamentos es UNA entrega. Contarlas por medicamento
   * inflaria el indicador de atenciones de farmacia que el CAP reporta.
   */
  it('una receta de dos medicamentos es una sola fila', async () => {
    servidor({
      entregas: [
        {
          ...ENTREGA,
          medicamentos: [
            ...ENTREGA.medicamentos,
            {
              codigo: 'IBU400',
              nombre: 'Ibuprofeno',
              unidad: 'TABLETA',
              numeroLote: 'L-1200',
              fechaVencimiento: '2027-01-31',
              cantidad: 10,
            },
          ],
        },
      ],
    });
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia');
    await screen.findByRole('heading', { name: 'Farmacia' });
    await usuario.click(await screen.findByRole('tab', { name: 'Entregas' }));

    expect(await screen.findByText(/^1 entrega,/)).toBeInTheDocument();
    const fila = screen.getByText('Amoxicilina').closest('tr') as HTMLElement;
    expect(within(fila).getByText('Ibuprofeno')).toBeInTheDocument();
  });

  it('cada medicamento dice de que lote salio', async () => {
    servidor({ entregas: [ENTREGA] });
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia');
    await screen.findByRole('heading', { name: 'Farmacia' });
    await usuario.click(await screen.findByRole('tab', { name: 'Entregas' }));

    expect(await screen.findByText('Lote L-4471')).toBeInTheDocument();
  });

  /**
   * El servicio de medicamentos guarda el id del paciente y su comunidad, no
   * sus datos personales. Resolver cien nombres contra el servicio de usuarios
   * para pintar esta tabla seria exponer identidad en una pantalla que responde
   * "que salio del inventario", no "a quien".
   */
  it('el historial no muestra el nombre del paciente', async () => {
    servidor({ entregas: [ENTREGA] });
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia');
    await screen.findByRole('heading', { name: 'Farmacia' });
    await usuario.click(await screen.findByRole('tab', { name: 'Entregas' }));
    await screen.findByText('Lote L-4471');

    expect(screen.queryByText(/Perez Caal/)).not.toBeInTheDocument();
  });
});
