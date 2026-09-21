import { CABECERA_TRAZA, MiddlewareTraza } from './traza.middleware';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function pasar(cabecera?: string | string[]) {
  const peticion: any = { headers: cabecera === undefined ? {} : { [CABECERA_TRAZA]: cabecera } };
  const cabecerasRespuesta: Record<string, string> = {};
  const respuesta: any = {
    setHeader: (nombre: string, valor: string) => {
      cabecerasRespuesta[nombre] = valor;
    },
  };
  const siguiente = jest.fn();
  new MiddlewareTraza().use(peticion, respuesta, siguiente);
  return { trazaId: peticion.trazaId as string, devuelta: cabecerasRespuesta[CABECERA_TRAZA], siguiente };
}

describe('MiddlewareTraza', () => {
  it('sin cabecera genera un UUID y lo devuelve en la respuesta', () => {
    const { trazaId, devuelta, siguiente } = pasar();
    expect(trazaId).toMatch(UUID);
    expect(devuelta).toBe(trazaId);
    expect(siguiente).toHaveBeenCalledTimes(1);
  });

  it('respeta un identificador valido del cliente', () => {
    const { trazaId, devuelta } = pasar('abc-123');
    expect(trazaId).toBe('abc-123');
    expect(devuelta).toBe('abc-123');
  });

  it('con la cabecera repetida toma la primera', () => {
    expect(pasar(['primera', 'segunda']).trazaId).toBe('primera');
  });

  it('descarta una cabecera mas larga que la columna traza_id (64)', () => {
    const { trazaId } = pasar('a'.repeat(65));
    expect(trazaId).toMatch(UUID);
    expect(pasar('a'.repeat(64)).trazaId).toBe('a'.repeat(64));
  });

  it('descarta una cabecera con caracteres que no son de un id', () => {
    for (const mala of ['con espacio', 'con/barra', "x'; DROP TABLE", '', 'ñandú']) {
      expect(pasar(mala).trazaId).toMatch(UUID);
    }
  });
});
