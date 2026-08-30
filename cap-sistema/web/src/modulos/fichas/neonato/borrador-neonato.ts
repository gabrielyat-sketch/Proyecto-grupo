import type { CatalogoFicha, NuevaFicha } from '../servicio-fichas';
import type { CasillaSignoPeligro, FilaMedicamento, FilaProblema } from '../borrador';
import { hoy } from '../borrador';

/**
 * El estado de la ficha de menor de 28 días mientras se llena.
 *
 * Comparte con la de adultos casi todo —signos de peligro, problemas,
 * medicamentos— y se separa en tres cosas, que son las tres del papel:
 *
 *  1. El peso va en **libras y onzas**, no en kilos.
 *  2. Trae los **antecedentes del parto**, que tienen valor propio.
 *  3. La consejería son **seis temas con fecha de reconsulta**, no un texto.
 *
 * Todo se guarda como texto mientras se escribe, igual que en la ficha de
 * adultos: un campo numérico a medio teclear no es un número, y convertir en
 * cada pulsación pelea con quien está escribiendo.
 */

/** Los tres bloques en que el papel parte los signos de peligro. */
export type BloqueSigno = 'PELIGRO' | 'INFECCION' | 'MALFORMACION';

/**
 * Dónde empieza cada bloque, por su orden en el catálogo.
 *
 * El papel los imprime en tres recuadros con conductas distintas y el modelo
 * de datos solo distingue por orden, así que el corte vive aquí. Si el MSPAS
 * cambiara el formulario, esto es lo primero que hay que revisar.
 */
export const PRIMER_SIGNO_INFECCION = 21;
export const PRIMER_SIGNO_MALFORMACION = 24;

export function bloqueDelSigno(orden: number): BloqueSigno {
  if (orden >= PRIMER_SIGNO_MALFORMACION) return 'MALFORMACION';
  if (orden >= PRIMER_SIGNO_INFECCION) return 'INFECCION';
  return 'PELIGRO';
}

/** La conducta que el papel imprime junto a cada bloque. */
export const CONDUCTA_DEL_BLOQUE: Record<BloqueSigno, string> = {
  PELIGRO:
    'Si presenta alguno de estos problemas, TIENE ENFERMEDAD GRAVE: actúe de acuerdo a capacidad resolutiva o refiera INMEDIATAMENTE.',
  INFECCION: 'Si tiene capacidad, trate o refiera.',
  MALFORMACION: 'Refiera a donde corresponda.',
};

/** Una fila de la tabla de consejería del pie de la ficha. */
export interface FilaConsejeria {
  brindada: boolean;
  /** Como `aaaa-mm-dd`. Vacío si no se anotó reconsulta. */
  fechaReconsulta: string;
}

/** Los campos del examen físico, tal como los pide el papel. */
export interface ExamenNeonato {
  temperaturaC: string;
  pesoLibras: string;
  pesoOnzas: string;
  /** «FC ___ X min» en el papel. */
  pulso: string;
  respiraciones: string;
  tallaCm: string;
  perimetroBraquialCm: string;
  /** «CC» en el papel: circunferencia cefálica. */
  circunferenciaCefalicaCm: string;
}

/** Los antecedentes del parto de la sección 4. */
export interface Parto {
  pesoNacerLibras: string;
  pesoNacerOnzas: string;
  lloroAlNacer: boolean | null;
  nacioCianotico: boolean | null;
  horasTrabajoParto: string;
  quienAtendioParto: string;
  quienAtendioPartoOtro: string;
  rupturaPrematuraMembranas: boolean;
  trabajoPartoPrematuro: boolean;
  partoProlongado: boolean;
  tipoParto: string;
  bcg: boolean | null;
  tdMadre: boolean | null;
  tdMadreDosis: string;
  lactanciaMaternaExclusiva: boolean | null;
}

