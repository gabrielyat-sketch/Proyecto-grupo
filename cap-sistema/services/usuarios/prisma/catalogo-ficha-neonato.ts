/**
 * Catalogo de la ficha clinica para menor de 28 dias.
 *
 * Transcrito del formulario oficial del MSPAS que el CAP entregó
 * (`docs/pdfs/ficha clínica Menor 28dias.pdf`). El texto de cada opcion se
 * copia TAL CUAL aparece impreso: si la pantalla dijera algo distinto, el
 * personal tendria que traducir mentalmente en cada captura.
 *
 * Es idempotente: se puede correr las veces que haga falta. Cada elemento se
 * identifica por su posicion en el formulario, no por un id generado, asi que
 * volver a ejecutarlo actualiza los textos en vez de duplicar el catalogo.
 *
 * Uso:  npm run catalogo:neonato -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient, type GrupoAntecedente } from '../generado';

cargarDotenv({ quiet: true });

const TIPO = 'NEONATO' as const;

/**
 * Seccion 3. Los VEINTE signos de peligro del recien nacido.
 *
 * El papel lo dice en un recuadro con una flecha: "Si presenta alguno de estos
 * problemas, TIENE ENFERMEDAD GRAVE, actúe de acuerdo a capacidad resolutiva o
 * refiera INMEDIATAMENTE". No es un matiz: con uno solo marcado, el neonato se
 * refiere. La pantalla tiene que decirlo en el momento, no dejarlo a que el
 * personal lo recuerde.
 *
 * Van los tres bloques del papel en la misma lista, porque los tres son
 * casillas de la seccion 3 y el modelo de datos solo distingue por orden. Los
 * dos ultimos bloques llevan su propia conducta impresa —"si tiene capacidad
 * trate o refiera" para infeccion, "refiera a donde corresponda" para
 * malformaciones— y eso lo dice la pantalla, no el catalogo.
 */
const SIGNOS_DE_PELIGRO: { texto: string; pideTexto?: boolean }[] = [
  // ── Evalué signos de peligro (1-20): enfermedad grave ──────────────────
  { texto: 'No respira' },
  { texto: 'Está flácido o inconsciente' },
  { texto: 'Le cuesta respirar' },
  { texto: 'Cianosis' },
  { texto: 'Hipotermia' },
  { texto: 'Fiebre' },
  { texto: 'No succiona' },
  { texto: 'Pesa menos de 5 libras 8 onzas' },
  { texto: 'Letárgico' },
  { texto: 'Convulsiones' },
  { texto: 'No defeca en 48 horas' },
  { texto: 'Distensión abdominal' },
  { texto: 'Vómitos o salivación excesiva' },
  { texto: 'Tiraje subcostal grave' },
  { texto: 'Respiración rápida' },
  { texto: 'Aleteo nasal' },
  { texto: 'Quejido' },
  { texto: 'Abombamiento de fontanela' },
  { texto: 'Supuración de oído' },
  { texto: 'Pústulas en la piel, mucosa' },
  // ── Evaluar infección (21-23): tratar o referir ────────────────────────
  { texto: 'Enrojecimiento del ombligo' },
  { texto: 'Pústulas aisladas en la piel' },
  { texto: 'Secreción purulenta de los ojos' },
  // ── Evaluar malformaciones (24-27): referir a donde corresponda ────────
  { texto: 'Labio leporino' },
  { texto: 'Paladar hendido' },
  { texto: 'Anomalías del tubo neural (Espina Bífida)' },
  { texto: 'Hidrocefalia' },
];

