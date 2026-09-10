import type { ReactNode } from 'react';
import './hoja.css';

/**
 * Las piezas con las que estan hechas las cuatro hojas del MSPAS.
 *
 * El formulario oficial se compone de muy pocas cosas repetidas: una barra
 * negra con numeral por seccion, cuadros con borde, campos con su raya,
 * casillas de SI / NO y tablas. Tenerlas aqui, una sola vez, es lo que hace
 * que las cuatro hojas salgan con la misma letra y las mismas medidas, y que
 * un ajuste de impresion —una raya mas gruesa, una casilla mas grande— se
 * haga en un solo sitio.
 *
 * Nada de MUI aqui a proposito: el tema del panel no manda en el papel.
 */

/** Una hoja fisica. Cada una es una pagina al imprimir. */
export function Pliego({ children, etiqueta }: { children: ReactNode; etiqueta: string }) {
  return (
    <section className="hoja-pliego" aria-label={etiqueta}>
      {children}
    </section>
  );
}

/** La barra negra de seccion: «III. EVALUE SIGNOS Y SINTOMAS DEL PELIGRO». */
export function Barra({
  numero,
  titulo,
  nota,
  ancha = false,
  corta = false,
}: {
  numero?: string;
  titulo: string;
  /** Texto en minusculas al lado del titulo, como «(hasta 6 meses despues del parto)». */
  nota?: string;
  ancha?: boolean;
  corta?: boolean;
}) {
  const clase = ['hoja-barra', ancha ? 'hoja-barra--ancha' : '', corta ? 'hoja-barra--corta' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <h2 className={clase} style={{ margin: 0, marginTop: '1.4mm' }}>
      {numero ? <span>{numero}</span> : null}
      <span>{titulo}</span>
      {nota ? <span className="hoja-barra-nota">{nota}</span> : null}
    </h2>
  );
}

export function Cuadro({ children, pegado = false }: { children: ReactNode; pegado?: boolean }) {
  return <div className={'hoja-cuadro' + (pegado ? ' hoja-cuadro--pegado' : '')}>{children}</div>;
}

export function Fila({ children, sinEnvolver = false }: { children: ReactNode; sinEnvolver?: boolean }) {
  return (
    <div className={'hoja-fila' + (sinEnvolver ? ' hoja-fila--sin-envolver' : '')}>{children}</div>
  );
}

export function Columnas({ n, children }: { n: 2 | 3; children: ReactNode }) {
  return <div className={'hoja-columnas hoja-columnas--' + n}>{children}</div>;
}

/** Un rotulo enmarcado dentro de un cuadro: «MEDICOS», «FAMILIARES». */
export function Subtitulo({ children }: { children: string }) {
  return <div className="hoja-subtitulo">{children}</div>;
}

/**
 * «Rotulo: ____valor____ sufijo».
 *
 * La raya se dibuja aunque no haya valor: es la del papel, y una hoja impresa
 * sin rayas donde el original las tiene deja de parecer el formulario.
 */
export function Campo({
  rotulo,
  valor,
  sufijo,
  llena = false,
  ancho,
}: {
  rotulo?: string;
  valor?: string | number | null;
  sufijo?: string;
  /** Ocupa todo lo que quede en la fila. */
  llena?: boolean;
  /** Ancho minimo de la raya, en mm. */
  ancho?: number;
}) {
  const vacio = valor === null || valor === undefined || valor === '';
  return (
    <span className={'hoja-campo' + (llena ? ' hoja-campo--llena' : '')}>
      {rotulo ? <span className="hoja-campo-rotulo">{rotulo}</span> : null}
      <span
        className={'hoja-campo-valor' + (vacio ? '' : ' hoja-valor')}
        style={ancho ? { minWidth: ancho + 'mm' } : undefined}
      >
        {vacio ? ' ' : String(valor)}
      </span>
      {sufijo ? <span className="hoja-campo-rotulo">{sufijo}</span> : null}
    </span>
  );
}