export interface BorradorNeonato {
  fecha: string;
  digitalizada: boolean;
  nombreMadre: string;
  motivo: string;
  signosPeligro: Record<string, CasillaSignoPeligro>;
  antecedentes: Record<string, { respuesta: boolean | null; detalle: string }>;
  parto: Parto;
  examen: ExamenNeonato;
  problemas: Record<string, FilaProblema>;
  medicamentos: FilaMedicamento[];
  consejeria: Record<string, FilaConsejeria>;
  referencia: string;
  diagnostico: string;
  tratamiento: string;
  notas: string;
  fechaProximaVisita: string;
}

const partoVacio = (): Parto => ({
  pesoNacerLibras: '',
  pesoNacerOnzas: '',
  lloroAlNacer: null,
  nacioCianotico: null,
  horasTrabajoParto: '',
  quienAtendioParto: '',
  quienAtendioPartoOtro: '',
  rupturaPrematuraMembranas: false,
  trabajoPartoPrematuro: false,
  partoProlongado: false,
  tipoParto: '',
  bcg: null,
  tdMadre: null,
  tdMadreDosis: '',
  lactanciaMaternaExclusiva: null,
});

const examenVacio = (): ExamenNeonato => ({
  temperaturaC: '',
  pesoLibras: '',
  pesoOnzas: '',
  pulso: '',
  respiraciones: '',
  tallaCm: '',
  perimetroBraquialCm: '',
  circunferenciaCefalicaCm: '',
});

export function borradorNeonatoVacio(catalogo: CatalogoFicha): BorradorNeonato {
  const signosPeligro: Record<string, CasillaSignoPeligro> = {};
  for (const s of catalogo.signosPeligro) {
    signosPeligro[s.id] = { presente: null, detalle: '' };
  }

  const antecedentes: Record<string, { respuesta: boolean | null; detalle: string }> = {};
  for (const a of catalogo.antecedentes) {
    antecedentes[a.id] = { respuesta: null, detalle: '' };
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

  const consejeria: Record<string, FilaConsejeria> = {};
  for (const t of catalogo.temasConsejeria) {
    consejeria[t.id] = { brindada: false, fechaReconsulta: '' };
  }

  return {
    fecha: hoy(),
    digitalizada: false,
    nombreMadre: '',
    motivo: '',
    signosPeligro,
    antecedentes,
    parto: partoVacio(),
    examen: examenVacio(),
    problemas,
    medicamentos: [],
    consejeria,
    referencia: '',
    diagnostico: '',
    tratamiento: '',
    notas: '',
    fechaProximaVisita: '',
  };
}

/** Rangos de lo que un recién nacido puede tener. Fuera de esto se avisa. */
export const RANGOS_NEONATO = {
  temperaturaC: { min: 34, max: 41 },
  pesoLibras: { min: 0, max: 15 },
  pesoOnzas: { min: 0, max: 15 },
  pulso: { min: 80, max: 200 },
  respiraciones: { min: 20, max: 90 },
  tallaCm: { min: 30, max: 60 },
  perimetroBraquialCm: { min: 5, max: 20 },
  circunferenciaCefalicaCm: { min: 25, max: 45 },
} as const;

export type CampoExamenNeonato = keyof typeof RANGOS_NEONATO;

export function fueraDeRangoNeonato(campo: CampoExamenNeonato, valor: string): boolean {
  if (valor.trim() === '') return false;
  const n = Number(valor);
  if (!Number.isFinite(n)) return true;
  const r = RANGOS_NEONATO[campo];
  return n < r.min || n > r.max;
}

/**
 * Cuántos de los veinte primeros signos están marcados.
 *
 * Con **uno solo** el papel manda referir de inmediato, así que la pantalla lo
 * dice en el momento en vez de dejarlo a que el personal lo recuerde.
 */
export function signosGravesMarcados(
  borrador: BorradorNeonato,
  catalogo: CatalogoFicha,
): string[] {
  return catalogo.signosPeligro
    .filter(
      (s) =>
        bloqueDelSigno(s.orden) === 'PELIGRO' && borrador.signosPeligro[s.id]?.presente === true,
    )
    .map((s) => s.texto);
}

const texto = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim());
const numero = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? undefined : n;
};
const siNo = (r: boolean | null): boolean | undefined => r ?? undefined;

