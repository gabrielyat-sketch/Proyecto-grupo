import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { almacenSesion, type Perfil } from '../../api';

const RECEPCION: Perfil = {
  id: 'u-1',
  usuario: 'mrodriguez',
  rol: 'RECEPCION',
  debeCambiarContrasena: false,
};

const COMUNIDADES = [
  { id: 'c-1', nombre: 'Purulha Centro', codigo: null, distante: false, activa: true },
  { id: 'c-2', nombre: 'Matanzas', codigo: null, distante: true, activa: true },
];

const PACIENTE = {
  id: 'p-1',
  nombres: 'Juana Isabel',
  apellidos: 'Perez Caal',
  fechaNacimiento: '1985-04-12T00:00:00.000Z',
  edad: 41,
  sexo: 'F',
  idioma: 'QEQCHI',
  fallecido: false,
  comunidad: { id: 'c-1', nombre: 'Purulha Centro' },
  expediente: { id: 'e-1', numero: 'EXP-2026-000123' },
};

const pagina = (datos: unknown[]) => ({
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

/** Responde comunidades y pacientes; `pacientes` decide que devuelve la busqueda. */
function servidorCon(
  pacientes: unknown[] = [PACIENTE],
  alCrear?: () => Response,
  carpetas: unknown[] = [],
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (p: Request) => {
      peticiones.push(p);
      const ruta = new URL(p.url, 'http://local').pathname;
      if (ruta.endsWith('/v1/comunidades')) return json(COMUNIDADES);
      if (ruta.endsWith('/v1/pacientes') && p.method === 'POST') {
        return alCrear
          ? alCrear()
          : json({ id: 'p-9', numeroExpediente: 'EXP-2026-000999', expedienteId: 'e-9' }, 201);
      }
      if (ruta.endsWith('/v1/pacientes')) return json(pagina(pacientes));
      // Las carpetas familiares del archivero.
      if (ruta.endsWith('/v1/grupos-familiares/siguiente-numero')) {
        return json({ serieId: 'c-1', numero: 8 });
      }
      if (ruta.endsWith('/v1/grupos-familiares')) return json(pagina(carpetas));
      return json({}, 404);
    }),
  );
}

const consultasDeBusqueda = () =>
  peticiones.filter((p) => p.method === 'GET' && p.url.includes('/v1/pacientes'));

const ultimaBusqueda = () => new URL(consultasDeBusqueda().at(-1)!.url);

