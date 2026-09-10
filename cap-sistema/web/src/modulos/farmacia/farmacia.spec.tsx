import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App, clienteConsultas } from '../../App';
import { almacenSesion, type Perfil } from '../../api';
import {
  conUnidad,
  desvioEnPalabras,
  faltanPara,
  fechaCorta,
  venceEn,
  vencidoHace,
} from './servicio-farmacia';

const FARMACIA: Perfil = {
  id: 'u-3',
  usuario: 'sgomez',
  rol: 'FARMACIA',
  debeCambiarContrasena: false,
};
const MEDICO: Perfil = { ...FARMACIA, id: 'u-1', usuario: 'jperez', rol: 'MEDICO' };
const DIRECTOR: Perfil = { ...FARMACIA, id: 'u-6', usuario: 'ddirector', rol: 'DIRECTOR' };
const RECEPCION: Perfil = { ...FARMACIA, id: 'u-4', usuario: 'rlopez', rol: 'RECEPCION' };

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
  // El lote que vence antes (L-4471, 15/10/2026) manda el color.
  semaforo: 'ROJO',
  proximoVencimiento: '2026-10-15',
  diasParaVencer: 18,
};

const SUERO = {
  ...AMOXICILINA,
  id: 'm-2',
  codigo: 'SRO001',
  nombreGenerico: 'Suero oral',
  nombreComercial: null,
  presentacion: null,
  concentracion: null,
  unidad: 'SOBRE',
  requiereReceta: false,
  stockMinimo: 100,
  existencia: 12,
  bajoMinimo: true,
  semaforo: 'VERDE',
  proximoVencimiento: '2028-01-10',
  diasParaVencer: 470,
};

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
      diasParaVencer: 18,
      semaforo: 'ROJO',
    },
    {
      id: 'l-2',
      numeroLote: 'L-9902',
      fechaVencimiento: '2028-03-30',
      cantidadDisponible: 200,
      estado: 'DISPONIBLE',
      vencimiento: 'VIGENTE',
      diasParaVencer: 550,
      semaforo: 'VERDE',
    },
  ],
};

const LOTE_POR_VENCER = {
  id: 'l-1',
  numeroLote: 'L-4471',
  medicamento: { codigo: 'AMOX500', nombreGenerico: 'Amoxicilina', unidad: 'TABLETA' },
  fechaVencimiento: '2026-10-15',
  cantidadDisponible: 120,
  diasParaVencer: 18,
  vencimiento: 'POR_VENCER',
  semaforo: 'ROJO',
};

const LOTE_AMARILLO = {
  id: 'l-5',
  numeroLote: 'LTGT1501',
  medicamento: { codigo: 'SF-300', nombreGenerico: 'Sulfato ferroso', unidad: 'TABLETA' },
  fechaVencimiento: '2027-06-07',
  cantidadDisponible: 300,
  diasParaVencer: 270,
  vencimiento: 'VIGENTE',
  semaforo: 'AMARILLO',
};

const LOTE_VENCIDO = {
  id: 'l-8',
  numeroLote: 'L-1200',
  medicamento: { codigo: 'IBU400', nombreGenerico: 'Ibuprofeno', unidad: 'TABLETA' },
  fechaVencimiento: '2026-07-31',
  cantidadDisponible: 45,
  diasVencido: 28,
};

