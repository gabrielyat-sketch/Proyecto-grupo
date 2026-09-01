import {
  bajoMinimo,
  clasificarVencimiento,
  diasParaVencer,
  LoteDisponible,
  seleccionarFefo,
} from './inventario';

const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));
const HOY = utc(2026, 6, 15);

/** Constructor corto de lote para las pruebas. */
const lote = (
  id: string,
  vence: Date,
  cantidad: number,
  ingreso: Date = utc(2026, 1, 1),
): LoteDisponible => ({
  id,
  fechaVencimiento: vence,
  cantidadDisponible: cantidad,
  fechaIngreso: ingreso,
});

describe('clasificarVencimiento', () => {
  it('un lote de dentro de un anio esta vigente', () => {
    expect(clasificarVencimiento(utc(2027, 6, 15), HOY, 90)).toBe('VIGENTE');
  });

  it('un lote que vencio ayer esta VENCIDO', () => {
    expect(clasificarVencimiento(utc(2026, 6, 14), HOY, 90)).toBe('VENCIDO');
  });

  it('el dia del vencimiento el lote TODAVIA sirve', () => {
    // Vence al final de ese dia. Descartarlo un dia antes tira medicamento
    // utilizable, y el abastecimiento del CAP no da para eso.
    expect(clasificarVencimiento(HOY, HOY, 90)).toBe('POR_VENCER');
  });

  it('avisa dentro de la ventana de alerta', () => {
    expect(clasificarVencimiento(utc(2026, 8, 1), HOY, 90)).toBe('POR_VENCER');
  });

  it('el limite exacto de la ventana todavia avisa', () => {
    expect(clasificarVencimiento(utc(2026, 9, 13), HOY, 90)).toBe('POR_VENCER');
    expect(clasificarVencimiento(utc(2026, 9, 14), HOY, 90)).toBe('VIGENTE');
  });

  it('una ventana mas corta clasifica distinto el mismo lote', () => {
    const dentroDeDosMeses = utc(2026, 8, 15);
    expect(clasificarVencimiento(dentroDeDosMeses, HOY, 90)).toBe('POR_VENCER');
    expect(clasificarVencimiento(dentroDeDosMeses, HOY, 30)).toBe('VIGENTE');
  });
});

describe('diasParaVencer', () => {
  it('cuenta los dias que faltan', () => {
    expect(diasParaVencer(utc(2026, 6, 25), HOY)).toBe(10);
  });

  it('es negativo si ya vencio', () => {
    expect(diasParaVencer(utc(2026, 6, 5), HOY)).toBe(-10);
  });

  it('es 0 el dia del vencimiento', () => {
    expect(diasParaVencer(HOY, HOY)).toBe(0);
  });
});

