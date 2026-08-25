import {
  alertasControlPrenatal,
  fechaDelDia,
  clasificarPresion,
  DIAS_GESTACION,
  estaEnMeta,
  evaluarRiesgoEmbarazo,
  fechaProbableParto,
  proximoControlHipertension,
  proximoControlPrenatal,
  semanasGestacion,
  sumarDias,
} from './clinico';

const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));

describe('clasificarPresion', () => {
  it.each([
    [110, 70, 'NORMAL'],
    [119, 79, 'NORMAL'],
    [120, 70, 'ELEVADA'],
    [129, 79, 'ELEVADA'],
    [130, 70, 'ESTADIO_1'],
    [139, 89, 'ESTADIO_1'],
    [140, 70, 'ESTADIO_2'],
    [170, 100, 'ESTADIO_2'],
    [181, 70, 'CRISIS'],
    [170, 121, 'CRISIS'],
  ])('%i/%i se clasifica como %s', (s, d, esperado) => {
    expect(clasificarPresion(s, d)).toBe(esperado);
  });

  describe('manda la cifra mas alta de las dos', () => {
    it('118/95 es ESTADIO_2 aunque la sistolica sea normal', () => {
      // Es el error clasico: clasificar solo por sistolica deja a este
      // paciente sin seguimiento.
      expect(clasificarPresion(118, 95)).toBe('ESTADIO_2');
    });

    it('135/70 es ESTADIO_1 aunque la diastolica sea normal', () => {
      expect(clasificarPresion(135, 70)).toBe('ESTADIO_1');
    });

    it('118/85 es ESTADIO_1 por la diastolica', () => {
      expect(clasificarPresion(118, 85)).toBe('ESTADIO_1');
    });
  });

  describe('valores frontera exactos', () => {
    it('180/120 todavia NO es crisis; 181 si', () => {
      expect(clasificarPresion(180, 120)).toBe('ESTADIO_2');
      expect(clasificarPresion(181, 120)).toBe('CRISIS');
      expect(clasificarPresion(180, 121)).toBe('CRISIS');
    });

    it('139/89 es estadio 1; 140/89 ya es estadio 2', () => {
      expect(clasificarPresion(139, 89)).toBe('ESTADIO_1');
      expect(clasificarPresion(140, 89)).toBe('ESTADIO_2');
    });
  });
});

describe('estaEnMeta', () => {
  it('exige que AMBAS cifras esten por debajo', () => {
    expect(estaEnMeta(130, 85, 140, 90)).toBe(true);
    expect(estaEnMeta(145, 85, 140, 90)).toBe(false);
    expect(estaEnMeta(130, 95, 140, 90)).toBe(false);
  });

  it('el valor exacto de la meta NO cuenta como en meta', () => {
    expect(estaEnMeta(140, 89, 140, 90)).toBe(false);
    expect(estaEnMeta(139, 90, 140, 90)).toBe(false);
  });
});

describe('proximoControlHipertension', () => {
  const base = utc(2026, 3, 1);

  it('cita una crisis al dia siguiente, no en un mes', () => {
    expect(proximoControlHipertension('CRISIS', base)).toEqual(utc(2026, 3, 2));
  });

  it('estadio 2 a los 15 dias', () => {
    expect(proximoControlHipertension('ESTADIO_2', base)).toEqual(utc(2026, 3, 16));
  });

  it('estadio 1 al mes', () => {
    expect(proximoControlHipertension('ESTADIO_1', base)).toEqual(utc(2026, 3, 31));
  });

  it('controlado a los 3 meses', () => {
    expect(proximoControlHipertension('NORMAL', base)).toEqual(utc(2026, 5, 30));
  });

  it('a peor clasificacion, control mas cercano', () => {
    const dias = (c: Parameters<typeof proximoControlHipertension>[0]) =>
      (proximoControlHipertension(c, base).getTime() - base.getTime()) / 86400000;
    expect(dias('CRISIS')).toBeLessThan(dias('ESTADIO_2'));
    expect(dias('ESTADIO_2')).toBeLessThan(dias('ESTADIO_1'));
    expect(dias('ESTADIO_1')).toBeLessThan(dias('NORMAL'));
  });
});