const BAJO_MINIMO = [
  {
    id: 'm-2',
    codigo: 'SRO001',
    nombreGenerico: 'Suero oral',
    unidad: 'SOBRE',
    stockMinimo: 100,
    existencia: 12,
  },
];

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
  catalogo = [AMOXICILINA, SUERO],
  detalle = DETALLE as unknown,
  rojo = [LOTE_POR_VENCER] as unknown[],
  amarillo = [LOTE_AMARILLO] as unknown[],
  verde = [] as unknown[],
  vencidos = [LOTE_VENCIDO] as unknown[],
  bajoMinimo = BAJO_MINIMO as unknown[],
  ajusteChoca = false,
}: {
  catalogo?: unknown[];
  detalle?: unknown;
  rojo?: unknown[];
  amarillo?: unknown[];
  verde?: unknown[];
  vencidos?: unknown[];
  bajoMinimo?: unknown[];
  /** Simula que alguien entrego mientras se contaba: el servidor da 409. */
  ajusteChoca?: boolean;
} = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      if (p.method !== 'GET') {
        cuerpos.push(await p.clone().json());
      }
      const url = new URL(p.url, 'http://local');
      const ruta = url.pathname;

      if (ruta.endsWith('/v1/medicamentos/bajo-minimo')) return json(bajoMinimo);
      if (ruta.endsWith('/v1/lotes/semaforo/resumen')) {
        return json({
          rojo: rojo.length,
          amarillo: amarillo.length,
          verde: verde.length,
          vencidos: vencidos.length,
        });
      }
      if (ruta.endsWith('/v1/lotes/semaforo/ROJO')) return json(paginaDe(rojo));
      if (ruta.endsWith('/v1/lotes/semaforo/AMARILLO')) return json(paginaDe(amarillo));
      if (ruta.endsWith('/v1/lotes/semaforo/VERDE')) return json(paginaDe(verde));
      if (ruta.endsWith('/v1/lotes/vencidos')) return json(paginaDe(vencidos));
      if (/\/v1\/lotes\/[^/]+\/ajuste$/.test(ruta)) {
        return ajusteChoca
          ? json(
              {
                codigo: 'CONFLICTO',
                mensaje:
                  'La existencia cambio mientras se contaba: hubo una entrega o un ingreso. Vuelva a contar.',
                trazaId: 'x',
                ruta,
                fecha: '2026-08-28T00:00:00.000Z',
              },
              409,
            )
          : json({ id: 'l-1', cantidadDisponible: 95, estado: 'DISPONIBLE' });
      }
      if (/\/v1\/lotes\/[^/]+\/baja$/.test(ruta)) return json({ id: 'l-8', estado: 'DADO_DE_BAJA' });
      if (/\/v1\/medicamentos\/[^/]+\/lotes$/.test(ruta)) return json({ id: 'l-nuevo' });
      if (ruta.endsWith('/v1/medicamentos')) {
        if (p.method === 'POST') return json({ ...AMOXICILINA, id: 'm-9' }, 201);
        const buscar = url.searchParams.get('buscar');
        const filtrado = buscar
          ? (catalogo as { nombreGenerico: string }[]).filter((m) =>
              m.nombreGenerico.toLowerCase().startsWith(buscar.toLowerCase()),
            )
          : catalogo;
        return json(paginaDe(filtrado));
      }
      if (/\/v1\/medicamentos\/[^/]+$/.test(ruta)) {
        return detalle ? json(detalle) : json({ codigo: 'NO_ENCONTRADO', mensaje: 'No existe ese medicamento.', trazaId: 'x', ruta, fecha: '2026-08-28T00:00:00.000Z' }, 404);
      }
      return json({}, 404);
    }),
  );
}

function abrir(perfil: Perfil, ruta = '/farmacia') {
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: perfil });
  window.history.pushState({}, '', ruta);
  return render(<App />);
}

const esperarPanel = () => screen.findByRole('heading', { name: 'Farmacia' });

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

// ══════════════════════ como se dicen las cosas ══════════════════════

