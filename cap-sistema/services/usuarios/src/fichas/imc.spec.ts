import { calcularImc } from './fichas.service';

describe('calcularImc', () => {
  it('calcula el indice con la formula estandar', () => {
    // 72.5 kg y 158 cm -> 72.5 / 1.58^2
    expect(calcularImc(72.5, 158)).toBe(29.04);
  });

  it('redondea a dos decimales: mas precision no significa nada clinicamente', () => {
    expect(calcularImc(70, 175)).toBe(22.86);
  });

  it('sin peso o sin talla no inventa un valor', () => {
    // Es la razon de no guardarlo: media ficha llena no puede producir un IMC.
    expect(calcularImc(null, 158)).toBeNull();
    expect(calcularImc(72.5, null)).toBeNull();
    expect(calcularImc(null, null)).toBeNull();
    expect(calcularImc(undefined, undefined)).toBeNull();
  });

  it('un cero o un negativo no producen un numero absurdo', () => {
    expect(calcularImc(0, 158)).toBeNull();
    expect(calcularImc(72.5, 0)).toBeNull();
    expect(calcularImc(-5, 158)).toBeNull();
  });

  it('acepta el Decimal de Prisma, que llega como texto', () => {
    // Prisma devuelve Decimal, y su representacion es una cadena.
    expect(calcularImc('72.50', '158.0')).toBe(29.04);
  });

  it('un texto que no es numero no rompe el calculo', () => {
    expect(calcularImc('vacio', '158')).toBeNull();
  });
});
