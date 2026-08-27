import { interpretarBusqueda, motivoSinBuscar } from './busqueda';

describe('interpretarBusqueda', () => {
  it('un DPI completo se busca por DPI', () => {
    expect(interpretarBusqueda('1234567890101')).toEqual({ tipo: 'dpi', dpi: '1234567890101' });
  });

  it('acepta el DPI con espacios y guiones, como viene en los documentos', () => {
    expect(interpretarBusqueda('1234 56789 0101')).toEqual({ tipo: 'dpi', dpi: '1234567890101' });
    expect(interpretarBusqueda('1234-56789-0101')).toEqual({ tipo: 'dpi', dpi: '1234567890101' });
  });

  it('un apellido se busca por nombre', () => {
    expect(interpretarBusqueda('Perez')).toEqual({ tipo: 'nombre', nombre: 'Perez' });
  });

  it('recorta los espacios de los lados', () => {
    expect(interpretarBusqueda('  Caal  ')).toEqual({ tipo: 'nombre', nombre: 'Caal' });
  });

  it('la caja vacia no dispara ninguna consulta', () => {
    expect(interpretarBusqueda('').tipo).toBe('vacio');
    expect(interpretarBusqueda('   ').tipo).toBe('vacio');
  });

  it('una sola letra no busca: devolveria media tabla', () => {
    expect(interpretarBusqueda('P').tipo).toBe('corto');
  });

  it('un DPI a medias tampoco busca', () => {
    // Menos de 8 digitos casi siempre es que la persona sigue escribiendo.
    expect(interpretarBusqueda('123').tipo).toBe('corto');
    expect(interpretarBusqueda('1234567').tipo).toBe('corto');
    expect(interpretarBusqueda('12345678').tipo).toBe('dpi');
  });

  it('un texto con letras es un nombre aunque empiece con numero', () => {
    // Solo se toma por DPI lo que son digitos, espacios o guiones y nada mas.
    expect(interpretarBusqueda('3ra Perez')).toEqual({ tipo: 'nombre', nombre: '3ra Perez' });
  });

  it('un DPI con letras mezcladas no se toma por DPI', () => {
    expect(interpretarBusqueda('12345678A').tipo).toBe('nombre');
  });

  it('explica por que no busco cuando el criterio es demasiado corto', () => {
    expect(motivoSinBuscar(interpretarBusqueda('P'))).toMatch(/al menos 2 letras/i);
    expect(motivoSinBuscar(interpretarBusqueda(''))).toBeNull();
    expect(motivoSinBuscar(interpretarBusqueda('Perez'))).toBeNull();
  });
});
