import { normalizarTexto, palabrasDeBusqueda, textoDeBusqueda } from './normalizar';

describe('normalizarTexto', () => {
  it('quita las tildes: es el motivo por el que "Xona" no encontraba a "Xona"', () => {
    expect(normalizarTexto('Xoná')).toBe('xona');
    expect(normalizarTexto('José Ramírez')).toBe('jose ramirez');
    expect(normalizarTexto('Ángela Peña')).toBe('angela pena');
  });

  it('trata la n con virgulilla como n', () => {
    // Media poblacion escribe "Munoz" y la otra media "Munoz": distinguirlas
    // solo esconde registros.
    expect(normalizarTexto('Muñoz')).toBe(normalizarTexto('Munoz'));
  });

  it('pasa todo a minusculas', () => {
    expect(normalizarTexto('YAT YAT')).toBe('yat yat');
  });

  it('colapsa los espacios de mas y recorta los de los lados', () => {
    expect(normalizarTexto('  Yat   Yat  ')).toBe('yat yat');
  });

  it('la dieresis tambien desaparece', () => {
    expect(normalizarTexto('Agüero')).toBe('aguero');
  });
});

describe('textoDeBusqueda', () => {
  it('junta apellidos y nombres en un solo texto normalizado', () => {
    expect(textoDeBusqueda('Yat Yat', 'Ramiro Gabriel')).toBe('yat yat ramiro gabriel');
    expect(textoDeBusqueda('Xoná Isem', 'Dennis Alessandro')).toBe('xona isem dennis alessandro');
  });

  it('el orden es apellidos primero, como el archivo de papel', () => {
    expect(textoDeBusqueda('Perez', 'Juana')).toBe('perez juana');
  });
});

describe('palabrasDeBusqueda', () => {
  it('separa por espacios', () => {
    expect(palabrasDeBusqueda('Yat Ramiro')).toEqual(['yat', 'ramiro']);
  });

  it('la coma no estorba: el personal copia el nombre tal como lo ve', () => {
    expect(palabrasDeBusqueda('Yat Yat, Ramiro Gabriel')).toEqual([
      'yat',
      'yat',
      'ramiro',
      'gabriel',
    ]);
  });

  it('normaliza cada palabra igual que al guardar', () => {
    expect(palabrasDeBusqueda('XONÁ  Isem')).toEqual(['xona', 'isem']);
  });

  it('un criterio vacio no produce ninguna palabra', () => {
    expect(palabrasDeBusqueda('')).toEqual([]);
    expect(palabrasDeBusqueda('   ,  ')).toEqual([]);
  });
});
