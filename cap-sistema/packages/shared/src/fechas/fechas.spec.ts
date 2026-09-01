import {
  DESFASE_GUATEMALA_HORAS,
  diasEntre,
  fechaDelDia,
  inicioDelDiaLocal,
  sumarDias,
} from './fechas';

const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
/** Instante UTC que corresponde a una hora local de Purulhá. */
const enPurulha = (a: number, m: number, d: number, hora: number) =>
  new Date(Date.UTC(a, m - 1, d, hora - DESFASE_GUATEMALA_HORAS));

describe('fechaDelDia', () => {
  it('un registro de la manana cae en el dia correcto', () => {
    expect(fechaDelDia(enPurulha(2026, 8, 25, 8))).toEqual(utc(2026, 8, 25));
  });

  it('un registro de las 19:00 NO se corre al dia siguiente', () => {
    // Sin la conversion, este instante es 2026-08-26 en UTC. Un CAP atiende
    // de noche: no es un caso raro.
    expect(fechaDelDia(enPurulha(2026, 8, 25, 19))).toEqual(utc(2026, 8, 25));
  });

  it('un registro de las 23:30 sigue siendo del mismo dia', () => {
    const instante = new Date(Date.UTC(2026, 7, 26, 5, 30)); // 23:30 del 25 en Purulha
    expect(fechaDelDia(instante)).toEqual(utc(2026, 8, 25));
  });

  it('pasada la medianoche local ya es el dia siguiente', () => {
    expect(fechaDelDia(enPurulha(2026, 8, 26, 0))).toEqual(utc(2026, 8, 26));
  });

  it('funciona cruzando el cambio de mes', () => {
    expect(fechaDelDia(enPurulha(2026, 8, 31, 20))).toEqual(utc(2026, 8, 31));
  });

  it('funciona cruzando el cambio de anio', () => {
    expect(fechaDelDia(enPurulha(2026, 12, 31, 22))).toEqual(utc(2026, 12, 31));
  });
});

describe('inicioDelDiaLocal', () => {
  /**
   * Es el complemento de fechaDelDia y son cosas distintas: una devuelve la
   * medianoche UTC del dia local —para comparar dias entre si— y la otra la
   * medianoche LOCAL como instante, que es lo unico comparable contra una
   * columna de marca de tiempo. Confundirlas corre la frontera del dia seis
   * horas.
   */
  it('devuelve la medianoche de Purulha, no la de UTC', () => {
    expect(inicioDelDiaLocal(enPurulha(2026, 8, 25, 14))).toEqual(enPurulha(2026, 8, 25, 0));
  });

  it('no es lo mismo que fechaDelDia: van seis horas de diferencia', () => {
    const instante = enPurulha(2026, 8, 25, 14);
    const diferencia = inicioDelDiaLocal(instante).getTime() - fechaDelDia(instante).getTime();
    expect(diferencia).toBe(6 * 3_600_000);
  });

  /**
   * El caso que rompio la sala de espera: una visita de las 19:46 del 27
   * quedaba con marca 01:46 UTC del 28, y con la medianoche equivocada
   * parecia de hoy.
   */
  it('una llegada de anoche queda ANTES del inicio de hoy', () => {
    const anoche = enPurulha(2026, 8, 27, 19); // 01:00 UTC del 28
    const hoy = inicioDelDiaLocal(enPurulha(2026, 8, 28, 12));
    expect(anoche.getTime()).toBeLessThan(hoy.getTime());
  });

  it('una llegada de esta manana queda DESPUES', () => {
    const estaManana = enPurulha(2026, 8, 28, 8);
    const hoy = inicioDelDiaLocal(enPurulha(2026, 8, 28, 12));
    expect(estaManana.getTime()).toBeGreaterThanOrEqual(hoy.getTime());
  });

  it('a las 00:30 de Purulha el dia acaba de empezar', () => {
    const madrugada = enPurulha(2026, 8, 28, 0.5);
    expect(madrugada.getTime()).toBeGreaterThanOrEqual(inicioDelDiaLocal(madrugada).getTime());
  });
});

describe('sumarDias', () => {
  it('suma dias sobre una fecha sin hora', () => {
    expect(sumarDias(utc(2026, 3, 1), 30)).toEqual(utc(2026, 3, 31));
  });

  it('cruza el cambio de anio', () => {
    expect(sumarDias(utc(2026, 12, 20), 20)).toEqual(utc(2027, 1, 9));
  });

  it('acepta dias negativos', () => {
    expect(sumarDias(utc(2026, 3, 1), -1)).toEqual(utc(2026, 2, 28));
  });

  it('maneja el anio bisiesto', () => {
    expect(sumarDias(utc(2028, 2, 28), 1)).toEqual(utc(2028, 2, 29));
  });

  it('no se corre en los meses donde otros husos cambian de hora', () => {
    for (const mes of [3, 10]) {
      const base = utc(2026, mes, 15);
      expect((sumarDias(base, 280).getTime() - base.getTime()) / 86_400_000).toBe(280);
    }
  });
});

describe('diasEntre', () => {
  it('cuenta dias completos', () => {
    expect(diasEntre(utc(2026, 3, 1), utc(2026, 3, 31))).toBe(30);
  });

  it('devuelve 0 el mismo dia', () => {
    expect(diasEntre(utc(2026, 3, 1), utc(2026, 3, 1))).toBe(0);
  });

  it('es negativo si la fecha final es anterior', () => {
    expect(diasEntre(utc(2026, 3, 31), utc(2026, 3, 1))).toBe(-30);
  });

  it('ignora la hora: de las 23:00 a la 1:00 del dia siguiente hay 1 dia', () => {
    const lunes = new Date(Date.UTC(2026, 2, 2, 23, 0));
    const martes = new Date(Date.UTC(2026, 2, 3, 1, 0));
    expect(diasEntre(lunes, martes)).toBe(1);
  });
});
