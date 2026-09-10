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
        <table key={i} className="hoja-lista-sino" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontWeight: 400 }} />
              <th style={{ width: '9mm', fontWeight: 400 }}>SI</th>
              <th style={{ width: '9mm', fontWeight: 400 }}>NO</th>
            </tr>
          </thead>
          <tbody>
            {col.map((s) => {
              const r = respuestaSigno(ficha, s.id);
              const detalle = detalleSigno(ficha, s.id);
              return (
                <tr key={s.id}>
                  <td style={{ padding: '0.3mm 0' }}>
                    {s.texto}
                    {s.pideTexto ? <Campo valor={detalle} ancho={22} /> : null}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Casilla marcada={r === true} rotulo={'SI ' + s.texto} soloAccesible />
                  </td>
                  <td style={{ textAlign: 'center' }}>
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

/**
 * Un grupo de antecedentes del catalogo con lo que el paciente tiene marcado.
 *
 * Los antecedentes son del PACIENTE, no de la consulta: se imprimen los que
 * tiene hoy. Los que piden detalle, fecha o numero llevan su raya al lado,
 * como en el papel («Toma medicamentos: SI NO Cual: ____»).
 */
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
  return (
    <Columnas n={columnas}>
      {lista.map((a) => {
        const r = respuestaAntecedente(antecedentes, a.id);
        const valor = r === null ? null : r.respuesta === 'SI' ? true : r.respuesta === 'NO' ? false : null;
        return (
          <div key={a.id} className="hoja-fila" style={{ margin: '0.3mm 0', gap: '1mm 2mm' }}>
            <SiNo rotulo={a.texto} valor={valor} />
            {a.permiteNoAplica ? (
              <Casilla marcada={r?.respuesta === 'NO_APLICA'} rotulo="No aplica" />
            ) : null}
            {a.pideDetalle ? <Campo rotulo="Cuál:" valor={r?.detalle} ancho={18} /> : null}
            {a.pideNumero ? <Campo rotulo="#" valor={r?.numero} ancho={8} /> : null}
            {a.pideFecha ? (
              <Campo rotulo="Fecha:" valor={r?.fecha ? fechaConBarras(r.fecha) : null} ancho={18} />
            ) : null}
          </div>
        );
      })}
    </Columnas>
  );
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
              <td className="hoja-celda-sino">
                <div>
                  <Casilla marcada={presente === true} rotulo="SI" />
                </div>
                <div>
                  <Casilla marcada={presente === false} rotulo="NO" />
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

/** El grupo «Subtitulo» + su bloque, como MEDICOS / FAMILIARES / HABITOS. */
export function BloqueConTitulo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <Subtitulo>{titulo}</Subtitulo>
      {children}
    </div>
  );
}
