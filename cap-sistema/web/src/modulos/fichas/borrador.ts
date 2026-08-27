import type {
  AntecedenteCatalogo,
  AntecedentesPaciente,
  CatalogoFicha,
  GuardarAntecedentes,
  NuevaFicha,
  TipoFicha,
} from './servicio-fichas';

export type Respuesta = 'SI' | 'NO' | 'NO_APLICA';

/**
 * Una casilla de antecedente.
 *
 * `respuesta: null` significa "no se ha preguntado", que NO es lo mismo que
 * "no". El backend hace la misma distincion y por eso guarda un enum de tres
 * valores en vez de un booleano: para un indicador de cobertura, confundir
 * ambas cosas convierte un dato ausente en uno afirmado.
 */
export interface CasillaAntecedente {
  respuesta: Respuesta | null;
  detalle: string;
  /** aaaa-mm-dd, tal como lo entrega el input de fecha. */
  fecha: string;
  /** Se guarda como texto para distinguir "vacio" de "cero". */
  numero: string;
}

export interface CasillaSignoPeligro {
  presente: boolean | null;
  detalle: string;
}

export interface FilaProblema {
  presente: boolean | null;
  signoIds: string[];
  diagnosticoIds: string[];
  otroDiagnostico: string;
  conducta: string;
}

export interface FilaMedicamento {
  nombre: string;
  dosis: string;
  dias: string;
}

/**
 * Los campos numericos del examen fisico se guardan como TEXTO.
 *
 * Un `number` no puede representar el estado intermedio de alguien que escribio
 * "1" de camino a "158": React re-renderizaria con 1 y el cursor saltaria. Se
 * convierten a numero una sola vez, al armar el cuerpo de la peticion.
 */
export type ExamenFisico = Record<CampoExamen, string>;

export const CAMPOS_EXAMEN = [
  'pesoKg',
  'tallaCm',
  'presionSistolica',
  'presionDiastolica',
  'temperaturaC',
  'pulso',
  'respiraciones',
  'circunferenciaCinturaCm',
] as const;

export type CampoExamen = (typeof CAMPOS_EXAMEN)[number];

/**
 * Los limites del backend, copiados de CrearFichaDto.
 *
 * Estan repetidos a proposito. El servidor sigue siendo quien decide —un
 * cliente modificado no puede saltarselos—, pero avisar aqui es lo que evita
 * que alguien descubra que escribio 1580 de talla despues de haber llenado la
 * hoja entera.
 */
export const RANGOS_EXAMEN: Record<CampoExamen, { min: number; max: number }> = {
  pesoKg: { min: 0.5, max: 400 },
  tallaCm: { min: 20, max: 250 },
  presionSistolica: { min: 40, max: 300 },
  presionDiastolica: { min: 20, max: 200 },
  temperaturaC: { min: 25, max: 45 },
  pulso: { min: 20, max: 250 },
  respiraciones: { min: 5, max: 90 },
  circunferenciaCinturaCm: { min: 20, max: 250 },
};

/** true cuando hay algo escrito y no es un numero admisible. */
export function fueraDeRango(campo: CampoExamen, valor: string): boolean {
  if (valor.trim() === '') return false;
  const n = Number(valor);
  if (!Number.isFinite(n)) return true;
  const { min, max } = RANGOS_EXAMEN[campo];
  return n < min || n > max;
}

export interface Obstetricos {
  fur: string;
  gestas: string;
  partos: string;
  abortos: string;
  cesareas: string;
  legradosLiu: string;
  nacidosVivos: string;
  nacidosMuertos: string;
  hijosVivos: string;
  hijosMuertos: string;
  fechaUltimoParto: string;
  prematurosAntes8Meses: string;
  abortosConsecutivos: boolean | null;
  embarazosMultiples: boolean | null;
  preeclampsia: boolean | null;
  tamizajeCervix: string;
  tamizajeFecha: string;
  tamizajeNormal: boolean | null;
  usaPlanificacion: boolean | null;
  metodoPlanificacion: string;
  tipoSangre: string;
  rhPositivo: boolean | null;
}

export interface Borrador {
  fecha: string;
  digitalizada: boolean;
  motivo: string;
  historiaEnfermedad: string;
  manejoEstabilizacion: string;
  signosPeligro: Record<string, CasillaSignoPeligro>;
  antecedentes: Record<string, CasillaAntecedente>;
  obstetricos: Obstetricos;
  examen: ExamenFisico;
  problemas: Record<string, FilaProblema>;
  medicamentos: FilaMedicamento[];
  consejeria: string;
  referencia: string;
  vacunaAdministrada: string;
  fechaProximaVisita: string;
  diagnostico: string;
  tratamiento: string;
  notas: string;
}

