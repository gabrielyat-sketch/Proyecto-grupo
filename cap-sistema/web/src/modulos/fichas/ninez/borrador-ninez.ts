import type { CatalogoFicha, NuevaFicha } from '../servicio-fichas';
import type { CasillaSignoPeligro, FilaMedicamento, FilaProblema } from '../borrador';
import { hoy } from '../borrador';

/**
 * El estado de la hoja de consulta del lactante y niñez mientras se llena.
 *
 * Es la **página 3** del formulario, y solo ella. Las dos primeras —vacunas,
 * micronutrientes, padres, casa— no son de la consulta sino del niño: se
 * llenan a lo largo de años y van en la etapa B. El porqué está en
 * `docs/diseno-ficha-ninez.md`.
 *
 * Se parece más a la ficha de adultos que a la del neonato, porque la matriz de
 * catorce problemas es la misma forma. Lo propio de esta hoja es poco:
 *
 *  1. **El peso se teclea en libras**, que es como el papel lo pide.
 *  2. Cuatro de los catorce problemas llevan una **raya impresa** al lado
 *     —«cuánto tiempo hace», «cuántas veces por día»—, y eso viaja en la
 *     anotación de cada fila.
 *  3. La consejería son **cuatro casillas sin fecha**, no seis con fecha de
 *     reconsulta como en el neonato.
 *
 * Todo se guarda como texto mientras se escribe, igual que en las otras dos: un
 * campo numérico a medio teclear no es un número, y convertir en cada pulsación
 * pelea con quien está escribiendo.
 */

/** Los signos vitales que pide la página 3. */
export interface SignosVitalesNinez {
  temperaturaC: string;
  /** El papel pide libras. Se convierte a kilos al enviar. */
  pesoLibras: string;
  tallaCm: string;
  /** «Pulso ___ X min» en el papel. */
  pulso: string;
  /** «Respiraciones X minuto», que el problema 1 pregunta. */
  respiraciones: string;
}

export interface BorradorNinez {
  fecha: string;
  digitalizada: boolean;
  motivo: string;
  historiaProblemaActual: string;
  signosPeligro: Record<string, CasillaSignoPeligro>;
  vitales: SignosVitalesNinez;
  problemas: Record<string, FilaProblema>;
  medicamentos: FilaMedicamento[];
  /** Los cuatro temas: marcados o no. El papel no pide fecha aquí. */
  consejeria: Record<string, boolean>;
  vacunaAdministrada: string;
  referencia: string;
  fechaProximaVisita: string;
}

const vitalesVacios = (): SignosVitalesNinez => ({
  temperaturaC: '',
  pesoLibras: '',
  tallaCm: '',
  pulso: '',
  respiraciones: '',
});

export function borradorNinezVacio(catalogo: CatalogoFicha): BorradorNinez {
  const signosPeligro: Record<string, CasillaSignoPeligro> = {};
  for (const s of catalogo.signosPeligro) {
    signosPeligro[s.id] = { presente: null, detalle: '' };
  }

  const problemas: Record<string, FilaProblema> = {};
  for (const p of catalogo.problemas) {
    problemas[p.id] = {
      presente: null,
      signoIds: [],
      diagnosticoIds: [],
      otroDiagnostico: '',
      conducta: '',
      anotacion: '',
    };
  }

  const consejeria: Record<string, boolean> = {};
  for (const t of catalogo.temasConsejeria) consejeria[t.id] = false;

  return {
    fecha: hoy(),
    digitalizada: false,
    motivo: '',
    historiaProblemaActual: '',
    signosPeligro,
    vitales: vitalesVacios(),
    problemas,
    medicamentos: [],
    consejeria,
    vacunaAdministrada: '',
    referencia: '',
    fechaProximaVisita: '',
  };
}

/**
 * El formulario es para el lactante y la niñez: de 28 días a 5 años.
 *
 * El límite de arriba sale de la propia hoja, no de una convención: la gráfica
 * de peso llega hasta los 60 meses y los tramos de micronutrientes terminan en
 * «4 a <5 años». A partir de ahí el MSPAS no dice qué hoja usar, y el sistema
 * manda a la de adultos porque es la única que queda.
 */