describe('como se presenta el inventario', () => {
  it('la existencia va con su unidad: "320" no dice si son tabletas o frascos', () => {
    expect(conUnidad(320, 'TABLETA')).toBe('320 tabletas');
    expect(conUnidad(5, 'JARABE_ML')).toBe('5 ml');
    expect(conUnidad(2, 'FRASCO')).toBe('2 frascos');
  });

  it('el vencimiento se dice en dias cuando falta poco y en meses cuando falta mucho', () => {
    expect(faltanPara(0)).toBe('Vence hoy');
    expect(faltanPara(1)).toBe('Vence manana');
    expect(faltanPara(18)).toBe('En 18 dias');
    expect(faltanPara(90)).toBe('En 3 meses');
  });

  it('lo vencido se cuenta hacia atras', () => {
    expect(vencidoHace(1)).toBe('Vencio ayer');
    expect(vencidoHace(28)).toBe('Hace 28 dias');
  });

  /**
   * El plazo que acompana al color del semaforo. Un punto rojo solo no dice
   * si es porque vence en cinco meses o porque vencio el anio pasado, y con lo
   * primero todavia se entrega.
   */
  it('el semaforo lleva su plazo con verbo, hacia adelante y hacia atras', () => {
    expect(venceEn(0)).toBe('Vence hoy');
    expect(venceEn(1)).toBe('Vence manana');
    expect(venceEn(18)).toBe('Vence en 18 dias');
    expect(venceEn(150)).toBe('Vence en 5 meses');
    expect(venceEn(-1)).toBe('Vencio ayer');
    expect(venceEn(-28)).toBe('Vencio hace 28 dias');
    expect(venceEn(-90)).toBe('Vencio hace 3 meses');
  });

  /**
   * Guatemala es UTC-6. Construir un Date con la cadena entera la interpreta
   * como medianoche UTC, que aqui es todavia el dia anterior: un lote parecia
   * vencer un dia antes de lo impreso en la caja.
   */
  it('la fecha de vencimiento no se corre un dia hacia atras', () => {
    expect(fechaCorta('2026-10-15')).toBe('15/10/2026');
    expect(fechaCorta('2027-01-01')).toBe('01/01/2027');
    expect(fechaCorta(null)).toBe('—');
  });
});

// ══════════════════════════ el catalogo ══════════════════════════

describe('catalogo', () => {
  it('lista los medicamentos con su existencia y su unidad', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();

    expect(await screen.findByText('Amoxicilina 500 mg')).toBeInTheDocument();
    expect(screen.getByText('320 tabletas')).toBeInTheDocument();
    expect(screen.getByText('12 sobres')).toBeInTheDocument();
  });

  /**
   * El semaforo de las bodegas del MSPAS: rojo a menos de 6 meses, amarillo
   * entre 6 y 12, verde a mas de 12. En el catalogo cada medicamento lleva el
   * color de su lote que vence antes, con su plazo, y la leyenda a la vista.
   */
  it('cada medicamento lleva el color de su lote que vence antes, con su plazo', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();

    const amoxicilina = (await screen.findByText('Amoxicilina 500 mg')).closest('tr')!;
    expect(within(amoxicilina).getByRole('img', { name: 'Semaforo rojo' })).toBeInTheDocument();
    expect(within(amoxicilina).getByText('Rojo')).toBeInTheDocument();
    expect(within(amoxicilina).getByText('Vence en 18 dias')).toBeInTheDocument();

    const suero = screen.getByText('Suero oral').closest('tr')!;
    expect(within(suero).getByRole('img', { name: 'Semaforo verde' })).toBeInTheDocument();
    expect(within(suero).getByText('Vence en 16 meses')).toBeInTheDocument();
  });

  it('la leyenda del semaforo esta a la vista, no escondida en un tooltip', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();
    await screen.findByText('Amoxicilina 500 mg');

    const leyenda = screen.getByLabelText('Leyenda del semaforo de vencimiento');
    expect(within(leyenda).getByText(/vence en menos de 6 meses/)).toBeInTheDocument();
    expect(within(leyenda).getByText(/vence entre 6 y 12 meses/)).toBeInTheDocument();
    expect(within(leyenda).getByText(/vence en más de 12 meses/)).toBeInTheDocument();
  });

  it('un medicamento sin existencia no lleva color: no hay nada en el estante que etiquetar', async () => {
    servidor({
      catalogo: [
        { ...SUERO, existencia: 0, semaforo: null, proximoVencimiento: null, diasParaVencer: null },
      ],
    });
    abrir(FARMACIA);
    await esperarPanel();

    const suero = (await screen.findByText('Suero oral')).closest('tr')!;
    expect(within(suero).queryByRole('img', { name: /Semaforo/ })).not.toBeInTheDocument();
  });

  it('marca lo que esta bajo su minimo, que es lo que hay que pedir', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();

    const fila = (await screen.findByText('Suero oral')).closest('tr');
    expect(within(fila as HTMLElement).getByText('Bajo minimo')).toBeInTheDocument();
  });

  it('un minimo en cero se muestra como sin alerta, no como cero', async () => {
    servidor({ catalogo: [{ ...AMOXICILINA, stockMinimo: 0, bajoMinimo: false }] });
    abrir(FARMACIA);
    await esperarPanel();

    const fila = (await screen.findByText('Amoxicilina 500 mg')).closest('tr');
    expect(within(fila as HTMLElement).queryByText('Bajo minimo')).not.toBeInTheDocument();
  });

  /**
   * Al reves que la busqueda del expediente. Ahi el numero esta cifrado y hay
   * que escribirlo entero; aqui el nombre viaja en claro y el servidor lo
   * resuelve por indice, asi que cada tecla es una consulta barata.
   */
  it('busca mientras se escribe, desde dos letras', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();
    await screen.findByText('Suero oral');

    await usuario.type(screen.getByLabelText(/Buscar medicamento/), 'Amox');

    await waitFor(() => {
      expect(screen.queryByText('Suero oral')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Amoxicilina 500 mg')).toBeInTheDocument();
  });

  it('una sola letra no llega a consultar: el servidor exige dos', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();
    await screen.findByText('Suero oral');

    await usuario.type(screen.getByLabelText(/Buscar medicamento/), 'A');

    await waitFor(() => {
      const conBusqueda = peticiones.filter((p) => new URL(p.url, 'http://l').searchParams.has('buscar'));
      expect(conBusqueda).toHaveLength(0);
    });
  });

  it('lo dice cuando la busqueda no encuentra nada, en vez de dejar la tabla vacia', async () => {
    servidor({ catalogo: [] });
    abrir(FARMACIA);
    await esperarPanel();

    expect(await screen.findByText(/El catalogo esta vacio/)).toBeInTheDocument();
  });

  it('el codigo es el enlace al medicamento: es donde la mano lo busca', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();

    const enlace = await screen.findByRole('link', { name: 'AMOX500' });
    expect(enlace).toHaveAttribute('href', '/farmacia/m-1');
  });
});