/** Lo que se envía al servidor. Lo vacío no viaja. */
export function cuerpoDeFichaNeonato(borrador: BorradorNeonato): NuevaFicha {
  const signosPeligro = Object.entries(borrador.signosPeligro)
    .filter(([, s]) => s.presente !== null)
    .map(([signoId, s]) => ({
      signoId,
      presente: s.presente as boolean,
      ...(texto(s.detalle) ? { detalle: texto(s.detalle) } : {}),
    }));

  const problemas = Object.entries(borrador.problemas)
    .filter(([, p]) => p.presente !== null)
    .map(([problemaId, p]) => ({
      problemaId,
      presente: p.presente as boolean,
      ...(p.signoIds.length ? { signoIds: p.signoIds } : {}),
      ...(p.diagnosticoIds.length ? { diagnosticoIds: p.diagnosticoIds } : {}),
      ...(texto(p.otroDiagnostico) ? { otroDiagnostico: texto(p.otroDiagnostico) } : {}),
      ...(texto(p.conducta) ? { conducta: texto(p.conducta) } : {}),
    }));

  const medicamentos = borrador.medicamentos
    .filter((m) => m.nombre.trim() !== '')
    .map((m) => ({
      nombre: m.nombre.trim(),
      ...(texto(m.dosis) ? { dosis: texto(m.dosis) } : {}),
      ...(numero(m.dias) !== undefined ? { dias: numero(m.dias) } : {}),
    }));

  // Solo viajan los temas con algo que decir: marcados o con fecha. Mandar los
  // seis siempre guardaria cuatro filas que dicen "no se hizo nada", y el
  // indicador de consejeria contaria como atendido lo que nadie explico.
  const consejeriaTemas = Object.entries(borrador.consejeria)
    .filter(([, c]) => c.brindada || c.fechaReconsulta !== '')
    .map(([temaId, c]) => ({
      temaId,
      brindada: c.brindada,
      ...(c.fechaReconsulta ? { fechaReconsulta: c.fechaReconsulta } : {}),
    }));

  const p = borrador.parto;
  const e = borrador.examen;
  const neonato = {
    ...(texto(borrador.nombreMadre) ? { nombreMadre: texto(borrador.nombreMadre) } : {}),
    ...(numero(e.pesoLibras) !== undefined ? { pesoLibras: numero(e.pesoLibras) } : {}),
    ...(numero(e.pesoOnzas) !== undefined ? { pesoOnzas: numero(e.pesoOnzas) } : {}),
    ...(numero(e.perimetroBraquialCm) !== undefined
      ? { perimetroBraquialCm: numero(e.perimetroBraquialCm) }
      : {}),
    ...(numero(e.circunferenciaCefalicaCm) !== undefined
      ? { circunferenciaCefalicaCm: numero(e.circunferenciaCefalicaCm) }
      : {}),
    ...(numero(p.pesoNacerLibras) !== undefined
      ? { pesoNacerLibras: numero(p.pesoNacerLibras) }
      : {}),
    ...(numero(p.pesoNacerOnzas) !== undefined
      ? { pesoNacerOnzas: numero(p.pesoNacerOnzas) }
      : {}),
    ...(siNo(p.lloroAlNacer) !== undefined ? { lloroAlNacer: siNo(p.lloroAlNacer) } : {}),
    ...(siNo(p.nacioCianotico) !== undefined ? { nacioCianotico: siNo(p.nacioCianotico) } : {}),
    ...(numero(p.horasTrabajoParto) !== undefined
      ? { horasTrabajoParto: numero(p.horasTrabajoParto) }
      : {}),
    ...(p.quienAtendioParto ? { quienAtendioParto: p.quienAtendioParto as never } : {}),
    ...(texto(p.quienAtendioPartoOtro)
      ? { quienAtendioPartoOtro: texto(p.quienAtendioPartoOtro) }
      : {}),
    ...(p.rupturaPrematuraMembranas ? { rupturaPrematuraMembranas: true } : {}),
    ...(p.trabajoPartoPrematuro ? { trabajoPartoPrematuro: true } : {}),
    ...(p.partoProlongado ? { partoProlongado: true } : {}),
    ...(p.tipoParto ? { tipoParto: p.tipoParto as never } : {}),
    ...(siNo(p.bcg) !== undefined ? { bcg: siNo(p.bcg) } : {}),
    ...(siNo(p.tdMadre) !== undefined ? { tdMadre: siNo(p.tdMadre) } : {}),
    ...(numero(p.tdMadreDosis) !== undefined ? { tdMadreDosis: numero(p.tdMadreDosis) } : {}),
    ...(siNo(p.lactanciaMaternaExclusiva) !== undefined
      ? { lactanciaMaternaExclusiva: siNo(p.lactanciaMaternaExclusiva) }
      : {}),
  };

  const cuerpo: NuevaFicha = {
    tipoFicha: 'NEONATO',
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
  if (Object.keys(neonato).length) cuerpo.neonato = neonato;

  if (texto(borrador.diagnostico)) cuerpo.diagnostico = texto(borrador.diagnostico);
  if (texto(borrador.tratamiento)) cuerpo.tratamiento = texto(borrador.tratamiento);
  if (texto(borrador.notas)) cuerpo.notas = texto(borrador.notas);
  if (texto(borrador.referencia)) cuerpo.referencia = texto(borrador.referencia);
  if (borrador.fechaProximaVisita) cuerpo.fechaProximaVisita = borrador.fechaProximaVisita;

  // El examen fisico que SI comparte con las demas fichas.
  if (numero(borrador.examen.temperaturaC) !== undefined) {
    cuerpo.temperaturaC = numero(borrador.examen.temperaturaC);
  }
  if (numero(borrador.examen.tallaCm) !== undefined) {
    cuerpo.tallaCm = numero(borrador.examen.tallaCm);
  }
  if (numero(borrador.examen.pulso) !== undefined) cuerpo.pulso = numero(borrador.examen.pulso);
  if (numero(borrador.examen.respiraciones) !== undefined) {
    cuerpo.respiraciones = numero(borrador.examen.respiraciones);
  }

  return cuerpo;
}

/** true si hay algo escrito que se perdería al salir. */
export function tieneContenidoNeonato(b: BorradorNeonato): boolean {
  if (b.motivo.trim() !== '' || b.nombreMadre.trim() !== '') return true;
  if (Object.values(b.signosPeligro).some((s) => s.presente !== null)) return true;
  if (Object.values(b.problemas).some((p) => p.presente !== null)) return true;
  if (Object.values(b.antecedentes).some((a) => a.respuesta !== null)) return true;
  if (Object.values(b.consejeria).some((c) => c.brindada || c.fechaReconsulta !== '')) return true;
  if (Object.values(b.examen).some((v) => v.trim() !== '')) return true;
  if (b.medicamentos.some((m) => m.nombre.trim() !== '')) return true;
  return [b.diagnostico, b.tratamiento, b.notas, b.referencia].some((v) => v.trim() !== '');
}

/**
 * La edad en DÍAS, que es como la pide el formulario.
 *
 * Se parte la cadena `aaaa-mm-dd` en vez de construir un `Date` con ella:
 * Guatemala es UTC-6 y la conversión correría la fecha al día anterior.
 */
export function edadEnDias(fechaNacimiento: string, referencia = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return 0;
  const nacimiento = new Date(anio, mes - 1, dia);
  const hoyLocal = new Date(
    referencia.getFullYear(),
    referencia.getMonth(),
    referencia.getDate(),
  );
  return Math.max(0, Math.round((hoyLocal.getTime() - nacimiento.getTime()) / 86_400_000));
}

/** El formulario es para menores de 28 días. */
export const EDAD_MAXIMA_NEONATO_DIAS = 28;
