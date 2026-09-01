import { diasEntre } from '@cap/shared';

/**
 * Reglas de inventario, como funciones puras.
 *
 * Igual que la lógica clínica de `programas`, esto es lo que puede
 * equivocarse sin lanzar ningún error: entregar del lote equivocado no falla,
 * simplemente deja vencer medicamento que se pudo haber usado.
 */

export type EstadoVencimiento = 'VENCIDO' | 'POR_VENCER' | 'VIGENTE';

/** Lo mínimo que necesita saber la selección FEFO de un lote. */
export interface LoteDisponible {
  id: string;
  fechaVencimiento: Date;
  fechaIngreso: Date;
  cantidadDisponible: number;
}

export interface LineaPlan {
  loteId: string;
  cantidad: number;
}

export interface PlanEntrega {
  /** De qué lote sacar cuánto, en orden de uso. */
  lineas: LineaPlan[];
  /** Cuánto NO se pudo cubrir. Cero significa que alcanza. */
  faltante: number;
}

/**
 * Clasifica un lote por su fecha de vencimiento.
 *
 * El día del vencimiento el lote **todavía sirve**: vence al final de ese día.
 * Marcarlo como vencido un día antes descarta medicamento utilizable, que en
 * un CAP rural con abastecimiento irregular no es un detalle menor.
 */
export function clasificarVencimiento(
  fechaVencimiento: Date,
  hoy: Date,
  diasAlerta: number,
): EstadoVencimiento {
  const dias = diasEntre(hoy, fechaVencimiento);
  if (dias < 0) return 'VENCIDO';
  if (dias <= diasAlerta) return 'POR_VENCER';
  return 'VIGENTE';
}

/** Días que faltan para vencer. Negativo si ya venció. */
export function diasParaVencer(fechaVencimiento: Date, hoy: Date): number {
  return diasEntre(hoy, fechaVencimiento);
}

/**
 * Selecciona de qué lotes descontar, con criterio **FEFO**
 * (First Expired, First Out): primero el que vence antes.
 *
 * No es FIFO. Da igual cuál entró primero: si el lote que llegó ayer vence en
 * dos meses y el que llegó hace un año vence en dos años, se entrega el de
 * ayer. Usar FIFO aquí hace que el CAP tire medicamento vigente mientras
 * dispensa del que le sobraba tiempo.
 *
 * Reglas que aplica:
 *  - **Nunca** toma de un lote vencido, aunque con él alcanzara.
 *  - Salta lotes sin existencia.
 *  - Si no alcanza, lo reporta en `faltante` en vez de entregar de menos en
 *    silencio: quien atiende tiene que saber que la receta quedó incompleta.
 */
export function seleccionarFefo(
  lotes: readonly LoteDisponible[],
  cantidadRequerida: number,
  hoy: Date,
): PlanEntrega {
  if (cantidadRequerida <= 0) {
    return { lineas: [], faltante: 0 };
  }

  const utilizables = lotes
    .filter((l) => l.cantidadDisponible > 0 && diasEntre(hoy, l.fechaVencimiento) >= 0)
    .sort((a, b) => {
      const porVencimiento = a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime();
      if (porVencimiento !== 0) return porVencimiento;
      // Empate de vencimiento: sale primero el que lleva más tiempo guardado.
      return a.fechaIngreso.getTime() - b.fechaIngreso.getTime();
    });

  const lineas: LineaPlan[] = [];
  let restante = cantidadRequerida;

  for (const lote of utilizables) {
    if (restante === 0) break;
    const toma = Math.min(lote.cantidadDisponible, restante);
    lineas.push({ loteId: lote.id, cantidad: toma });
    restante -= toma;
  }

  return { lineas, faltante: restante };
}

/**
 * Si un medicamento está por debajo de su mínimo.
 *
 * Un mínimo en cero desactiva la alerta: hay medicamentos que el CAP no
 * mantiene en existencia permanente y avisar por ellos solo entrena al
 * personal a ignorar las alertas.
 */
export function bajoMinimo(existenciaTotal: number, stockMinimo: number): boolean {
  return stockMinimo > 0 && existenciaTotal < stockMinimo;
}