// ═════════════════════════ quien hace que ═════════════════════════

describe('quien hace que', () => {
  it('farmacia da de alta medicamentos', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();

    expect(await screen.findByRole('button', { name: /Nuevo medicamento/ })).toBeInTheDocument();
  });

  it('el medico consulta existencias pero no toca el catalogo', async () => {
    servidor();
    abrir(MEDICO);
    await esperarPanel();
    await screen.findByText('Amoxicilina 500 mg');

    expect(screen.queryByRole('button', { name: /Nuevo medicamento/ })).not.toBeInTheDocument();
  });

  /**
   * El medico necesita saber que hay para no recetar lo que no hay. El
   * vencimiento del estante no es asunto suyo, y el controlador guarda esos
   * endpoints para Farmacia, Administrador y Director. Ofrecerle la pestana
   * terminaria en un 403 que parece una falla del sistema.
   */
  it('el medico NO ve las alertas de vencimiento: no son suyas', async () => {
    servidor();
    abrir(MEDICO);
    await esperarPanel();

    expect(screen.queryByRole('tab', { name: /Rojo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Amarillo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Verde/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Vencidos/ })).not.toBeInTheDocument();
  });

  it('y tampoco las pide: no es que las pida y esconda la respuesta', async () => {
    servidor();
    abrir(MEDICO);
    await esperarPanel();
    await screen.findByText('Amoxicilina 500 mg');

    const alertas = peticiones.filter((p) => p.url.includes('/lotes/'));
    expect(alertas).toHaveLength(0);
  });

  it('el director mira las alertas pero no da de baja nada', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(DIRECTOR);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Vencidos/ }));
    await screen.findByText('Ibuprofeno');
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
  });

  it('recepcion no entra a farmacia', async () => {
    servidor();
    abrir(RECEPCION);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Farmacia' })).not.toBeInTheDocument();
    });
  });
});

// ═══════════════════════════ las alertas ═══════════════════════════

