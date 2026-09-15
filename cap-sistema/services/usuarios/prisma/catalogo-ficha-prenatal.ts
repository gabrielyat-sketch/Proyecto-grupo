/**
 * Catalogo de la ficha clinica prenatal y/o posparto.
 *
 * Transcrito del formulario oficial del MSPAS que el CAP entregó
 * (`docs/pdfs/ficha clínica prenatal y posparto .pdf`), leido pagina por
 * pagina. El texto de cada opcion se copia TAL CUAL aparece impreso: si la
 * pantalla dijera algo distinto, el personal tendria que traducir mentalmente
 * en cada captura.
 *
 * Siembra DOS tipos de ficha, no uno. Las paginas 1 y 2 son la hoja prenatal;
 * la 3 y la 4 son la evaluacion del posparto, que reinicia la numeracion de
 * secciones y trae otros signos de peligro y otra consejeria. Ver la decision 1
 * de `docs/diseno-ficha-prenatal.md`.
 *
 * Ninguno de los dos tipos siembra problemas: esta ficha no trae matriz. El
 * papel lo resuelve con una fila que dice "Problemas detectados" y una raya
 * para escribir, y esa raya vive cifrada en `FichaPrenatal`.
 *
 * Es idempotente: se puede correr las veces que haga falta. Cada elemento se
 * identifica por su posicion en el formulario, no por un id generado, asi que
 * volver a ejecutarlo actualiza los textos en vez de duplicar el catalogo.
 *
 * Uso:  npm run catalogo:prenatal -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient, type GrupoAntecedente } from '../generado';

cargarDotenv({ quiet: true });

const PRENATAL = 'PRENATAL' as const;
const POSPARTO = 'POSPARTO' as const;

/**
 * Seccion III de la hoja prenatal. Los OCHO signos de peligro del embarazo.
 *
 * El papel encabeza el recuadro con la conducta: "Marque en los cuadros
 * correspondientes de SI o NO lo encontrado en la evaluacion. De acuerdo al
 * nivel de resolucion, trate o refiera".
 *
 * El orden es el impreso, leyendo las dos columnas por filas, que es como se
 * recorre la hoja con el lapiz.
 */
const SIGNOS_PRENATAL: string[] = [
  'Hemorragia vaginal',
  'Dolor abdominal severo (epigastralgia)',
  'Dolor de cabeza severo',
  'Presión arterial alta',
  'Visión borrosa',
  'Fiebre',
  'Convulsión',
  'Presentaciones fetales anormales',
];

/**
 * Seccion III de la hoja del posparto. Otros ocho.
 *
 * Siete son los mismos que en el embarazo. El octavo cambia —"presentaciones
 * fetales anormales" no tiene sentido cuando ya nacio— y en su lugar el papel
 * imprime los coagulos con mal olor. La presion arterial alta viene aqui con
 * su cifra: "(140/90)". El orden tampoco es el mismo: la fiebre sube.
 *
 * Es exactamente el motivo por el que el posparto es su propio tipo de ficha.
 */
const SIGNOS_POSPARTO: string[] = [
  'Hemorragia vaginal',
  'Dolor abdominal severo (epigastralgia)',
  'Dolor de cabeza severo',
  'Presión arterial alta (140/90)',
  'Visión borrosa',
  'Convulsiones',
  'Fiebre',
  'Coágulos con mal olor (Loquios)',
];

/**
 * Seccion VII de la hoja prenatal, bloque de antecedentes MEDICOS.
 *
 * Casi todos ya existen en el catalogo porque la ficha de adultos los pide
 * tambien, y se REUTILIZAN por su codigo en vez de crear filas nuevas: un
 * antecedente es del paciente, no de la hoja. Si a una mujer se le registro
 * asma en una consulta de adultos, tiene que aparecer marcada cuando llegue
 * embarazada.
 *
 * Eso trae una diferencia que conviene decir: el papel de adultos imprime "Tb"
 * y el prenatal imprime "Tuberculosis". Es la misma enfermedad y la misma fila.
 * Se conserva el texto que ya estaba, porque cambiarlo aqui lo cambiaria
 * tambien en la ficha de adultos.
 *
 * Los antecedentes gineco-obstetricos del mismo recuadro —FUR, gestas, partos,
 * cesareas, tamizaje de cervix, tipo de sangre— NO van aqui: no son casillas de
 * SI/NO, tienen valor propio, y ya viven en `AntecedentesObstetricos`.
 */
