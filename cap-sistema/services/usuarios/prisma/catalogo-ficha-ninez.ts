/**
 * Catalogo de la ficha clinica del lactante y ninez — hoja de consulta.
 *
 * Transcrito del formulario oficial del MSPAS que el CAP entrego
 * (`docs/pdfs/ficha clínica de la lactancia y niñez .pdf`), pagina 3. El texto
 * de cada opcion se copia TAL CUAL aparece impreso: si la pantalla dijera algo
 * distinto, el personal tendria que traducir mentalmente en cada captura.
 *
 * **Solo siembra la pagina 3.** Las paginas 1 y 2 —vacunas, micronutrientes,
 * padres y casa— no son de la consulta sino del nino, se llenan a lo largo de
 * anos y necesitan tablas propias. Van en la etapa B. El porque esta en
 * `docs/diseno-ficha-ninez.md`.
 *
 * Es idempotente: se puede correr las veces que haga falta. Cada elemento se
 * identifica por su posicion en el formulario, no por un id generado, asi que
 * volver a ejecutarlo actualiza los textos en vez de duplicar el catalogo.
 *
 * Uso:  npm run catalogo:ninez -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient } from '../generado';

cargarDotenv({ quiet: true });

const TIPO = 'NINEZ' as const;

/**
 * Seccion 1. Los cuatro signos de peligro.
 *
 * Son cuatro, no veinte como en la ficha del neonato, y el papel los pone
 * ARRIBA DEL TODO —antes incluso de identificar el servicio— con una sola
 * instruccion: "proceda de acuerdo a nivel de resolucion". Es lo primero que se
 * mira al recibir a un nino.
 *
 * La hoja de consulta lo recuerda en su encabezado: "si es reconsulta, volver a
 * investigar signos de peligro". Se preguntan en CADA visita, no una vez.
 *
 * El formulario impreso escribe "inconiente". Aqui va la palabra bien escrita:
 * una errata del papel repetida en un desplegable se lee como un descuido del
 * sistema, y el significado no cambia.
 */
const SIGNOS_DE_PELIGRO: string[] = [
  'No puede beber o tomar el pecho',
  'Vomita todo',
  'Está letárgico o inconsciente',
  'Presenta convulsiones',
];

/**
 * La matriz de la pagina 3: catorce problemas.
 *
 * Es la misma forma que la ficha de adultos —preguntar SI/NO, subrayar los
 * hallazgos, subrayar el diagnostico, anotar tratamiento—, asi que la pantalla
 * reutiliza la matriz que ya existe.
 *
 * Cuatro filas piden algo que una casilla no recoge, y el papel les imprime una
 * raya al lado. Eso viaja en `anotacion`, con la etiqueta que el formulario
 * trae escrita.
 *
 * Dos filas se salen del molde y hay que saberlo:
 *
 *  - **Signos de alerta en cancer** no da una lista de diagnosticos: da uno
 *    solo, con un parentesis para escribir la region u organo. Es de las pocas
 *    veces que el papel pide texto libre en la columna de clasificacion.
 *  - **Problemas del/la acompanante** no habla del nino. En el CAP la madre
 *    llega con el hijo, y si ella tiene un problema hay que atenderla con SU
 *    ficha: el "diagnostico" es esa instruccion.
 */
interface Problema {
  nombre: string;
  /** La raya que el papel imprime en la columna de investigar. */
  etiquetaAnotacion?: string;
  signos: string[];
  diagnosticos: string[];
}

