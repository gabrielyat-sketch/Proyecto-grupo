import type { ReactNode } from 'react';
import type { Ficha } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha } from '../servicio-fichas';
import { Campo, Casilla, Columnas, Fila, MarcaEnRaya, Subtitulo, fechaConBarras } from './Hoja';

/**
 * Los bloques que las cuatro hojas comparten: signos de peligro, antecedentes,
 * la matriz de problemas y la tabla de consejeria.
 *
 * Todos se dibujan desde el CATALOGO —la estructura del formulario, la misma
 * que usa la pantalla de captura— y le preguntan a la ficha que se marco. Asi
 * la hoja impresa lista los catorce problemas del papel aunque solo uno este
 * presente, que es lo que la hace parecer el formulario y no un resumen.
 */

// ─────────────────────────── signos de peligro ───────────────────────────

/** Lo que la ficha dice de un signo: SI, NO, o nada si no se contesto. */
function respuestaSigno(ficha: Ficha, signoId: string): boolean | null {
  const s = ficha.signosPeligro.find((x) => x.signoId === signoId);
  return s ? s.presente : null;
}

function detalleSigno(ficha: Ficha, signoId: string): string | null {
  return ficha.signosPeligro.find((x) => x.signoId === signoId)?.detalle ?? null;
}

/**
 * La lista de SI / NO en dos columnas, como en las hojas de adulto y prenatal.
 * Los signos que piden texto («Otros: describa») llevan su raya.
 */