export const EDAD_MINIMA_NINEZ_DIAS = 28;
export const EDAD_MAXIMA_NINEZ_ANIOS = 5;

/** Rangos de lo que un niño de esta edad puede tener. Fuera de esto se avisa. */
export const RANGOS_NINEZ = {
  temperaturaC: { min: 34, max: 42 },
  pesoLibras: { min: 3, max: 60 },
  tallaCm: { min: 40, max: 130 },
  pulso: { min: 60, max: 200 },
  respiraciones: { min: 15, max: 90 },
} as const;

export type CampoVitalNinez = keyof typeof RANGOS_NINEZ;

export function fueraDeRangoNinez(campo: CampoVitalNinez, valor: string): boolean {
  if (valor.trim() === '') return false;
  const n = Number(valor);
  if (!Number.isFinite(n)) return true;
  const r = RANGOS_NINEZ[campo];
  return n < r.min || n > r.max;
}

/**
 * Los umbrales de respiración rápida que el papel imprime dentro del problema 1.
 *
 * Están escritos en la hoja para que el personal los compare a mano. El sistema
 * ya tiene la edad y las respiraciones, así que puede decirlo en el momento —que
 * es donde sirve— en vez de dejarlo a una resta mental durante una consulta.
 *
 * No decide nada por su cuenta: avisa, y quien atiende marca lo que
 * corresponda. El umbral que aplica depende de la edad, así que dárselo mal
 * sería peor que no darlo.
 */
export function respiracionRapida(
  edadEnMeses: number,
  respiraciones: number,
): { rapida: boolean; umbral: number } {
  const umbral = edadEnMeses < 2 ? 60 : edadEnMeses < 12 ? 50 : 40;
  return { rapida: respiraciones >= umbral, umbral };
}

/**
 * La edad en MESES cumplidos.
 *
 * Se parte la cadena `aaaa-mm-dd` en vez de construir un `Date` con ella:
 * Guatemala es UTC-6 y la conversión correría la fecha al día anterior, que en
 * el borde de un mes cambia la edad y con ella el umbral de respiración rápida.
 */
export function edadEnMeses(fechaNacimiento: string, referencia = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return 0;
  const meses =
    (referencia.getFullYear() - anio) * 12 + (referencia.getMonth() + 1 - mes);
  // Si todavia no llego el dia del mes, el mes no esta cumplido.
  return Math.max(0, referencia.getDate() < dia ? meses - 1 : meses);
}

/** «2 años 3 meses», que es como el papel pide la edad. */
export function edadDicha(meses: number): string {
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const partes: string[] = [];
  if (anios > 0) partes.push(anios + (anios === 1 ? ' año' : ' años'));
  if (resto > 0 || anios === 0) partes.push(resto + (resto === 1 ? ' mes' : ' meses'));
  return partes.join(' ');
}

/**
 * De libras a kilos, que es como la base guarda el peso.
 *
 * El papel captura en libras y la gráfica de la etapa C las vuelve a necesitar,
 * pero el peso se guarda **una sola vez y en kilos**: es la columna que
 * alimenta los indicadores de desnutrición de todo el sistema. Guardar las dos
 * unidades daría dos verdades que un día se contradicen.
 */
export const LIBRAS_A_KILOS = 0.45359237;

export function librasAKilos(libras: number): number {
  return Math.round(libras * LIBRAS_A_KILOS * 100) / 100;
}

const texto = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim());
const numero = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? undefined : n;
};

