/**
 * Genera las cinco hojas como HTML estatico, con datos de ejemplo, para
 * mirarlas sin levantar el panel ni la base.
 *
 * Sin la variable de entorno no escribe nada y la prueba pasa en silencio.
 * Con ella, deja un .html por hoja; Chrome sin ventana los imprime a PDF y
 * ahi se ve si la hoja cabe en oficio y si parece el papel:
 *
 *   SALIDA_VISTA_PREVIA=/tmp/vista npx vitest run src/modulos/fichas/impresion/vista-previa
 *   chrome --headless=new --print-to-pdf=adulto.pdf file:///tmp/vista/adulto.html
 *
 * Es como se reviso la impresion al construirla (ver docs/diseno-impresion-fichas.md).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { HojaAdulto } from './HojaAdulto';
import { HojaNeonato } from './HojaNeonato';
import { HojaNinez } from './HojaNinez';
import { HojaPosparto, HojaPrenatal } from './HojaPrenatal';

const SALIDA = process.env.SALIDA_VISTA_PREVIA ?? '';

const PACIENTE = {
  id: 'p-1', dpi: '2547896540101', nombres: 'Juana Isabel', apellidos: 'Perez Caal',
  fechaNacimiento: '1985-04-12', edad: 41, sexo: 'F', idioma: 'QEQCHI', telefono: '55512345',
  fallecido: false, comunidad: { id: 'c-1', nombre: 'Purulha Centro' }, grupoFamiliar: null,
  lugar: { id: 'l-1', nombre: 'Barrio El Calvario', tipo: 'BARRIO' as const }, migrante: false, lugarOrigen: null,
  tieneAlergias: null, alergias: null,
  expediente: { id: 'e-1', numero: 'EXP-2026-000123', aperturaEn: '2026-01-10T00:00:00.000Z' },
};

const sp = (n: number, textos: string[]) =>
  textos.map((t, i) => ({ id: 'sp-' + (n + i), orden: i + 1, texto: t, pideTexto: t.startsWith('Otros') }));
const ant = (grupo: 'MEDICO' | 'FAMILIAR' | 'HABITO', textos: string[], base: number) =>
  textos.map((t, i) => ({
    id: 'a-' + (base + i), codigo: 'X' + (base + i), grupo, orden: i + 1, texto: t,
    pideDetalle: t.startsWith('Toma'), pideFecha: t.startsWith('Antecedente de vacuna'),
    pideNumero: t === 'Fuma', permiteNoAplica: t.startsWith('Antecedente de vacuna'),
  }));
const problema = (id: string, orden: number, nombre: string, signos: string[], dx: string[]) => ({
  id, orden, nombre, etiquetaAnotacion: null,
  signos: signos.map((t, i) => ({ id: id + '-s' + i, orden: i + 1, texto: t })),
  diagnosticos: dx.map((t, i) => ({ id: id + '-d' + i, orden: i + 1, texto: t, pideTexto: t === 'Otro' })),
});

const CATALOGO_ADULTO = {
  tipoFicha: 'ADULTO' as const,
  signosPeligro: sp(1, ['Dificultad respiratoria', 'Inconsciencia, letargia, comportamiento extraño', 'Dolor u opresión precordial', 'Convulsiones o rigidez de cuello', 'Cefalea Intensa', 'Vómitos', 'Otros (describir)']),
  antecedentes: [
    ...ant('MEDICO', ['Asma bronquial', 'Cardiopatía', 'ITS', 'Infecciones Urinarias', 'Toma medicamentos', 'Trastorno Psico social', 'Violencia basada en género', 'Antecedente de vacuna Td', 'Diabetes', 'Cáncer', 'Neuropatía', 'Desnutrición', 'Violencia intrafamiliar', 'Conductas anormales (suicidas, alimentarias, etc.)', 'Hipertensión arterial', 'Tb', 'Chagas'], 1),
    ...ant('FAMILIAR', ['Diabetes', 'Tuberculosis', 'HTA', 'Nefropatía', 'Cáncer', 'Otro'], 30),
    ...ant('HABITO', ['Fuma', 'Ingiere bebidas alcohólicas', 'Consumo de drogas', 'Múltiples parejas sexuales', 'Usa condón en las relaciones sexuales', 'Realiza actividad física', 'Consume 5 porciones diarias de frutas y verduras'], 40),
  ],
  problemas: [
    problema('pr-1', 1, 'Tos o dificultad para respirar', ['Sibilancia', 'Tos Crónica', 'Estridores'], ['Neumonía grave', 'Neumonía', 'Resfriado', 'Tuberculosis', 'Asma', 'Otro']),
    problema('pr-2', 2, 'Oído y garganta', ['Tumefacción atrás de la oreja', 'Dolor de oído con supuración visible', 'Menos o más de 14 días', 'Puntos sépticos en amígdalas', 'Ganglios linfáticos en el cuello'], ['Mastoiditis', 'Otitis Media Aguda', 'Otitis Media Crónica', 'Amigdalitis bacteriana', 'Amigdalitis viral']),
    problema('pr-3', 3, 'Bucodental', ['Caries, inflamación de encías, lesiones destructivas avanzadas, Masas - úlceras', 'Placas blandas en boca y garganta'], ['Caries dental', 'Gingivitis', 'periodontitis', 'Sospecha de Cáncer buco faríngeo', 'Otro']),
    problema('pr-4', 4, 'Diarrea', ['Deshidratación', 'Heces sanguinolentas', 'Más de 14 días'], ['Diarrea con DHE grave', 'Diarrea con DHE', 'Diarrea sin DHE', 'Diarrea persistente', 'Disentería']),
    problema('pr-5', 5, 'Fiebre', ['Fiebre recurrente - dolor retroorbitario', 'Rash cutáneo, Hemorragias, Ictericia', 'heces blanquecinas, orina obscura', 'Adenopatía, Linfadenopatía', 'Hepatomegalia'], ['Malaria', 'Dengue', 'Hepatitis', 'Chagas', 'Leptospirosis', 'Otro']),
    problema('pr-6', 6, 'Piel', ['Nódulos, Granos, Úlceras, Ampollas', 'Rash, Ronchas'], ['Leishmaniasis', 'Dermatitis', 'Pió dermitis', 'Otro']),
    problema('pr-7', 7, 'ITS', ['Dolor o ardor al orinar', 'Secreción Uretral', 'Secreción Vaginal', 'Secreción anal', 'Papilomas genitales', 'Úlceras orales o en genitales', 'Ganglios Inguinales', 'Dolor abdominal inferior'], ['Clasificar y tratar de acuerdo a enfoque sindrómico', 'Ofertar consejería a pruebas de VIH y/o referir a nivel correspondiente']),
    problema('pr-8', 8, 'Suplementación con micro nutrientes', ['Palidez palmar, conjuntivas y mucosas de la boca', 'Problemas de alimentación', 'Peso inadecuado'], ['Anemia Grave', 'Anemia', 'Bajo peso', 'Sobrepeso', 'Obesidad']),
    problema('pr-9', 9, 'Signos de alerta de Diabetes', ['Sed intensa', 'Disminución de peso', 'Aumento de apetito', 'Orina frecuente', 'Deshidratación', 'Respiración rápida'], ['Diabetes a descartar']),
    problema('pr-10', 10, 'Signos de alerta de Hipertensión/ Insuficiencia cardiaca', ['Letargia', 'Sudoración excesiva', 'convulsiones', 'dolor precordial', 'Edema', 'Palidez generalizada', 'Anuria', 'Epistaxis', 'Dificultad para respirar al estar acostado', 'edema en pies al final del día'], ['Hipertensión Arterial', 'Sospecha de insuficiencia cardiaca', 'Problemas renales', 'Otro']),
    problema('pr-11', 11, 'Signos de alerta para diagnóstico precoz de Cáncer', ['Tos crónica', 'Ronquera inexplicable', 'Pérdida de peso', 'Sangrados anormales', 'Masas', 'Heces planas y delgadas', 'Indigestiones o dificultad para tragar', 'Fiebres sin causa aparente', 'dificultad para orinar'], ['Sospecha de cáncer', 'Otro']),
    problema('pr-12', 12, 'Necesidades Planificación Familiar', ['Necesidad de espaciar otro embarazo', 'Deseo de no tener más hijos'], ['Planificación Familiar temporal o definitiva']),
    problema('pr-13', 13, 'Psicosociales', [], ['De acuerdo a hallazgo encontrado']),
    problema('pr-14', 14, 'Otros', ['Intoxicaciones, traumas, mordeduras de perros, etc.'], ['De acuerdo a hallazgo encontrado']),
  ],
  temasConsejeria: [],
};

const FICHA = {
  id: 'a-1', expedienteId: 'e-1', tipoFicha: 'ADULTO' as const, fecha: '2026-09-10T15:30:00.000Z',
  registradaPor: 'u-1', digitalizada: false,
  motivo: 'Tos de una semana con fiebre por las noches.',
  historiaEnfermedad: 'Inicio hace 7 dias con tos seca, luego productiva. Fiebre no cuantificada por las noches. Niega disnea.',
  manejoEstabilizacion: null, diagnostico: null, tratamiento: null, notas: null,
  consejeria: 'Tomar abundantes liquidos, volver si hay dificultad para respirar.',
  referencia: null, vacunaAdministrada: null,
  pesoKg: '68.0', tallaCm: '160.0', presionSistolica: 120, presionDiastolica: 80, temperaturaC: '37.8',
  pulso: 84, respiraciones: 20, circunferenciaCinturaCm: '88.0', imc: 26.56, fechaProximaVisita: '2026-09-24',
  signosPeligro: CATALOGO_ADULTO.signosPeligro.map((s) => ({ signoId: s.id, texto: s.texto, presente: false, detalle: null })),
  problemas: [
    { problemaId: 'pr-1', nombre: 'Tos o dificultad para respirar', presente: true, signos: ['Tos Crónica'], diagnosticos: ['Resfriado'], otroDiagnostico: null, conducta: null, anotacion: null },
    ...CATALOGO_ADULTO.problemas.slice(1).map((p) => ({ problemaId: p.id, nombre: p.nombre, presente: false, signos: [], diagnosticos: [], otroDiagnostico: null, conducta: null, anotacion: null })),
  ],
  medicamentos: [
    { nombre: 'Amoxicilina 500 mg', dosis: '1 tableta cada 8 horas', dias: 7 },
    { nombre: 'Acetaminofén 500 mg', dosis: '1 tableta cada 6 horas si hay fiebre', dias: 3 },
  ],
  consejeriaTemas: [], neonato: null, prenatal: null, posparto: null,
};

const ANTECEDENTES = {
  pacienteId: 'p-1',
  marcados: [
    { antecedenteId: 'a-9', codigo: 'X9', texto: 'Diabetes', grupo: 'MEDICO' as const, respuesta: 'SI' as const, detalle: null, fecha: null, numero: null, actualizadoEn: '' },
    { antecedenteId: 'a-5', codigo: 'X5', texto: 'Toma medicamentos', grupo: 'MEDICO' as const, respuesta: 'SI' as const, detalle: 'Metformina', fecha: null, numero: null, actualizadoEn: '' },
    { antecedenteId: 'a-1', codigo: 'X1', texto: 'Asma bronquial', grupo: 'MEDICO' as const, respuesta: 'NO' as const, detalle: null, fecha: null, numero: null, actualizadoEn: '' },
    { antecedenteId: 'a-40', codigo: 'X40', texto: 'Fuma', grupo: 'HABITO' as const, respuesta: 'NO' as const, detalle: null, fecha: null, numero: null, actualizadoEn: '' },
  ],
  obstetricos: { fur: '2026-03-01', gestas: 3, partos: 2, abortos: 0, tamizajeCervix: 'PAPANICOLAU', tamizajeFecha: '2025-11-02', tamizajeNormal: true, usaPlanificacion: true, metodoPlanificacion: 'Inyección', tipoSangre: 'O', rhPositivo: true },
};

function escribir(nombre: string, cuerpo: string) {
  if (!SALIDA) return;
  mkdirSync(SALIDA, { recursive: true });
  const css = readFileSync(resolve(__dirname, 'hoja.css'), 'utf8');
  writeFileSync(
    resolve(SALIDA, nombre + '.html'),
    '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body style="margin:0"><div class="hoja-vista">' + cuerpo + '</div></body></html>',
  );
}

it('escribe las vistas previas', () => {
  escribir('adulto', renderToStaticMarkup(<HojaAdulto ficha={FICHA} catalogo={CATALOGO_ADULTO} paciente={PACIENTE} antecedentes={ANTECEDENTES} />));

  const CAT_NEO = { ...CATALOGO_ADULTO, tipoFicha: 'NEONATO' as const, signosPeligro: sp(1, ['No respira', 'Está flácido o inconsciente', 'Le cuesta respirar', 'Cianosis', 'Hipotermia', 'Fiebre', 'No succiona', 'Pesa menos de 5 libras 8 onzas', 'Letárgico', 'Convulsiones', 'No defeca en 48 horas', 'Distensión abdominal', 'Vómitos o salivación excesiva', 'Tiraje subcostal grave', 'Respiración rápida', 'Aleteo nasal', 'Quejido', 'Abombamiento de fontanela', 'Supuración de oído', 'Pústulas en la piel, mucosa']),
    antecedentes: [...ant('MEDICO', ['Diabetes', 'Hipertensión', 'TB', 'ITS', 'VIH/SIDA', 'Toma o tomó algún medicamento'], 1), ...ant('HABITO', ['Fuma', 'Bebe alcohol en abundancia', 'Utiliza Drogas'], 20)],
    problemas: [problema('n-1', 1, 'Diarrea', ['Ojos hundidos', 'signo de pliegue cutáneo', 'Heces sanguinolentas', 'Más de 14 días'], ['Diarrea con DHE', 'sin DHE', 'persistente', 'Disentería']), problema('n-2', 2, 'Piel', ['Ombligo eritematoso o con secreción purulenta SIN extensión a piel', 'Pústulas en piel pocas o localizadas'], ['Infección local']), problema('n-3', 3, 'ITS', ['Edema palpebral, secreción purulenta conjuntival', 'Hígado, bazo palpable, linfadenopatía, rash palmar, Ictericia'], ['Conjuntivitis Palpebral', 'Sífilis Congénita']), problema('n-4', 4, 'Nutrición', ['Peso edad', 'Se alimenta al pecho menos de 8 veces al día', 'Verificar técnica de amamantamiento'], ['Bajo peso al nacer', 'Problemas de alimentación', 'No mama suficiente', 'Estado nutricional normal']), problema('n-5', 5, 'Vacunación', ['Revisión de BCG'], ['Esquema iniciado', 'Esquema sin iniciar'])],
    temasConsejeria: ['Técnica de amamantamiento', 'Cuidados del cordón umbilical', 'Medidas preventivas de higiene', 'Monitoreo del crecimiento', 'Vacunación (Edades recomendadas para vacunación)', 'Signos generales de peligro del neonato'].map((t, i) => ({ id: 't-' + i, orden: i + 1, texto: t })),
  };
  const NEO = { ...FICHA, tipoFicha: 'NEONATO' as const, pesoKg: null, motivo: 'Control del recién nacido', historiaEnfermedad: null,
    signosPeligro: [{ signoId: 'sp-6', texto: 'Fiebre', presente: true, detalle: null }],
    problemas: [{ problemaId: 'n-4', nombre: 'Nutrición', presente: true, signos: ['Se alimenta al pecho menos de 8 veces al día'], diagnosticos: ['Problemas de alimentación'], otroDiagnostico: null, conducta: 'Orientar técnica de lactancia, control en 3 días', anotacion: null }],
    medicamentos: [], consejeriaTemas: [{ temaId: 't-0', texto: 'Técnica de amamantamiento', brindada: true, fechaReconsulta: '2026-09-13' }],
    neonato: { nombreMadre: 'Rosa Caal Tiul', pesoLibras: 7, pesoOnzas: 4, perimetroBraquialCm: '10.5', circunferenciaCefalicaCm: '34.0', pesoNacerLibras: 6, pesoNacerOnzas: 12, lloroAlNacer: true, nacioCianotico: false, horasTrabajoParto: 9, quienAtendioParto: 'CT' as const, quienAtendioPartoOtro: null, rupturaPrematuraMembranas: false, trabajoPartoPrematuro: false, partoProlongado: false, tipoParto: 'NORMAL' as const, bcg: true, tdMadre: true, tdMadreDosis: 2, lactanciaMaternaExclusiva: true } };
  escribir('neonato', renderToStaticMarkup(<HojaNeonato ficha={NEO} catalogo={CAT_NEO} paciente={{ ...PACIENTE, nombres: 'Bebé de Rosa', fechaNacimiento: '2026-09-01', edad: 0, sexo: 'M' }} antecedentes={ANTECEDENTES} />));

  const CAT_NINEZ = { ...CAT_NEO, tipoFicha: 'NINEZ' as const, signosPeligro: sp(1, ['No puede beber o tomar el pecho', 'Vomita todo', 'Está letárgico o inconciente', 'Presenta convulsiones']), temasConsejeria: ['Uso del medicamento', 'Uso de sobres de rehidratación oral', 'Alimentación de acuerdo a edad', 'Signos Generales de Peligro'].map((t, i) => ({ id: 't-' + i, orden: i + 1, texto: t })) };
  const CARNET = { pacienteId: 'p-2', edadEnMeses: 32, vacunas: [{ vacunaId: 'v-1', orden: 1, fecha: '2024-01-06', edadEnMeses: 0 }, { vacunaId: 'v-2', orden: 1, fecha: '2024-03-08', edadEnMeses: 2 }], micronutrientes: [],
    datos: { lugarNacimiento: 'Purulhá', acompananteNombre: 'Rosa Caal', madreNombre: 'Rosa Caal Tiul', madreEdad: 29, madreOcupacion: 'Ama de casa', madreSabeLeer: true, madreEscolaridad: 'PRIMARIA_1_3' as const, padreNombre: 'Pedro Perez', padreEdad: 33, padreOcupacion: 'Agricultor', padreSabeLeer: false, hijosTotal: 3, hijosVivos: 3, hijosMuertos: 0 },
    hogar: { agua: 'POZO' as const, aguaOtro: null, excretas: 'LETRINA' as const } };
  const CAT_CARNET = { vacunas: [['Hepatitis', ['RN']], ['BCG', ['RN']], ['Rotavirus', ['2 meses', '4 meses', '6 meses']], ['OPV', ['2 meses', '4 meses', '6 meses', '18 meses', '4 años']], ['Pentavalente', ['2 meses', '4 meses', '6 meses']], ['SPR', ['12 meses']]].map(([n, d], i) => ({ id: 'v-' + (i + 1), orden: i + 1, nombre: n as string, dosis: (d as string[]).map((e, j) => ({ orden: j + 1, edadRecomendada: e })) })), micronutrientes: [] };
  const NINEZ = { ...FICHA, tipoFicha: 'NINEZ' as const, pesoKg: '12.5', tallaCm: '88.0', motivo: 'Diarrea de 2 días', consejeriaTemas: [{ temaId: 't-1', texto: 'Uso de sobres de rehidratación oral', brindada: true, fechaReconsulta: null }], problemas: [{ problemaId: 'n-1', nombre: 'Diarrea', presente: true, signos: ['Ojos hundidos'], diagnosticos: ['sin DHE'], otroDiagnostico: null, conducta: null, anotacion: null }], signosPeligro: CAT_NINEZ.signosPeligro.map((s) => ({ signoId: s.id, texto: s.texto, presente: false, detalle: null })) };
  escribir('ninez', renderToStaticMarkup(<HojaNinez ficha={NINEZ} catalogo={CAT_NINEZ} paciente={{ ...PACIENTE, nombres: 'Marcos', fechaNacimiento: '2024-01-05', edad: 2, sexo: 'M' }} antecedentes={null} carnet={CARNET} catalogoCarnet={CAT_CARNET} />));

  const CAT_PRE = { ...CATALOGO_ADULTO, tipoFicha: 'PRENATAL' as const, signosPeligro: sp(1, ['Hemorragia vaginal', 'Dolor de cabeza severo', 'Visión borrosa', 'Convulsión', 'Dolor abdominal severo (epigastralgia)', 'Presión arterial alta', 'Fiebre', 'Presentaciones fetales anormales']), temasConsejeria: ['Alimentación durante el embarazo', 'Señales de peligro embarazo', 'Consejería pre/post prueba VIH', 'Plan de parto', 'Plan de emergencia familiar y comunitario', 'Lactancia materna exclusiva/MELA', 'Otros métodos de planificación familiar', 'Importancia del control posparto', 'Vacunación y cuidados del recién nacido/a'].map((t, i) => ({ id: 't-' + i, orden: i + 1, texto: t })) };
  const PRE = { ...FICHA, tipoFicha: 'PRENATAL' as const, motivo: null, historiaEnfermedad: 'Sin molestias.', medicamentos: [], consejeriaTemas: [{ temaId: 't-0', texto: 'Alimentación durante el embarazo', brindada: true, fechaReconsulta: null }, { temaId: 't-1', texto: 'Señales de peligro embarazo', brindada: true, fechaReconsulta: null }], signosPeligro: CAT_PRE.signosPeligro.map((s) => ({ signoId: s.id, texto: s.texto, presente: false, detalle: null })), problemas: [],
    prenatal: { circunferenciaBrazoCm: '24.0', examenGeneralNormal: true, examenBucodental: 'Caries en molar', alturaUterinaCm: '22.0', movimientosFetales: true, fcf: 140, presentacionLeopold: null, trazasSangre: false, trazasSangreDescripcion: null, lesionesVulvares: false, lesionesVulvaresDescripcion: null, flujoVaginal: false, hemoglobinaHematocrito: '11.2 / 34', grupoRh: 'O+', orina: 'Normal', glicemia: '88', vdrl: 'No reactivo', vih: 'Negativo', papanicolau: null, infecciones: null, semanasPorFurAu: 24, problemasDetectados: 'Anemia leve', sulfatoFerrosoTabletas: 30, acidoFolicoTabletas: 30, tdDosis: 1, semanasGestacion: 24, fechaProbableParto: '2026-12-06' } };
  escribir('prenatal', renderToStaticMarkup(<HojaPrenatal ficha={PRE} catalogo={CAT_PRE} paciente={PACIENTE} antecedentes={ANTECEDENTES} />));

  const CAT_POS = { ...CAT_PRE, tipoFicha: 'POSPARTO' as const, signosPeligro: sp(1, ['Hemorragia vaginal', 'Dolor de cabeza severo', 'Visión borrosa', 'Fiebre', 'Dolor abdominal severo (epigastralgia)', 'Presión arterial alta (140/90)', 'Convulsiones', 'Coágulos con mal olor (Loquios)']), temasConsejeria: ['Consejería en PF posparto', 'Consejería en lactancia materna exclusiva y alimentación de la mujer lactante', 'Consejería de lactancia materna a mujer VIH +', 'Consejería a mujer VIH +'].map((t, i) => ({ id: 't-' + i, orden: i + 1, texto: t })) };
  const POS = { ...PRE, tipoFicha: 'POSPARTO' as const, prenatal: null, signosPeligro: CAT_POS.signosPeligro.map((s) => ({ signoId: s.id, texto: s.texto, presente: false, detalle: null })), consejeriaTemas: [{ temaId: 't-0', texto: 'Consejería en PF posparto', brindada: true, fechaReconsulta: null }],
    posparto: { esPrimerControl: true, diasDespuesDelParto: 5, dondeAtendioParto: 'En casa', quienAtendioParto: 'CT', quienAtendioPartoOtro: null, involucionUterina: 'Adecuada', examenMamas: 'Sin masas, pezones sanos', heridaOperatoria: null, examenGinecologico: 'Loquios serosos, sin mal olor. Episiorrafia sin signos de infección.', lactanciaMaternaExclusiva: true, motivoSinLactancia: null, problemasDetectados: null, sulfatoFerroso: true, sulfatoFerrosoTabletas: 30, acidoFolico: false, acidoFolicoTabletas: null, td: null, tdDosis: null, otroMedicamento: null } };
  escribir('posparto', renderToStaticMarkup(<HojaPosparto ficha={POS} catalogo={CAT_POS} paciente={PACIENTE} />));
  escribir('posparto2', renderToStaticMarkup(<HojaPosparto ficha={{ ...POS, posparto: { ...POS.posparto, esPrimerControl: false, diasDespuesDelParto: 40 } }} catalogo={CAT_POS} paciente={PACIENTE} />));
});
