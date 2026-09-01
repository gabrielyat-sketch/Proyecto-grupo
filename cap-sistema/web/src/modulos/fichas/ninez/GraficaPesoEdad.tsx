import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { PuntoCrecimiento, TendenciaPeso } from './servicio-carnet';
import { edadDicha } from './carnet-ninez';

/**
 * La gráfica de peso para edad — página 2 del formulario.
 *
 * **Nada de esto se captura: se dibuja.** El sistema ya guarda el peso de cada
 * atención, y la gráfica son esos pesos puestos en el tiempo. Es de las pocas
 * partes donde lo digital hace algo que el papel no puede: avisar **en la
 * consulta** de que el niño dejó de crecer bien, en vez de dejarlo a que
 * alguien compare dos puntos a ojo.
 *
 * **Faltan las bandas de referencia.** Las tres curvas del papel son un
 * escaneo, y de una foto no salen valores. Cuando el CAP o el MSPAS den la
 * tabla de peso para edad se dibujan encima, sin tocar nada de esto: son una
 * lectura distinta —dónde cae el punto— de la que ya está —cómo se movió—.
 *
 * **El estado no se dice con color.** Se dice con la forma del punto, con la
 * palabra en la tabla y con la leyenda. El ámbar y el rojo del tema del panel
 * son indistinguibles para un deuteránope: se comprobó, no se supuso.
 */

const ANCHO = 720;
const ALTO = 300;
const MARGEN = { arriba: 16, derecha: 16, abajo: 44, izquierda: 48 };
/** El papel llega hasta los cinco años. */
const MESES_MAXIMO = 60;

const TRAZO = { ancho: ANCHO - MARGEN.izquierda - MARGEN.derecha, alto: ALTO - MARGEN.arriba - MARGEN.abajo };

/** Cómo se dice cada tendencia, y con qué forma se dibuja. */
export const TENDENCIA: Record<
  TendenciaPeso,
  { texto: string; forma: 'circulo' | 'cuadro' | 'triangulo'; color: string }
> = {
  CRECE_BIEN: { texto: 'Crece bien', forma: 'circulo', color: 'success.main' },
  NO_GANO: { texto: 'No ganó peso', forma: 'cuadro', color: 'warning.main' },
  PERDIO: { texto: 'Perdió peso', forma: 'triangulo', color: 'error.main' },
  SIN_ANTERIOR: { texto: 'Primer control', forma: 'circulo', color: 'text.secondary' },
};

/** Los colores resueltos, que dentro de un SVG no entienden los tokens de MUI. */
const COLOR: Record<TendenciaPeso, string> = {
  CRECE_BIEN: '#1b5e20',
  NO_GANO: '#8a5a00',
  PERDIO: '#b3261e',
  SIN_ANTERIOR: '#4a6572',
};