describe('fechaProbableParto', () => {
  it('suma 280 dias a la FUM', () => {
    expect(fechaProbableParto(utc(2026, 1, 1))).toEqual(utc(2026, 10, 8));
  });

  it('cruza correctamente el cambio de anio', () => {
    expect(fechaProbableParto(utc(2026, 6, 15))).toEqual(utc(2027, 3, 22));
  });

  it('maneja el 29 de febrero de un anio bisiesto', () => {
    const fpp = fechaProbableParto(utc(2028, 2, 29));
    expect((fpp.getTime() - Date.UTC(2028, 1, 29)) / 86400000).toBe(DIAS_GESTACION);
  });

  it('no se corre por el horario de verano', () => {
    // Marzo y octubre son los meses donde muchos husos cambian de hora.
    for (const mes of [3, 10]) {
      const fum = utc(2026, mes, 15);
      const fpp = fechaProbableParto(fum);
      expect((fpp.getTime() - fum.getTime()) / 86400000).toBe(DIAS_GESTACION);
    }
  });
});

describe('semanasGestacion', () => {
  const fum = utc(2026, 1, 1);

  it('el mismo dia de la FUM son 0 semanas', () => {
    expect(semanasGestacion(fum, utc(2026, 1, 1))).toBe(0);
  });

  it('a los 6 dias siguen siendo 0 semanas, no 1', () => {
    expect(semanasGestacion(fum, utc(2026, 1, 7))).toBe(0);
  });

  it('a los 7 dias es 1 semana exacta', () => {
    expect(semanasGestacion(fum, utc(2026, 1, 8))).toBe(1);
  });

  it('a los 280 dias son 40 semanas', () => {
    expect(semanasGestacion(fum, sumarDias(fum, 280))).toBe(40);
  });

  it('devuelve 0 si la fecha es anterior a la FUM, en vez de un negativo', () => {
    expect(semanasGestacion(fum, utc(2025, 12, 1))).toBe(0);
  });
});

describe('proximoControlPrenatal', () => {
  const hoy = utc(2026, 5, 10);

  it('antes de las 28 semanas cita en 4 semanas', () => {
    expect(proximoControlPrenatal(20, hoy)).toEqual(sumarDias(hoy, 28));
  });

  it('entre 28 y 36 cita en 2 semanas', () => {
    expect(proximoControlPrenatal(30, hoy)).toEqual(sumarDias(hoy, 14));
  });

  it('desde las 36 cita cada semana', () => {
    expect(proximoControlPrenatal(38, hoy)).toEqual(sumarDias(hoy, 7));
  });

  it('a las 38 semanas NO cita en un mes: seria despues del parto', () => {
    const dias = (proximoControlPrenatal(38, hoy).getTime() - hoy.getTime()) / 86400000;
    expect(dias).toBeLessThanOrEqual(7);
  });

  it('los limites 28 y 36 caen en el rango mas frecuente', () => {
    expect(proximoControlPrenatal(28, hoy)).toEqual(sumarDias(hoy, 14));
    expect(proximoControlPrenatal(36, hoy)).toEqual(sumarDias(hoy, 7));
  });
});

describe('evaluarRiesgoEmbarazo', () => {
  const base = { edad: 25, numeroGestacion: 2, partosPrevios: 1 };

  it('un embarazo sin factores es de bajo riesgo', () => {
    expect(evaluarRiesgoEmbarazo(base).alto).toBe(false);
  });

  it('marca alto riesgo por edad menor de 15', () => {
    const r = evaluarRiesgoEmbarazo({ ...base, edad: 14 });
    expect(r.alto).toBe(true);
    expect(r.motivos[0]).toMatch(/menor de 15/);
  });

  it('marca alto riesgo por edad mayor de 35', () => {
    expect(evaluarRiesgoEmbarazo({ ...base, edad: 38 }).alto).toBe(true);
  });

  it('15 y 35 exactos NO son de alto riesgo por edad', () => {
    expect(evaluarRiesgoEmbarazo({ ...base, edad: 15 }).alto).toBe(false);
    expect(evaluarRiesgoEmbarazo({ ...base, edad: 35 }).alto).toBe(false);
  });

  it('marca gran multipara a partir de la quinta gestacion', () => {
    expect(evaluarRiesgoEmbarazo({ ...base, numeroGestacion: 4 }).alto).toBe(false);
    expect(evaluarRiesgoEmbarazo({ ...base, numeroGestacion: 5 }).alto).toBe(true);
  });

  it('marca alto riesgo por presion elevada', () => {
    const r = evaluarRiesgoEmbarazo({ ...base, sistolica: 145, diastolica: 92 });
    expect(r.alto).toBe(true);
    expect(r.motivos[0]).toMatch(/145\/92/);
  });

  it('acumula varios motivos', () => {
    const r = evaluarRiesgoEmbarazo({ edad: 40, numeroGestacion: 6, partosPrevios: 5 });
    expect(r.motivos).toHaveLength(2);
  });
});

