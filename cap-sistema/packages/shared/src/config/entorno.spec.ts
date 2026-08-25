import { cargarEntorno, esquemaBase, esquemaCifrado } from './entorno';

const valido = {
  PUERTO: '3001',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/cap?schema=auth',
  JWT_SECRET: 'x'.repeat(32),
};

describe('cargarEntorno', () => {
  it('acepta una configuracion completa y convierte el puerto a numero', () => {
    const env = cargarEntorno(esquemaBase, valido as any);
    expect(env.PUERTO).toBe(3001);
    expect(typeof env.PUERTO).toBe('number');
  });

  it('aplica los valores por defecto', () => {
    const env = cargarEntorno(esquemaBase, valido as any);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRACION).toBe('15m');
  });

  it('falla si falta DATABASE_URL', () => {
    const { DATABASE_URL, ...sinBd } = valido;
    expect(() => cargarEntorno(esquemaBase, sinBd as any)).toThrow(/DATABASE_URL/);
  });

  it('rechaza un JWT_SECRET demasiado corto', () => {
    expect(() => cargarEntorno(esquemaBase, { ...valido, JWT_SECRET: 'corto' } as any))
      .toThrow(/al menos 32/);
  });

  it('informa todos los problemas juntos, no de uno en uno', () => {
    try {
      cargarEntorno(esquemaBase, { JWT_SECRET: 'corto' } as any);
      fail('deberia haber lanzado');
    } catch (e) {
      const mensaje = (e as Error).message;
      expect(mensaje).toContain('PUERTO');
      expect(mensaje).toContain('DATABASE_URL');
      expect(mensaje).toContain('JWT_SECRET');
    }
  });

  it('exige que las llaves de cifrado midan 64 caracteres hex', () => {
    expect(() => cargarEntorno(esquemaCifrado, { LLAVE_DATOS: 'abc', LLAVE_INDICE: 'def' } as any))
      .toThrow(/64 caracteres hex/);
    expect(
      cargarEntorno(esquemaCifrado, { LLAVE_DATOS: 'a'.repeat(64), LLAVE_INDICE: 'b'.repeat(64) } as any),
    ).toBeDefined();
  });
});