describe('alertas', () => {
  /**
   * El numero va en la pestana a proposito: una alerta que obliga a entrar
   * para descubrir que no hay nada deja de avisar.
   */
  it('la pestana lleva cuantos son, sin tener que entrar', async () => {
    servidor({ vencidos: [LOTE_VENCIDO, { ...LOTE_VENCIDO, id: 'l-9' }] });
    abrir(FARMACIA);
    await esperarPanel();

    const pestana = await screen.findByRole('tab', { name: /Vencidos/ });
    expect(within(pestana).getByText('2')).toBeInTheDocument();
  });

  /**
   * Las tres pestanas de color son el semaforo del estante tal cual, con el
   * nombre con el que el personal ya llama a esas cajas. Los cuatro numeros
   * llegan en UNA consulta, no pidiendo cada lista para leer su total.
   */
  it('las pestanas Rojo, Amarillo y Verde llevan su cuenta, y sale de una sola consulta', async () => {
    servidor({ verde: [{ ...LOTE_AMARILLO, id: 'l-6', semaforo: 'VERDE' }] });
    abrir(FARMACIA);
    await esperarPanel();

    expect(within(await screen.findByRole('tab', { name: /Rojo/ })).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: /Amarillo/ })).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByRole('tab', { name: /Verde/ })).getByText('1')).toBeInTheDocument();

    const deLotes = peticiones.filter((p) => p.url.includes('/lotes/'));
    expect(deLotes).toHaveLength(1);
    expect(deLotes[0].url).toMatch(/\/lotes\/semaforo\/resumen$/);
  });

  it('el orden de las pestanas es el del semaforo: Rojo, Amarillo, Verde, y luego Vencidos', async () => {
    servidor();
    abrir(FARMACIA);
    await esperarPanel();
    await screen.findByRole('tab', { name: /Rojo/ });

    const nombres = screen.getAllByRole('tab').map((t) => t.textContent?.replace(/\d+$/, ''));
    expect(nombres).toEqual(['Catalogo', 'Rojo', 'Amarillo', 'Verde', 'Vencidos', 'Bajo minimo', 'Entregas']);
  });

  it('los lotes en rojo salen del que vence antes, con los dias que faltan', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Rojo/ }));

    expect(await screen.findByText('L-4471')).toBeInTheDocument();
    expect(screen.getByText('En 18 dias')).toBeInTheDocument();
    expect(screen.getByText('15/10/2026')).toBeInTheDocument();
    // Y la misma etiqueta de color que lleva la caja en el estante.
    expect(screen.getByRole('img', { name: 'Semaforo rojo' })).toBeInTheDocument();
  });

  it('la pestana Amarillo lista los suyos, con su plazo en meses', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Amarillo/ }));

    expect(await screen.findByText('LTGT1501')).toBeInTheDocument();
    expect(screen.getByText('Sulfato ferroso')).toBeInTheDocument();
    expect(screen.getByText('En 9 meses')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Semaforo amarillo' })).toBeInTheDocument();
    expect(screen.getByText(/1 lote en amarillo/)).toBeInTheDocument();
  });

  it('sin lotes en rojo lo dice como buena noticia', async () => {
    servidor({ rojo: [] });
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Rojo/ }));
    expect(await screen.findByText(/Ningun lote vence en los proximos seis meses/)).toBeInTheDocument();
  });

  it('sin lotes en verde lo dice sin alarma: no es una alerta', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Verde/ }));
    expect(await screen.findByText(/Ningun lote vence a mas de doce meses/)).toBeInTheDocument();
  });

  it('los vencidos avisan que ya no se pueden entregar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Vencidos/ }));

    expect(await screen.findByText(/ya no se pueden entregar/)).toBeInTheDocument();
    expect(screen.getByText('Hace 28 dias')).toBeInTheDocument();
  });

  it('bajo minimo dice cuanto falta, que es el numero que se anota en el pedido', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Bajo minimo/ }));

    const fila = (await screen.findByText('Suero oral')).closest('tr') as HTMLElement;
    // 100 de minimo menos 12 de existencia.
    expect(within(fila).getByText('88 sobres')).toBeInTheDocument();
  });
});

// ═══════════════════════ el detalle y sus lotes ═══════════════════════

