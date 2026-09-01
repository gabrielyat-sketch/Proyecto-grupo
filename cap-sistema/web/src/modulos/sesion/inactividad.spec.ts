import { AVISO_MS, LIMITE_MS, MINUTOS_INACTIVIDAD, estadoInactividad } from './inactividad';

const minutos = (n: number) => n * 60_000;

describe('estadoInactividad', () => {
  it('por defecto cierra a los 15 minutos, como pide la arquitectura', () => {
    expect(MINUTOS_INACTIVIDAD).toBe(15);
    expect(LIMITE_MS).toBe(minutos(15));
  });

  it('recien llegado, la fase es activo', () => {
    expect(estadoInactividad(0).fase).toBe('activo');
  });

  it('a los 10 minutos sigue activo, sin molestar a nadie', () => {
    expect(estadoInactividad(minutos(10)).fase).toBe('activo');
  });

  it('a falta de un minuto exacto ya avisa', () => {
    const e = estadoInactividad(LIMITE_MS - AVISO_MS);
    expect(e.fase).toBe('aviso');
    expect(e.segundosRestantes).toBe(60);
  });

  it('un segundo antes del aviso todavia no molesta', () => {
    expect(estadoInactividad(LIMITE_MS - AVISO_MS - 1_000).fase).toBe('activo');
  });

  it('la cuenta regresiva baja segundo a segundo', () => {
    expect(estadoInactividad(LIMITE_MS - 30_000).segundosRestantes).toBe(30);
    expect(estadoInactividad(LIMITE_MS - 5_000).segundosRestantes).toBe(5);
  });

  it('al llegar al limite expira', () => {
    expect(estadoInactividad(LIMITE_MS).fase).toBe('expirado');
  });

  it('si la computadora se suspendio media hora, al despertar ya expiro', () => {
    // El calculo va sobre una marca de tiempo, no contando pulsos: un contador
    // de pulsos se habria quedado dormido con la maquina y la sesion seguiria
    // abierta al volver.
    expect(estadoInactividad(minutos(30)).fase).toBe('expirado');
  });
});