describe('seleccionarFefo', () => {
  it('toma del unico lote cuando alcanza', () => {
    const plan = seleccionarFefo([lote('A', utc(2027, 1, 1), 100)], 30, HOY);
    expect(plan.lineas).toEqual([{ loteId: 'A', cantidad: 30 }]);
    expect(plan.faltante).toBe(0);
  });

  describe('es FEFO, no FIFO', () => {
    it('entrega primero el que VENCE antes, no el que ENTRO antes', () => {
      const antiguo = lote('viejo', utc(2028, 1, 1), 100, utc(2025, 1, 1));
      const reciente = lote('nuevo', utc(2026, 8, 1), 100, utc(2026, 6, 1));

      const plan = seleccionarFefo([antiguo, reciente], 50, HOY);

      // FIFO habria tomado del lote 'viejo' y dejado vencer al 'nuevo'.
      expect(plan.lineas).toEqual([{ loteId: 'nuevo', cantidad: 50 }]);
    });

    it('con vencimiento empatado sale primero el que lleva mas tiempo guardado', () => {
      const mismoVence = utc(2027, 1, 1);
      const plan = seleccionarFefo(
        [lote('B', mismoVence, 10, utc(2026, 5, 1)), lote('A', mismoVence, 10, utc(2026, 1, 1))],
        5,
        HOY,
      );
      expect(plan.lineas[0].loteId).toBe('A');
    });
  });

  describe('nunca entrega de un lote vencido', () => {
    it('lo excluye aunque con el alcanzara de sobra', () => {
      const plan = seleccionarFefo([lote('vencido', utc(2026, 1, 1), 1000)], 10, HOY);
      expect(plan.lineas).toEqual([]);
      expect(plan.faltante).toBe(10);
    });

    it('salta el vencido y toma del siguiente vigente', () => {
      const plan = seleccionarFefo(
        [lote('vencido', utc(2026, 1, 1), 500), lote('vigente', utc(2027, 1, 1), 500)],
        20,
        HOY,
      );
      expect(plan.lineas).toEqual([{ loteId: 'vigente', cantidad: 20 }]);
    });

    it('el lote que vence HOY si se puede entregar', () => {
      const plan = seleccionarFefo([lote('hoy', HOY, 50)], 10, HOY);
      expect(plan.lineas).toEqual([{ loteId: 'hoy', cantidad: 10 }]);
    });
  });

  describe('reparto entre varios lotes', () => {
    it('completa la cantidad tomando de mas de un lote', () => {
      const plan = seleccionarFefo(
        [lote('A', utc(2026, 9, 1), 30), lote('B', utc(2027, 1, 1), 100)],
        50,
        HOY,
      );
      expect(plan.lineas).toEqual([
        { loteId: 'A', cantidad: 30 },
        { loteId: 'B', cantidad: 20 },
      ]);
      expect(plan.faltante).toBe(0);
    });

    it('agota el primero exactamente antes de pasar al segundo', () => {
      const plan = seleccionarFefo(
        [lote('A', utc(2026, 9, 1), 30), lote('B', utc(2027, 1, 1), 100)],
        30,
        HOY,
      );
      expect(plan.lineas).toHaveLength(1);
      expect(plan.lineas[0]).toEqual({ loteId: 'A', cantidad: 30 });
    });

    it('salta lotes sin existencia', () => {
      const plan = seleccionarFefo(
        [lote('agotado', utc(2026, 7, 1), 0), lote('con-stock', utc(2027, 1, 1), 50)],
        10,
        HOY,
      );
      expect(plan.lineas).toEqual([{ loteId: 'con-stock', cantidad: 10 }]);
    });
  });

  describe('cuando no alcanza', () => {
    it('reporta el faltante en vez de entregar de menos en silencio', () => {
      const plan = seleccionarFefo([lote('A', utc(2027, 1, 1), 8)], 20, HOY);
      expect(plan.lineas).toEqual([{ loteId: 'A', cantidad: 8 }]);
      expect(plan.faltante).toBe(12);
    });

    it('con inventario vacio el faltante es la cantidad completa', () => {
      expect(seleccionarFefo([], 25, HOY).faltante).toBe(25);
    });
  });

  describe('casos degenerados', () => {
    it('pedir 0 no toma nada', () => {
      expect(seleccionarFefo([lote('A', utc(2027, 1, 1), 100)], 0, HOY)).toEqual({
        lineas: [],
        faltante: 0,
      });
    });

    it('una cantidad negativa no genera lineas', () => {
      expect(seleccionarFefo([lote('A', utc(2027, 1, 1), 100)], -5, HOY).lineas).toEqual([]);
    });

    it('nunca devuelve una linea con cantidad 0', () => {
      const plan = seleccionarFefo(
        [lote('A', utc(2026, 9, 1), 10), lote('B', utc(2027, 1, 1), 10)],
        10,
        HOY,
      );
      expect(plan.lineas.every((l) => l.cantidad > 0)).toBe(true);
    });

    it('la suma de las lineas nunca supera lo pedido', () => {
      const plan = seleccionarFefo(
        [lote('A', utc(2026, 9, 1), 100), lote('B', utc(2027, 1, 1), 100)],
        37,
        HOY,
      );
      expect(plan.lineas.reduce((s, l) => s + l.cantidad, 0)).toBe(37);
    });
  });
});

describe('bajoMinimo', () => {
  it('avisa cuando la existencia esta por debajo del minimo', () => {
    expect(bajoMinimo(5, 20)).toBe(true);
  });

  it('el minimo exacto NO se considera bajo', () => {
    expect(bajoMinimo(20, 20)).toBe(false);
  });

  it('un minimo en cero desactiva la alerta', () => {
    // Hay medicamentos que el CAP no mantiene en existencia permanente.
    // Avisar por ellos solo entrena al personal a ignorar las alertas.
    expect(bajoMinimo(0, 0)).toBe(false);
  });
});