export const hoy = (): string => new Date().toISOString().slice(0, 10);

const OBSTETRICOS_VACIOS: Obstetricos = {
  fur: '',
  gestas: '',
  partos: '',
  abortos: '',
  cesareas: '',
  legradosLiu: '',
  nacidosVivos: '',
  nacidosMuertos: '',
  hijosVivos: '',
  hijosMuertos: '',
  fechaUltimoParto: '',
  prematurosAntes8Meses: '',
  abortosConsecutivos: null,
  embarazosMultiples: null,
  preeclampsia: null,
  tamizajeCervix: '',
  tamizajeFecha: '',
  tamizajeNormal: null,
  usaPlanificacion: null,
  metodoPlanificacion: '',
  tipoSangre: '',
  rhPositivo: null,
};

const MEDICAMENTO_VACIO: FilaMedicamento = { nombre: '', dosis: '', dias: '' };

/**
 * Un borrador con todas las casillas del catalogo presentes y sin responder.
 *
 * Se crean todas por adelantado —no sobre la marcha— para que la pantalla no
 * tenga que preguntarse si una casilla existe antes de leerla, y para que el
 * recuento de avance sepa cuantas hay en total.
 */
export function borradorVacio(catalogo: CatalogoFicha): Borrador {
  const signosPeligro: Record<string, CasillaSignoPeligro> = {};
  for (const s of catalogo.signosPeligro) signosPeligro[s.id] = { presente: null, detalle: '' };

  const antecedentes: Record<string, CasillaAntecedente> = {};
  for (const a of catalogo.antecedentes) {
    antecedentes[a.id] = { respuesta: null, detalle: '', fecha: '', numero: '' };
  }

  const problemas: Record<string, FilaProblema> = {};
  for (const p of catalogo.problemas) {
    problemas[p.id] = {
      presente: null,
      signoIds: [],
      diagnosticoIds: [],
      otroDiagnostico: '',
      conducta: '',
    };
  }

  const examen = Object.fromEntries(CAMPOS_EXAMEN.map((c) => [c, ''])) as ExamenFisico;

  return {
    fecha: hoy(),
    digitalizada: false,
    motivo: '',
    historiaEnfermedad: '',
    manejoEstabilizacion: '',
    signosPeligro,
    antecedentes,
    obstetricos: { ...OBSTETRICOS_VACIOS },
    examen,
    problemas,
    medicamentos: [{ ...MEDICAMENTO_VACIO }],
    consejeria: '',
    referencia: '',
    vacunaAdministrada: '',
    fechaProximaVisita: '',
    diagnostico: '',
    tratamiento: '',
    notas: '',
  };
}

/**
 * Vuelca sobre el borrador lo que el paciente YA tenia respondido.
 *
 * Los antecedentes son del paciente, no de la consulta: si en marzo se anoto que
 * es diabetico, en agosto tiene que aparecer ya marcado. Volver a preguntarlo en
 * blanco cada visita es como se pierde la historia.
 */
export function conAntecedentesPrevios(
  borrador: Borrador,
  previos: AntecedentesPaciente | undefined,
): Borrador {
  if (!previos) return borrador;

  const antecedentes = { ...borrador.antecedentes };
  for (const m of previos.marcados) {
    if (!antecedentes[m.antecedenteId]) continue;
    antecedentes[m.antecedenteId] = {
      respuesta: m.respuesta as Respuesta,
      detalle: m.detalle ?? '',
      fecha: m.fecha ? String(m.fecha).slice(0, 10) : '',
      numero: m.numero === null || m.numero === undefined ? '' : String(m.numero),
    };
  }

  const o = previos.obstetricos;
  const obstetricos: Obstetricos = o
    ? {
        ...borrador.obstetricos,
        fur: fechaCorta(o.fur),
        gestas: cifra(o.gestas),
        partos: cifra(o.partos),
        abortos: cifra(o.abortos),
        cesareas: cifra(o.cesareas),
        legradosLiu: cifra(o.legradosLiu),
        nacidosVivos: cifra(o.nacidosVivos),
        nacidosMuertos: cifra(o.nacidosMuertos),
        hijosVivos: cifra(o.hijosVivos),
        hijosMuertos: cifra(o.hijosMuertos),
        fechaUltimoParto: fechaCorta(o.fechaUltimoParto),
        prematurosAntes8Meses: cifra(o.prematurosAntes8Meses),
        abortosConsecutivos: o.abortosConsecutivos ?? null,
        embarazosMultiples: o.embarazosMultiples ?? null,
        preeclampsia: o.preeclampsia ?? null,
        tamizajeCervix: o.tamizajeCervix ?? '',
        tamizajeFecha: fechaCorta(o.tamizajeFecha),
        tamizajeNormal: o.tamizajeNormal ?? null,
        usaPlanificacion: o.usaPlanificacion ?? null,
        metodoPlanificacion: o.metodoPlanificacion ?? '',
        tipoSangre: o.tipoSangre ?? '',
        rhPositivo: o.rhPositivo ?? null,
      }
    : borrador.obstetricos;

  return { ...borrador, antecedentes, obstetricos };
}

