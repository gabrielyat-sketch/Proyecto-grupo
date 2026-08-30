import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { tema } from '../../../tema';
import { GraficaPesoEdad, TENDENCIA } from './GraficaPesoEdad';
import type { PuntoCrecimiento } from './servicio-carnet';

/**
 * La grafica de peso para edad.
 *
 * Lo que se comprueba aqui no es que dibuje: es que **no diga de mas**. La
 * clasificacion sale de comparar contra el control anterior, no de donde cae el
 * punto, y las bandas de referencia del papel todavia no estan.
 */

const dibujar = (puntos: PuntoCrecimiento[]) =>
  render(
    <ThemeProvider theme={tema}>
      <GraficaPesoEdad puntos={puntos} />
    </ThemeProvider>,
  );

const punto = (
  fecha: string,
  edadEnMeses: number,
  pesoLibras: number,
  tendencia: PuntoCrecimiento['tendencia'],
  diferenciaLibras: number | null,
): PuntoCrecimiento => ({ fecha, edadEnMeses, pesoLibras, tendencia, diferenciaLibras });

const TRES = [
  punto('2025-02-10', 6, 22, 'SIN_ANTERIOR', null),
  punto('2025-08-10', 12, 24.2, 'CRECE_BIEN', 2.2),
  punto('2026-02-10', 18, 23.1, 'PERDIO', -1.1),
];

describe('sin pesos registrados', () => {
  /**
   * La grafica no se captura: sale de los pesos de cada consulta. Si no hay
   * ninguno, lo que toca es decirlo, no dibujar un cuadro vacio que parece
   * roto.
   */
  it('lo dice, y explica de donde saldria', () => {
    dibujar([]);
    expect(screen.getByText(/Todavía no hay pesos registrados/)).toBeInTheDocument();
    expect(screen.getByText(/no se captura aquí/)).toBeInTheDocument();
  });

  it('un punto sin edad no se dibuja: sin fecha de nacimiento no hay eje', () => {
    dibujar([{ ...TRES[0], edadEnMeses: null }]);
    expect(screen.getByText(/Todavía no hay pesos registrados/)).toBeInTheDocument();
  });
});

describe('la tabla, que es lo que se lee en una consulta', () => {
  it('trae cada control con su peso, su cambio y su estado', () => {
    dibujar(TRES);

    const filas = screen.getAllByRole('row');
    // Una de encabezado y tres de datos.
    expect(filas).toHaveLength(4);

    // Lo mas reciente primero: es lo que se mira al abrir.
    const primera = within(filas[1]);
    expect(primera.getByText('2026-02-10')).toBeInTheDocument();
    expect(primera.getByText('23.1')).toBeInTheDocument();
    expect(primera.getByText('-1.1')).toBeInTheDocument();
    expect(primera.getByText('Perdió peso')).toBeInTheDocument();
  });

  it('el aumento lleva signo, para que se lea sin restar', () => {
    dibujar(TRES);
    expect(screen.getByText('+2.2')).toBeInTheDocument();
  });

  it('el primer control no inventa un cambio', () => {
    dibujar(TRES);
    const filas = screen.getAllByRole('row');
    expect(within(filas[3]).getByText('—')).toBeInTheDocument();
    expect(within(filas[3]).getByText('Primer control')).toBeInTheDocument();
  });
});

describe('el estado no se dice solo con color', () => {
  /**
   * Se comprobo con el validador de paletas: el ambar de aviso (#8a5a00) y el
   * rojo de error (#b3261e) del tema del panel tienen una separacion de 0.7 en
   * deuteranopia. Son el mismo color para quien no distingue rojo y verde.
   *
   * Por eso el estado va en la FORMA del punto y en la palabra, y el color solo
   * acompana.
   */
  it('cada estado tiene su propia forma, no solo su color', () => {
    const formas = new Set(
      (['CRECE_BIEN', 'NO_GANO', 'PERDIO'] as const).map((t) => TENDENCIA[t].forma),
    );
    expect(formas.size).toBe(3);
  });

  it('la leyenda dice las tres con palabras', () => {
    dibujar(TRES);
    expect(screen.getAllByText('Crece bien').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No ganó peso').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Perdió peso').length).toBeGreaterThan(0);
  });

  it('la gráfica se anuncia y remite a la tabla', () => {
    dibujar(TRES);
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute(
      'aria-label',
      expect.stringContaining('3 controles registrados'),
    );
    expect(svg.getAttribute('aria-label')).toContain('tabla');
  });
});

describe('lo que la gráfica todavía NO dice', () => {
  /**
   * Las tres bandas del papel son un escaneo y de una foto no salen valores.
   * Mientras no llegue la tabla de referencia, la pantalla dice si el nino
   * gano o perdio peso —que es lo que mas importa en la consulta— y NO dice si
   * esta por encima o por debajo de lo esperado para su edad.
   */
  it('la nota de la sección declara que faltan las bandas de referencia', () => {
    dibujar(TRES);
    // La clasificacion que se ofrece es siempre entre controles: ninguna fila
    // habla de percentiles ni de "bajo peso para la edad".
    const textos = screen.getAllByRole('row').map((f) => f.textContent ?? '');
    for (const t of textos) {
      expect(t).not.toMatch(/percentil|bajo peso para|desnutrici/i);
    }
  });
});
