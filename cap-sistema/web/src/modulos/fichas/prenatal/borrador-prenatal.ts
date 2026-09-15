import type { CatalogoFicha, NuevaFicha } from '../servicio-fichas';
import { borradorVacio, cuerpoDeFicha, type Borrador } from '../borrador';

/**
 * El estado de las dos hojas de la ficha prenatal mientras se llenan.
 *
 * **Las dos extienden el borrador compartido en vez de empezar de cero.** Casi
 * todo lo que piden estas hojas ya lo sabe llevar: los signos de peligro, los
 * antecedentes, los gineco-obstétricos —que son literalmente la página 1 de
 * esta ficha, y por eso existen desde antes—, los signos vitales, los
 * medicamentos, la referencia y el cierre. Lo propio es la página 2, y eso es
 * `hoja`.
 *
 * Dos diferencias con el borrador de adultos, y las dos vienen del papel:
 *
 *  1. **La consejería son casillas, no un texto libre.** Nueve temas impresos
 *     en la hoja del embarazo y cinco en la del posparto, cada uno con su SI/NO
 *     por control.
 *  2. **No hay matriz de problemas.** El papel deja una raya que dice
 *     «Problemas detectados», y va en `hoja`.
 *
 * Todo lo numérico se guarda como TEXTO mientras se escribe, igual que en las
 * otras tres: un campo a medio teclear no es un número, y convertir en cada
 * pulsación pelea con quien está escribiendo.
 */

/** Lo que solo pide la página 2: el control prenatal. */
export interface HojaPrenatal {
  /** El papel: «sólo si embarazo menor de 12 semanas». */
  circunferenciaBrazoCm: string;

  /** UNA casilla para cuatro hallazgos, como está impresa. */
  examenGeneralNormal: boolean | null;
  examenBucodental: string;

  alturaUterinaCm: string;
  movimientosFetales: boolean | null;
  fcf: string;
  presentacionLeopold: string;

  trazasSangre: boolean | null;
  trazasSangreDescripcion: string;
  lesionesVulvares: boolean | null;
  lesionesVulvaresDescripcion: string;
  flujoVaginal: boolean | null;

  // Los ocho renglones del laboratorio. Texto, porque el papel deja una raya y
  // el resultado se anota como lo manda el laboratorio.
  hemoglobinaHematocrito: string;
  grupoRh: string;
  orina: string;
  glicemia: string;
  vdrl: string;
  vih: string;
  papanicolau: string;
  infecciones: string;

  /** «Semanas embarazo por FUR y/o AU», como las anota quien atiende. */
  semanasPorFurAu: string;
  problemasDetectados: string;

  sulfatoFerrosoTabletas: string;
  acidoFolicoTabletas: string;
  tdDosis: string;
}

/** Lo que solo piden las páginas 3 y 4: la evaluación del posparto. */
export interface HojaPosparto {
  /**
   * El primer control tiene hoja propia en el papel y cinco preguntas que los
   * demás no repiten. Esta casilla es la que decide si se piden.
   */
  esPrimerControl: boolean;

  diasDespuesDelParto: string;
  dondeAtendioParto: string;
  quienAtendioParto: string;
  quienAtendioPartoOtro: string;

  involucionUterina: string;
  examenMamas: string;
  heridaOperatoria: string;
  examenGinecologico: string;

  lactanciaMaternaExclusiva: boolean | null;
  /** La pregunta «¿Por qué no?» del papel, que es la que guía la consejería. */
  motivoSinLactancia: string;

  problemasDetectados: string;

  // La página 3 marca SI/NO y la 4 anota tabletas. Caben las dos formas, y
  // ninguna se deduce de la otra: en el primer control se sabe QUE se entregó
  // pero no CUANTO.
  sulfatoFerroso: boolean | null;
  sulfatoFerrosoTabletas: string;
  acidoFolico: boolean | null;
  acidoFolicoTabletas: string;
  td: boolean | null;
  tdDosis: string;
  otroMedicamento: boolean | null;
}

export interface BorradorPrenatal extends Borrador {
  hoja: HojaPrenatal;
  /**
   * Los temas del pie, marcados o no. El papel de esta ficha **no** trae
   * columna de fecha de reconsulta, a diferencia del de neonato: son casillas
   * de SI/NO por control.
   */
  consejeriaTemas: Record<string, boolean>;
}

export interface BorradorPosparto extends Borrador {
  hoja: HojaPosparto;
  consejeriaTemas: Record<string, boolean>;
}

