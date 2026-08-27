/**
 * Catalogo de la ficha clinica de adolescente, adulto y adulto mayor.
 *
 * Transcrito del formulario oficial del MSPAS que el CAP entregó
 * (`docs/pdfs/ficha clínica Adolescentes-Adulto y adultoMayor.pdf`). El texto
 * de cada opcion se copia TAL CUAL aparece impreso: si la pantalla dijera algo
 * distinto, el personal tendria que traducir mentalmente en cada captura.
 *
 * Es idempotente: se puede correr las veces que haga falta. Cada elemento se
 * identifica por su posicion en el formulario, no por un id generado, asi que
 * volver a ejecutarlo actualiza los textos en vez de duplicar el catalogo.
 *
 * Uso:  npm run catalogo -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient, type GrupoAntecedente } from '../generado';

cargarDotenv({ quiet: true });

const TIPO = 'ADULTO' as const;

/** Seccion III. Deciden si el paciente se atiende o se refiere de inmediato. */
const SIGNOS_DE_PELIGRO: { texto: string; pideTexto?: boolean }[] = [
  { texto: 'Dificultad respiratoria' },
  { texto: 'Inconsciencia, letargia, comportamiento extraño' },
  { texto: 'Dolor u opresión precordial' },
  { texto: 'Convulsiones o rigidez de cuello' },
  { texto: 'Cefalea intensa' },
  { texto: 'Vómitos' },
  { texto: 'Otros (describir)', pideTexto: true },
];