/**
 * Una casilla con su X, y el rotulo antes o despues como lo ponga el papel.
 *
 * `soloAccesible` deja el rotulo para el lector de pantalla y no lo dibuja:
 * es para las tablas donde SI y NO ya estan en el encabezado de la columna.
 */
export function Casilla({
  marcada,
  rotulo,
  rotuloDespues = false,
  soloAccesible = false,
}: {
  marcada: boolean;
  rotulo?: string;
  rotuloDespues?: boolean;
  soloAccesible?: boolean;
}) {
  const caja = (
    <span
      className={'hoja-caja' + (marcada ? ' hoja-caja--marcada' : '')}
      role="checkbox"
      aria-checked={marcada}
      aria-label={rotulo}
    />
  );
  if (!rotulo || soloAccesible) return caja;
  return (
    <span className="hoja-casilla">
      {rotuloDespues ? caja : null}
      <span>{rotulo}</span>
      {rotuloDespues ? null : caja}
    </span>
  );
}

/**
 * «Rotulo   SI [ ]  NO [ ]».
 *
 * Con `null` las dos casillas quedan vacias: no se marca NO por lo que no se
 * pregunto. En un formulario clinico, un NO que nadie contesto es un dato
 * falso.
 */
export function SiNo({
  rotulo,
  valor,
  detalle,
  rotuloDetalle,
}: {
  rotulo?: string;
  valor: boolean | null | undefined;
  /** Lo que sigue a la casilla: «Cual: ____». */
  detalle?: string | null;
  rotuloDetalle?: string;
}) {
  return (
    <span className="hoja-sino" aria-label={rotulo}>
      {rotulo ? <span>{rotulo}</span> : null}
      <Casilla marcada={valor === true} rotulo="SI" />
      <Casilla marcada={valor === false} rotulo="NO" />
      {rotuloDetalle !== undefined ? <Campo rotulo={rotuloDetalle} valor={detalle} ancho={18} /> : null}
    </span>
  );
}

/**
 * El area rayada para escribir, con el texto ya puesto sobre las rayas.
 *
 * `minimo` es cuantas rayas dibuja aunque no haya texto: las del papel. Si el
 * texto es mas largo, crecen; mas vale una hoja un poco mas larga que un
 * motivo de consulta cortado.
 */
export function Renglones({ texto, minimo = 2 }: { texto: string | null | undefined; minimo?: number }) {
  return (
    <div className="hoja-renglones" style={{ ['--renglones' as string]: minimo }}>
      {texto ?? ''}
    </div>
  );
}

/** «Nombre y cargo de la persona que atendio: ____». Se firma a mano. */
export function Firma({ rotulo = 'Nombre y cargo de la persona que atendió:' }: { rotulo?: string }) {
  return (
    <div className="hoja-firma">
      <span>{rotulo}</span>
      <span className="hoja-campo-valor" style={{ flex: 1 }}>
        {' '}
      </span>
    </div>
  );
}

/** Los emblemas del papel, en texto: DRPAP y SIAS. No hay logos en negro. */
export function EmblemaDrpap() {
  return (
    <div className="hoja-emblema">
      <b>DRPAP</b>
      Departamento de Regulación de los Programas de Atención a las Personas
    </div>
  );
}

export function EmblemaSias() {
  return (
    <div className="hoja-emblema">
      <b>SIAS</b>
      Sistema Integral de Atención en Salud · Departamento de Desarrollo de los Servicios de Salud
    </div>
  );
}

/** Titulo, emblemas y —debajo— No. Expediente y Fecha en sus recuadros. */
export function Encabezado({
  titulo,
  subtitulo,
  numeroExpediente,
  fecha,
  emblemaIzquierdo = <EmblemaDrpap />,
  emblemaDerecho = <EmblemaSias />,
}: {
  titulo: string;
  subtitulo?: string;
  numeroExpediente: string | null | undefined;
  fecha: string;
  emblemaIzquierdo?: ReactNode;
  emblemaDerecho?: ReactNode;
}) {
  return (
    <>
      <header className="hoja-encabezado">
        <div>{emblemaIzquierdo}</div>
        <h1 className="hoja-titulo" style={{ margin: 0 }}>
          {titulo}
          {subtitulo ? <small>{subtitulo}</small> : null}
        </h1>
        <div>{emblemaDerecho}</div>
      </header>
      <div className="hoja-cabecera-datos">
        <div className="hoja-recuadro" style={{ flex: '0 1 90mm' }}>
          <span>No. Expediente:</span>
          <span className="hoja-campo-valor hoja-valor" style={{ flex: 1 }}>
            {numeroExpediente ?? ' '}
          </span>
        </div>
        <div className="hoja-recuadro" style={{ flex: '0 1 46mm' }}>
          <span>Fecha:</span>
          <span className="hoja-valor">{fecha}</span>
        </div>
      </div>
    </>
  );
}