beforeEach(() => {
  peticiones = [];
  almacenSesion.limpiar();
  almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: RECEPCION });
  window.history.pushState({}, '', '/recepcion');
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('min-width'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('busqueda de recepcion', () => {
  it('el foco entra solo a la caja: se escribe sin tocar el raton', async () => {
    servidorCon();
    render(<App />);

    await waitFor(() => expect(screen.getByLabelText(/DPI, apellido o nombre/i)).toHaveFocus());
  });

  it('no consulta al servidor mientras el criterio es demasiado corto', async () => {
    servidorCon();
    render(<App />);

    const caja = await screen.findByLabelText(/DPI, apellido o nombre/i);
    await userEvent.type(caja, 'P');

    expect(await screen.findByText(/al menos 2 letras/i)).toBeInTheDocument();
    expect(consultasDeBusqueda()).toHaveLength(0);
  });

  it('un apellido se manda como nombre', async () => {
    servidorCon();
    render(<App />);

    await userEvent.type(await screen.findByLabelText(/DPI, apellido o nombre/i), 'Perez');

    await waitFor(() => expect(consultasDeBusqueda().length).toBeGreaterThan(0));
    expect(ultimaBusqueda().searchParams.get('nombre')).toBe('Perez');
    expect(ultimaBusqueda().searchParams.get('dpi')).toBeNull();
  });

  it('un DPI con guiones se manda limpio, solo digitos', async () => {
    servidorCon();
    render(<App />);

    await userEvent.type(
      await screen.findByLabelText(/DPI, apellido o nombre/i),
      '1234-56789-0101',
    );

    await waitFor(() => expect(consultasDeBusqueda().length).toBeGreaterThan(0));
    expect(ultimaBusqueda().searchParams.get('dpi')).toBe('1234567890101');
    expect(ultimaBusqueda().searchParams.get('nombre')).toBeNull();
  });

  it('muestra los resultados sin exponer el DPI en pantalla', async () => {
    // El listado se ve a la vista de la fila de espera. El identificador solo
    // aparece al abrir la ficha de una persona concreta.
    servidorCon();
    render(<App />);

    await userEvent.type(await screen.findByLabelText(/DPI, apellido o nombre/i), 'Perez');

    expect(await screen.findByText('Perez Caal, Juana Isabel')).toBeInTheDocument();
    expect(screen.getByText('EXP-2026-000123')).toBeInTheDocument();
    expect(screen.queryByText('1234567890101')).not.toBeInTheDocument();
  });

  it('sin resultados ofrece registrar al paciente', async () => {
    servidorCon([]);
    render(<App />);

    await userEvent.type(await screen.findByLabelText(/DPI, apellido o nombre/i), 'Xyz');

    const aviso = await screen.findByRole('alert');
    expect(within(aviso).getByText(/No se encontro ningun paciente/i)).toBeInTheDocument();
    // Acotado al aviso: la cabecera tambien tiene un enlace para registrar.
    expect(within(aviso).getByRole('link', { name: /Registrar/i })).toBeInTheDocument();
  });

  it('Ctrl+K devuelve el foco a la caja de busqueda', async () => {
    servidorCon();
    render(<App />);

    const caja = await screen.findByLabelText(/DPI, apellido o nombre/i);
    await userEvent.click(screen.getByLabelText(/Comunidad/i));
    await userEvent.keyboard('{Escape}');
    caja.blur();

    await userEvent.keyboard('{Control>}k{/Control}');

    await waitFor(() => expect(caja).toHaveFocus());
  });
});

describe('alta de paciente', () => {
  async function abrirFormulario() {
    window.history.pushState({}, '', '/recepcion/nuevo');
    render(<App />);
    return screen.findByLabelText(/Nombres/i);
  }

  it('exige nombres, apellidos, fecha y comunidad antes de llamar al servidor', async () => {
    servidorCon();
    await abrirFormulario();

    await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

    expect(await screen.findByText(/Escriba los nombres/i)).toBeInTheDocument();
    expect(screen.getByText(/Escriba los apellidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Indique la fecha de nacimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/Elija la comunidad/i)).toBeInTheDocument();
    expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(0);
  });

  it('rechaza un DPI que no tenga 13 digitos, sin ir al servidor', async () => {
    servidorCon();
    await abrirFormulario();

    await userEvent.type(screen.getByLabelText(/^DPI/i), '12345');
    await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

    expect(await screen.findByText(/exactamente 13 digitos/i)).toBeInTheDocument();
    expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(0);
  });

  it('deja registrar SIN DPI: los ninos y parte de la poblacion no lo tienen', async () => {
    servidorCon();
    await abrirFormulario();

    await userEvent.type(screen.getByLabelText(/Nombres/i), 'Carlos');
    await userEvent.type(screen.getByLabelText(/Apellidos/i), 'Chub');
    await userEvent.type(screen.getByLabelText(/Fecha de nacimiento/i), '2020-03-15');
    await userEvent.click(screen.getByLabelText(/Comunidad/i));
    await userEvent.click(await screen.findByRole('option', { name: 'Matanzas' }));
    await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

    await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1));
    expect(await screen.findByText(/EXP-2026-000999/)).toBeInTheDocument();
  });

  /**
   * La carpeta familiar.
   *
   * El CAP archiva por familia: un folder con un numero en la pestana,
   * rotulado con el apellido y guardado por el lugar donde vive.
   */
  describe('carpeta familiar', () => {
    async function datosMinimos() {
      await userEvent.type(screen.getByLabelText(/Nombres/i), 'Carlos');
      await userEvent.type(screen.getByLabelText(/Apellidos/i), 'Chub');
      await userEvent.type(screen.getByLabelText(/Fecha de nacimiento/i), '2020-03-15');
      await userEvent.click(screen.getByLabelText(/Comunidad/i));
      await userEvent.click(await screen.findByRole('option', { name: 'Matanzas' }));
    }

    const cuerpoDelAlta = async () =>
      JSON.parse(await peticiones.find((p) => p.method === 'POST')!.text());

    it('abrir una carpeta nueva la manda EN EL ALTA, no en otra llamada', async () => {
      servidorCon();
      await abrirFormulario();
      await datosMinimos();

      await userEvent.click(screen.getByLabelText(/Existe la carpeta/i));
      await userEvent.click(await screen.findByRole('option', { name: /hay que abrirla/i }));
      await userEvent.type(await screen.findByLabelText(/^Familia/i), 'Lopez Ac');
      await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

      await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1));

      /*
        UNA sola peticion. Crear la carpeta aparte dejaria, si el alta falla,
        un folder vacio ocupando un numero del archivero.
      */
      expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1);
      expect(await cuerpoDelAlta()).toMatchObject({
        carpetaNueva: { apellidos: 'Lopez Ac' },
      });
    });

    it('ofrece el siguiente numero libre del lugar, sin ir al archivero', async () => {
      servidorCon();
      await abrirFormulario();
      await datosMinimos();

      await userEvent.click(screen.getByLabelText(/Existe la carpeta/i));
      await userEvent.click(await screen.findByRole('option', { name: /hay que abrirla/i }));

      expect(await screen.findByText(/Siguiente libre aqui: 8|Siguiente libre aquí: 8/)).toBeInTheDocument();
    });

    /**
     * Dos familias del mismo apellido pueden vivir en el mismo caserio sin ser
     * parientes. Elegir por el sistema mezclaria dos historias clinicas, y eso
     * no se nota hasta que alguien lee un antecedente que no es de quien tiene
     * delante.
     */
    it('con la carpeta ya existente, hay que elegir cual y va su id', async () => {
      const carpeta = (id: string, numero: number) => ({
        id,
        numero,
        apellidos: 'Lopez Ac',
        direccion: null,
        telefono: null,
        comunidad: { id: 'c-1', nombre: 'Matanzas' },
        lugar: null,
        integrantes: numero,
      });
      servidorCon([PACIENTE], undefined, [carpeta('g-1', 1), carpeta('g-2', 47)]);
      await abrirFormulario();
      await datosMinimos();

      await userEvent.click(screen.getByLabelText(/Existe la carpeta/i));
      await userEvent.click(await screen.findByRole('option', { name: /ya existe/i }));
      await userEvent.type(await screen.findByLabelText(/^Familia/i), 'Lopez');

      await userEvent.click(await screen.findByLabelText(/Cual carpeta|Cuál carpeta/i));
      await userEvent.click(await screen.findByRole('option', { name: /No. 47/ }));
      await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

      await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1));
      const cuerpo = await cuerpoDelAlta();
      expect(cuerpo.grupoFamiliarId).toBe('g-2');
      // Y NO viaja la otra forma: el servidor tomaria una y la otra quedaria
      // escrita sin efecto.
      expect(cuerpo.carpetaNueva).toBeUndefined();
    });

    it('sin responder, el paciente se registra sin carpeta', async () => {
      servidorCon();
      await abrirFormulario();
      await datosMinimos();
      await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

      await waitFor(() => expect(peticiones.filter((p) => p.method === 'POST')).toHaveLength(1));
      const cuerpo = await cuerpoDelAlta();
      expect(cuerpo.carpetaNueva).toBeUndefined();
      expect(cuerpo.grupoFamiliarId).toBeUndefined();
    });
  });

  it('tras registrar, el formulario queda limpio para el siguiente', async () => {
    servidorCon();
    await abrirFormulario();

    await userEvent.type(screen.getByLabelText(/Nombres/i), 'Carlos');
    await userEvent.type(screen.getByLabelText(/Apellidos/i), 'Chub');
    await userEvent.type(screen.getByLabelText(/Fecha de nacimiento/i), '2020-03-15');
    await userEvent.click(screen.getByLabelText(/Comunidad/i));
    await userEvent.click(await screen.findByRole('option', { name: 'Matanzas' }));
    await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

    await screen.findByText(/EXP-2026-000999/);
    expect(screen.getByLabelText(/Nombres/i)).toHaveValue('');
    expect(screen.getByLabelText(/Apellidos/i)).toHaveValue('');
  });

  it('muestra el mensaje del servidor cuando el DPI ya existe', async () => {
    servidorCon([PACIENTE], () =>
      json(
        {
          codigo: 'CONFLICTO',
          mensaje: 'Ya existe un paciente registrado con ese DPI.',
          detalles: ['pacienteId:p-1'],
          trazaId: 'abc',
          ruta: '/v1/pacientes',
          fecha: '2026-08-26T00:00:00.000Z',
        },
        409,
      ),
    );
    await abrirFormulario();

    await userEvent.type(screen.getByLabelText(/Nombres/i), 'Juana');
    await userEvent.type(screen.getByLabelText(/Apellidos/i), 'Perez');
    await userEvent.type(screen.getByLabelText(/Fecha de nacimiento/i), '1985-04-12');
    await userEvent.click(screen.getByLabelText(/Comunidad/i));
    await userEvent.click(await screen.findByRole('option', { name: 'Purulha Centro' }));
    await userEvent.click(screen.getByRole('button', { name: /Registrar paciente/i }));

    const aviso = await screen.findByRole('alert');
    expect(within(aviso).getByText(/Ya existe un paciente registrado con ese DPI/i)).toBeInTheDocument();
    // Es un error que la persona puede resolver: no lleva codigo de referencia.
    expect(within(aviso).queryByText(/reporte este codigo/i)).not.toBeInTheDocument();
  });
});

