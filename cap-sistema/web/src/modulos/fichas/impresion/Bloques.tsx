import type { ReactNode } from 'react';
import type { Ficha } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha } from '../servicio-fichas';
import { Campo, Casilla, Columnas, Fila, SiNo, Subtitulo, fechaConBarras } from './Hoja';

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
export function SignosPeligroSiNo({ catalogo, ficha }: { catalogo: CatalogoFicha; ficha: Ficha }) {
  const signos = [...catalogo.signosPeligro].sort((a, b) => a.orden - b.orden);
  const mitad = Math.ceil(signos.length / 2);
  const columnas = [signos.slice(0, mitad), signos.slice(mitad)];
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
}: {
  catalogo: CatalogoFicha;
  ficha: Ficha;
  columnas?: 2 | 3;
}) {
  const signos = [...catalogo.signosPeligro].sort((a, b) => a.orden - b.orden);
  const porColumna = Math.ceil(signos.length / columnas);
  const grupos = Array.from({ length: columnas }, (_, i) =>
    signos.slice(i * porColumna, (i + 1) * porColumna),
  );
  return (
    <Columnas n={columnas}>
      {grupos.map((g, i) => (
        <ol key={i} style={{ margin: 0, padding: 0, listStyle: 'none', fontWeight: 700 }}>
          {g.map((s, j) => {
            const r = respuestaSigno(ficha, s.id);
            const detalle = detalleSigno(ficha, s.id);
            return (
              <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '2mm' }}>
                <span>
                  {i * porColumna + j + 1}. {s.texto}
                  {s.pideTexto && detalle ? <span className="hoja-valor">: {detalle}</span> : null}
                </span>
                <Casilla marcada={r === true} rotulo={s.texto} soloAccesible />
              </li>
            );
          })}
        </ol>
      ))}
    </Columnas>
  );
}

// ───────────────────────────── antecedentes ─────────────────────────────

