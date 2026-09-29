import { serieDe } from './serie';

const COMUNIDAD = 'comunidad-purulha-centro';
const LUGAR = 'lugar-el-calvario';

/**
 * La serie decide qué números de carpeta chocan entre sí. Equivocarla no da un
 * error visible: da una numeración global donde el CAP tiene una por barrio, y
 * el síntoma que llega es «el número choca siempre, venga de donde venga».
 */
describe('serie de numeracion de las carpetas', () => {
  it('con barrio, la serie es el barrio', () => {
    expect(serieDe(COMUNIDAD, LUGAR)).toBe(LUGAR);
  });

  it('sin barrio, la serie es la comunidad', () => {
    expect(serieDe(COMUNIDAD)).toBe(COMUNIDAD);
    expect(serieDe(COMUNIDAD, null)).toBe(COMUNIDAD);
  });

  /**
   * «Sin especificar» en un desplegable viaja como cadena vacía, y `??` la deja
   * pasar. La serie sería '' para todas las comunidades: una sola numeración
   * global, que es justo lo que este campo existe para evitar.
   */
  it('el lugar vacio cae en la comunidad, no en una serie compartida', () => {
    expect(serieDe(COMUNIDAD, '')).toBe(COMUNIDAD);
    expect(serieDe(COMUNIDAD, '   ')).toBe(COMUNIDAD);
    expect(serieDe('otra-comunidad', '')).toBe('otra-comunidad');
  });

  it('dos comunidades sin barrio no comparten serie', () => {
    expect(serieDe('comunidad-a', '')).not.toBe(serieDe('comunidad-b', ''));
  });
});
