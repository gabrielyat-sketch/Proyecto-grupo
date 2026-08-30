import {
  avanceDe,
  borradorVacio,
  clasificacionImc,
  conAntecedentesPrevios,
  cuerpoDeAntecedentes,
  cuerpoDeFicha,
  fueraDeRango,
  hoy,
  imcDe,
  porGrupo,
  reparosDe,
  tieneContenido,
} from './borrador';
import type { CatalogoFicha } from './servicio-fichas';

const CATALOGO: CatalogoFicha = {
  tipoFicha: 'ADULTO',
  signosPeligro: [
    { id: 'sp-1', orden: 1, texto: 'Dificultad respiratoria', pideTexto: false },
    { id: 'sp-2', orden: 7, texto: 'Otros (describir)', pideTexto: true },
  ],
  antecedentes: [
    {
      id: 'a-1',
      codigo: 'MED_DIABETES',
      grupo: 'MEDICO',
      orden: 1,
      texto: 'Diabetes',
      pideDetalle: false,
      pideFecha: false,
      pideNumero: false,
      permiteNoAplica: false,
    },
    {
      id: 'a-2',
      codigo: 'MED_SR',
      grupo: 'MEDICO',
      orden: 2,
      texto: 'SR',
      pideDetalle: false,
      pideFecha: false,
      pideNumero: false,
      permiteNoAplica: true,
    },
    {
      id: 'a-3',
      codigo: 'HAB_FUMA',
      grupo: 'HABITO',
      orden: 1,
      texto: 'Fuma',
      pideDetalle: false,
      pideFecha: false,
      pideNumero: true,
      permiteNoAplica: false,
    },
  ],
  problemas: [
    {
      id: 'p-1',
      orden: 1,
      nombre: 'Tos o dificultad para respirar',
      etiquetaAnotacion: null,
      signos: [{ id: 'sg-1', orden: 1, texto: 'Respiracion rapida' }],
      diagnosticos: [
        { id: 'dx-1', orden: 1, texto: 'Neumonia', pideTexto: false },
        { id: 'dx-2', orden: 2, texto: 'Otro', pideTexto: true },
      ],
    },
  ],
  // La ficha de adultos usa consejeria de texto libre, no temas.
  temasConsejeria: [],
};

const nuevo = () => borradorVacio(CATALOGO);

describe('borrador de la ficha', () => {
  it('nace con una casilla por cada renglon del catalogo, todas sin responder', () => {
    const b = nuevo();
    expect(Object.keys(b.signosPeligro)).toHaveLength(2);
    expect(Object.keys(b.antecedentes)).toHaveLength(3);
    expect(Object.keys(b.problemas)).toHaveLength(1);
    expect(b.antecedentes['a-1'].respuesta).toBeNull();
    expect(b.problemas['p-1'].presente).toBeNull();
  });

  it('un borrador recien abierto no cuenta como contenido sin guardar', () => {
    expect(tieneContenido(nuevo())).toBe(false);
  });

  it('responder NO ya es contenido: "no" es un dato, no un vacio', () => {
    const b = nuevo();
    b.antecedentes['a-1'].respuesta = 'NO';
    expect(tieneContenido(b)).toBe(true);
  });
});

describe('lo ya respondido en visitas anteriores', () => {
  it('llega marcado, no en blanco', () => {
    const b = conAntecedentesPrevios(nuevo(), {
      pacienteId: 'x',
      marcados: [
        {
          antecedenteId: 'a-1',
          codigo: 'MED_DIABETES',
          texto: 'Diabetes',
          grupo: 'MEDICO',
          respuesta: 'SI',
          detalle: null,
          fecha: null,
          numero: null,
          actualizadoEn: '2026-03-01T10:00:00.000Z',
        },
      ],
      obstetricos: { gestas: 3, tipoSangre: 'O', rhPositivo: true },
    });

    expect(b.antecedentes['a-1'].respuesta).toBe('SI');
    expect(b.obstetricos.gestas).toBe('3');
    expect(b.obstetricos.tipoSangre).toBe('O');
    expect(b.obstetricos.rhPositivo).toBe(true);
    // Lo que nunca se pregunto sigue sin responder.
    expect(b.antecedentes['a-2'].respuesta).toBeNull();
  });

  it('un antecedente que ya no esta en el catalogo se ignora sin romper nada', () => {
    const b = conAntecedentesPrevios(nuevo(), {
      pacienteId: 'x',
      marcados: [
        {
          antecedenteId: 'retirado',
          codigo: 'VIEJO',
          texto: 'Retirado del formulario',
          grupo: 'MEDICO',
          respuesta: 'SI',
          detalle: null,
          fecha: null,
          numero: null,
          actualizadoEn: '2026-03-01T10:00:00.000Z',
        },
      ],
      obstetricos: null,
    });
    expect(b.antecedentes.retirado).toBeUndefined();
  });

  it('la fecha llega recortada al dia: el campo de fecha no admite la hora', () => {
    const b = conAntecedentesPrevios(nuevo(), {
      pacienteId: 'x',
      marcados: [
        {
          antecedenteId: 'a-3',
          codigo: 'HAB_FUMA',
          texto: 'Fuma',
          grupo: 'HABITO',
          respuesta: 'SI',
          detalle: null,
          fecha: '2026-03-01T10:00:00.000Z',
          numero: 5,
          actualizadoEn: '2026-03-01T10:00:00.000Z',
        },
      ],
      obstetricos: null,
    });
    expect(b.antecedentes['a-3'].fecha).toBe('2026-03-01');
    expect(b.antecedentes['a-3'].numero).toBe('5');
  });
});

