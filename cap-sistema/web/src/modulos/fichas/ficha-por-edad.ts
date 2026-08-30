import type { TipoFicha } from './servicio-fichas';

/**
 * Qué ficha del MSPAS le corresponde a un paciente.
 *
 * El CAP tiene cuatro hojas distintas y llenar la equivocada no es un error
 * cosmético: cada una pregunta cosas diferentes, y lo que se capture en la que
 * no toca no tiene respaldo en ningún papel firmado.
 *
 * La decisión no debería ser del personal. Recepción ya pide la **fecha de
 * nacimiento** al registrar al paciente, y de ahí sale la edad exacta: el
 * sistema puede elegir solo y ofrecer la hoja correcta.
 *
 * La prenatal es la excepción y por eso no está aquí: no depende de la edad
 * sino de que la paciente esté embarazada, y eso el sistema no lo sabe hasta
 * que alguien se lo dice.
 */

/** Los cortes de edad que traen impresos los propios formularios. */
export const DIAS_MAXIMO_NEONATO = 28;
export const ANIOS_MINIMO_ADULTO = 10;

export interface FichaSugerida {
  tipo: TipoFicha;
  /** Cómo se llama la hoja en el papel. */
  nombre: string;
  /** La ruta de su pantalla, o null si todavía no está construida. */
  ruta: string | null;
  /** Por qué le toca esa, dicho para quien atiende. */
  motivo: string;
}

/**
 * La edad en días, calculada sin construir un `Date` con la cadena entera.
 *
 * Guatemala es UTC-6: `new Date('2026-08-20')` se interpreta como medianoche
 * UTC, que aquí es todavía el 19, y la edad saldría un día mayor.
 */
export function edadEnDias(fechaNacimiento: string, referencia = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return 0;
  const nacimiento = new Date(anio, mes - 1, dia);
  const hoy = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  return Math.max(0, Math.round((hoy.getTime() - nacimiento.getTime()) / 86_400_000));
}

/** Los años cumplidos, que es como se dice la edad de un adulto. */
export function edadEnAnios(fechaNacimiento: string, referencia = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return 0;
  let anios = referencia.getFullYear() - anio;
  const cumpleEsteAnio =
    referencia.getMonth() + 1 > mes ||
    (referencia.getMonth() + 1 === mes && referencia.getDate() >= dia);
  if (!cumpleEsteAnio) anios -= 1;
  return Math.max(0, anios);
}

/**
 * Elige la ficha por la fecha de nacimiento.
 *
 * `ruta` viene en null cuando la hoja existe en el papel pero su pantalla
 * todavía no está construida. Eso es información, no un fallo: la pantalla
 * puede decir cuál toca y por qué no se puede abrir, en vez de ofrecer la
 * equivocada y que alguien la llene sin darse cuenta.
 */
export function fichaParaPaciente(
  fechaNacimiento: string,
  pacienteId: string,
  referencia = new Date(),
): FichaSugerida {
  const dias = edadEnDias(fechaNacimiento, referencia);

  if (dias <= DIAS_MAXIMO_NEONATO) {
    return {
      tipo: 'NEONATO',
      nombre: 'Menor de 28 días',
      ruta: '/pacientes/' + pacienteId + '/ficha-neonato',
      motivo: dias === 1 ? 'Tiene 1 día de nacido' : 'Tiene ' + dias + ' días de nacido',
    };
  }

  const anios = edadEnAnios(fechaNacimiento, referencia);

  if (anios < ANIOS_MINIMO_ADULTO) {
    return {
      tipo: 'NINEZ',
      nombre: 'Lactancia y niñez',
      // Todavia sin construir.
      ruta: null,
      motivo: anios === 0 ? 'Tiene ' + dias + ' días' : 'Tiene ' + anios + ' años',
    };
  }

  return {
    tipo: 'ADULTO',
    nombre: 'Adolescente, adulto y adulto mayor',
    ruta: '/pacientes/' + pacienteId + '/ficha',
    motivo: 'Tiene ' + anios + ' años',
  };
}
