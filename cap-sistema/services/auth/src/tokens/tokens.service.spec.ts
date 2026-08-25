import { TokensService } from './tokens.service';

describe('TokensService.hashear', () => {
  it('es determinista', () => {
    expect(TokensService.hashear('abc')).toBe(TokensService.hashear('abc'));
  });

  it('distingue tokens distintos', () => {
    expect(TokensService.hashear('abc')).not.toBe(TokensService.hashear('abd'));
  });

  it('no deja el token legible dentro del hash', () => {
    const token = 'token-de-refresco-secreto';
    expect(TokensService.hashear(token)).not.toContain(token);
  });

  it('produce 64 caracteres hexadecimales (SHA-256)', () => {
    expect(TokensService.hashear('abc')).toMatch(/^[0-9a-f]{64}$/);
  });
});