const ANTECEDENTES: {
  codigo: string;
  grupo: GrupoAntecedente;
  texto: string;
  pideDetalle?: boolean;
  pideFecha?: boolean;
  pideNumero?: boolean;
  permiteNoAplica?: boolean;
}[] = [
  // ── Las dos columnas del papel, leidas por filas ───────────────────────
  { codigo: 'MED_ASMA', grupo: 'MEDICO', texto: 'Asma bronquial' },
  { codigo: 'MED_DIABETES', grupo: 'MEDICO', texto: 'Diabetes' },
  { codigo: 'MED_HIPERTENSION', grupo: 'MEDICO', texto: 'Hipertensión arterial' },
  { codigo: 'MED_CARDIOPATIA', grupo: 'MEDICO', texto: 'Cardiopatía' },
  { codigo: 'MED_CANCER', grupo: 'MEDICO', texto: 'Cáncer' },
  { codigo: 'MED_TB', grupo: 'MEDICO', texto: 'Tb' },
  { codigo: 'MED_ITS', grupo: 'MEDICO', texto: 'ITS' },
  { codigo: 'MED_NEUROPATIA', grupo: 'MEDICO', texto: 'Neuropatía' },
  { codigo: 'MED_CHAGAS', grupo: 'MEDICO', texto: 'Chagas' },
  { codigo: 'MED_INF_URINARIAS', grupo: 'MEDICO', texto: 'Infecciones urinarias' },

  // ── Las filas sueltas ──────────────────────────────────────────────────
  { codigo: 'MED_MEDICAMENTOS', grupo: 'MEDICO', texto: 'Toma medicamentos', pideDetalle: true },
  { codigo: 'MED_PSICOSOCIAL', grupo: 'MEDICO', texto: 'Trastorno psicosocial' },
  { codigo: 'MED_VIOLENCIA_INTRAFAMILIAR', grupo: 'MEDICO', texto: 'Violencia intrafamiliar' },
  { codigo: 'MED_VIOLENCIA_GENERO', grupo: 'MEDICO', texto: 'Violencia basada en género' },
  // Nuevo: la ficha de adultos no pregunta por cirugias previas y esta si.
  // Lleva raya para escribir cual, asi que pide detalle.
  { codigo: 'MED_QUIRURGICOS', grupo: 'MEDICO', texto: 'Quirúrgicos', pideDetalle: true },

  // ── Habitos ────────────────────────────────────────────────────────────
  { codigo: 'HAB_FUMA', grupo: 'HABITO', texto: 'Fuma', pideNumero: true },
  { codigo: 'HAB_ALCOHOL', grupo: 'HABITO', texto: 'Ingiere bebidas alcohólicas' },
  { codigo: 'HAB_DROGAS', grupo: 'HABITO', texto: 'Consumo de drogas' },

  // ── Vacunacion ─────────────────────────────────────────────────────────
  {
    codigo: 'MED_VACUNA_TD',
    grupo: 'MEDICO',
    texto: 'Antecedente de vacuna Td',
    pideNumero: true,
    pideFecha: true,
  },
  { codigo: 'MED_SR', grupo: 'MEDICO', texto: 'SR', permiteNoAplica: true },

  // Nuevo: la ultima raya del recuadro, "Otros antecedentes: ______".
  { codigo: 'MED_OTROS', grupo: 'MEDICO', texto: 'Otros antecedentes', pideDetalle: true },
];

/**
 * La tabla de consejeria del pie de la hoja prenatal. NUEVE temas.
 *
 * A diferencia de la ficha de neonato, aqui el papel no trae columna de fecha
 * de reconsulta: son casillas de SI/NO por control. El modelo la admite igual y
 * se deja vacia; no hace falta una tabla aparte para una columna que esta hoja
 * no imprime.
 */
const TEMAS_PRENATAL: string[] = [
  'Alimentación durante el embarazo',
  'Señales de peligro embarazo',
  'Consejería pre/post prueba VIH',
  'Plan de parto',
  'Plan de emergencia familiar y comunitario',
  'Lactancia materna exclusiva/MELA',
  'Otros métodos de planificación familiar',
  'Importancia del control posparto',
  'Vacunación y cuidados del recién nacido/a',
];

/**
 * La consejeria del posparto. CINCO temas, y no son los mismos.
 *
 * Cuatro de los nueve del embarazo desaparecen —plan de parto, plan de
 * emergencia, señales de peligro del embarazo, control posparto— porque ya
 * ocurrio lo que anunciaban. Y aparecen dos que antes no estaban: la
 * alimentacion de la madre lactante y la lactancia en mujer VIH+.
 */
const TEMAS_POSPARTO: string[] = [
  'Lactancia materna exclusiva/MELA',
  'Planificación familiar posparto',
  'Alimentación de la madre lactante',
  'Lactancia materna a madre VIH +',
  'Mujer VIH +',
];

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

  await prisma.$transaction(async (tx) => {
    // ── Signos de peligro de las dos hojas ───────────────────────────────
    for (const [tipo, signos] of [
      [PRENATAL, SIGNOS_PRENATAL],
      [POSPARTO, SIGNOS_POSPARTO],
    ] as const) {
      for (const [i, texto] of signos.entries()) {
        await tx.signoPeligro.upsert({
          where: { tipoFicha_orden: { tipoFicha: tipo, orden: i + 1 } },
          create: { tipoFicha: tipo, orden: i + 1, texto, pideTexto: false },
          update: { texto, pideTexto: false, activo: true },
        });
      }
    }

    // ── Antecedentes: solo la hoja prenatal los pregunta ─────────────────
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
        where: { antecedenteId_tipoFicha: { antecedenteId: fila.id, tipoFicha: PRENATAL } },
        create: { antecedenteId: fila.id, tipoFicha: PRENATAL, orden: i + 1 },
        update: { orden: i + 1 },
      });
    }

    // ── Temas de consejeria de las dos hojas ─────────────────────────────
    for (const [tipo, temas] of [
      [PRENATAL, TEMAS_PRENATAL],
      [POSPARTO, TEMAS_POSPARTO],
    ] as const) {
      for (const [i, texto] of temas.entries()) {
        await tx.temaConsejeria.upsert({
          where: { tipoFicha_orden: { tipoFicha: tipo, orden: i + 1 } },
          create: { tipoFicha: tipo, orden: i + 1, texto },
          update: { texto, activo: true },
        });
      }
    }
  });

  console.log('Catalogo de la ficha prenatal y posparto:');
  console.log('  ' + SIGNOS_PRENATAL.length + ' signos de peligro del embarazo');
  console.log('  ' + SIGNOS_POSPARTO.length + ' signos de peligro del posparto');
  console.log('  ' + ANTECEDENTES.length + ' antecedentes de la hoja prenatal');
  console.log('  ' + TEMAS_PRENATAL.length + ' temas de consejeria prenatal');
  console.log('  ' + TEMAS_POSPARTO.length + ' temas de consejeria posparto');
  console.log('  0 problemas: esta ficha no trae matriz.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo sembrar el catalogo:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
