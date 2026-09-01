import { estaVigente, expiraEn } from './token';

/** Arma un JWT de mentira: solo importa la carga, nadie verifica la firma aqui. */
function jwt(carga: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_');
  return b64({ alg: 'HS256' }) + '.' + b64(carga) + '.firmafalsa';
}

const enSegundos = (d: number) => Math.floor(Date.now() / 1000) + d;

describe('expiraEn', () => {
  it('lee el exp de la carga', () => {
    expect(expiraEn(jwt({ exp: 1893456000 }))).toBe(1893456000);
  });

  it('devuelve null si no es un JWT', () => {
    expect(expiraEn('esto-no-es-un-token')).toBeNull();
  });

  it('devuelve null si la carga no es JSON valido', () => {
    expect(expiraEn('a.no-es-base64-json.c')).toBeNull();
  });
});

describe('estaVigente', () => {
  it('un token de hace rato ya no vale', () => {
    expect(estaVigente(jwt({ exp: enSegundos(-60) }))).toBe(false);
  });

  it('un token con media hora por delante vale', () => {
    expect(estaVigente(jwt({ exp: enSegundos(1800) }))).toBe(true);
  });

  it('un token a punto de expirar se considera vencido', () => {
    // Sin margen llegaria vencido al servidor, y ademas el reloj del equipo del
    // CAP no tiene por que estar sincronizado al segundo.
    expect(estaVigente(jwt({ exp: enSegundos(5) }))).toBe(false);
  });

  it('un token sin exp legible se deja pasar: que decida el servidor', () => {
    expect(estaVigente('token-opaco')).toBe(true);
  });
});