/**
 * Seccion 4. Antecedentes maternos y del parto.
 *
 * Aqui el paciente es el niño pero **los antecedentes son de la madre**. El
 * propio formulario lo asume: dice "Revisar ficha de control prenatal y post
 * parto de la madre". Por eso los codigos llevan el prefijo `MAT_`: son del
 * mismo catalogo compartido que los de la ficha de adultos, y sin el prefijo
 * "Diabetes" del neonato y "Diabetes" del adulto serian el mismo antecedente
 * cuando no lo son — uno es de la madre y el otro del propio paciente.
 *
 * Los antecedentes del parto (peso al nacer, tipo de parto, quien atendio)
 * NO estan aqui: no son casillas de si/no sino campos con valor propio, y van
 * en el modelo de la atencion. Meterlos como antecedentes obligaria a guardar
 * "3200 gramos" en una casilla que solo sabe decir SI o NO.
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
  // ── Medicos de la madre ────────────────────────────────────────────────
  { codigo: 'MAT_DIABETES', grupo: 'MEDICO', texto: 'Diabetes' },
  { codigo: 'MAT_HIPERTENSION', grupo: 'MEDICO', texto: 'Hipertensión' },
  { codigo: 'MAT_TB', grupo: 'MEDICO', texto: 'TB' },
  { codigo: 'MAT_ITS', grupo: 'MEDICO', texto: 'ITS' },
  { codigo: 'MAT_VIH_SIDA', grupo: 'MEDICO', texto: 'VIH/SIDA' },
  {
    codigo: 'MAT_MEDICAMENTO',
    grupo: 'MEDICO',
    texto: 'Toma o tomó algún medicamento',
    pideDetalle: true,
  },
  { codigo: 'MAT_OTRO', grupo: 'MEDICO', texto: 'Otro antecedente', pideDetalle: true },
  { codigo: 'MAT_QUIRURGICOS', grupo: 'MEDICO', texto: 'Quirúrgicos', pideDetalle: true },
  // ── Habitos de la madre ────────────────────────────────────────────────
  { codigo: 'MAT_FUMA', grupo: 'HABITO', texto: 'Fuma' },
  { codigo: 'MAT_ALCOHOL', grupo: 'HABITO', texto: 'Bebe alcohol en abundancia' },
  { codigo: 'MAT_DROGAS', grupo: 'HABITO', texto: 'Utiliza Drogas' },
];

/**
 * Seccion 6. Los diez problemas a revisar.
 *
 * Las columnas del papel son cuatro: el problema con sus casillas SI/NO, lo
 * que hay que INVESTIGAR (preguntar y observar), el DIAGNOSTICO a subrayar, y
 * el TRATAMIENTO. Las dos de en medio son las que aqui se llaman signos y
 * diagnosticos.
 *
 * Dos filas se salen del molde y hay que saberlo:
 *
 *  - **VIH-SIDA** no tiene casillas SI/NO en el papel: su columna de
 *    diagnostico es una instruccion ("verificar que esté en control en
 *    servicio hospitalario o referir"). Se deja como problema para que el
 *    personal reconozca la fila, pero su "diagnostico" es esa conducta.
 *  - **Problemas del acompañante** remite a otra ficha. Es la unica fila que
 *    no habla del neonato: en el CAP la madre llega con el niño, y si ella
 *    tiene un problema hay que atenderla con SU ficha.
 */