export function SignosPeligroSiNo({
  catalogo,
  ficha,
  intercalados = false,
}: {
  catalogo: CatalogoFicha;
  ficha: Ficha;
  /**
   * El catalogo prenatal esta en el orden en que se LEE el papel, renglon a
   * renglon: 1 a la izquierda, 2 a la derecha, 3 a la izquierda... El de
   * adultos va columna por columna. Cada hoja dice cual es el suyo.
   */
  intercalados?: boolean;
}) {
  const signos = [...catalogo.signosPeligro].sort((a, b) => a.orden - b.orden);
  const mitad = Math.ceil(signos.length / 2);
  const columnas = intercalados
    ? [signos.filter((_, i) => i % 2 === 0), signos.filter((_, i) => i % 2 === 1)]
    : [signos.slice(0, mitad), signos.slice(mitad)];
  return (
    <Columnas n={2}>
      {columnas.map((col, i) => (
        <table key={i} className="hoja-tabla-sino">
          <thead>
            <tr>
              <th />
              <th>SI</th>
              <th>NO</th>
            </tr>
          </thead>
          <tbody>
            {col.map((s) => {
              const r = respuestaSigno(ficha, s.id);
              const detalle = detalleSigno(ficha, s.id);
              return (
                <tr key={s.id}>
                  <td>
                    {s.texto}
                    {s.pideTexto ? <Campo valor={detalle} ancho={22} /> : null}
                  </td>
                  <td>
                    <Casilla marcada={r === true} rotulo={'SI ' + s.texto} soloAccesible />
                  </td>
                  <td>
                    <Casilla marcada={r === false} rotulo={'NO ' + s.texto} soloAccesible />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </Columnas>
  );
}

/**
 * La lista numerada con una sola casilla por signo, como en las hojas del
 * neonato y de ninez: se marca lo que esta, lo demas queda en blanco.
 */
export function SignosPeligroCasillas({
  catalogo,
  ficha,
  columnas = 2,
  signos: subconjunto,
  negrita = true,
  casillaPegada = false,
  separador = false,
}: {
  catalogo: CatalogoFicha;
  ficha: Ficha;
  columnas?: 1 | 2 | 3;
  /** Solo estos signos (la hoja del neonato los reparte en tres recuadros); todos si no se dan. */
  signos?: CatalogoFicha['signosPeligro'];
  negrita?: boolean;
  /** La casilla pegada al texto en vez de al borde derecho, como en la hoja de ninez. */
  casillaPegada?: boolean;
  /** Una raya vertical entre columnas. */
  separador?: boolean;
}) {
  const signos = [...(subconjunto ?? catalogo.signosPeligro)].sort((a, b) => a.orden - b.orden);
  const porColumna = Math.ceil(signos.length / columnas);
  const grupos = Array.from({ length: columnas }, (_, i) =>
    signos.slice(i * porColumna, (i + 1) * porColumna),
  );
  const lista = (
    <>
      {grupos.map((g, i) => (
        <ol
          key={i}
          style={{
            margin: 0,
            padding: separador && i > 0 ? '0 0 0 3mm' : 0,
            listStyle: 'none',
            fontWeight: negrita ? 700 : 400,
            borderLeft: separador && i > 0 ? '0.25mm solid #000' : undefined,
          }}
        >
          {g.map((s, j) => {
            const r = respuestaSigno(ficha, s.id);
            const detalle = detalleSigno(ficha, s.id);
            return (
              <li
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: casillaPegada ? 'flex-start' : 'space-between',
                  gap: '3mm',
                  margin: '0.4mm 0',
                }}
              >
                <span style={{ display: 'inline-flex', gap: '1.5mm' }}>
                  <span style={{ minWidth: '4mm' }}>{i * porColumna + j + 1}.</span>
                  <span>
                    {s.texto}
                    {s.pideTexto && detalle ? <span className="hoja-valor">: {detalle}</span> : null}
                  </span>
                </span>
                <Casilla marcada={r === true} rotulo={s.texto} soloAccesible />
              </li>
            );
          })}
        </ol>
      ))}
    </>
  );
  if (columnas === 1) return lista;
  return <Columnas n={columnas}>{lista}</Columnas>;
}

// ───────────────────────────── antecedentes ─────────────────────────────

function respuestaAntecedente(antecedentes: AntecedentesPaciente | null, antecedenteId: string) {
  return antecedentes?.marcados.find((m) => m.antecedenteId === antecedenteId) ?? null;
}

/** Lo que hay que saber de un antecedente para dibujarlo: su fila del catalogo y su respuesta. */
function antecedentePorCodigo(
  catalogo: CatalogoFicha,
  antecedentes: AntecedentesPaciente | null,
  codigo: string,
) {
  const a = catalogo.antecedentes.find((x) => x.codigo === codigo) ?? null;
  const r = a ? respuestaAntecedente(antecedentes, a.id) : null;
  const valor = r === null ? null : r.respuesta === 'SI' ? true : r.respuesta === 'NO' ? false : null;
  return { a, r, valor };
}

/** Lo corto que acompana a un antecedente en su misma linea: «# ___». */
function ExtrasCortos({ a, r }: { a: CatalogoFicha['antecedentes'][number]; r: ReturnType<typeof respuestaAntecedente> }) {
  return a.pideNumero ? <Campo rotulo="#" valor={r?.numero} ancho={7} /> : null;
}

const tieneExtrasLargos = (a: CatalogoFicha['antecedentes'][number]) =>
  a.pideDetalle || a.pideFecha || a.permiteNoAplica;

/** Lo que va en su propio renglon: «Cual: ____», «Fecha: __/__/__», «No aplica». */
function ExtrasLargos({ a, r }: { a: CatalogoFicha['antecedentes'][number]; r: ReturnType<typeof respuestaAntecedente> }) {
  return (
    <>
      {a.pideDetalle ? <Campo rotulo="Cuál:" valor={r?.detalle} llena /> : null}
      {a.pideFecha ? (
        <Campo rotulo="Fecha:" valor={r?.fecha ? fechaConBarras(r.fecha) : null} llena />
      ) : null}
      {a.permiteNoAplica ? <Casilla marcada={r?.respuesta === 'NO_APLICA'} rotulo="No aplica" /> : null}
    </>
  );
}

/**
 * Antecedentes en columnas, cada uno donde lo pone el papel.
 *
 * `codigos` son las columnas, y dentro de cada una el orden de arriba abajo,
 * copiados de la hoja oficial. Dentro de cada columna las casillas de SI y
 * de NO forman su propia columna: el texto a la izquierda con lo que mida y
 * los cuadritos alineados uno debajo del otro. Un codigo que el catalogo no
 * tenga se salta sin dejar hueco.
 *
 * Los antecedentes son del PACIENTE, no de la consulta: se imprimen los que
 * tiene hoy.
 */
export function ColumnasAntecedentes({
  catalogo,
  antecedentes,
  codigos,
  anchos,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  codigos: string[][];
  /** Proporciones de las columnas, como en el papel; iguales si no se dan. */
  anchos?: string;
}) {
  const n = codigos.length as 2 | 3;
  return (
    <Columnas n={n} anchos={anchos}>
      {codigos.map((columna, i) => (
        <div key={i} className="hoja-lista-sino">
          {columna.map((codigo) => {
            const { a, r, valor } = antecedentePorCodigo(catalogo, antecedentes, codigo);
            if (!a) return null;
            return (
              <div key={a.id} className="hoja-lista-sino-fila" role="group" aria-label={a.texto}>
                <span>{a.texto}</span>
                <span className="hoja-lista-sino-casilla">
                  <Casilla marcada={valor === true} rotulo="SI" />
                </span>
                <span className="hoja-lista-sino-casilla">
                  <Casilla marcada={valor === false} rotulo="NO" />
                </span>
                <span className="hoja-lista-sino-corto">
                  <ExtrasCortos a={a} r={r} />
                </span>
                {tieneExtrasLargos(a) ? (
                  <span className="hoja-lista-sino-extra">
                    <ExtrasLargos a={a} r={r} />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </Columnas>
  );
}

/** Un antecedente en linea, «Texto SI [ ] NO [ ] Cual: ____», para las filas sueltas del papel. */
export function SiNoAntecedente({
  catalogo,
  antecedentes,
  codigo,
  rotulo,
  rotuloDetalle = 'Cuál:',
  anchoDetalle = 24,
  soloNoAplicaMarcado = false,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  codigo: string;
  /** Si el papel lo llama distinto que el catalogo. */
  rotulo?: string;
  /** «Cuál:» o «¿Cuál?», como lo escriba el papel. */
  rotuloDetalle?: string;
  anchoDetalle?: number;
  /** El papel prenatal no trae «No aplica»: solo se dibuja si se marco. */
  soloNoAplicaMarcado?: boolean;
}) {
  const { a, r, valor } = antecedentePorCodigo(catalogo, antecedentes, codigo);
  if (!a) return null;
  return (
    <span className="hoja-sino" role="group" aria-label={a.texto}>
      <span>{rotulo ?? a.texto}</span>
      <Casilla marcada={valor === true} rotulo="SI" />
      <Casilla marcada={valor === false} rotulo="NO" />
      <ExtrasCortos a={a} r={r} />
      {a.permiteNoAplica && (!soloNoAplicaMarcado || r?.respuesta === 'NO_APLICA') ? (
        <Casilla marcada={r?.respuesta === 'NO_APLICA'} rotulo="No aplica" />
      ) : null}
      {a.pideDetalle ? <Campo rotulo={rotuloDetalle} valor={r?.detalle} ancho={anchoDetalle} /> : null}
      {a.pideFecha ? (
        <Campo rotulo="Fecha de última dosis:" valor={r?.fecha ? fechaConBarras(r.fecha) : null} ancho={20} />
      ) : null}
    </span>
  );
}

/** Un antecedente que en el papel es solo una raya: «Quirurgicos: ____». */
export function LineaAntecedente({
  catalogo,
  antecedentes,
  codigo,
  rotulo,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  codigo: string;
  rotulo: string;
}) {
  const { a, r } = antecedentePorCodigo(catalogo, antecedentes, codigo);
  return (
    <Fila>
      <Campo rotulo={rotulo} valor={a ? r?.detalle : null} llena />
    </Fila>
  );
}

/**
 * Lo que el catalogo tenga y la hoja no haya colocado a mano.
 *
 * Si el CAP anade un antecedente nuevo al catalogo, sale aqui —al final del
 * grupo, en columnas— en vez de perderse. La hoja deja de ser identica al
 * papel en ese renglon, que es preferible a imprimir un dato de menos.
 */
export function AntecedentesRestantes({
  catalogo,
  antecedentes,
  colocados,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  colocados: string[];
}) {
  const puestos = new Set(colocados);
  const restantes = catalogo.antecedentes.filter((a) => !puestos.has(a.codigo)).sort((a, b) => a.orden - b.orden);
  if (restantes.length === 0) return null;
  const porColumna = Math.ceil(restantes.length / 3);
  const codigos = [0, 1, 2].map((i) => restantes.slice(i * porColumna, (i + 1) * porColumna).map((a) => a.codigo));
  return <ColumnasAntecedentes catalogo={catalogo} antecedentes={antecedentes} codigos={codigos} />;
}

// ─────────────────────────── matriz de problemas ───────────────────────────

/** Una opcion del papel, subrayada si la ficha la marco. */
function Opcion({ texto, marcada, clase = 'hoja-opcion' }: { texto: string; marcada: boolean; clase?: string }) {
  return <span className={clase + (marcada ? ' hoja-opcion--marcada' : '')}>{texto}</span>;
}

export interface EncabezadosMatriz {
  problema: ReactNode;
  evaluar: ReactNode;
  clasificar: ReactNode;
  conducta: ReactNode;
}

type ProblemaCatalogo = CatalogoFicha['problemas'][number];

/**
 * La revision de problemas: la tabla grande de todas las hojas.
 *
 * Cada fila es un problema del catalogo con su SI / NO, sus signos a evaluar
 * y sus diagnosticos posibles; lo que la ficha marco va subrayado, que es lo
 * que el papel pide («subraye los signos encontrados»). La columna de la
 * derecha cambia segun la hoja: en adultos y ninez es UNA columna que abarca
 * todas las filas (medicamento 1 al 4, vacuna, referencia...), y en el neonato
 * es una celda por problema con su tratamiento. `conductaPorFila` decide.
 *
 * El SI / NO tambien cambia de forma: en adultos son casillas en su propia
 * columna; en el neonato son rayas («SI___», «NO___») en su columna; en ninez
 * las casillas van debajo del nombre del problema. `sino` lo dice.
 */
export function MatrizProblemas({
  catalogo,
  ficha,
  encabezados,
  conductaPorFila = false,
  columnaConducta,
  sino = 'columna',
  filasSinSiNo = [],
  opcionesEnLineas = false,
  anotacionBajoProblema = [],
  extraInvestigue,
  extraClasificar,
  anchos = {},
  compacta = false,
  altoFila,
}: {
  catalogo: CatalogoFicha;
  ficha: Ficha;
  encabezados: EncabezadosMatriz;
  conductaPorFila?: boolean;
  /** Lo que va en la columna derecha cuando abarca todas las filas. */
  columnaConducta?: ReactNode;
  sino?: 'columna' | 'rayas' | 'bajoProblema';
  /**
   * Problemas que en el papel no llevan SI / NO y cuyo «diagnostico» es una
   * instruccion que se extiende hasta la columna de tratamiento (VIH-SIDA en
   * el neonato). Por nombre, porque el catalogo no lo distingue.
   */
  filasSinSiNo?: string[];
  /** Cada signo y cada diagnostico en su renglon, como en las hojas de ninez y neonato. */
  opcionesEnLineas?: boolean;
  /** Problemas cuya raya («Cuanto tiempo hace») va debajo del SI / NO y no en la columna de investigar. */
  anotacionBajoProblema?: string[];
  /** Texto fijo del papel que el catalogo no trae, a poner al principio de la columna de investigar. */
  extraInvestigue?: (p: ProblemaCatalogo) => ReactNode;
  /** Idem, al final de la columna de clasificar. */
  extraClasificar?: (p: ProblemaCatalogo) => ReactNode;
  /** Anchos de columna en mm, donde el papel se aparta de los de adultos. */
  anchos?: { problema?: number; clasificar?: number; conducta?: number };
  /** Letra y margenes mas apretados: la hoja de ninez tiene catorce problemas en una cara. */
  compacta?: boolean;
  /** Alto minimo de cada fila en mm, para que la tabla llene la hoja como el papel. */
  altoFila?: number;
}) {
  const problemas = [...catalogo.problemas].sort((a, b) => a.orden - b.orden);
  const conColumnaSino = sino !== 'bajoProblema';
  const sinSiNo = new Set(filasSinSiNo);
  const anotacionAbajo = new Set(anotacionBajoProblema);
  const claseOpciones = 'hoja-opcion' + (opcionesEnLineas ? ' hoja-opcion--renglon' : '');

  const casillas = (presente: boolean | null) =>
    sino === 'rayas' ? (
      <span className="hoja-sino-rayas">
        <MarcaEnRaya rotulo="SI" marcada={presente === true} ancho={5} />
        <MarcaEnRaya rotulo="NO" marcada={presente === false} ancho={5} />
      </span>
    ) : sino === 'bajoProblema' ? (
      <span className="hoja-sino">
        <Casilla marcada={presente === true} rotulo="SI" />
        <Casilla marcada={presente === false} rotulo="NO" />
      </span>
    ) : (
      <div className="hoja-sino-vertical">
        <span>SI</span>
        <Casilla marcada={presente === true} rotulo="SI" soloAccesible />
        <span>NO</span>
        <Casilla marcada={presente === false} rotulo="NO" soloAccesible />
      </div>
    );

  return (
    <table className={'hoja-tabla hoja-matriz' + (compacta ? ' hoja-matriz--compacta' : '')}>
      <thead>
        <tr>
          <th
            className="hoja-encabezado-columna"
            style={{ width: (anchos.problema ?? (conColumnaSino ? 24 : 30)) + 'mm' }}
            colSpan={sino === 'rayas' ? 2 : 1}
          >
            {encabezados.problema}
          </th>
          {sino === 'columna' ? (
            <th className="hoja-encabezado-columna" style={{ width: '11mm' }} aria-label="SI o NO" />
          ) : null}
          <th className="hoja-encabezado-columna">{encabezados.evaluar}</th>
          <th className="hoja-encabezado-columna" style={{ width: (anchos.clasificar ?? 44) + 'mm' }}>
            {encabezados.clasificar}
          </th>
          <th
            className="hoja-encabezado-columna hoja-celda-conducta"
            style={anchos.conducta ? { width: anchos.conducta + 'mm' } : undefined}
          >
            {encabezados.conducta}
          </th>
        </tr>
      </thead>
      <tbody>
        {problemas.map((p, i) => {
          const r = ficha.problemas.find((x) => x.problemaId === p.id) ?? null;
          const presente = r ? r.presente : null;
          const signosMarcados = new Set(r?.signos ?? []);
          const diagnosticosMarcados = new Set(r?.diagnosticos ?? []);
          const signos = [...p.signos].sort((a, b) => a.orden - b.orden);
          const todosLosDx = [...p.diagnosticos].sort((a, b) => a.orden - b.orden);
          // «Otro: ____» va con su raya, no en la lista de opciones.
          const diagnosticos = todosLosDx.filter((d) => !d.pideTexto);
          const conTexto = todosLosDx.filter((d) => d.pideTexto);
          const lleva = !sinSiNo.has(p.nombre);
          const anotacion = p.etiquetaAnotacion ? (
            <div style={{ fontWeight: 400 }}>
              <Campo rotulo={p.etiquetaAnotacion} valor={r?.anotacion} ancho={14} />
            </div>
          ) : null;
          const anotacionEnProblema = anotacion && anotacionAbajo.has(p.nombre);
          return (
            <tr key={p.id} style={altoFila ? { height: altoFila + 'mm' } : undefined}>
              <td className="hoja-celda-problema" style={anchos.problema ? { width: anchos.problema + 'mm' } : undefined}>
                {p.orden}. {p.nombre}
                {sino === 'bajoProblema' && lleva ? casillas(presente) : null}
                {anotacionEnProblema ? anotacion : null}
              </td>
              {conColumnaSino ? <td className="hoja-celda-sino">{lleva ? casillas(presente) : null}</td> : null}
              <td>
                {anotacion && !anotacionEnProblema ? anotacion : null}
                {extraInvestigue?.(p)}
                {signos.map((s) => (
                  <Opcion key={s.id} texto={s.texto} marcada={signosMarcados.has(s.texto)} clase={claseOpciones} />
                ))}
              </td>
              <td colSpan={!lleva && conductaPorFila ? 2 : 1}>
                {diagnosticos.map((d) => (
                  <Opcion
                    key={d.id}
                    texto={d.texto}
                    marcada={diagnosticosMarcados.has(d.texto)}
                    clase={claseOpciones}
                  />
                ))}
                {/* «Otro: ____» en adultos; en neonato y ninez el papel pone el texto y debajo un parentesis para escribir. */}
                {conTexto.map((d) =>
                  opcionesEnLineas ? (
                    <div key={d.id}>
                      <Opcion texto={d.texto} marcada={diagnosticosMarcados.has(d.texto)} clase={claseOpciones} />
                      <div>
                        (<Campo valor={r?.otroDiagnostico} ancho={30} />)
                      </div>
                    </div>
                  ) : (
                    <div key={d.id}>
                      <Campo rotulo={d.texto + ':'} valor={r?.otroDiagnostico} ancho={18} />
                    </div>
                  ),
                )}
                {conTexto.length === 0 && r?.otroDiagnostico ? (
                  <div>
                    <Campo rotulo="Otro:" valor={r.otroDiagnostico} ancho={18} />
                  </div>
                ) : null}
                {extraClasificar?.(p)}
              </td>
              {conductaPorFila ? (
                lleva ? (
                  <td className="hoja-celda-conducta">
                    <span className="hoja-valor">{r?.conducta ?? ''}</span>
                  </td>
                ) : null
              ) : i === 0 ? (
                <td className="hoja-celda-conducta" rowSpan={problemas.length}>
                  {columnaConducta}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * La columna derecha de la matriz en adultos y ninez: cuatro medicamentos con
 * dosis y dias, vacuna administrada, referencia, consejeria y proxima visita.
 */
export function ColumnaConducta({
  ficha,
  consejeriaBrindada,
  lineasReferencia = 1,
  firma,
}: {
  ficha: Ficha;
  /** Lo que la hoja pone en «Consejeria brindada»; la de ninez trae casillas. */
  consejeriaBrindada?: ReactNode;
  /** Cuantas rayas deja el papel bajo «Referencia a:». */
  lineasReferencia?: number;
  /** La hoja de ninez cierra la columna con «Nombre de la persona que atendio la consulta:». */
  firma?: string;
}) {
  const medicamentos = [0, 1, 2, 3].map((i) => ficha.medicamentos[i] ?? null);
  return (
    <div>
      {medicamentos.map((m, i) => (
        <div key={i} className="hoja-conducta-bloque">
          <b>Medicamento {i + 1}:</b>
          <span className={'hoja-campo-valor' + (m ? ' hoja-valor' : '')}>{m?.nombre ?? ' '}</span>
          <b>Dosis:</b>
          <span className={'hoja-campo-valor' + (m?.dosis ? ' hoja-valor' : '')}>{m?.dosis ?? ' '}</span>
          <b>Días de tratamiento</b>
          <span className={'hoja-campo-valor' + (m?.dias ? ' hoja-valor' : '')}>
            {m?.dias !== null && m?.dias !== undefined ? m.dias : ' '}
          </span>
        </div>
      ))}
      {ficha.medicamentos.length > 4 ? (
        <div className="hoja-conducta-bloque">
          <b>Otros medicamentos:</b>
          {ficha.medicamentos.slice(4).map((m, i) => (
            <span key={i} className="hoja-campo-valor hoja-valor">
              {m.nombre}
              {m.dosis ? ' — ' + m.dosis : ''}
              {m.dias ? ' — ' + m.dias + ' días' : ''}
            </span>
          ))}
        </div>
      ) : null}
      <div className="hoja-conducta-bloque">
        <b>Vacuna administrada:</b>
        <span className={'hoja-campo-valor' + (ficha.vacunaAdministrada ? ' hoja-valor' : '')}>
          {ficha.vacunaAdministrada ?? ' '}
        </span>
      </div>
      <div className="hoja-conducta-bloque">
        <b>Referencia a:</b>
        <span className={'hoja-campo-valor' + (ficha.referencia ? ' hoja-valor' : '')}>
          {ficha.referencia ?? ' '}
        </span>
        {Array.from({ length: lineasReferencia - 1 }, (_, i) => (
          <span key={i} className="hoja-campo-valor">
            {' '}
          </span>
        ))}
      </div>
      {/*
        En adultos la consejeria va en su propia seccion (X), asi que aqui
        queda la raya del papel; la hoja de ninez trae casillas y las pasa.
      */}
      <div className="hoja-conducta-bloque">
        <b>Consejería brindada:</b>
        {consejeriaBrindada ?? <span className="hoja-campo-valor"> </span>}
      </div>
      <div className="hoja-conducta-bloque">
        <b>Fecha de próxima visita:</b>
        <span className={'hoja-campo-valor' + (ficha.fechaProximaVisita ? ' hoja-valor' : '')}>
          {fechaConBarras(ficha.fechaProximaVisita)}
        </span>
      </div>
      {firma ? (
        <div className="hoja-conducta-bloque" style={{ marginTop: '4mm' }}>
          <span>{firma}</span>
          <span className="hoja-campo-valor"> </span>
          <span className="hoja-campo-valor"> </span>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────── consejeria ────────────────────────────────

/**
 * La tabla CONSEJERIA / FECHA RECONSULTA de la hoja del neonato.
 *
 * El papel no trae casilla: la persona subraya el tema que explico y anota la
 * fecha. Aqui lo brindado sale subrayado, con la misma convencion que los
 * hallazgos de la matriz; para el lector de pantalla sigue siendo una casilla.
 */
export function TablaConsejeria({ catalogo, ficha }: { catalogo: CatalogoFicha; ficha: Ficha }) {
  const temas = [...catalogo.temasConsejeria].sort((a, b) => a.orden - b.orden);
  return (
    <table className="hoja-tabla">
      <thead>
        <tr>
          <th>CONSEJERÍA</th>
          <th style={{ width: '44mm' }}>FECHA RECONSULTA</th>
        </tr>
      </thead>
      <tbody>
        {temas.map((t) => {
          const r = ficha.consejeriaTemas.find((x) => x.temaId === t.id) ?? null;
          const brindada = r?.brindada === true;
          return (
            <tr key={t.id}>
              <td>
                <span
                  className={'hoja-opcion' + (brindada ? ' hoja-opcion--marcada' : '')}
                  role="checkbox"
                  aria-checked={brindada}
                  aria-label={t.texto}
                >
                  {t.texto}
                </span>
              </td>
              <td className={'hoja-centrado' + (r?.fechaReconsulta ? ' hoja-valor' : '')}>
                {r?.fechaReconsulta ? fechaConBarras(r.fechaReconsulta) : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Los temas de consejeria como lista de casillas, para la columna de ninez. */
export function ConsejeriaCasillas({ catalogo, ficha }: { catalogo: CatalogoFicha; ficha: Ficha }) {
  const temas = [...catalogo.temasConsejeria].sort((a, b) => a.orden - b.orden);
  if (temas.length === 0) return null;
  return (
    <ol style={{ margin: 0, paddingLeft: '4mm' }}>
      {temas.map((t) => {
        const r = ficha.consejeriaTemas.find((x) => x.temaId === t.id) ?? null;
        return (
          <li key={t.id}>
            <Casilla marcada={r?.brindada === true} rotulo={t.texto} />
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Un grupo de antecedentes con su rotulo enmarcado —MEDICOS, FAMILIARES,
 * HABITOS— montado sobre la linea que lo separa del anterior, como en el
 * papel.
 */
export function BloqueConTitulo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="hoja-grupo">
      <Subtitulo>{titulo}</Subtitulo>
      {children}
    </div>
  );
}
