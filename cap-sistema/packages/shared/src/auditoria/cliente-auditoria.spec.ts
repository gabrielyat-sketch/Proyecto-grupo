import { ClienteAuditoria, EntradaAuditoria, FalloDeAuditoria } from './cliente-auditoria';

const cliente = new ClienteAuditoria({ url: 'http://localhost:3007', timeoutMs: 50 });

const entrada = (parcial: Partial<EntradaAuditoria> = {}): EntradaAuditoria => ({
  servicio: 'usuarios',
  accion: 'MODIFICACION',
  entidad: 'expediente',
  entidadId: 'exp-001',
  motivo: 'Correccion de diagnostico',
  ...parcial,
});

/** Silencia el Logger de Nest: los fallos se registran a proposito. */
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

function respondeCon(estado: number): jest.Mock {
  const espia = jest.fn().mockResolvedValue({ ok: estado < 400, status: estado });
  global.fetch = espia as unknown as typeof fetch;
  return espia;
}

describe('ClienteAuditoria', () => {
  it('propaga el token del usuario, no una credencial del servicio', async () => {
    // El registro tiene que quedar a nombre de quien de verdad hizo el cambio.
    const espia = respondeCon(201);
    await cliente.registrar(entrada(), 'Bearer token-del-medico', 'traza-9');

    const [, opciones] = espia.mock.calls[0];
    expect(opciones.headers.Authorization).toBe('Bearer token-del-medico');
    expect(opciones.headers['x-traza-id']).toBe('traza-9');
  });

  it('no envia el usuario en el cuerpo', async () => {
    // Si el llamador pudiera decir en nombre de quien registra, la bitacora no
    // probaria nada. El servicio lo toma del token.
    const espia = respondeCon(201);
    await cliente.registrar(entrada(), 'Bearer t');

    const cuerpo = JSON.parse(espia.mock.calls[0][1].body);
    expect(cuerpo).not.toHaveProperty('usuarioId');
  });

  it('una modificacion que no se pudo registrar hace fallar la operacion', async () => {
    respondeCon(503);
    await expect(cliente.registrar(entrada(), 'Bearer t')).rejects.toBeInstanceOf(FalloDeAuditoria);
  });

  it('lo mismo con una impresion: sale del sistema en papel', async () => {
    respondeCon(503);
    await expect(
      cliente.registrar(entrada({ accion: 'IMPRESION' }), 'Bearer t'),
    ).rejects.toBeInstanceOf(FalloDeAuditoria);
  });

  it('una consulta NO bloquea la atencion aunque no se pueda registrar', async () => {
    // Aplicar fail-closed aqui dejaria al CAP sin poder abrir el expediente
    // del paciente que tiene enfrente porque un servicio secundario esta caido.
    respondeCon(503);
    await expect(cliente.registrar(entrada({ accion: 'CONSULTA' }), 'Bearer t')).resolves.toBeUndefined();
  });

  it('un servicio caido se trata igual que uno que responde error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    await expect(cliente.registrar(entrada(), 'Bearer t')).rejects.toBeInstanceOf(FalloDeAuditoria);
  });

  it('el mensaje del fallo le dice al personal que reintente, no que se equivoco', async () => {
    respondeCon(500);
    await expect(cliente.registrar(entrada(), 'Bearer t')).rejects.toThrow(/[Vv]uelva a intentarlo/);
  });

  it('si no se indica cuando ocurrio, usa el momento de la llamada', async () => {
    const espia = respondeCon(201);
    await cliente.registrar(entrada(), 'Bearer t');
    expect(JSON.parse(espia.mock.calls[0][1].body).ocurridoEn).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it('no duplica la barra si la url base trae una al final', async () => {
    const espia = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = espia as unknown as typeof fetch;
    await new ClienteAuditoria({ url: 'http://localhost:3007/' }).registrar(entrada(), 'Bearer t');
    expect(espia.mock.calls[0][0]).toBe('http://localhost:3007/v1/registros');
  });
});