type Grupo = 'MEDICO' | 'FAMILIAR' | 'HABITO';

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
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  codigo: string;
  /** Si el papel lo llama distinto que el catalogo. */
  rotulo?: string;
}) {
  const { a, r, valor } = antecedentePorCodigo(catalogo, antecedentes, codigo);
  if (!a) return null;
  return (
    <span className="hoja-sino" role="group" aria-label={a.texto}>
      <span>{rotulo ?? a.texto}</span>
      <Casilla marcada={valor === true} rotulo="SI" />
      <Casilla marcada={valor === false} rotulo="NO" />
      <ExtrasCortos a={a} r={r} />
      {a.permiteNoAplica ? <Casilla marcada={r?.respuesta === 'NO_APLICA'} rotulo="No aplica" /> : null}
      {a.pideDetalle ? <Campo rotulo="Cuál:" valor={r?.detalle} ancho={24} /> : null}
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

/** Compatibilidad: un grupo entero repartido en columnas, en el orden del catalogo. */
export function GrupoAntecedentes({
  catalogo,
  antecedentes,
  grupo,
  columnas = 3,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  grupo: Grupo;
  columnas?: 2 | 3;
}) {
  const lista = catalogo.antecedentes.filter((a) => a.grupo === grupo).sort((a, b) => a.orden - b.orden);
  if (lista.length === 0) return null;
  const porColumna = Math.ceil(lista.length / columnas);
  const codigos = Array.from({ length: columnas }, (_, i) =>
    lista.slice(i * porColumna, (i + 1) * porColumna).map((a) => a.codigo),
  );
  return <ColumnasAntecedentes catalogo={catalogo} antecedentes={antecedentes} codigos={codigos} />;
}

/** El bloque gineco-obstetrico de la hoja de adultos y de la prenatal. */
export function AntecedentesObstetricos({
  antecedentes,
  completo = false,
}: {
  antecedentes: AntecedentesPaciente | null;
  /** La hoja prenatal pide mas renglones que la de adultos. */
  completo?: boolean;
}) {
  const o = antecedentes?.obstetricos ?? null;
  return (
    <>
      <Fila>
        <Campo rotulo="FUR:" valor={o?.fur ? fechaConBarras(o.fur) : null} ancho={20} />
        <Campo rotulo="# Gestas:" valor={o?.gestas} ancho={8} />
        <Campo rotulo="Partos:" valor={o?.partos} ancho={8} />
        <Campo rotulo="AB:" valor={o?.abortos} ancho={8} />
        {completo ? (
          <>
            <SiNo rotulo="AB consecutivos:" valor={o?.abortosConsecutivos} />
            <Campo rotulo="# LIU:" valor={o?.legradosLiu} ancho={8} />
          </>
        ) : null}
      </Fila>
      {completo ? (
        <>
          <Fila>
            <Campo rotulo="# Nacidos Vivos:" valor={o?.nacidosVivos} ancho={8} />
            <Campo rotulo="# Nacidos Muertos:" valor={o?.nacidosMuertos} ancho={8} />
            <Campo rotulo="# Hijos Vivos:" valor={o?.hijosVivos} ancho={8} />
            <Campo rotulo="# Hijos Muertos:" valor={o?.hijosMuertos} ancho={8} />
            <Campo rotulo="# de Cesáreas:" valor={o?.cesareas} ancho={8} />
          </Fila>
          <Fila>
            <SiNo rotulo="Embarazos múltiples:" valor={o?.embarazosMultiples} />
            <Campo
              rotulo="Fecha último parto:"
              valor={o?.fechaUltimoParto ? fechaConBarras(o.fechaUltimoParto) : null}
              ancho={20}
            />
            <Campo rotulo="# Niños(as) nacidos antes de los 8 meses:" valor={o?.prematurosAntes8Meses} ancho={8} />
          </Fila>
          <Fila>
            <SiNo rotulo="Preeclampsia:" valor={o?.preeclampsia} />
          </Fila>
        </>
      ) : null}
      <Fila>
        <span>Detección de cáncer de cérvix:</span>
        <Casilla rotulo="Papanicolau" marcada={o?.tamizajeCervix === 'PAPANICOLAU'} />
        <Casilla rotulo="IVAA" marcada={o?.tamizajeCervix === 'IVAA'} />
        <Campo rotulo="Fecha:" valor={o?.tamizajeFecha ? fechaConBarras(o.tamizajeFecha) : null} ancho={20} />
        <SiNo rotulo="Resultado Normal:" valor={o?.tamizajeNormal} />
      </Fila>
      <Fila>
        <SiNo rotulo="Utiliza o ha utilizado algún método de Planificación Familiar:" valor={o?.usaPlanificacion} />
        <Campo rotulo="Cuál:" valor={o?.metodoPlanificacion} ancho={30} />
      </Fila>
      <Fila>
        <Campo rotulo="Tipo de Sangre: Grupo" valor={o?.tipoSangre} ancho={10} />
        <Casilla rotulo="RH (+)" marcada={o?.rhPositivo === true} />
        <Casilla rotulo="RH (-)" marcada={o?.rhPositivo === false} />
      </Fila>
    </>
  );
}

// ─────────────────────────── matriz de problemas ───────────────────────────

/** Una opcion del papel, subrayada si la ficha la marco. */
function Opcion({ texto, marcada }: { texto: string; marcada: boolean }) {
  return <span className={'hoja-opcion' + (marcada ? ' hoja-opcion--marcada' : '')}>{texto}</span>;
}

export interface EncabezadosMatriz {
  problema: ReactNode;
  evaluar: ReactNode;
  clasificar: ReactNode;
  conducta: ReactNode;
}

/**
 * La revision de problemas: la tabla grande de todas las hojas.
 *
 * Cada fila es un problema del catalogo con su SI / NO, sus signos a evaluar
 * y sus diagnosticos posibles; lo que la ficha marco va subrayado, que es lo
 * que el papel pide («subraye los signos encontrados»). La columna de la
 * derecha cambia segun la hoja: en adultos y ninez es UNA columna que abarca
 * todas las filas (medicamento 1 al 4, vacuna, referencia...), y en el neonato
 * es una celda por problema con su tratamiento. `conductaPorFila` decide.
 */
export function MatrizProblemas({
  catalogo,
  ficha,
  encabezados,
  conductaPorFila = false,
  columnaConducta,
}: {
  catalogo: CatalogoFicha;
  ficha: Ficha;
  encabezados: EncabezadosMatriz;
  conductaPorFila?: boolean;
  /** Lo que va en la columna derecha cuando abarca todas las filas. */
  columnaConducta?: ReactNode;
}) {
  const problemas = [...catalogo.problemas].sort((a, b) => a.orden - b.orden);
  return (
    <table className="hoja-tabla">
      <thead>
        <tr>
          <th className="hoja-encabezado-columna" style={{ width: '24mm' }}>
            {encabezados.problema}
          </th>
          <th className="hoja-encabezado-columna" style={{ width: '11mm' }} aria-label="SI o NO" />
          <th className="hoja-encabezado-columna">{encabezados.evaluar}</th>
          <th className="hoja-encabezado-columna" style={{ width: '44mm' }}>
            {encabezados.clasificar}
          </th>
          <th className="hoja-encabezado-columna hoja-celda-conducta">{encabezados.conducta}</th>
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
          return (
            <tr key={p.id}>
              <td className="hoja-celda-problema">
                {p.orden}. {p.nombre}
                {p.etiquetaAnotacion ? (
                  <div style={{ fontWeight: 400 }}>
                    <Campo rotulo={p.etiquetaAnotacion} valor={r?.anotacion} ancho={10} />
                  </div>
                ) : null}
              </td>
              {/* SI arriba, NO abajo, centrados en la fila y con las casillas en linea. */}
              <td className="hoja-celda-sino">
                <div className="hoja-sino-vertical">
                  <span>SI</span>
                  <Casilla marcada={presente === true} rotulo="SI" soloAccesible />
                  <span>NO</span>
                  <Casilla marcada={presente === false} rotulo="NO" soloAccesible />
                </div>
              </td>
              <td>
                {signos.map((s) => (
                  <Opcion key={s.id} texto={s.texto} marcada={signosMarcados.has(s.texto)} />
                ))}
              </td>
              <td>
                {diagnosticos.map((d) => (
                  <Opcion key={d.id} texto={d.texto} marcada={diagnosticosMarcados.has(d.texto)} />
                ))}
                {conTexto.map((d) => (
                  <div key={d.id}>
                    <Campo rotulo={d.texto + ':'} valor={r?.otroDiagnostico} ancho={18} />
                  </div>
                ))}
                {conTexto.length === 0 && r?.otroDiagnostico ? (
                  <div>
                    <Campo rotulo="Otro:" valor={r.otroDiagnostico} ancho={18} />
                  </div>
                ) : null}
              </td>
              {conductaPorFila ? (
                <td className="hoja-celda-conducta">
                  <span className="hoja-valor">{r?.conducta ?? ''}</span>
                </td>
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
}: {
  ficha: Ficha;
  /** Lo que la hoja pone en «Consejeria brindada»; la de ninez trae casillas. */
  consejeriaBrindada?: ReactNode;
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
    </div>
  );
}

// ──────────────────────────────── consejeria ────────────────────────────────

/** La tabla CONSEJERIA / FECHA RECONSULTA de las hojas del neonato y de ninez. */
export function TablaConsejeria({ catalogo, ficha }: { catalogo: CatalogoFicha; ficha: Ficha }) {
  const temas = [...catalogo.temasConsejeria].sort((a, b) => a.orden - b.orden);
  return (
    <table className="hoja-tabla">
      <thead>
        <tr>
          <th>CONSEJERÍA</th>
          <th style={{ width: '18mm' }}>Brindada</th>
          <th style={{ width: '34mm' }}>FECHA RECONSULTA</th>
        </tr>
      </thead>
      <tbody>
        {temas.map((t) => {
          const r = ficha.consejeriaTemas.find((x) => x.temaId === t.id) ?? null;
          return (
            <tr key={t.id}>
              <td>{t.texto}</td>
              <td className="hoja-centrado">
                <Casilla marcada={r?.brindada === true} rotulo={t.texto} soloAccesible />
              </td>
              <td className={r?.fechaReconsulta ? 'hoja-valor' : ''}>
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
