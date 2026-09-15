/**
 * «Gráfica de peso para edad»: la hoja 2 de la ficha del lactante y ninez.
 *
 * Es la cuadricula del papel, dibujada en SVG con las mismas medidas: a la
 * izquierda de 0 a 36 meses (libras 3 a 42, en escalera: hasta 30 el primer
 * ano, hasta 36 el segundo, hasta 42 el tercero) y a la derecha de 38 a 60
 * meses (libras 19 a 58). Encima se marca el peso de la consulta de hoy.
 *
 * Las curvas de referencia del papel NO se dibujan: no tenemos sus datos y
 * trazarlas a ojo seria inventar un patron de crecimiento. Cuando la grafica
 * de la pantalla tenga las bandas de la OMS, se pintan aqui con los mismos
 * numeros.
 */

/** Un punto a marcar: meses cumplidos y libras. */
export interface PuntoPeso {
  meses: number;
  libras: number;
}

const CELDA = 3.1; // mm por mes y por libra: la cuadricula del papel, reducida para que quepa en oficio
const GROSOR_FINO = 0.15;
const GROSOR_GRUESO = 0.35;

/** Un panel: meses de `mesDesde` a `mesHasta`, libras de `lbDesde` a `lbHasta`. */
function Panel({
  x,
  y,
  mesDesde,
  mesHasta,
  lbDesde,
  lbHasta,
  /** Techo de libras por tramo de meses: [[mesHastaExclusivo, lbTecho], ...]. Escalera del panel izquierdo. */
  escalera,
  pasoMes = 1,
  anios,
  punto,
}: {
  x: number;
  y: number;
  mesDesde: number;
  mesHasta: number;
  lbDesde: number;
  lbHasta: number;
  escalera?: [number, number][];
  pasoMes?: number;
  /** Rotulos de anos bajo el eje: [[mesCentro, texto], ...]. */
  anios: [number, number | string][];
  punto: PuntoPeso | null;
}) {
  const alto = (lbHasta - lbDesde) * CELDA;
  const px = (mes: number) => x + ((mes - mesDesde) / pasoMes) * CELDA;
  const py = (lb: number) => y + (lbHasta - lb) * CELDA;
  const techo = (mes: number) => {
    if (!escalera) return lbHasta;
    for (const [hasta, lb] of escalera) if (mes < hasta) return lb;
    return lbHasta;
  };

  const verticales = [];
  for (let m = mesDesde; m <= mesHasta; m += pasoMes) {
    const lb = techo(m === mesHasta ? m - pasoMes : m);
    verticales.push(
      <line
        key={'v' + m}
        x1={px(m)}
        x2={px(m)}
        y1={py(lb)}
        y2={py(lbDesde)}
        stroke="#000"
        strokeWidth={(m - mesDesde) % (pasoMes * 6) === 0 ? GROSOR_GRUESO : GROSOR_FINO}
      />,
    );
  }
  /** De que mes a que mes tiene cuadricula una libra: en la escalera, las de arriba empiezan mas tarde. */
  const tramoDe = (lb: number): [number, number] => {
    let desde = -1;
    let hasta = mesDesde;
    for (let m = mesDesde; m < mesHasta; m += pasoMes) {
      if (techo(m) >= lb) {
        if (desde < 0) desde = m;
        hasta = m + pasoMes;
      }
    }
    return [desde < 0 ? mesDesde : desde, hasta];
  };

  const horizontales = [];
  for (let lb = lbDesde; lb <= lbHasta; lb += 1) {
    const [desde, hasta] = tramoDe(lb);
    if (hasta === mesDesde) continue;
    horizontales.push(
      <line
        key={'h' + lb}
        x1={px(desde)}
        x2={px(hasta)}
        y1={py(lb)}
        y2={py(lb)}
        stroke="#000"
        strokeWidth={lb % 5 === 0 ? GROSOR_GRUESO : GROSOR_FINO}
      />,
    );
  }
  const rotulosLb = [];
  for (let lb = lbDesde; lb <= lbHasta; lb += 1) {
    const [desde, hasta] = tramoDe(lb);
    rotulosLb.push(
      <g key={'r' + lb} fontSize="2.4" fontFamily="Arial, sans-serif">
        <text x={px(desde) - 1} y={py(lb) + 0.8} textAnchor="end">
          {lb}
        </text>
        <text x={px(hasta) + 1} y={py(lb) + 0.8}>
          {lb}
        </text>
      </g>,
    );
  }
  const rotulosMes = [];
  for (let m = mesDesde; m <= mesHasta; m += pasoMes) {
    rotulosMes.push(
      <text key={'m' + m} x={px(m)} y={py(lbDesde) + 3.2} textAnchor="middle" fontSize="2.4" fontFamily="Arial, sans-serif">
        {m}
      </text>,
    );
  }

  return (
    <g>
      {horizontales}
      {verticales}
      {rotulosLb}
      {rotulosMes}
      {/* «Peso en libras», de pie, a la izquierda del panel. */}
      <text
        transform={'translate(' + (x - 7) + ' ' + (y + alto / 2) + ') rotate(-90)'}
        textAnchor="middle"
        fontSize="2.8"
        fontFamily="Arial, sans-serif"
      >
        Peso en libras
      </text>
      <text x={x - 8} y={py(lbDesde) + 8} fontSize="3" fontWeight="700" fontFamily="Arial, sans-serif">
        Meses
      </text>
      <text x={x - 8} y={py(lbDesde) + 14} fontSize="3" fontWeight="700" fontFamily="Arial, sans-serif">
        Edad
      </text>
      {/* Las rayitas de los meses bajo el eje y los anos. */}
      {Array.from({ length: (mesHasta - mesDesde) / pasoMes + 1 }, (_, i) => mesDesde + i * pasoMes).map((m) => (
        <line
          key={'t' + m}
          x1={px(m)}
          x2={px(m)}
          y1={py(lbDesde) + 4.5}
          y2={py(lbDesde) + (m % 12 === 0 ? 11 : 9)}
          stroke="#000"
          strokeWidth={m % 12 === 0 ? GROSOR_GRUESO : GROSOR_FINO}
        />
      ))}
      <line x1={px(mesDesde)} x2={px(mesHasta)} y1={py(lbDesde) + 11} y2={py(lbDesde) + 11} stroke="#000" strokeWidth={GROSOR_GRUESO} />
      {anios.map(([m, texto]) => (
        <text key={'a' + m} x={px(m)} y={py(lbDesde) + 14.5} textAnchor="middle" fontSize="3" fontWeight="700" fontFamily="Arial, sans-serif">
          {texto}
        </text>
      ))}
      {punto && punto.meses >= mesDesde && punto.meses <= mesHasta && punto.libras >= lbDesde && punto.libras <= techo(punto.meses) ? (
        <g>
          <circle cx={px(punto.meses)} cy={py(punto.libras)} r={1.4} fill="#000" />
          <circle cx={px(punto.meses)} cy={py(punto.libras)} r={2.6} fill="none" stroke="#000" strokeWidth={0.3} />
        </g>
      ) : null}
    </g>
  );
}