/** Seccion VII. `codigo` es estable para poder citarlo desde los reportes. */
const ANTECEDENTES: {
  codigo: string;
  grupo: GrupoAntecedente;
  texto: string;
  pideDetalle?: boolean;
  pideFecha?: boolean;
  pideNumero?: boolean;
  permiteNoAplica?: boolean;
}[] = [
  // ── Medicos ────────────────────────────────────────────────────────────
  { codigo: 'MED_ASMA', grupo: 'MEDICO', texto: 'Asma bronquial' },
  { codigo: 'MED_CARDIOPATIA', grupo: 'MEDICO', texto: 'Cardiopatía' },
  { codigo: 'MED_ITS', grupo: 'MEDICO', texto: 'ITS' },
  { codigo: 'MED_INF_URINARIAS', grupo: 'MEDICO', texto: 'Infecciones urinarias' },
  { codigo: 'MED_MEDICAMENTOS', grupo: 'MEDICO', texto: 'Toma medicamentos', pideDetalle: true },
  { codigo: 'MED_PSICOSOCIAL', grupo: 'MEDICO', texto: 'Trastorno psicosocial' },
  { codigo: 'MED_VIOLENCIA_GENERO', grupo: 'MEDICO', texto: 'Violencia basada en género' },
  { codigo: 'MED_DIABETES', grupo: 'MEDICO', texto: 'Diabetes' },
  { codigo: 'MED_CANCER', grupo: 'MEDICO', texto: 'Cáncer' },
  { codigo: 'MED_NEUROPATIA', grupo: 'MEDICO', texto: 'Neuropatía' },
  { codigo: 'MED_DESNUTRICION', grupo: 'MEDICO', texto: 'Desnutrición' },
  { codigo: 'MED_VIOLENCIA_INTRAFAMILIAR', grupo: 'MEDICO', texto: 'Violencia intrafamiliar' },
  {
    codigo: 'MED_CONDUCTAS_ANORMALES',
    grupo: 'MEDICO',
    texto: 'Conductas anormales (suicidas, alimentarias, etc.)',
  },
  { codigo: 'MED_HIPERTENSION', grupo: 'MEDICO', texto: 'Hipertensión arterial' },
  { codigo: 'MED_TB', grupo: 'MEDICO', texto: 'Tb' },
  { codigo: 'MED_CHAGAS', grupo: 'MEDICO', texto: 'Chagas' },
  {
    codigo: 'MED_VACUNA_TD',
    grupo: 'MEDICO',
    texto: 'Antecedente de vacuna Td',
    pideNumero: true,
    pideFecha: true,
  },
  { codigo: 'MED_SR', grupo: 'MEDICO', texto: 'SR', permiteNoAplica: true },

  // ── Familiares ─────────────────────────────────────────────────────────
  { codigo: 'FAM_DIABETES', grupo: 'FAMILIAR', texto: 'Diabetes' },
  { codigo: 'FAM_TUBERCULOSIS', grupo: 'FAMILIAR', texto: 'Tuberculosis' },
  { codigo: 'FAM_HTA', grupo: 'FAMILIAR', texto: 'HTA' },
  { codigo: 'FAM_NEFROPATIA', grupo: 'FAMILIAR', texto: 'Nefropatía' },
  { codigo: 'FAM_CANCER', grupo: 'FAMILIAR', texto: 'Cáncer' },
  { codigo: 'FAM_OTRO', grupo: 'FAMILIAR', texto: 'Otro', pideDetalle: true },

  // ── Habitos ────────────────────────────────────────────────────────────
  { codigo: 'HAB_FUMA', grupo: 'HABITO', texto: 'Fuma', pideNumero: true },
  { codigo: 'HAB_ALCOHOL', grupo: 'HABITO', texto: 'Ingiere bebidas alcohólicas' },
  { codigo: 'HAB_DROGAS', grupo: 'HABITO', texto: 'Consumo de drogas' },
  {
    codigo: 'HAB_MULTIPLES_PAREJAS',
    grupo: 'HABITO',
    texto: 'Múltiples parejas sexuales (más de 1 pareja en los últimos tres meses)',
  },
  { codigo: 'HAB_CONDON', grupo: 'HABITO', texto: 'Usa condón en las relaciones sexuales' },
  {
    codigo: 'HAB_ACTIVIDAD_MENOS_60',
    grupo: 'HABITO',
    texto: 'Realiza actividad física: menos de 60 minutos/semana',
  },
  {
    codigo: 'HAB_ACTIVIDAD_60_149',
    grupo: 'HABITO',
    texto: 'Realiza actividad física: de 60-149 minutos/semana',
  },
  {
    codigo: 'HAB_ACTIVIDAD_MAS_150',
    grupo: 'HABITO',
    texto: 'Realiza actividad física: más de 150 minutos/semana',
  },
  {
    codigo: 'HAB_FRUTAS_VERDURAS',
    grupo: 'HABITO',
    texto: 'Consume 5 porciones diarias de frutas y verduras',
  },
];

/**
 * Seccion IX. Los 14 problemas, con sus signos a evaluar y sus diagnosticos.
 *
 * `signos` es lo que el papel manda subrayar en la columna EVALUAR;
 * `diagnosticos`, lo que se subraya en DIAGNOSTICAR/CLASIFICAR.
 */