describe('quien puede dar de alta un paciente', () => {
  it('Enfermeria busca, pero NO se le ofrece registrar', async () => {
    // El servidor solo deja registrar a Recepcion y Administracion. Ofrecerle
    // el boton terminaba en un 403 al guardar, despues de llenar el formulario
    // entero: la persona cree que el sistema fallo, cuando esta haciendo lo
    // correcto.
    servidorCon();
    almacenSesion.limpiar();
    almacenSesion.guardar({
      tokenAcceso: 't',
      tokenRefresco: 'r',
      usuario: { ...RECEPCION, id: 'u-9', usuario: 'mcaal', rol: 'ENFERMERIA' },
    });
    window.history.pushState({}, '', '/recepcion');
    render(<App />);

    await screen.findByRole('heading', { name: 'Recepcion' });
    expect(screen.queryByRole('link', { name: /Registrar paciente/i })).not.toBeInTheDocument();
  });

  it('escribir la ruta del alta a mano tampoco entra', async () => {
    servidorCon();
    almacenSesion.limpiar();
    almacenSesion.guardar({
      tokenAcceso: 't',
      tokenRefresco: 'r',
      usuario: { ...RECEPCION, id: 'u-9', usuario: 'mcaal', rol: 'ENFERMERIA' },
    });
    window.history.pushState({}, '', '/recepcion/nuevo');
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('Recepcion si lo ve: es su trabajo', async () => {
    servidorCon();
    almacenSesion.limpiar();
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: RECEPCION });
    window.history.pushState({}, '', '/recepcion');
    render(<App />);

    expect(await screen.findByRole('link', { name: /Registrar paciente/i })).toBeInTheDocument();
  });
});

