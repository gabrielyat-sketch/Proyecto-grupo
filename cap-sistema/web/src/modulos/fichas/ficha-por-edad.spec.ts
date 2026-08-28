import { edadEnAnios, edadEnDias, fichaParaPaciente } from './ficha-por-edad';

/**
 * Llenar la ficha equivocada no es un error cosmético: cada hoja del MSPAS
 * pregunta cosas distintas, y lo que se capture en la que no toca no tiene
 * respaldo en ningún papel firmado. La decisión sale de la fecha de nacimiento
 * que recepción ya pide, no del criterio de quien atiende.
 */

/** Un día fijo, para que las pruebas no dependan de cuándo se corran. */
const HOY = new Date(2026, 7, 28); // 28 de agosto de 2026

describe('la edad a partir de la fecha de nacimiento', () => {
  it('cuenta los días de un recién nacido', () => {
    expect(edadEnDias('2026-08-28', HOY)).toBe(0);
    expect(edadEnDias('2026-08-27', HOY)).toBe(1);
    expect(edadEnDias('2026-08-01', HOY)).toBe(27);
  });

  it('cuenta los años cumplidos, no los empezados', () => {
    // Cumple en septiembre: todavía no los ha cumplido.
    expect(edadEnAnios('2000-09-15', HOY)).toBe(25);
    // Cumplió ayer.
    expect(edadEnAnios('2000-08-27', HOY)).toBe(26);
    // Cumple hoy.
    expect(edadEnAnios('2000-08-28', HOY)).toBe(26);
  });

  /**
   * Guatemala es UTC-6: construir un `Date` con la cadena entera la interpreta
   * como medianoche UTC, que aquí es el día anterior.
   */
  it('no se corre un día al leer la fecha', () => {
    expect(edadEnDias('2026-08-20T00:00:00.000Z', HOY)).toBe(8);
  });
});

describe('qué ficha le toca a cada paciente', () => {
  it('un recién nacido va a la de menor de 28 días', () => {
    const f = fichaParaPaciente('2026-08-20', 'p-1', HOY);
    expect(f.tipo).toBe('NEONATO');
    expect(f.ruta).toBe('/pacientes/p-1/ficha-neonato');
    expect(f.motivo).toBe('Tiene 8 días de nacido');
  });

  /** El propio formulario dice "menor de 28 días". */
  it('el día 28 todavía es neonato; el 29 ya no', () => {
    expect(fichaParaPaciente('2026-07-31', 'p-1', HOY).tipo).toBe('NEONATO');
    expect(fichaParaPaciente('2026-07-30', 'p-1', HOY).tipo).toBe('NINEZ');
  });

  /**
   * La hoja existe en el papel pero su pantalla no está construida. Se dice,
   * en vez de ofrecer la de adultos y que alguien la llene sin darse cuenta.
   */
  it('un niño va a la de niñez, que todavía no tiene pantalla', () => {
    const f = fichaParaPaciente('2020-03-10', 'p-1', HOY);
    expect(f.tipo).toBe('NINEZ');
    expect(f.ruta).toBeNull();
    expect(f.nombre).toBe('Lactancia y niñez');
  });

  it('a los diez años empieza la ficha de adultos', () => {
    expect(fichaParaPaciente('2016-08-29', 'p-1', HOY).tipo).toBe('NINEZ');
    expect(fichaParaPaciente('2016-08-28', 'p-1', HOY).tipo).toBe('ADULTO');
  });

  it('un adulto mayor usa la misma que un adolescente', () => {
    const f = fichaParaPaciente('1945-01-01', 'p-1', HOY);
    expect(f.tipo).toBe('ADULTO');
    expect(f.ruta).toBe('/pacientes/p-1/ficha');
    expect(f.motivo).toBe('Tiene 81 años');
  });

  it('el motivo se dice para quien atiende, no en jerga', () => {
    expect(fichaParaPaciente('2026-08-27', 'p-1', HOY).motivo).toBe('Tiene 1 día de nacido');
  });
});
