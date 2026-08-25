import {
  normalizarPagina,
  crearPagina,
  TAMANO_PAGINA_MAXIMO,
  TAMANO_PAGINA_POR_DEFECTO,
} from './paginacion';

describe('normalizarPagina', () => {
  it('usa valores por defecto cuando no recibe nada', () => {
    expect(normalizarPagina()).toEqual({ pagina: 1, tamano: TAMANO_PAGINA_POR_DEFECTO, saltar: 0 });
  });

  it('recorta un tamano mayor al maximo permitido', () => {
    expect(normalizarPagina({ tamano: 5000 }).tamano).toBe(TAMANO_PAGINA_MAXIMO);
  });

  it('convierte cadenas, que es como llegan en el query string', () => {
    expect(normalizarPagina({ pagina: '3', tamano: '10' })).toEqual({
      pagina: 3,
      tamano: 10,
      saltar: 20,
    });
  });

  it('rechaza valores negativos o cero', () => {
    expect(normalizarPagina({ pagina: -5, tamano: 0 }).pagina).toBe(1);
    expect(normalizarPagina({ pagina: -5, tamano: 0 }).tamano).toBe(TAMANO_PAGINA_POR_DEFECTO);
  });

  it('ignora basura sin romperse', () => {
    expect(normalizarPagina({ pagina: 'abc', tamano: 'xyz' }).pagina).toBe(1);
  });

  it('calcula bien el desplazamiento', () => {
    expect(normalizarPagina({ pagina: 4, tamano: 25 }).saltar).toBe(75);
  });
});

describe('crearPagina', () => {
  it('calcula el total de paginas', () => {
    expect(crearPagina([], 101, { tamano: 25 }).totalPaginas).toBe(5);
  });

  it('devuelve al menos una pagina aunque no haya datos', () => {
    expect(crearPagina([], 0).totalPaginas).toBe(1);
  });
});
