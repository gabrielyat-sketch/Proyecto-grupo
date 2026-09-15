import { DIAS_DE_GESTACION, fechaProbableParto, semanasDeGestacion } from './gestacion';

/**
 * La FUR viene de una columna de fecha sin hora: Prisma la devuelve como la
 * medianoche UTC de ese dia.
 */
const fur = new Date('2026-01-01T00:00:00Z');

/**
 * El instante en que ocurre una hora local de Purulha, que es UTC-6.
 *
 * `Date.UTC` absorbe el desbordamiento: las 20:00 locales son la hora 26 del
 * dia en UTC, o sea las 02:00 del dia siguiente, que es justo el caso que
 * rompia la cuenta.
 */
function enPurulha(dia: string, hora: number): Date {
  const [anio, mes, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, d, hora + 6));
}

describe('fechaProbableParto', () => {
  it('suma los 280 dias de la regla de Naegele', () => {
    // 1 de enero de 2026 + 280 dias = 8 de octubre de 2026.
    expect(fechaProbableParto(fur).toISOString().slice(0, 10)).toBe('2026-10-08');
  });

  it('usa la misma constante que el servicio de programas', () => {
    // Si alguien la cambia en un solo sitio, esta prueba lo dice antes de que
    // las dos pantallas empiecen a contradecirse.
    expect(DIAS_DE_GESTACION).toBe(280);
  });
});

describe('semanasDeGestacion', () => {
  it('cuenta semanas completas, no redondeadas', () => {
    // A los seis dias todavia no hay una semana cumplida.
    expect(semanasDeGestacion(fur, enPurulha('2026-01-07', 9))).toBe(0);
    expect(semanasDeGestacion(fur, enPurulha('2026-01-08', 9))).toBe(1);
  });

  it('a las 40 semanas dice 40', () => {
    expect(semanasDeGestacion(fur, enPurulha('2026-10-08', 9))).toBe(40);
  });

  /**
   * La prueba que faltaba, y que hacia pasar por bueno el fallo.
   *
   * La version anterior comprobaba que "la hora no mueve la cuenta" con las
   * 23:59 UTC —las 17:59 en Purulha—, que es justo la ultima hora del dia en
   * que el fallo NO se nota. Con la consulta de la noche, que en un centro de
   * atencion permanente es rutina, contar en UTC crudo adelantaba un dia.
   */
  it('la consulta de la noche cuenta como el dia que fue en Purulha', () => {
    // Las 20:00 del 7 de enero en Purulha son las 02:00 del 8 en UTC. Ese
    // control es del dia 7: seis dias de embarazo, todavia 0 semanas.
    const consultaDeNoche = enPurulha('2026-01-07', 20);
    expect(consultaDeNoche.toISOString()).toBe('2026-01-08T02:00:00.000Z');
    expect(semanasDeGestacion(fur, consultaDeNoche)).toBe(0);
  });

  it('la hora del dia no cambia la cuenta dentro del mismo dia local', () => {
    // Del 1 de enero al 10 de junio hay 160 dias: 22 semanas cumplidas y 6
    // dias. Las 06:00 y las 23:00 de ese mismo dia tienen que dar lo mismo, y
    // contando en UTC crudo la segunda daba 23.
    expect(semanasDeGestacion(fur, enPurulha('2026-06-10', 6))).toBe(22);
    expect(semanasDeGestacion(fur, enPurulha('2026-06-10', 23))).toBe(22);
  });

  it('no inventa un cero cuando la consulta es anterior a la FUR', () => {
    // Uno de los dos datos esta mal escrito. Un 0 se leeria como un embarazo
    // de menos de una semana.
    expect(semanasDeGestacion(fur, enPurulha('2025-12-31', 9))).toBeNull();
  });
});