export function GraficaPesoEdad({ puntos }: { puntos: readonly PuntoCrecimiento[] }) {
  const conEdad = puntos.filter((p) => p.edadEnMeses !== null);

  if (conEdad.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Todavía no hay pesos registrados en ninguna consulta de este niño. La gráfica sale de
        ellos: no se captura aquí.
      </Typography>
    );
  }

  // La escala vertical sale de los pesos del nino, con un margen de dos libras
  // a cada lado. El papel usa una escala fija porque esta impreso; aqui no hay
  // motivo para dejar tres cuartos de la grafica en blanco.
  const pesos = conEdad.map((p) => p.pesoLibras);
  const minimo = Math.max(0, Math.floor(Math.min(...pesos)) - 2);
  const maximo = Math.ceil(Math.max(...pesos)) + 2;

  const x = (meses: number) => MARGEN.izquierda + (meses / MESES_MAXIMO) * TRAZO.ancho;
  const y = (libras: number) =>
    MARGEN.arriba + TRAZO.alto - ((libras - minimo) / (maximo - minimo)) * TRAZO.alto;

  const linea = conEdad
    .map((p, i) => (i === 0 ? 'M' : 'L') + x(p.edadEnMeses as number) + ' ' + y(p.pesoLibras))
    .join(' ');

  // Una marca por ano, como el eje inferior del papel.
  const anios = [0, 1, 2, 3, 4, 5];
  // Cinco lineas horizontales: suficientes para leer, sin convertir el fondo
  // en una reticula que compita con los puntos.
  const nivelesY = Array.from({ length: 5 }, (_, i) => minimo + ((maximo - minimo) * i) / 4);

  return (
    <Stack sx={{ gap: 2 }}>
      <Box sx={{ overflowX: 'auto' }}>
        <svg
          viewBox={'0 0 ' + ANCHO + ' ' + ALTO}
          width="100%"
          style={{ minWidth: 560, display: 'block' }}
          role="img"
          aria-label={
            'Peso para edad: ' +
            conEdad.length +
            (conEdad.length === 1 ? ' control registrado' : ' controles registrados') +
            '. El detalle está en la tabla que sigue.'
          }
        >
          {/* Rejilla, recesiva: esta para leer el valor, no para mirarla. */}
          {nivelesY.map((v) => (
            <g key={v}>
              <line
                x1={MARGEN.izquierda}
                x2={ANCHO - MARGEN.derecha}
                y1={y(v)}
                y2={y(v)}
                stroke="#d0dcdf"
                strokeWidth={1}
              />
              <text x={MARGEN.izquierda - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#4a6572">
                {Math.round(v)}
              </text>
            </g>
          ))}

          {anios.map((a) => (
            <g key={a}>
              <line
                x1={x(a * 12)}
                x2={x(a * 12)}
                y1={MARGEN.arriba}
                y2={MARGEN.arriba + TRAZO.alto}
                stroke="#e8eff1"
                strokeWidth={1}
              />
              <text
                x={x(a * 12)}
                y={ALTO - MARGEN.abajo + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#4a6572"
              >
                {a === 0 ? 'Nace' : a + (a === 1 ? ' año' : ' años')}
              </text>
            </g>
          ))}

          <text
            x={MARGEN.izquierda - 8}
            y={MARGEN.arriba - 4}
            textAnchor="end"
            fontSize={11}
            fill="#4a6572"
          >
            Lb
          </text>

          {/* La linea del nino. Dos pixeles: es el dato, no el fondo. */}
          <path d={linea} fill="none" stroke="#15607a" strokeWidth={2} />

          {/*
            El estado va en la FORMA, no en el color. Los tres colores de estado
            del tema del panel no se distinguen entre si con deuteranopia.
          */}
          {conEdad.map((p) => {
            const cx = x(p.edadEnMeses as number);
            const cy = y(p.pesoLibras);
            const forma = TENDENCIA[p.tendencia].forma;
            const color = COLOR[p.tendencia];
            const titulo =
              edadDicha(p.edadEnMeses as number) +
              ' · ' +
              p.pesoLibras +
              ' Lb · ' +
              TENDENCIA[p.tendencia].texto;

            if (forma === 'cuadro') {
              return (
                <rect
                  key={p.fecha}
                  x={cx - 5}
                  y={cy - 5}
                  width={10}
                  height={10}
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth={2.5}
                >
                  <title>{titulo}</title>
                </rect>
              );
            }
            if (forma === 'triangulo') {
              return (
                <polygon
                  key={p.fecha}
                  points={
                    cx + ',' + (cy + 6) + ' ' + (cx - 6) + ',' + (cy - 5) + ' ' + (cx + 6) + ',' + (cy - 5)
                  }
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                >
                  <title>{titulo}</title>
                </polygon>
              );
            }
            return (
              <circle key={p.fecha} cx={cx} cy={cy} r={5} fill={color} stroke="#ffffff" strokeWidth={1.5}>
                <title>{titulo}</title>
              </circle>
            );
          })}
        </svg>
      </Box>

      {/* La leyenda: forma y palabra, nunca solo color. */}
      <Stack direction="row" sx={{ gap: 2.5, flexWrap: 'wrap' }}>
        {(['CRECE_BIEN', 'NO_GANO', 'PERDIO'] as const).map((t) => (
          <Stack key={t} direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
            <MarcaLeyenda tendencia={t} />
            <Typography variant="body2" color="text.secondary">
              {TENDENCIA[t].texto}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {/*
        La tabla no es un extra de accesibilidad: en una consulta, leer "perdio
        1.2 libras desde marzo" es mas util que mirar una pendiente.
      */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Edad</TableCell>
              <TableCell align="right">Peso (Lb)</TableCell>
              <TableCell align="right">Cambio</TableCell>
              <TableCell>Desde el control anterior</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...conEdad].reverse().map((p) => (
              <TableRow key={p.fecha}>
                <TableCell>{p.fecha}</TableCell>
                <TableCell>{edadDicha(p.edadEnMeses as number)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {p.pesoLibras}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {p.diferenciaLibras === null
                    ? '—'
                    : (p.diferenciaLibras > 0 ? '+' : '') + p.diferenciaLibras}
                </TableCell>
                <TableCell>
                  <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
                    <MarcaLeyenda tendencia={p.tendencia} />
                    <span>{TENDENCIA[p.tendencia].texto}</span>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}

/** La misma forma que en la gráfica, en pequeño. */
function MarcaLeyenda({ tendencia }: { tendencia: TendenciaPeso }) {
  const { forma } = TENDENCIA[tendencia];
  const color = COLOR[tendencia];
  return (
    <svg width={14} height={14} aria-hidden focusable="false">
      {forma === 'cuadro' ? (
        <rect x={2} y={2} width={10} height={10} fill="#ffffff" stroke={color} strokeWidth={2.5} />
      ) : forma === 'triangulo' ? (
        <polygon points="7,13 1,3 13,3" fill={color} />
      ) : (
        <circle cx={7} cy={7} r={5} fill={color} />
      )}
    </svg>
  );
}