/** Lo que se envía al servidor. Lo vacío no viaja. */
export function cuerpoDeFichaNinez(borrador: BorradorNinez): NuevaFicha {
  const signosPeligro = Object.entries(borrador.signosPeligro)
    .filter(([, s]) => s.presente !== null)
    .map(([signoId, s]) => ({ signoId, presente: s.presente as boolean }));

  const problemas = Object.entries(borrador.problemas)
    .filter(([, p]) => p.presente !== null)
    .map(([problemaId, p]) => ({
      problemaId,
      presente: p.presente as boolean,
      ...(p.signoIds.length ? { signoIds: p.signoIds } : {}),
      ...(p.diagnosticoIds.length ? { diagnosticoIds: p.diagnosticoIds } : {}),
      ...(texto(p.otroDiagnostico) ? { otroDiagnostico: texto(p.otroDiagnostico) } : {}),
      ...(texto(p.conducta) ? { conducta: texto(p.conducta) } : {}),
      ...(texto(p.anotacion) ? { anotacion: texto(p.anotacion) } : {}),
    }));

  const medicamentos = borrador.medicamentos
    .filter((m) => m.nombre.trim() !== '')
    .map((m) => ({
      nombre: m.nombre.trim(),
      ...(texto(m.dosis) ? { dosis: texto(m.dosis) } : {}),
      ...(numero(m.dias) !== undefined ? { dias: numero(m.dias) } : {}),
    }));

  // Solo viajan los temas marcados. Mandar los cuatro siempre guardaria filas
  // que dicen "no se explico nada", y el indicador de consejeria contaria como
  // atendido lo que nadie explico.
  const consejeriaTemas = Object.entries(borrador.consejeria)
    .filter(([, brindada]) => brindada)
    .map(([temaId]) => ({ temaId, brindada: true }));

  const cuerpo: NuevaFicha = {
    tipoFicha: 'NINEZ',
    motivo: borrador.motivo.trim(),
    digitalizada: borrador.digitalizada,
  };

  // La fecha solo viaja si NO es hoy: en una consulta del dia, dejarla fuera
  // deja que la ponga el servidor con la hora exacta.
  if (borrador.fecha !== hoy()) cuerpo.fecha = borrador.fecha;

  if (signosPeligro.length) cuerpo.signosPeligro = signosPeligro;
  if (problemas.length) cuerpo.problemas = problemas;
  if (medicamentos.length) cuerpo.medicamentos = medicamentos;
  if (consejeriaTemas.length) cuerpo.consejeriaTemas = consejeriaTemas;

  if (texto(borrador.historiaProblemaActual)) {
    cuerpo.historiaEnfermedad = texto(borrador.historiaProblemaActual);
  }
  if (texto(borrador.vacunaAdministrada)) {
    cuerpo.vacunaAdministrada = texto(borrador.vacunaAdministrada);
  }
  if (texto(borrador.referencia)) cuerpo.referencia = texto(borrador.referencia);
  if (borrador.fechaProximaVisita) cuerpo.fechaProximaVisita = borrador.fechaProximaVisita;

  const v = borrador.vitales;
  if (numero(v.temperaturaC) !== undefined) cuerpo.temperaturaC = numero(v.temperaturaC);
  if (numero(v.tallaCm) !== undefined) cuerpo.tallaCm = numero(v.tallaCm);
  if (numero(v.pulso) !== undefined) cuerpo.pulso = numero(v.pulso);
  if (numero(v.respiraciones) !== undefined) cuerpo.respiraciones = numero(v.respiraciones);

  const libras = numero(v.pesoLibras);
  if (libras !== undefined) cuerpo.pesoKg = librasAKilos(libras);

  return cuerpo;
}

/** true si hay algo escrito que se perdería al salir. */
export function tieneContenidoNinez(b: BorradorNinez): boolean {
  if (b.motivo.trim() !== '' || b.historiaProblemaActual.trim() !== '') return true;
  if (Object.values(b.signosPeligro).some((s) => s.presente !== null)) return true;
  if (Object.values(b.problemas).some((p) => p.presente !== null)) return true;
  if (Object.values(b.consejeria).some((c) => c)) return true;
  if (Object.values(b.vitales).some((v) => v.trim() !== '')) return true;
  if (b.medicamentos.some((m) => m.nombre.trim() !== '')) return true;
  return [b.vacunaAdministrada, b.referencia].some((v) => v.trim() !== '');
}