export const hojaPrenatalVacia = (): HojaPrenatal => ({
  circunferenciaBrazoCm: '',
  examenGeneralNormal: null,
  examenBucodental: '',
  alturaUterinaCm: '',
  movimientosFetales: null,
  fcf: '',
  presentacionLeopold: '',
  trazasSangre: null,
  trazasSangreDescripcion: '',
  lesionesVulvares: null,
  lesionesVulvaresDescripcion: '',
  flujoVaginal: null,
  hemoglobinaHematocrito: '',
  grupoRh: '',
  orina: '',
  glicemia: '',
  vdrl: '',
  vih: '',
  papanicolau: '',
  infecciones: '',
  semanasPorFurAu: '',
  problemasDetectados: '',
  sulfatoFerrosoTabletas: '',
  acidoFolicoTabletas: '',
  tdDosis: '',
});

export const hojaPospartoVacia = (): HojaPosparto => ({
  esPrimerControl: false,
  diasDespuesDelParto: '',
  dondeAtendioParto: '',
  quienAtendioParto: '',
  quienAtendioPartoOtro: '',
  involucionUterina: '',
  examenMamas: '',
  heridaOperatoria: '',
  examenGinecologico: '',
  lactanciaMaternaExclusiva: null,
  motivoSinLactancia: '',
  problemasDetectados: '',
  sulfatoFerroso: null,
  sulfatoFerrosoTabletas: '',
  acidoFolico: null,
  acidoFolicoTabletas: '',
  td: null,
  tdDosis: '',
  otroMedicamento: null,
});

/** Las casillas de consejería del catálogo, todas sin marcar. */
function temasSinMarcar(catalogo: CatalogoFicha): Record<string, boolean> {
  return Object.fromEntries(catalogo.temasConsejeria.map((t) => [t.id, false]));
}

export function borradorPrenatalVacio(catalogo: CatalogoFicha): BorradorPrenatal {
  return {
    ...borradorVacio(catalogo),
    hoja: hojaPrenatalVacia(),
    consejeriaTemas: temasSinMarcar(catalogo),
  };
}

export function borradorPospartoVacio(catalogo: CatalogoFicha): BorradorPosparto {
  return {
    ...borradorVacio(catalogo),
    hoja: hojaPospartoVacia(),
    consejeriaTemas: temasSinMarcar(catalogo),
  };
}

const texto = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim());
const numero = (v: string): number | undefined => {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? undefined : n;
};
/** Una casilla sin responder no viaja: null es «no se preguntó». */
const casilla = (v: boolean | null): boolean | undefined => (v === null ? undefined : v);

function asignar(destino: Record<string, unknown>, campo: string, valor: unknown): void {
  if (valor !== undefined) destino[campo] = valor;
}

/** Los temas marcados. Lo no marcado no viaja, como en el resto del borrador. */
function temasBrindados(temas: Record<string, boolean>) {
  return Object.entries(temas)
    .filter(([, marcado]) => marcado)
    .map(([temaId]) => ({ temaId, brindada: true }));
}

/**
 * El cuerpo de POST /v1/expedientes/:id/fichas para la hoja prenatal.
 *
 * Se apoya en `cuerpoDeFicha`, que ya sabe armar todo lo compartido, y le añade
 * lo de la página 2. La consejería se sobrescribe: la compartida es el texto
 * libre de la ficha de adultos, y aquí son casillas.
 */