const PROBLEMAS: { nombre: string; signos: string[]; diagnosticos: string[] }[] = [
  {
    nombre: 'Diarrea',
    signos: [
      'Ojos hundidos',
      'Signo de pliegue cutáneo',
      'Heces sanguinolentas',
      'Más de 14 días',
    ],
    diagnosticos: [
      'Diarrea con DHE',
      'Diarrea sin DHE',
      'Diarrea persistente',
      'Disentería',
    ],
  },
  {
    nombre: 'Piel',
    signos: [
      'Ombligo eritematoso o con secreción purulenta SIN extensión a piel',
      'Pústulas en piel pocas o localizadas',
    ],
    diagnosticos: ['Infección local'],
  },
  {
    nombre: 'ITS',
    signos: [
      'Edema palpebral, secreción purulenta conjuntival',
      'Hígado, bazo palpable, linfadenopatía, rash palmar, Ictericia',
    ],
    diagnosticos: ['Conjuntivitis Palpebral', 'Sífilis Congénita'],
  },
  {
    nombre: 'Nutrición',
    signos: [
      'Peso edad',
      'Se alimenta al pecho menos de 8 veces al día',
      'Verificar técnica de amamantamiento',
      'Toma otros líquidos, leche o alimentos a parte del pecho',
    ],
    diagnosticos: [
      'Bajo peso al nacer',
      'Problemas de alimentación',
      'No mama suficiente',
      'Agarre deficiente de pecho',
      'Estado nutricional normal',
    ],
  },
  {
    nombre: 'Vacunación',
    signos: ['Revisión de BCG'],
    diagnosticos: ['Esquema iniciado', 'Esquema sin iniciar'],
  },
  {
    nombre: 'Discapacidades',
    signos: ['Discapacidad, visual, luxación de cadera, pie equino, pie plano'],
    diagnosticos: ['Clasifique de acuerdo a discapacidad'],
  },
  {
    nombre: 'Salud Buco-Dental',
    signos: [
      'Falta de unión de los lóbulos de los labios',
      'Falta de unión o espacio en el paladar',
      'Placas blancas en la boca',
      'Presencia de dientes al nacimiento',
    ],
    diagnosticos: ['Labio y paladar hendido', 'Micosis', 'Dientes Neonatales'],
  },
  {
    nombre: 'VIH-SIDA',
    signos: ['Sin madre o RN (VIH+)'],
    diagnosticos: [
      'Verificar que esté en control en servicio hospitalario o referir',
      'Consejería sobre opciones de lactancia',
    ],
  },
  {
    nombre: 'Otros problemas',
    signos: ['¿Tiene otro problema adicional de salud?'],
    diagnosticos: ['Clasifique de acuerdo a su criterio profesional'],
  },
  {
    nombre: 'Problemas del acompañante',
    signos: ['Post-parto, Planificación Familiar, otro'],
    diagnosticos: ['Utilice Ficha clínica correspondiente'],
  },
];

/**
 * La tabla de consejeria del pie de la ficha.
 *
 * En la ficha de adultos la consejeria es un texto libre. Aqui son SEIS temas
 * impresos, cada uno con su casilla y su columna de FECHA RECONSULTA: no es
 * una nota, es una lista de lo que hay que explicarle a la madre antes de que
 * se vaya, y cuando debe volver por cada cosa.
 */
const TEMAS_CONSEJERIA: string[] = [
  'Técnica de amamantamiento',
  'Cuidados del cordón umbilical',
  'Medidas preventivas de higiene',
  'Monitoreo del crecimiento',
  'Vacunación (Edades recomendadas para vacunación)',
  'Signos generales de peligro del neonato',
];

/**
 * Diagnosticos que en el papel llevan una linea o un parentesis para escribir.
 *
 * Mismo criterio que en la ficha de adultos: si el formulario deja espacio
 * para texto, la pantalla tambien.
 */
const PIDE_TEXTO = new Set<string>([
  'Clasifique de acuerdo a discapacidad',
  'Clasifique de acuerdo a su criterio profesional',
]);

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

    // ── Temas de consejeria ──────────────────────────────────────────────
    for (const [i, texto] of TEMAS_CONSEJERIA.entries()) {
      await tx.temaConsejeria.upsert({
        where: { tipoFicha_orden: { tipoFicha: TIPO, orden: i + 1 } },
        create: { tipoFicha: TIPO, orden: i + 1, texto },
        update: { texto, activo: true },
      });
    }
  });

  console.log('Catalogo de la ficha de menor de 28 dias:');
  console.log('  ' + SIGNOS_DE_PELIGRO.length + ' signos de peligro');
  console.log('  ' + ANTECEDENTES.length + ' antecedentes maternos');
  console.log('  ' + PROBLEMAS.length + ' problemas');
  console.log('  ' + signos + ' signos a evaluar');
  console.log('  ' + diagnosticos + ' diagnosticos posibles');
  console.log('  ' + TEMAS_CONSEJERIA.length + ' temas de consejeria');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo sembrar el catalogo:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