const PROBLEMAS: { nombre: string; signos: string[]; diagnosticos: string[] }[] = [
  {
    nombre: 'Tos o dificultad para respirar',
    signos: ['Sibilancia', 'Tos crónica', 'Estridores'],
    diagnosticos: ['Neumonía grave', 'Neumonía', 'Resfriado', 'Tuberculosis', 'Asma', 'Otro'],
  },
  {
    nombre: 'Oído y garganta',
    signos: [
      'Tumefacción atrás de la oreja',
      'Dolor de oído con supuración visible',
      'Menos o más de 14 días',
      'Puntos sépticos en amígdalas',
      'Ganglios linfáticos en el cuello',
    ],
    diagnosticos: [
      'Mastoiditis',
      'Otitis media aguda',
      'Otitis media crónica',
      'Amigdalitis bacteriana',
      'Amigdalitis viral',
    ],
  },
  {
    nombre: 'Bucodental',
    signos: [
      'Caries, inflamación de encías, lesiones destructivas avanzadas',
      'Masas - úlceras',
      'Placas blandas en boca y garganta',
    ],
    diagnosticos: [
      'Caries dental',
      'Gingivitis',
      'Periodontitis',
      'Sospecha de cáncer bucofaríngeo',
      'Otro',
    ],
  },
  {
    nombre: 'Diarrea',
    signos: ['Deshidratación', 'Heces sanguinolentas', 'Más de 14 días'],
    diagnosticos: [
      'Diarrea con DHE grave',
      'Diarrea con DHE',
      'Diarrea sin DHE',
      'Diarrea persistente',
      'Disentería',
    ],
  },
  {
    nombre: 'Fiebre',
    signos: [
      'En zona de alto riesgo de malaria o dengue',
      'Fiebre recurrente - dolor retroorbitario',
      'Rash cutáneo',
      'Hemorragias',
      'Ictericia',
      'Heces blanquecinas, orina obscura',
      'Adenopatía, linfadenopatía',
      'Hepatomegalia',
    ],
    diagnosticos: ['Malaria', 'Dengue', 'Hepatitis', 'Chagas', 'Leptospirosis', 'Otro'],
  },
  {
    nombre: 'Piel',
    signos: ['Nódulos, granos, úlceras, ampollas', 'Rash, ronchas'],
    diagnosticos: ['Leishmaniasis', 'Dermatitis', 'Piodermitis', 'Otro'],
  },
  {
    nombre: 'ITS',
    signos: [
      'Dolor o ardor al orinar',
      'Secreción uretral',
      'Secreción vaginal',
      'Secreción anal',
      'Papilomas genitales, orales o anales',
      'Prurito vaginal',
      'Úlceras orales o en genitales',
      'Ganglios inguinales',
      'Dolor abdominal inferior',
      'Lesiones en piel y/o mucosas',
    ],
    diagnosticos: [
      'Clasificar y tratar de acuerdo a enfoque sindrómico',
      'Ofertar consejería a pruebas de VIH y/o referir a nivel correspondiente',
    ],
  },
  {
    nombre: 'Suplementación con micronutrientes',
    signos: [
      'Palidez palmar, conjuntivas y mucosas de la boca',
      'Problemas de alimentación',
      'Peso inadecuado',
    ],
    diagnosticos: ['Anemia grave', 'Anemia', 'Bajo peso', 'Sobrepeso', 'Obesidad'],
  },
  {
    nombre: 'Signos de alerta de diabetes',
    signos: [
      'Sed intensa',
      'Disminución de peso',
      'Aumento de apetito',
      'Orina frecuente',
      'Deshidratación',
      'Respiración rápida',
    ],
    diagnosticos: ['Diabetes a descartar'],
  },
  {
    nombre: 'Signos de alerta de hipertensión / insuficiencia cardiaca',
    signos: [
      'Letargia',
      'Sudoración excesiva',
      'Convulsiones',
      'Dolor precordial',
      'Edema',
      'Palidez generalizada',
      'Anuria, epistaxis',
      'Dificultad para respirar al estar acostado',
      'Edema en pies al final del día',
    ],
    diagnosticos: [
      'Hipertensión arterial',
      'Sospecha de insuficiencia cardiaca',
      'Problemas renales',
      'Otros',
    ],
  },
  {
    nombre: 'Signos de alerta para diagnóstico precoz de cáncer',
    signos: [
      'Tos crónica',
      'Ronquera inexplicable',
      'Pérdida de peso',
      'Sangrados anormales',
      'Masas',
      'Heces planas y delgadas',
      'Indigestiones o dificultad para tragar',
      'Fiebres sin causa aparente',
      'Dificultad para orinar',
    ],
    diagnosticos: ['Sospecha de cáncer', 'Otro'],
  },
  {
    nombre: 'Necesidades de planificación familiar',
    signos: ['Necesidad de espaciar otro embarazo', 'Deseo de no tener más hijos'],
    diagnosticos: ['Planificación familiar temporal', 'Planificación familiar definitiva'],
  },
  {
    nombre: 'Psicosociales',
    signos: [],
    diagnosticos: ['De acuerdo a hallazgo encontrado'],
  },
  {
    nombre: 'Otros',
    signos: ['Intoxicaciones, traumas, mordeduras de perros, etc.', 'Otros'],
    diagnosticos: ['De acuerdo a hallazgo encontrado'],
  },
];