describe('alertasControlPrenatal', () => {
  it('un control normal no genera alertas', () => {
    expect(alertasControlPrenatal({ semanas: 24, sistolica: 110, diastolica: 70, fcf: 140 })).toEqual([]);
  });

  it('presion 140/90 sugiere descartar preeclampsia', () => {
    const a = alertasControlPrenatal({ semanas: 30, sistolica: 142, diastolica: 91 });
    expect(a.some((x) => /preeclampsia/i.test(x))).toBe(true);
  });

  it('presion 160/110 exige referir de inmediato', () => {
    const a = alertasControlPrenatal({ semanas: 30, sistolica: 165, diastolica: 112 });
    expect(a.some((x) => /de inmediato/i.test(x))).toBe(true);
  });

  it('el edema SOLO no alarma: es frecuente y normal en el embarazo', () => {
    expect(alertasControlPrenatal({ semanas: 30, edema: true, sistolica: 110, diastolica: 70 })).toEqual([]);
  });

  it('el edema CON presion elevada si alarma', () => {
    const a = alertasControlPrenatal({ semanas: 30, edema: true, sistolica: 145, diastolica: 92 });
    expect(a.some((x) => /Edema/i.test(x))).toBe(true);
  });

  it('detecta bradicardia y taquicardia fetal', () => {
    expect(alertasControlPrenatal({ semanas: 30, fcf: 100 })[0]).toMatch(/bradicardia/i);
    expect(alertasControlPrenatal({ semanas: 30, fcf: 170 })[0]).toMatch(/taquicardia/i);
  });

  it('no valora la FCF antes de las 12 semanas, cuando aun no se ausculta', () => {
    expect(alertasControlPrenatal({ semanas: 8, fcf: 90 })).toEqual([]);
  });

  it('avisa del embarazo prolongado pasadas las 42 semanas', () => {
    expect(alertasControlPrenatal({ semanas: 43 }).some((x) => /prolongado/i.test(x))).toBe(true);
    expect(alertasControlPrenatal({ semanas: 42 }).some((x) => /prolongado/i.test(x))).toBe(false);
  });
});

describe('fechaDelDia (huso de Guatemala, UTC-6 sin horario de verano)', () => {
  /** Instante UTC que corresponde a una hora local de Purulha. */
  const enPurulha = (a: number, m: number, d: number, hora: number) =>
    new Date(Date.UTC(a, m - 1, d, hora + 6));

  it('un control de la manana cae en el dia correcto', () => {
    expect(fechaDelDia(enPurulha(2026, 8, 25, 8))).toEqual(utc(2026, 8, 25));
  });

  it('un control de las 19:00 NO se corre al dia siguiente', () => {
    // Sin la conversion, este instante es 2026-08-26 en UTC y la cita se
    // agendaba un dia tarde. Un CAP atiende de noche: no es un caso raro.
    expect(fechaDelDia(enPurulha(2026, 8, 25, 19))).toEqual(utc(2026, 8, 25));
  });

  it('un control de las 23:30 sigue siendo del mismo dia', () => {
    const instante = new Date(Date.UTC(2026, 7, 26, 5, 30)); // 23:30 del 25 en Purulha
    expect(fechaDelDia(instante)).toEqual(utc(2026, 8, 25));
  });

  it('pasada la medianoche local ya es el dia siguiente', () => {
    expect(fechaDelDia(enPurulha(2026, 8, 26, 0))).toEqual(utc(2026, 8, 26));
  });

  it('funciona cruzando el cambio de mes', () => {
    expect(fechaDelDia(enPurulha(2026, 8, 31, 20))).toEqual(utc(2026, 8, 31));
  });

  it('la cita queda a los dias exactos contados desde el dia local', () => {
    const control = enPurulha(2026, 8, 25, 21);
    const cita = proximoControlHipertension('ESTADIO_1', fechaDelDia(control));
    expect(cita).toEqual(utc(2026, 9, 24)); // 25 de agosto + 30 dias
  });
});