describe('un medicamento y sus lotes', () => {
  /**
   * "320 tabletas" puede ser un lote que vence en dos anios o tres que vencen
   * el mes que viene, y lo que se hace con cada caso es distinto. Por eso los
   * lotes van a la vista y no tras un desplegable.
   */
  it('los lotes se ven de corrido, cada uno con su semaforo y su plazo', async () => {
    servidor();
    abrir(FARMACIA, '/farmacia/m-1');

    const pronto = (await screen.findByText('L-4471')).closest('tr')!;
    expect(within(pronto).getByRole('img', { name: 'Semaforo rojo' })).toBeInTheDocument();
    expect(within(pronto).getByText('Vence en 18 dias')).toBeInTheDocument();

    const lejos = screen.getByText('L-9902').closest('tr')!;
    expect(within(lejos).getByRole('img', { name: 'Semaforo verde' })).toBeInTheDocument();
    expect(within(lejos).getByText('Vence en 18 meses')).toBeInTheDocument();
  });

  /**
   * En rojo todavia se entrega; vencido ya no. Esa es la diferencia que
   * importa con el paciente enfrente, y por eso "Vencido" va aparte del
   * semaforo y no se pierde dentro del rojo.
   */
  it('un lote vencido lo dice aparte del rojo: rojo se entrega, vencido no', async () => {
    servidor({
      detalle: {
        ...DETALLE,
        lotes: [{ ...DETALLE.lotes[0], vencimiento: 'VENCIDO', diasParaVencer: -12, semaforo: 'ROJO' }],
      },
    });
    abrir(FARMACIA, '/farmacia/m-1');

    const fila = (await screen.findByText('L-4471')).closest('tr')!;
    expect(within(fila).getByText('Vencido')).toBeInTheDocument();
    expect(within(fila).getByText('Vencio hace 12 dias')).toBeInTheDocument();
    expect(within(fila).getByRole('img', { name: 'Semaforo rojo' })).toBeInTheDocument();
  });

  it('el encabezado lleva el color del lote que vence antes', async () => {
    servidor();
    abrir(FARMACIA, '/farmacia/m-1');

    await screen.findByText('L-4471');
    // Uno en el encabezado y uno en la fila del lote L-4471.
    expect(screen.getAllByRole('img', { name: 'Semaforo rojo' })).toHaveLength(2);
  });

  it('un medicamento sin lotes lo dice: no hay existencia que entregar', async () => {
    servidor({ detalle: { ...DETALLE, existencia: 0, lotes: [] } });
    abrir(FARMACIA, '/farmacia/m-1');

    expect(await screen.findByText(/no tiene lotes registrados/)).toBeInTheDocument();
  });

  it('un medicamento que no existe lo dice en vez de fallar', async () => {
    servidor({ detalle: null });
    abrir(FARMACIA, '/farmacia/m-404');

    expect(await screen.findByText(/no existe en el catalogo/)).toBeInTheDocument();
  });

  it('un medicamento desactivado no admite lotes nuevos', async () => {
    servidor({ detalle: { ...DETALLE, activo: false } });
    abrir(FARMACIA, '/farmacia/m-1');

    expect(await screen.findByRole('button', { name: /Ingresar lote/ })).toBeDisabled();
  });

  it('ingresar un lote manda la fecha tal cual, sin convertirla a Date', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia/m-1');

    await usuario.click(await screen.findByRole('button', { name: /Ingresar lote/ }));
    await usuario.type(screen.getByLabelText(/Numero de lote/), 'L-2026-0871');
    await usuario.type(screen.getByLabelText(/Cantidad/), '500');
    const fecha = screen.getByLabelText(/Fecha de vencimiento/);
    await usuario.clear(fecha);
    await usuario.type(fecha, '2027-08-31');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual(
        expect.objectContaining({ numeroLote: 'L-2026-0871', fechaVencimiento: '2027-08-31', cantidad: 500 }),
      );
    });
  });

  /**
   * El codigo, el nombre y la unidad identifican al medicamento, y los lotes
   * ya ingresados se contaron en esa unidad. El servidor tampoco los acepta.
   */
  it('la edicion no ofrece cambiar el codigo, el nombre ni la unidad', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia/m-1');

    await usuario.click(await screen.findByRole('button', { name: /Editar/ }));

    expect(screen.getByLabelText(/Existencia minima/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Codigo/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nombre generico/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Unidad/)).not.toBeInTheDocument();
  });

  it('editar manda solo los tres campos que el servidor acepta', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA, '/farmacia/m-1');

    await usuario.click(await screen.findByRole('button', { name: /Editar/ }));
    const minimo = screen.getByLabelText(/Existencia minima/);
    await usuario.clear(minimo);
    await usuario.type(minimo, '400');
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual({ stockMinimo: 400, activo: true, requiereReceta: true });
    });
  });

  it('el medico ve los lotes pero no ingresa ni da de baja', async () => {
    servidor();
    abrir(MEDICO, '/farmacia/m-1');

    await screen.findByText('L-4471');
    expect(screen.queryByRole('button', { name: /Ingresar lote/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
  });
});

// ═══════════════════ ajuste por conteo fisico ═══════════════════

describe('ajuste por conteo fisico', () => {
  /** Abre el dialogo de conteo del primer lote del medicamento. */
  async function abrirConteo(usuario: ReturnType<typeof userEvent.setup>) {
    abrir(FARMACIA, '/farmacia/m-1');
    await screen.findByText('L-4471');
    const fila = screen.getByText('L-4471').closest('tr') as HTMLElement;
    await usuario.click(within(fila).getByRole('button', { name: 'Contar' }));
    return screen.getByRole('dialog');
  }

  it('el desvio se dice en palabras: un numero con signo hay que interpretarlo', () => {
    expect(desvioEnPalabras(95, 100, 'TABLETA')).toBe('Faltan 5 tabletas');
    expect(desvioEnPalabras(112, 100, 'TABLETA')).toBe('Sobran 12 tabletas');
    expect(desvioEnPalabras(50, 50, 'SOBRE')).toBe('Coincide con el sistema');
  });

  it('dice lo que el sistema tiene antes de empezar a contar', async () => {
    servidor();
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    expect(within(dialogo).getByText(/El sistema dice/)).toHaveTextContent('120 tabletas');
  });

  /**
   * Se escribe lo CONTADO, no la diferencia. Quien recorre el estante cuenta
   * unidades; pedirle la diferencia lo obliga a restar de cabeza y a acertar
   * el signo.
   */
  it('avisa cuanto falta mientras se escribe el conteo', async () => {
    servidor();
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    await usuario.type(within(dialogo).getByLabelText(/Cantidad contada/), '113');

    expect(within(dialogo).getByText('Faltan 7 tabletas')).toBeInTheDocument();
  });

  it('y cuanto sobra cuando aparece medicamento de mas', async () => {
    servidor();
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    await usuario.type(within(dialogo).getByLabelText(/Cantidad contada/), '125');

    expect(within(dialogo).getByText('Sobran 5 tabletas')).toBeInTheDocument();
  });

  it('un conteo que cuadra no deja ajustar: seria un movimiento vacio', async () => {
    servidor();
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    await usuario.type(within(dialogo).getByLabelText(/Cantidad contada/), '120');
    await usuario.type(within(dialogo).getByLabelText(/Motivo del ajuste/), 'Conteo mensual.');

    expect(within(dialogo).getByText(/cuadra con el sistema/)).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Ajustar existencia' })).toBeDisabled();
  });

  it('exige el motivo: un descuadre sin explicar no sirve de nada', async () => {
    servidor();
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    await usuario.type(within(dialogo).getByLabelText(/Cantidad contada/), '95');
    const enviar = within(dialogo).getByRole('button', { name: 'Ajustar existencia' });
    expect(enviar).toBeDisabled();

    await usuario.type(within(dialogo).getByLabelText(/Motivo del ajuste/), 'Cajas mal ubicadas.');
    expect(enviar).toBeEnabled();
  });

  /**
   * El servidor necesita la existencia que se mostraba al empezar para poder
   * detectar que alguien entrego mientras se contaba.
   */
  it('manda lo contado y la existencia que mostraba el sistema', async () => {
    servidor();
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    await usuario.type(within(dialogo).getByLabelText(/Cantidad contada/), '95');
    await usuario.type(
      within(dialogo).getByLabelText(/Motivo del ajuste/),
      'Conteo fisico del 28/08/2026.',
    );
    await usuario.click(within(dialogo).getByRole('button', { name: 'Ajustar existencia' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual({
        cantidadContada: 95,
        cantidadEnSistema: 120,
        motivo: 'Conteo fisico del 28/08/2026.',
      });
    });
  });

  it('si alguien entrego mientras se contaba, lo explica y no reintenta solo', async () => {
    servidor({ ajusteChoca: true });
    const usuario = userEvent.setup();
    const dialogo = await abrirConteo(usuario);

    await usuario.type(within(dialogo).getByLabelText(/Cantidad contada/), '95');
    await usuario.type(within(dialogo).getByLabelText(/Motivo del ajuste/), 'Conteo fisico.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Ajustar existencia' }));

    expect(await screen.findByText(/cambio mientras contaba/)).toBeInTheDocument();
    // Un solo intento: reintentar solo volveria a mandar un conteo ya viejo.
    const ajustes = peticiones.filter((p) => p.url.includes('/ajuste'));
    expect(ajustes).toHaveLength(1);
  });

  /**
   * Si aparece una caja que se creia gastada hay que poder devolverla al
   * inventario, asi que el conteo tambien se ofrece en un lote agotado.
   */
  it('un lote agotado tambien se puede contar', async () => {
    servidor({
      detalle: {
        ...DETALLE,
        lotes: [{ ...DETALLE.lotes[0], cantidadDisponible: 0, estado: 'AGOTADO' }],
      },
    });
    abrir(FARMACIA, '/farmacia/m-1');

    await screen.findByText('L-4471');
    const fila = screen.getByText('L-4471').closest('tr') as HTMLElement;
    expect(within(fila).getByRole('button', { name: 'Contar' })).toBeInTheDocument();
    // Pero no se da de baja lo que ya no tiene existencia.
    expect(within(fila).queryByRole('button', { name: 'Dar de baja' })).not.toBeInTheDocument();
  });

  it('un lote dado de baja ya no es inventario: no se cuenta', async () => {
    servidor({
      detalle: {
        ...DETALLE,
        lotes: [{ ...DETALLE.lotes[0], cantidadDisponible: 0, estado: 'DADO_DE_BAJA' }],
      },
    });
    abrir(FARMACIA, '/farmacia/m-1');

    await screen.findByText('L-4471');
    const fila = screen.getByText('L-4471').closest('tr') as HTMLElement;
    expect(within(fila).queryByRole('button', { name: 'Contar' })).not.toBeInTheDocument();
  });

  it('el medico no ajusta inventario', async () => {
    servidor();
    abrir(MEDICO, '/farmacia/m-1');

    await screen.findByText('L-4471');
    expect(screen.queryByRole('button', { name: 'Contar' })).not.toBeInTheDocument();
  });
});

