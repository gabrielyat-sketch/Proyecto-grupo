import { obtenerFicha, obtenerHistorial } from '../../expedientes/servicio-expedientes';
import type { BorradorNeonato } from './borrador-neonato';

/**
 * Lo que la ficha de menor de 28 dias ya sabe de una consulta anterior.
 *
 * Casi todo lo que pregunta la seccion de antecedentes NO cambia entre visitas:
 * quien es la madre, cuanto peso al nacer, si lloro, quien atendio el parto,
 * como fue. Son hechos del nacimiento, no del dia. Volverlos a escribir en cada
 * control es trabajo repetido, y peor: donde hay que teclear lo mismo cinco
 * veces, la quinta se escribe distinto y el expediente acaba diciendo dos cosas.
 *
 * Lo que si es del dia se deja en blanco a proposito —el peso de hoy, el
 * perimetro braquial, la circunferencia cefalica—, porque arrastrarlo seria
 * dar por bueno un dato que hay que volver a medir.
 *
 * La ficha de adultos ya hacia esto con sus antecedentes; aqui faltaba.
 */
export interface AntecedentesPrevios {
  nombreMadre: string;
  pesoNacerLibras: string;
  pesoNacerOnzas: string;
  lloroAlNacer: boolean | null;
  nacioCianotico: boolean | null;
  horasTrabajoParto: string;
  quienAtendioParto: string;
  quienAtendioPartoOtro: string;
  rupturaPrematuraMembranas: boolean | null;
  trabajoPartoPrematuro: boolean | null;
  partoProlongado: boolean | null;
  tipoParto: string;
  tdMadre: boolean | null;
  tdMadreDosis: string;
}

const texto = (v: number | string | null) => (v === null ? '' : String(v));

/**
 * Busca la ultima ficha de neonato del expediente y saca lo que se repite.
 *
 * Se mira solo la primera pagina del historial: si hubo una ficha de neonato,
 * es reciente por definicion —el paciente tiene menos de un mes— y estara
 * arriba. Recorrer el historial entero para un caso que no puede darse seria
 * pagar por nada.
 */
export async function antecedentesPreviosDeNeonato(
  expedienteId: string,
): Promise<AntecedentesPrevios | null> {
  const historial = await obtenerHistorial(expedienteId, 1);
  const anterior = historial.datos.find((a) => a.tipoFicha === 'NEONATO');
  if (!anterior) return null;

  const ficha = await obtenerFicha(anterior.id);
  const n = ficha.neonato;
  if (!n) return null;

  return {
    nombreMadre: n.nombreMadre ?? '',
    pesoNacerLibras: texto(n.pesoNacerLibras),
    pesoNacerOnzas: texto(n.pesoNacerOnzas),
    lloroAlNacer: n.lloroAlNacer,
    nacioCianotico: n.nacioCianotico,
    horasTrabajoParto: texto(n.horasTrabajoParto),
    quienAtendioParto: n.quienAtendioParto ?? '',
    quienAtendioPartoOtro: n.quienAtendioPartoOtro ?? '',
    rupturaPrematuraMembranas: n.rupturaPrematuraMembranas,
    trabajoPartoPrematuro: n.trabajoPartoPrematuro,
    partoProlongado: n.partoProlongado,
    tipoParto: n.tipoParto ?? '',
    tdMadre: n.tdMadre,
    tdMadreDosis: texto(n.tdMadreDosis),
  };
}

/** Pone lo anterior sobre un borrador en blanco, sin pisar lo que ya se escribio. */
export function conAntecedentesPrevios(
  vacio: BorradorNeonato,
  previos: AntecedentesPrevios | null,
): BorradorNeonato {
  if (!previos) return vacio;
  return { ...vacio, ...previos };
}
