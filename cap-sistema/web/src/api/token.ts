/**
 * Lectura del `exp` de un JWT, sin verificar la firma.
 *
 * El navegador NO valida el token: eso lo hace el servidor, y ademas cada
 * microservicio lo revalida por su cuenta (arquitectura §10.1). Aqui solo se
 * mira la fecha de expiracion para saber cuando conviene renovarlo.
 */
export function expiraEn(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const carga = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    return typeof carga.exp === 'number' ? carga.exp : null;
  } catch {
    return null;
  }
}

/**
 * Margen de 30 segundos.
 *
 * Sin margen, un token que expira en dos segundos pasa la comprobacion y llega
 * vencido al servidor. Y el reloj del equipo del CAP no tiene por que estar
 * perfectamente sincronizado.
 */
const MARGEN_SEGUNDOS = 30;

export function estaVigente(token: string): boolean {
  const exp = expiraEn(token);
  // Un token sin `exp` legible se trata como vigente: que decida el servidor.
  if (exp === null) return true;
  return exp - MARGEN_SEGUNDOS > Date.now() / 1000;
}