// ═════════════════════════ dar de baja ═════════════════════════

describe('dar de baja un lote', () => {
  it('exige un motivo antes de dejar enviar', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Vencidos/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Dar de baja' }));

    const enviar = screen.getByRole('button', { name: 'Dar de baja' });
    expect(enviar).toBeDisabled();

    await usuario.type(screen.getByLabelText(/Motivo de la baja/), 'Vencido y destruido');
    expect(enviar).toBeEnabled();
  });

  it('avisa cuanto se descuenta antes de hacerlo', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Vencidos/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Dar de baja' }));

    // Acotado al dialogo: "45 tabletas" tambien esta en la fila de la tabla
    // que quedo detras, y sin acotar el selector encuentra las dos.
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/Se descuentan/)).toHaveTextContent('45 tabletas');
  });

  /**
   * El servidor limita el motivo a 200 caracteres, que es lo que cabe en la
   * columna. Antes lo recortaba en silencio: la baja quedaba justificada a
   * media frase, y el motivo es lo unico que explica despues por que faltan
   * esas cajas.
   */
  it('el motivo no se puede pasar del limite de la columna', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Vencidos/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Dar de baja' }));

    const campo = screen.getByLabelText(/Motivo de la baja/);
    expect(campo).toHaveAttribute('maxlength', '200');
  });

  it('manda el motivo completo, sin recortarlo', async () => {
    servidor();
    const usuario = userEvent.setup();
    abrir(FARMACIA);
    await esperarPanel();

    await usuario.click(await screen.findByRole('tab', { name: /Vencidos/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Dar de baja' }));

    const motivo = 'Vencido el 31 de julio, retirado del estante y destruido segun acta 14-2026.';
    await usuario.type(screen.getByLabelText(/Motivo de la baja/), motivo);
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }));

    await waitFor(() => {
      expect(cuerpos).toContainEqual({ motivo });
    });
  });
});