const PROBLEMAS: Problema[] = [
  {
    nombre: 'Tos o dificultad para respirar',
    etiquetaAnotacion: 'Cuánto tiempo hace',
    signos: [
      'Observe y escuche: tiraje subcostal, estridor, sibilancias',
      'Rinorrea, malestar general sin respiración rápida',
      'Tos crónica, falta apetito, pérdida de peso',
    ],
    diagnosticos: ['Neumonía grave', 'Neumonía', 'Resfriado', 'Tuberculosis'],
  },
  {
    nombre: 'Oído y garganta',
    signos: [
      'Tumefacción atrás de la oreja',
      'Dolor de oído con supuración visible < 14 días',
      'Supuración de oído por más de 14 días',
      'Dolor de garganta',
      'Puntos sépticos en amígdalas',
      'Ganglios linfáticos en el cuello',
      'Enrojecimiento de garganta sin puntos sépticos',
    ],
    diagnosticos: [
      'Mastoiditis',
      'Otitis Media Aguda',
      'Otitis Media Crónica',
      'Faringoamigdalitis bacteriana',
      'Faringoamigdalitis viral',
    ],
  },
  {
    nombre: 'Diarrea',
    etiquetaAnotacion: 'Cuánto tiempo hace',
    signos: [
      'Letárgico, Intranquilo o Irritable, Ojos hundidos',
      'Bebe mal o no puede beber',
      'Bebe con sed, pliegue cutáneo < ó > de 2 seg.',
      'No tiene signos de Deshidratación',
      'Heces sanguinolentas',
    ],
    diagnosticos: [
      'Diarrea con DHE grave',
      'Diarrea con DHE',
      'Diarrea sin DHE',
      'Disentería',
      'Diarrea Persistente',
    ],
  },
  {
    nombre: 'Fiebre (temperatura axilar de 38°C o mayor, sin otra causa)',
    etiquetaAnotacion: 'Cuánto tiempo hace',
    signos: [
      '¿Viene o ha estado en zona endémica de malaria o dengue en los últimos 14 días?',
      'Fiebre cada 2 ó 3 días, sudoración',
      'Dolor retroorbitario, articulaciones, rash',
      'Sangrado de encías, petequias o equimosis',
      'Erupción maculo papular generalizada',
      'Coriza, ojos enrojecidos; si tuvo sarampión el último mes buscar úlceras en boca, supuración de ojos, opacidad de córnea',
      'Ictericia, heces blanquecinas, orina café',
      'Adenopatía, Linfadenopatía, Hepatomegalia',
      'Rash cutáneo, Hemorragia, Coriza',
    ],
    diagnosticos: [
      'Malaria',
      'Dengue',
      'Dengue hemorrágico sospechoso',
      'Sarampión',
      'Complicaciones de sarampión',
      'Hepatitis',
      'Chagas',
      'Enfermedades prevenibles por vacunación',
    ],
  },
  {
    nombre: 'Nutrición',
    etiquetaAnotacion: '¿Cuántas veces por día?',
    signos: [
      '0 a 6 meses: ¿le da pecho?',
      '0 a 6 meses: ¿le da otras comidas o toma otros líquidos además del pecho?',
      '6 a 24 meses: ¿le da pecho?',
      '6 a 24 meses: ¿le da otras comidas o toma otros líquidos además del pecho?',
      'Determinar si alcanzó peso mínimo mensual esperado',
      'Palidez palmar, conjuntivas y mucosas',
      'Para primera visita: emaciación visible - edema de pies',
      'Adecuación peso para talla menor 70%',
      'Adecuación 70 a 80% peso para talla',
      'Adecuación 80 a 90% peso para talla',
      'Arriba de 90% peso para talla',
    ],
    diagnosticos: [
      'No crece bien',
      'Crece bien',
      'Anemia Grave',
      'Anemia',
      'Desnutrición severa',
      'Desnutrición moderada',
      'Desnutrición Leve',
      'Nutrición normal',
    ],
  },
  {
    nombre: 'Vacunación',
    signos: ['Verificar en carnet, esquema vigente completo'],
    diagnosticos: ['Esquema completo', 'Esquema al día', 'Esquema incompleto'],
  },
  {
    nombre: 'Piel',
    signos: [
      'Úlceras crónicas múltiples en superficie expuesta de la piel',
      'Nódulos, Granos, Úlceras',
      'Rash (ronchas)',
    ],
    diagnosticos: ['Leishmaniasis cutánea', 'Piodermitis', 'Dermatitis'],
  },
  {
    nombre: 'Genito Urinario',
    signos: [
      'Dolor o ardor al orinar, Secreción Uretral, Secreción Vaginal',
      'Lactantes: Hígado, bazo palpable, linfadenopatía, rash palmar, Ictericia',
    ],
    diagnosticos: [
      'Síndrome de Secreción Uretral',
      'Síndrome de Secreción Vaginal',
      'Sífilis congénita',
    ],
  },
  {
    nombre: 'VIH-SIDA',
    signos: [
      'Para lactantes: crecimiento lento, hijo de madre VIH+, deterioro clínico',
      'Fiebre, diarrea, no succiona adecuadamente, taquipnea, convulsiones, no responde a estímulos, reflejos disminuidos, frecuencia respiratoria rápida, infecciones recurrentes o crónicas',
    ],
    diagnosticos: ['Caso sospechoso de SIDA', 'Transmisión vertical'],
  },
  {
    nombre: 'Discapacidades',
    signos: ['Capacidad auditiva, visual', 'Problemas del habla, aprendizaje'],
    diagnosticos: ['Clasifique de acuerdo a discapacidad'],
  },
  {
    nombre: 'Signos de alerta en Cáncer',
    signos: [
      'Cuadros infecciosos que se prolongan a pesar del tratamiento; fiebre por más de 3 días sin causa aparente',
      'Moretones sin golpes; epistaxis y sangrado de encías frecuentes; ganglios inflamados; cefaleas frecuentes; brillo extraño en un ojo; dolor de huesos; dolor abdominal con masa',
    ],
    diagnosticos: ['Sospecha de cáncer de'],
  },
  {
    nombre: 'Salud Buco-Dental',
    signos: ['Úlceras o placas blancas en la boca', 'Caries, Inflamación de encías'],
    diagnosticos: ['Moniliasis oral', 'Caries dental', 'Gingivitis'],
  },
  {
    nombre: 'Salud Mental y Otros problemas',
    signos: [
      'Lesiones físicas, apariencia desanimada, déficit de atención',
      '¿Tiene otro problema adicional de salud, el consultante?',
    ],
    diagnosticos: ['Clasifique de acuerdo a su criterio profesional'],
  },
  {
    nombre: 'Presenta problemas el / la acompañante',
    signos: [
      'La acompañante del niño(a) requiere atención de: embarazo, parto, posparto, planificación familiar u otro',
    ],
    diagnosticos: ['Utilice ficha clínica correspondiente'],
  },
];