export function GraficaPesoEdad({ punto }: { punto: PuntoPeso | null }) {
  // Panel izquierdo: 0-36 meses, 3-42 lb, en escalera. Derecho: 38-60 meses de dos en dos, 19-58 lb.
  const ANCHO = 300;
  const ALTO = 148;
  return (
    <svg
      viewBox={'0 0 ' + ANCHO + ' ' + ALTO}
      width={ANCHO + 'mm'}
      height={ALTO + 'mm'}
      role="img"
      aria-label="Gráfica de peso para edad"
      style={{ display: 'block' }}
    >
      <text x="10" y="18" fontSize="6" fontWeight="700" fontFamily="Arial, sans-serif">
        Gráfica de peso para edad
      </text>
      {/* La leyenda del papel. */}
      <g fontSize="2.2" fontFamily="Arial, sans-serif">
        <rect x="12" y="22" width="36" height="22" fill="none" stroke="#000" strokeWidth="0.3" />
        <text x="26" y="28" fontWeight="700">
          No crece bien,
        </text>
        <text x="26" y="31">pierde peso</text>
        <text x="26" y="36" fontWeight="700">
          No crece bien,
        </text>
        <text x="26" y="39">no gana peso</text>
        <text x="26" y="43" fontWeight="700">
          Crece bien.
        </text>
      </g>
      <Panel
        x={30}
        y={8}
        mesDesde={0}
        mesHasta={36}
        lbDesde={3}
        lbHasta={42}
        escalera={[
          [12, 30],
          [24, 36],
        ]}
        anios={[
          [6, '1 año'],
          [18, '2 años'],
          [30, '3 años'],
        ]}
        punto={punto}
      />
      <Panel
        x={160}
        y={8}
        mesDesde={38}
        mesHasta={60}
        lbDesde={19}
        lbHasta={58}
        pasoMes={2}
        anios={[
          [43, '4 años'],
          [55, '5 años'],
        ]}
        punto={punto}
      />
    </svg>
  );
}
