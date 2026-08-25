import { hashContrasena, verificarContrasena } from './contrasena';

describe('contrasena', () => {
  jest.setTimeout(20000);

  it('acepta la contrasena correcta', async () => {
    const h = await hashContrasena('Clave-Correcta-2026');
    await expect(verificarContrasena(h, 'Clave-Correcta-2026')).resolves.toBe(true);
  });

  it('rechaza una contrasena incorrecta', async () => {
    const h = await hashContrasena('Clave-Correcta-2026');
    await expect(verificarContrasena(h, 'Clave-Incorrecta')).resolves.toBe(false);
  });

  it('produce un hash distinto para la misma contrasena (sal aleatoria)', async () => {
    const a = await hashContrasena('MismaClave123');
    const b = await hashContrasena('MismaClave123');
    expect(a).not.toBe(b);
  });

  it('el hash es Argon2id', async () => {
    expect(await hashContrasena('Cualquiera123')).toMatch(/^\$argon2id\$/);
  });

  it('nunca deja la contrasena legible dentro del hash', async () => {
    const h = await hashContrasena('SecretoDelDirector');
    expect(h).not.toContain('SecretoDelDirector');
  });

  it('rechaza una contrasena vacia', async () => {
    await expect(hashContrasena('')).rejects.toThrow(/no puede estar vacia/);
  });

  it('devuelve false ante un hash corrupto en vez de lanzar', async () => {
    await expect(verificarContrasena('esto-no-es-un-hash', 'algo')).resolves.toBe(false);
  });
});