describe('indice de masa corporal', () => {
  it('se calcula igual que en el servidor', () => {
    expect(imcDe('72.5', '158')).toBe(29.04);
  });

  it('no se inventa un valor si falta el peso o la talla', () => {
    expect(imcDe('', '158')).toBeNull();
    expect(imcDe('72', '')).toBeNull();
    expect(imcDe('72', '0')).toBeNull();
    expect(imcDe('abc', '158')).toBeNull();
  });

  it('nombra la franja de la OMS', () => {
    expect(clasificacionImc(17)).toBe('Bajo peso');
    expect(clasificacionImc(22)).toBe('Normal');
    expect(clasificacionImc(27)).toBe('Sobrepeso');
    expect(clasificacionImc(31)).toBe('Obesidad');
    expect(clasificacionImc(null)).toBe('');
  });
});

describe('rangos del examen fisico', () => {
  it('un campo vacio no es un error: casi nada es obligatorio', () => {
    expect(fueraDeRango('tallaCm', '')).toBe(false);
  });

  it('avisa de lo que el servidor rechazaria', () => {
    expect(fueraDeRango('tallaCm', '1580')).toBe(true);
    expect(fueraDeRango('tallaCm', '158')).toBe(false);
    expect(fueraDeRango('temperaturaC', '3')).toBe(true);
    expect(fueraDeRango('pulso', 'setenta')).toBe(true);
  });
});

describe('cuerpo de la ficha', () => {
  it('manda solo lo que se lleno', () => {
    const b = nuevo();
    b.motivo = '  Tos de tres dias  ';
    const cuerpo = cuerpoDeFicha(b, 'ADULTO');

    expect(cuerpo.motivo).toBe('Tos de tres dias');
    expect(cuerpo).not.toHaveProperty('historiaEnfermedad');
    expect(cuerpo).not.toHaveProperty('pesoKg');
    expect(cuerpo).not.toHaveProperty('signosPeligro');
    expect(cuerpo).not.toHaveProperty('problemas');
  });

  it('convierte a numero lo que en pantalla es texto', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.examen.pesoKg = '72.5';
    b.examen.presionSistolica = '128';
    const cuerpo = cuerpoDeFicha(b, 'ADULTO');

    expect(cuerpo.pesoKg).toBe(72.5);
    expect(cuerpo.presionSistolica).toBe(128);
  });

  it('el IMC NO viaja: lo calcula el servidor al leer la ficha', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.examen.pesoKg = '72.5';
    b.examen.tallaCm = '158';
    expect(cuerpoDeFicha(b, 'ADULTO')).not.toHaveProperty('imc');
  });

  it('las casillas sin responder no viajan, para no confundirlas con un "no"', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.signosPeligro['sp-1'].presente = false;
    const cuerpo = cuerpoDeFicha(b, 'ADULTO');

    expect(cuerpo.signosPeligro).toEqual([{ signoId: 'sp-1', presente: false }]);
  });

  it('no manda la fecha cuando la atencion es de hoy', () => {
    const b = nuevo();
    b.motivo = 'Control';
    expect(cuerpoDeFicha(b, 'ADULTO')).not.toHaveProperty('fecha');

    b.fecha = '2026-01-15';
    expect(cuerpoDeFicha(b, 'ADULTO').fecha).toBe('2026-01-15');
  });

  it('descarta los renglones de medicamento que quedaron en blanco', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.medicamentos = [
      { nombre: 'Amoxicilina 500 mg', dosis: '1 cada 8 horas', dias: '7' },
      { nombre: '', dosis: '', dias: '' },
    ];
    const cuerpo = cuerpoDeFicha(b, 'ADULTO');

    expect(cuerpo.medicamentos).toEqual([
      { nombre: 'Amoxicilina 500 mg', dosis: '1 cada 8 horas', dias: 7 },
    ]);
  });

  it('un problema marcado viaja con lo que se subrayo', () => {
    const b = nuevo();
    b.motivo = 'Tos';
    b.problemas['p-1'] = {
      presente: true,
      signoIds: ['sg-1'],
      diagnosticoIds: ['dx-1'],
      otroDiagnostico: '',
      conducta: 'Amoxicilina',
      anotacion: '',
    };
    expect(cuerpoDeFicha(b, 'ADULTO').problemas).toEqual([
      {
        problemaId: 'p-1',
        presente: true,
        signoIds: ['sg-1'],
        diagnosticoIds: ['dx-1'],
        conducta: 'Amoxicilina',
      },
    ]);
  });
});