/** Las opciones "Otro" y "Otros" piden escribir cual. */
const PIDE_TEXTO = new Set(['Otro', 'Otros']);

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

  let signos = 0;
  let diagnosticos = 0;

  await prisma.$transaction(async (tx) => {
    // ── Signos de peligro ────────────────────────────────────────────────
    for (const [i, s] of SIGNOS_DE_PELIGRO.entries()) {
      await tx.signoPeligro.upsert({
        where: { tipoFicha_orden: { tipoFicha: TIPO, orden: i + 1 } },
        create: { tipoFicha: TIPO, orden: i + 1, texto: s.texto, pideTexto: s.pideTexto ?? false },
        update: { texto: s.texto, pideTexto: s.pideTexto ?? false, activo: true },
      });
    }

    // ── Antecedentes ─────────────────────────────────────────────────────
    for (const [i, a] of ANTECEDENTES.entries()) {
      const fila = await tx.catalogoAntecedente.upsert({
        where: { codigo: a.codigo },
        create: {
          codigo: a.codigo,
          grupo: a.grupo,
          texto: a.texto,
          pideDetalle: a.pideDetalle ?? false,
          pideFecha: a.pideFecha ?? false,
          pideNumero: a.pideNumero ?? false,
          permiteNoAplica: a.permiteNoAplica ?? false,
        },
        update: {
          grupo: a.grupo,
          texto: a.texto,
          pideDetalle: a.pideDetalle ?? false,
          pideFecha: a.pideFecha ?? false,
          pideNumero: a.pideNumero ?? false,
          permiteNoAplica: a.permiteNoAplica ?? false,
          activo: true,
        },
      });

      await tx.antecedenteEnFicha.upsert({
        where: { antecedenteId_tipoFicha: { antecedenteId: fila.id, tipoFicha: TIPO } },
        create: { antecedenteId: fila.id, tipoFicha: TIPO, orden: i + 1 },
        update: { orden: i + 1 },
      });
    }

    // ── Problemas, con sus signos y diagnosticos ─────────────────────────
    for (const [i, p] of PROBLEMAS.entries()) {
      const problema = await tx.problemaFicha.upsert({
        where: { tipoFicha_orden: { tipoFicha: TIPO, orden: i + 1 } },
        create: { tipoFicha: TIPO, orden: i + 1, nombre: p.nombre },
        update: { nombre: p.nombre, activo: true },
      });

      for (const [j, texto] of p.signos.entries()) {
        await tx.signoProblema.upsert({
          where: { problemaId_orden: { problemaId: problema.id, orden: j + 1 } },
          create: { problemaId: problema.id, orden: j + 1, texto },
          update: { texto, activo: true },
        });
        signos += 1;
      }

      for (const [j, texto] of p.diagnosticos.entries()) {
        await tx.diagnosticoProblema.upsert({
          where: { problemaId_orden: { problemaId: problema.id, orden: j + 1 } },
          create: { problemaId: problema.id, orden: j + 1, texto, pideTexto: PIDE_TEXTO.has(texto) },
          update: { texto, pideTexto: PIDE_TEXTO.has(texto), activo: true },
        });
        diagnosticos += 1;
      }
    }
  });

  console.log('Catalogo de la ficha de adultos:');
  console.log('  ' + SIGNOS_DE_PELIGRO.length + ' signos de peligro');
  console.log('  ' + ANTECEDENTES.length + ' antecedentes');
  console.log('  ' + PROBLEMAS.length + ' problemas');
  console.log('  ' + signos + ' signos a evaluar');
  console.log('  ' + diagnosticos + ' diagnosticos posibles');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo sembrar el catalogo:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