export function cuerpoDeFichaPrenatal(borrador: BorradorPrenatal): NuevaFicha {
  const cuerpo = cuerpoDeFicha(borrador, 'PRENATAL');
  const h = borrador.hoja;

  const prenatal: Record<string, unknown> = {};
  asignar(prenatal, 'circunferenciaBrazoCm', numero(h.circunferenciaBrazoCm));
  asignar(prenatal, 'examenGeneralNormal', casilla(h.examenGeneralNormal));
  asignar(prenatal, 'examenBucodental', texto(h.examenBucodental));
  asignar(prenatal, 'alturaUterinaCm', numero(h.alturaUterinaCm));
  asignar(prenatal, 'movimientosFetales', casilla(h.movimientosFetales));
  asignar(prenatal, 'fcf', numero(h.fcf));
  asignar(prenatal, 'presentacionLeopold', texto(h.presentacionLeopold));
  asignar(prenatal, 'trazasSangre', casilla(h.trazasSangre));
  asignar(prenatal, 'trazasSangreDescripcion', texto(h.trazasSangreDescripcion));
  asignar(prenatal, 'lesionesVulvares', casilla(h.lesionesVulvares));
  asignar(prenatal, 'lesionesVulvaresDescripcion', texto(h.lesionesVulvaresDescripcion));
  asignar(prenatal, 'flujoVaginal', casilla(h.flujoVaginal));
  asignar(prenatal, 'hemoglobinaHematocrito', texto(h.hemoglobinaHematocrito));
  asignar(prenatal, 'grupoRh', texto(h.grupoRh));
  asignar(prenatal, 'orina', texto(h.orina));
  asignar(prenatal, 'glicemia', texto(h.glicemia));
  asignar(prenatal, 'vdrl', texto(h.vdrl));
  asignar(prenatal, 'vih', texto(h.vih));
  asignar(prenatal, 'papanicolau', texto(h.papanicolau));
  asignar(prenatal, 'infecciones', texto(h.infecciones));
  asignar(prenatal, 'semanasPorFurAu', numero(h.semanasPorFurAu));
  asignar(prenatal, 'problemasDetectados', texto(h.problemasDetectados));
  asignar(prenatal, 'sulfatoFerrosoTabletas', numero(h.sulfatoFerrosoTabletas));
  asignar(prenatal, 'acidoFolicoTabletas', numero(h.acidoFolicoTabletas));
  asignar(prenatal, 'tdDosis', numero(h.tdDosis));

  if (Object.keys(prenatal).length > 0) {
    cuerpo.prenatal = prenatal as NuevaFicha['prenatal'];
  }

  delete cuerpo.consejeria;
  const temas = temasBrindados(borrador.consejeriaTemas);
  if (temas.length > 0) cuerpo.consejeriaTemas = temas;

  return cuerpo;
}

/** El mismo camino para la evaluación del posparto. */
export function cuerpoDeFichaPosparto(borrador: BorradorPosparto): NuevaFicha {
  const cuerpo = cuerpoDeFicha(borrador, 'POSPARTO');
  const h = borrador.hoja;

  const posparto: Record<string, unknown> = {};
  // Esta va siempre, marcada o no: es la que decide como se lee la hoja.
  posparto.esPrimerControl = h.esPrimerControl;

  // Las cinco preguntas de la pagina 3 solo viajan cuando es el primer
  // control. Si alguien las llena, cambia la casilla y guarda, lo escrito no
  // se manda: quedaria en una hoja que no las pregunta y nadie volveria a
  // verlo.
  if (h.esPrimerControl) {
    asignar(posparto, 'diasDespuesDelParto', numero(h.diasDespuesDelParto));
    asignar(posparto, 'dondeAtendioParto', texto(h.dondeAtendioParto));
    asignar(posparto, 'quienAtendioParto', texto(h.quienAtendioParto));
    asignar(posparto, 'quienAtendioPartoOtro', texto(h.quienAtendioPartoOtro));
  }

  asignar(posparto, 'involucionUterina', texto(h.involucionUterina));
  asignar(posparto, 'examenMamas', texto(h.examenMamas));
  asignar(posparto, 'heridaOperatoria', texto(h.heridaOperatoria));
  asignar(posparto, 'examenGinecologico', texto(h.examenGinecologico));
  asignar(posparto, 'lactanciaMaternaExclusiva', casilla(h.lactanciaMaternaExclusiva));
  asignar(posparto, 'motivoSinLactancia', texto(h.motivoSinLactancia));
  asignar(posparto, 'problemasDetectados', texto(h.problemasDetectados));
  asignar(posparto, 'sulfatoFerroso', casilla(h.sulfatoFerroso));
  asignar(posparto, 'sulfatoFerrosoTabletas', numero(h.sulfatoFerrosoTabletas));
  asignar(posparto, 'acidoFolico', casilla(h.acidoFolico));
  asignar(posparto, 'acidoFolicoTabletas', numero(h.acidoFolicoTabletas));
  asignar(posparto, 'td', casilla(h.td));
  asignar(posparto, 'tdDosis', numero(h.tdDosis));
  asignar(posparto, 'otroMedicamento', casilla(h.otroMedicamento));

  cuerpo.posparto = posparto as NuevaFicha['posparto'];

  delete cuerpo.consejeria;
  const temas = temasBrindados(borrador.consejeriaTemas);
  if (temas.length > 0) cuerpo.consejeriaTemas = temas;

  return cuerpo;
}