describe('cuerpo de los antecedentes', () => {
  it('no manda nada cuando no se pregunto nada', () => {
    expect(cuerpoDeAntecedentes(nuevo())).toBeNull();
  });

  it('manda solo las casillas respondidas: es una actualizacion parcial', () => {
    const b = nuevo();
    b.antecedentes['a-1'].respuesta = 'SI';
    const cuerpo = cuerpoDeAntecedentes(b);

    expect(cuerpo?.marcados).toEqual([{ antecedenteId: 'a-1', respuesta: 'SI' }]);
    expect(cuerpo).not.toHaveProperty('obstetricos');
  });

  it('un cero obstetrico SI viaja: "cero partos" no es lo mismo que no preguntar', () => {
    const b = nuevo();
    b.obstetricos.partos = '0';
    expect(cuerpoDeAntecedentes(b)?.obstetricos).toEqual({ partos: 0 });
  });
});

describe('reparos antes de guardar', () => {
  it('el motivo de la consulta es lo unico obligatorio', () => {
    const reparos = reparosDe(nuevo(), CATALOGO);
    expect(reparos).toHaveLength(1);
    expect(reparos[0].seccion).toBe('consulta');
  });

  it('rechaza "No aplica" donde el papel no lo ofrece', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.antecedentes['a-1'].respuesta = 'NO_APLICA';
    expect(reparosDe(b, CATALOGO).map((r) => r.seccion)).toContain('antecedentes');

    // En SR si esta impreso.
    const c = nuevo();
    c.motivo = 'Control';
    c.antecedentes['a-2'].respuesta = 'NO_APLICA';
    expect(reparosDe(c, CATALOGO)).toEqual([]);
  });

  it('pide describir el signo de peligro "otros"', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.signosPeligro['sp-2'] = { presente: true, detalle: '' };
    expect(reparosDe(b, CATALOGO).map((r) => r.seccion)).toContain('peligro');
  });

  it('un problema marcado como presente sin nada subrayado es un descuido', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.problemas['p-1'].presente = true;
    expect(reparosDe(b, CATALOGO).map((r) => r.seccion)).toContain('problemas');
  });

  it('marcar el problema como ausente no exige subrayar nada', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.problemas['p-1'].presente = false;
    expect(reparosDe(b, CATALOGO)).toEqual([]);
  });

  it('no deja guardar una atencion con fecha futura', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.fecha = '2099-01-01';
    expect(reparosDe(b, CATALOGO).map((r) => r.seccion)).toContain('identificacion');
  });

  it('avisa del valor fuera de rango antes de que lo rechace el servidor', () => {
    const b = nuevo();
    b.motivo = 'Control';
    b.examen.tallaCm = '1580';
    expect(reparosDe(b, CATALOGO).map((r) => r.seccion)).toContain('examen');
  });
});

describe('avance por seccion', () => {
  it('cuenta lo respondido sobre el total impreso', () => {
    const b = nuevo();
    b.antecedentes['a-1'].respuesta = 'NO';
    b.examen.pesoKg = '70';

    const avance = avanceDe(b, CATALOGO);
    expect(avance.antecedentes).toEqual({ respondidas: 1, total: 3 });
    expect(avance.examen).toEqual({ respondidas: 1, total: 8 });
    expect(avance.problemas).toEqual({ respondidas: 0, total: 1 });
  });
});

describe('agrupacion del catalogo de antecedentes', () => {
  it('respeta el orden de los bloques impresos y omite los vacios', () => {
    const bloques = porGrupo(CATALOGO.antecedentes);
    expect(bloques.map((b) => b.grupo)).toEqual(['MEDICO', 'HABITO']);
    expect(bloques[0].filas).toHaveLength(2);
  });
});

describe('hoy()', () => {
  it('entrega la fecha en el formato del campo de fecha', () => {
    expect(hoy()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