const fechaCorta = (v: string | null | undefined) => (v ? String(v).slice(0, 10) : '');
const cifra = (v: number | null | undefined) =>
  v === null || v === undefined ? '' : String(v);

/**
 * Indice de masa corporal, calculado en pantalla mientras se escribe.
 *
 * Es el mismo calculo que hace el backend al leer una ficha (no se guarda). En
 * el papel es el campo que mas se equivoca al sacarse a mano, y verlo aparecer
 * solo es justamente lo que evita la cuenta mental.
 */
export function imcDe(pesoKg: string, tallaCm: string): number | null {
  const peso = Number(pesoKg);
  const talla = Number(tallaCm);
  if (pesoKg === '' || tallaCm === '') return null;
  if (!Number.isFinite(peso) || !Number.isFinite(talla) || peso <= 0 || talla <= 0) return null;
  const metros = talla / 100;
  return Math.round((peso / (metros * metros)) * 100) / 100;
}

/** Las cuatro franjas de la OMS, para poner una palabra junto al numero. */
export function clasificacionImc(imc: number | null): string {
  if (imc === null) return '';
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

// ═══════════════════════════════════════════════════════════════════════════
//  De borrador a peticion
// ═══════════════════════════════════════════════════════════════════════════

/** Omite el campo si esta vacio: el backend rechaza las cadenas de longitud 0. */
function texto(valor: string): string | undefined {
  const limpio = valor.trim();
  return limpio === '' ? undefined : limpio;
}

function numero(valor: string): number | undefined {
  if (valor.trim() === '') return undefined;
  const n = Number(valor);
  return Number.isFinite(n) ? n : undefined;
}

/** El input de fecha entrega 'aaaa-mm-dd'; se manda tal cual. */
function fecha(valor: string): string | undefined {
  return valor === '' ? undefined : valor;
}

function booleano(valor: boolean | null): boolean | undefined {
  return valor === null ? undefined : valor;
}

/**
 * El cuerpo de POST /v1/expedientes/:id/fichas.
 *
 * Solo viaja lo que se lleno. Mandar el formulario entero con nulos haria que
 * cada consulta guardara 200 filas de "no se pregunto", y despues ningun
 * reporte podria distinguir eso de un "no".
 */
export function cuerpoDeFicha(borrador: Borrador, tipoFicha: TipoFicha): NuevaFicha {
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

  const cuerpo: NuevaFicha = {
    tipoFicha,
    motivo: borrador.motivo.trim(),
    digitalizada: borrador.digitalizada,
  };

  // La fecha solo viaja si NO es hoy: en una consulta del dia, dejarla fuera
  // hace que el servidor selle la hora real de la atencion en vez de la
  // medianoche que implicaria mandar solo el dia.
  if (borrador.fecha !== '' && borrador.fecha !== hoy()) cuerpo.fecha = borrador.fecha;

  asignar(cuerpo, 'historiaEnfermedad', texto(borrador.historiaEnfermedad));
  asignar(cuerpo, 'manejoEstabilizacion', texto(borrador.manejoEstabilizacion));
  asignar(cuerpo, 'consejeria', texto(borrador.consejeria));
  asignar(cuerpo, 'referencia', texto(borrador.referencia));
  asignar(cuerpo, 'vacunaAdministrada', texto(borrador.vacunaAdministrada));
  asignar(cuerpo, 'diagnostico', texto(borrador.diagnostico));
  asignar(cuerpo, 'tratamiento', texto(borrador.tratamiento));
  asignar(cuerpo, 'notas', texto(borrador.notas));
  asignar(cuerpo, 'fechaProximaVisita', fecha(borrador.fechaProximaVisita));

  for (const campo of CAMPOS_EXAMEN) asignar(cuerpo, campo, numero(borrador.examen[campo]));

  if (signosPeligro.length) cuerpo.signosPeligro = signosPeligro;
  if (problemas.length) cuerpo.problemas = problemas;
  if (medicamentos.length) cuerpo.medicamentos = medicamentos;

  return cuerpo;
}

function asignar<C extends string>(
  destino: Record<string, unknown>,
  campo: C,
  valor: string | number | undefined,
): void {
  if (valor !== undefined) destino[campo] = valor;
}

/**
 * El cuerpo de PATCH /v1/pacientes/:id/antecedentes.
 *
 * Solo viajan las casillas RESPONDIDAS. Como el endpoint es una actualizacion
 * parcial, lo que no se manda se conserva: llenar media hoja no borra lo que
 * otro turno ya habia preguntado.
 */
export function cuerpoDeAntecedentes(borrador: Borrador): GuardarAntecedentes | null {
  const marcados = Object.entries(borrador.antecedentes)
    .filter(([, a]) => a.respuesta !== null)
    .map(([antecedenteId, a]) => ({
      antecedenteId,
      respuesta: a.respuesta as Respuesta,
      ...(texto(a.detalle) ? { detalle: texto(a.detalle) } : {}),
      ...(fecha(a.fecha) ? { fecha: a.fecha } : {}),
      ...(numero(a.numero) !== undefined ? { numero: numero(a.numero) } : {}),
    }));

  const o = borrador.obstetricos;
  const obstetricos: Record<string, unknown> = {};
  asignar(obstetricos, 'fur', fecha(o.fur));
  asignar(obstetricos, 'gestas', numero(o.gestas));
  asignar(obstetricos, 'partos', numero(o.partos));
  asignar(obstetricos, 'abortos', numero(o.abortos));
  asignar(obstetricos, 'cesareas', numero(o.cesareas));
  asignar(obstetricos, 'legradosLiu', numero(o.legradosLiu));
  asignar(obstetricos, 'nacidosVivos', numero(o.nacidosVivos));
  asignar(obstetricos, 'nacidosMuertos', numero(o.nacidosMuertos));
  asignar(obstetricos, 'hijosVivos', numero(o.hijosVivos));
  asignar(obstetricos, 'hijosMuertos', numero(o.hijosMuertos));
  asignar(obstetricos, 'fechaUltimoParto', fecha(o.fechaUltimoParto));
  asignar(obstetricos, 'prematurosAntes8Meses', numero(o.prematurosAntes8Meses));
  asignar(obstetricos, 'tamizajeCervix', texto(o.tamizajeCervix));
  asignar(obstetricos, 'tamizajeFecha', fecha(o.tamizajeFecha));
  asignar(obstetricos, 'metodoPlanificacion', texto(o.metodoPlanificacion));
  asignar(obstetricos, 'tipoSangre', texto(o.tipoSangre));
  for (const campo of [
    'abortosConsecutivos',
    'embarazosMultiples',
    'preeclampsia',
    'tamizajeNormal',
    'usaPlanificacion',
    'rhPositivo',
  ] as const) {
    const valor = booleano(o[campo]);
    if (valor !== undefined) obstetricos[campo] = valor;
  }

  const hayObstetricos = Object.keys(obstetricos).length > 0;
  if (marcados.length === 0 && !hayObstetricos) return null;

  return {
    ...(marcados.length ? { marcados } : {}),
    ...(hayObstetricos ? { obstetricos } : {}),
  } as GuardarAntecedentes;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Avance y validacion
// ═══════════════════════════════════════════════════════════════════════════

export interface AvanceSeccion {
  respondidas: number;
  total: number;
}

/**
 * Cuantas casillas de cada seccion se han respondido.
 *
 * Es lo que permite al indice lateral decir "22 de 33" en vez de un punto de
 * color. Quien transcribe una hoja necesita saber que le falta ANTES de
 * guardar, no despues de que el servidor la rechace.
 */
export function avanceDe(
  borrador: Borrador,
  catalogo: CatalogoFicha,
): Record<string, AvanceSeccion> {
  const respondidos = (valores: unknown[]) => valores.filter((v) => v !== null && v !== '').length;

  return {
    peligro: {
      respondidas: Object.values(borrador.signosPeligro).filter((s) => s.presente !== null).length,
      total: catalogo.signosPeligro.length,
    },
    antecedentes: {
      respondidas: Object.values(borrador.antecedentes).filter((a) => a.respuesta !== null).length,
      total: catalogo.antecedentes.length,
    },
    examen: {
      respondidas: respondidos(CAMPOS_EXAMEN.map((c) => borrador.examen[c])),
      total: CAMPOS_EXAMEN.length,
    },
    problemas: {
      respondidas: Object.values(borrador.problemas).filter((p) => p.presente !== null).length,
      total: catalogo.problemas.length,
    },
  };
}

/**
 * true si hay algo escrito que se perderia al salir.
 *
 * Sirve para el aviso de "hay cambios sin guardar": una ficha de veinte minutos
 * no puede desaparecer por una tecla mal dada.
 */
export function tieneContenido(borrador: Borrador): boolean {
  const conAlgo = (valores: string[]) => valores.some((v) => v.trim() !== '');

  if (
    conAlgo([
      borrador.motivo,
      borrador.historiaEnfermedad,
      borrador.manejoEstabilizacion,
      borrador.consejeria,
      borrador.referencia,
      borrador.vacunaAdministrada,
      borrador.diagnostico,
      borrador.tratamiento,
      borrador.notas,
      borrador.fechaProximaVisita,
    ])
  ) {
    return true;
  }
  if (CAMPOS_EXAMEN.some((c) => borrador.examen[c].trim() !== '')) return true;
  if (Object.values(borrador.signosPeligro).some((s) => s.presente !== null)) return true;
  if (Object.values(borrador.antecedentes).some((a) => a.respuesta !== null)) return true;
  if (Object.values(borrador.problemas).some((p) => p.presente !== null)) return true;
  if (borrador.medicamentos.some((m) => m.nombre.trim() !== '')) return true;
  return cuerpoDeAntecedentes(borrador) !== null;
}

export interface Reparo {
  seccion: string;
  mensaje: string;
}

/**
 * Lo que impide guardar, revisado ANTES de enviar.
 *
 * Las mismas reglas del backend. Duplicarlas no sobra: el servidor sigue siendo
 * la autoridad —un cliente modificado no puede saltarselas— pero decirle al
 * usuario que falta el motivo despues de un viaje a la red y con la pagina ya
 * desplazada es como se pierde el trabajo de veinte minutos.
 */
export function reparosDe(borrador: Borrador, catalogo: CatalogoFicha): Reparo[] {
  const reparos: Reparo[] = [];

  if (borrador.motivo.trim() === '') {
    reparos.push({ seccion: 'consulta', mensaje: 'Escriba el motivo de la consulta.' });
  }
  if (borrador.fecha > hoy()) {
    reparos.push({ seccion: 'identificacion', mensaje: 'La fecha no puede estar en el futuro.' });
  }

  for (const campo of CAMPOS_EXAMEN) {
    if (fueraDeRango(campo, borrador.examen[campo])) {
      const { min, max } = RANGOS_EXAMEN[campo];
      reparos.push({
        seccion: 'examen',
        mensaje: 'El valor de ' + campo + ' debe estar entre ' + min + ' y ' + max + '.',
      });
    }
  }

  const sinDetalle = catalogo.signosPeligro.filter(
    (s) => s.pideTexto && borrador.signosPeligro[s.id]?.presente && !borrador.signosPeligro[s.id].detalle.trim(),
  );
  for (const s of sinDetalle) {
    reparos.push({ seccion: 'peligro', mensaje: 'Describa el signo: ' + s.texto });
  }

  for (const a of catalogo.antecedentes) {
    const casilla = borrador.antecedentes[a.id];
    if (casilla?.respuesta === 'NO_APLICA' && !a.permiteNoAplica) {
      reparos.push({
        seccion: 'antecedentes',
        mensaje: 'El formulario no ofrece "No aplica" en: ' + a.texto,
      });
    }
  }

  for (const p of catalogo.problemas) {
    const fila = borrador.problemas[p.id];
    if (!fila?.presente) continue;
    if (fila.signoIds.length === 0 && fila.diagnosticoIds.length === 0 && !fila.otroDiagnostico.trim()) {
      reparos.push({
        seccion: 'problemas',
        mensaje: 'Marco "' + p.nombre + '" como presente pero no subrayo ningun signo ni diagnostico.',
      });
    }
  }

  return reparos;
}

/** Agrupa el catalogo de antecedentes por el bloque impreso al que pertenece. */
export function porGrupo(
  antecedentes: readonly AntecedenteCatalogo[],
): { grupo: string; titulo: string; filas: AntecedenteCatalogo[] }[] {
  const titulos: Record<string, string> = {
    MEDICO: 'Antecedentes medicos',
    FAMILIAR: 'Antecedentes familiares',
    HABITO: 'Habitos',
  };
  const orden = ['MEDICO', 'FAMILIAR', 'HABITO'];

  return orden
    .map((grupo) => ({
      grupo,
      titulo: titulos[grupo] ?? grupo,
      filas: antecedentes.filter((a) => a.grupo === grupo),
    }))
    .filter((b) => b.filas.length > 0);
}