describe('marcar la llegada de un paciente', () => {
  it('Recepcion lo pasa a la sala de espera, con motivo opcional', async () => {
    servidorCon();
    almacenSesion.limpiar();
    almacenSesion.guardar({ tokenAcceso: 't', tokenRefresco: 'r', usuario: RECEPCION });
    window.history.pushState({}, '', '/recepcion');
    render(<App />);

    await userEvent.type(await screen.findByLabelText(/DPI, apellido o nombre/i), 'perez');
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar llegada' }));

    const diálogo = await screen.findByRole('dialog');
    await userEvent.type(within(diálogo).getByLabelText(/A que viene/), 'Control de embarazo');
    await userEvent.click(within(diálogo).getByRole('button', { name: 'Marcar llegada' }));

    await waitFor(() => {
      const llegada = peticiones.find((p) => p.method === 'POST' && p.url.includes('/v1/visitas'));
      expect(llegada).toBeDefined();
    });
  });

  it('Enfermeria no marca llegadas: no esta en la ventanilla', async () => {
    servidorCon();
    almacenSesion.limpiar();
    almacenSesion.guardar({
      tokenAcceso: 't',
      tokenRefresco: 'r',
      usuario: { ...RECEPCION, id: 'u-9', usuario: 'mcaal', rol: 'ENFERMERIA' },
    });
    window.history.pushState({}, '', '/recepcion');
    render(<App />);

    await userEvent.type(await screen.findByLabelText(/DPI, apellido o nombre/i), 'perez');
    await screen.findByText(/Perez Caal/);
    expect(screen.queryByRole('button', { name: 'Marcar llegada' })).not.toBeInTheDocument();
  });
});