/**
 * Las casillas del tipo de establecimiento, con el CAP marcado.
 *
 * Cada hoja trae su propia lista —la de adultos tiene nueve, la del neonato
 * seis— asi que se recibe entera y solo se marca la del CAP.
 */
export function TipoEstablecimiento({ opciones, marcada }: { opciones: string[]; marcada: string }) {
  return (
    <Fila>
      {opciones.map((o) => (
        <Casilla key={o} rotulo={o} marcada={o === marcada} />
      ))}
    </Fila>
  );
}

// ─────────────────────────── como se escriben ───────────────────────────

/** `aaaa-mm-dd` o un instante ISO → «dd / mm / aaaa», como la raya del papel. */
export function fechaConBarras(valor: string | null | undefined): string {
  if (!valor) return '/ /';
  const [anio, mes, dia] = valor.slice(0, 10).split('-');
  if (!anio || !mes || !dia) return valor;
  return dia + ' / ' + mes + ' / ' + anio;
}

/** Un instante ISO en hora de Guatemala, solo el dia. */
export function diaLocal(instante: string): string {
  const f = new Date(instante);
  const dia = String(f.getDate()).padStart(2, '0');
  const mes = String(f.getMonth() + 1).padStart(2, '0');
  return dia + ' / ' + mes + ' / ' + f.getFullYear();
}

/** El sistema guarda kilos; el papel pide libras. */
export function kgALibras(kg: string | null | undefined): string | null {
  if (!kg) return null;
  const n = Number(kg);
  if (!Number.isFinite(n)) return null;
  return (n * 2.20462).toFixed(1);
}

/** Libras y onzas, como las escribe el papel de neonatos y ninez. */
export function kgALibrasYOnzas(kg: string | null | undefined): { lb: string; oz: string } | null {
  if (!kg) return null;
  const n = Number(kg);
  if (!Number.isFinite(n)) return null;
  const totalOnzas = Math.round(n * 35.274);
  return { lb: String(Math.floor(totalOnzas / 16)), oz: String(totalOnzas % 16) };
}

/** El sistema guarda centimetros; la hoja de adultos pide metros. */
export function cmAMetros(cm: string | null | undefined): string | null {
  if (!cm) return null;
  const n = Number(cm);
  if (!Number.isFinite(n)) return null;
  return (n / 100).toFixed(2);
}

/** Dias cumplidos entre el nacimiento y el dia de la consulta. */
export function diasEntre(nacimiento: string, consulta: string): number {
  const a = new Date(nacimiento.slice(0, 10) + 'T00:00:00');
  const b = new Date(consulta);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/** Anios y meses cumplidos, como los pide la ficha de ninez. */
export function aniosYMeses(nacimiento: string, consulta: string): { anios: number; meses: number } {
  const a = new Date(nacimiento.slice(0, 10) + 'T00:00:00');
  const b = new Date(consulta);
  let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) meses -= 1;
  meses = Math.max(0, meses);
  return { anios: Math.floor(meses / 12), meses: meses % 12 };
}

export const siNoTexto = (v: boolean | null | undefined): string | null =>
  v === null || v === undefined ? null : v ? 'SI' : 'NO';

/** «Valor unidad» o nada. */
export const conUnidad = (v: string | number | null | undefined, unidad: string): string | null =>
  v === null || v === undefined || v === '' ? null : String(v) + ' ' + unidad;