/**
 * Los diagnosticos que el papel imprime con un parentesis o una raya para
 * escribir cual. Son los que llevan `pideTexto`.
 */
const PIDE_TEXTO = new Set<string>([
  'Clasifique de acuerdo a discapacidad',
  'Sospecha de cáncer de',
  'Clasifique de acuerdo a su criterio profesional',
]);

/**
 * La consejeria brindada, en la columna de tratamiento.
 *
 * Son cuatro casillas sin fecha, a diferencia de la ficha del neonato, donde
 * cada tema lleva su fecha de reconsulta. Aqui el papel solo pregunta si se
 * explico o no.
 */
const TEMAS_CONSEJERIA: string[] = [
  'Uso del medicamento',
  'Uso de sobres de rehidratación oral',
  'Alimentación de acuerdo a edad',
  'Signos generales de peligro',
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  let signos = 0;
  let diagnosticos = 0;
  let conAnotacion = 0;

  await prisma.$transaction(async (tx) => {
    // ── Seccion 1: los cuatro signos de peligro ──────────────────────────
    for (const [i, texto] of SIGNOS_DE_PELIGRO.entries()) {
      await tx.signoPeligro.upsert({
        where: { tipoFicha_orden: { tipoFicha: TIPO, orden: i + 1 } },
        create: { tipoFicha: TIPO, orden: i + 1, texto, pideTexto: false },
        update: { texto, pideTexto: false, activo: true },
      });
    }

    // ── La matriz de catorce problemas ───────────────────────────────────
    for (const [i, p] of PROBLEMAS.entries()) {
      const problema = await tx.problemaFicha.upsert({
        where: { tipoFicha_orden: { tipoFicha: TIPO, orden: i + 1 } },
        create: {
          tipoFicha: TIPO,
          orden: i + 1,
          nombre: p.nombre,
          etiquetaAnotacion: p.etiquetaAnotacion ?? null,
        },
        update: {
          nombre: p.nombre,
          etiquetaAnotacion: p.etiquetaAnotacion ?? null,
          activo: true,
        },
      });
      if (p.etiquetaAnotacion) conAnotacion += 1;

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
          create: {
            problemaId: problema.id,
            orden: j + 1,
            texto,
            pideTexto: PIDE_TEXTO.has(texto),
          },
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

  console.log('Catalogo de la ficha del lactante y ninez (hoja de consulta):');
  console.log('  ' + SIGNOS_DE_PELIGRO.length + ' signos de peligro');
  console.log('  ' + PROBLEMAS.length + ' problemas');
  console.log('  ' + conAnotacion + ' de ellos con una raya que anotar');
  console.log('  ' + signos + ' signos a evaluar');
  console.log('  ' + diagnosticos + ' diagnosticos posibles');
  console.log('  ' + TEMAS_CONSEJERIA.length + ' temas de consejeria');
  console.log('');
  console.log('Las vacunas y los micronutrientes NO entran aqui: son del nino,');
  console.log('no de la consulta. Van en la etapa B.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo sembrar el catalogo:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
