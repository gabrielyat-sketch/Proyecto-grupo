import type { Ficha } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha, Paciente } from '../servicio-fichas';
import { SERVICIO_DE_SALUD } from '../servicio-fichas';
import type { Carnet, CatalogoCarnet, TramoEdad } from '../ninez/servicio-carnet';
import { COLUMNAS_DOSIS, ETIQUETA_TRAMO, TRAMOS, casillasDe } from '../ninez/carnet-ninez';
import {
  AntecedentesRestantes,
  ColumnaConducta,
  ConsejeriaCasillas,
  MatrizProblemas,
  SignosPeligroCasillas,
} from './Bloques';
import { GraficaPesoEdad } from './GraficaPeso';
import {
  Barra,
  Campo,
  Casilla,
  Cuadro,
  EmblemaDrpap,
  Fila,
  Firma,
  Flecha,
  Pliego,
  RecuadroDato,
  SiNo,
  TipoEstablecimiento,
  aniosYMeses,
  diaLocal,
  fechaConBarras,
  kgALibras,
} from './Hoja';

const ESCOLARIDAD: { clave: string; texto: string }[] = [
  { clave: 'NINGUNO', texto: 'Ninguno' },
  { clave: 'PRIMARIA_1_3', texto: '1° a 3° Primaria' },
  { clave: 'PRIMARIA_4_6', texto: '4° a 6° Primaria' },
  { clave: 'MEDIA', texto: 'Media' },
  { clave: 'SUPERIOR', texto: 'Superior' },
];

const AGUA: { clave: string; texto: string }[] = [
  { clave: 'CHORRO_INTRADOMICILIAR', texto: 'Chorro intradomiciliario' },
  { clave: 'CHORRO_PUBLICO', texto: 'Chorro Público' },
  { clave: 'POZO', texto: 'Pozo' },
  { clave: 'RIO', texto: 'Rio' },
  { clave: 'OTRO', texto: 'Otro' },
];

const EXCRETAS: { clave: string; texto: string }[] = [
  { clave: 'INODORO', texto: 'Inodoro' },
  { clave: 'LETRINA', texto: 'Letrina' },
  { clave: 'AIRE_LIBRE', texto: 'Aire Libre' },
];

/** Como numera el papel las entregas: «1a., 2da.» en una tabla y «1a., 2a., 3a., 4ta.» en la otra. */
const ORDINALES_DOSIS = ['1a.', '2da.'];
const ORDINALES_ENTREGAS = ['1a.', '2a.', '3a.', '4ta.'];

/** El papel pone la vitamina A y el desparasitante en «Dosis de»; el hierro y el acido folico en «Entregas de». */
const esDosis = (nombre: string) => /vitamina|desparasit/i.test(nombre);

/** El emblema del area de salud, en texto. */
function EmblemaAreaDeSalud() {
  return (
    <div className="hoja-emblema">
      <b>MSPAS</b>
      Ministerio de Salud Pública
      <br />
      Área de Salud {SERVICIO_DE_SALUD.areaDeSalud}
    </div>
  );
}

/** Los ninos del papel no se imprimen; se deja su hueco para que todo quede donde estaba. */
function HuecoDibujo() {
  return <div style={{ width: '22mm' }} />;
}

/**
 * Una casilla del esquema que el papel deja en gris: dosis que esa vacuna no
 * lleva. Las vacunas sin esquema impreso (Neumococo, Hb, Otras) van en blanco.
 */
function celdaGris(edadRecomendada: string | null, conEsquema: boolean): string {
  return conEsquema && edadRecomendada === null ? ' hoja-sombreado' : '';
}

/**
 * «Dosis de» y «Entregas de»: las tablas de micronutrientes de la hoja 2.
 *
 * Cada tramo de edad trae tantas columnas como entregas espere el producto
 * que mas pida; donde un producto no espera entrega, la celda va en gris,
 * como el desparasitante antes de los dos anos en el papel.
 */
function TablaMicronutrientes({
  titulo,
  productos,
  carnet,
  ordinales,
}: {
  titulo: string;
  productos: CatalogoCarnet['micronutrientes'];
  carnet: Carnet | null;
  ordinales: string[];
}) {
  if (productos.length === 0) return null;
  const columnasPorTramo = (tramo: TramoEdad) =>
    Math.max(0, ...productos.map((p) => p.esperadas.filter((e) => e.tramo === tramo).length));
  const tramos = TRAMOS.map((t) => ({ tramo: t, columnas: columnasPorTramo(t) })).filter((t) => t.columnas > 0);
  return (
    <table className="hoja-tabla" style={{ marginTop: '3mm', tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th rowSpan={2} style={{ width: '34mm', fontSize: '8pt' }}>
            {titulo}
          </th>
          {tramos.map((t) => (
            <th key={t.tramo} colSpan={t.columnas} style={{ fontSize: '8pt' }}>
              {ETIQUETA_TRAMO[t.tramo]}
            </th>
          ))}
        </tr>
        <tr>
          {tramos.map((t) =>
            Array.from({ length: t.columnas }, (_, i) => (
              <th key={t.tramo + i} style={{ fontWeight: 400 }}>
                {ordinales[i] ?? i + 1 + 'a.'}
              </th>
            )),
          )}
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => (
          <tr key={p.id} style={{ height: '6.5mm' }}>
            <td className="hoja-negrita hoja-centrado" style={{ verticalAlign: 'middle', fontSize: '8pt' }}>
              {p.nombre}
            </td>
            {tramos.map((t) =>
              Array.from({ length: t.columnas }, (_, i) => {
                const esperada = p.esperadas.find((e) => e.tramo === t.tramo && e.orden === i + 1) ?? null;
                const entrega = esperada
                  ? (carnet?.micronutrientes.find(
                      (m) => m.micronutrienteId === p.id && m.tramo === t.tramo && m.orden === i + 1,
                    ) ?? null)
                  : null;
                return (
                  <td
                    key={t.tramo + i}
                    className={'hoja-centrado' + (esperada ? '' : ' hoja-sombreado') + (entrega ? ' hoja-valor' : '')}
                    style={{ verticalAlign: 'middle', fontSize: '6pt', whiteSpace: 'nowrap', padding: '0.6mm 0.3mm' }}
                  >
                    {entrega ? fechaConBarras(entrega.fecha) : ''}
                  </td>
                );
              }),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** El texto fijo del papel bajo «Tos o dificultad para respirar», que el catalogo no trae. */
function ReferenciaRespiracion({ ficha }: { ficha: Ficha }) {
  return (
    <>
      <div>
        <Campo rotulo="Respiraciones X minuto" valor={ficha.respiraciones} ancho={20} />
      </div>
      <div className="hoja-negrita hoja-cursiva" style={{ paddingLeft: '6mm' }}>
        Respiración Rápida sí
        <br />
        &lt; de dos meses 60 o más
        <br />
        2m a &lt; 1 año = 50 ó más
        <br />
        &gt; 1 año a &lt; 5 años = 40 ó más
      </div>
    </>
  );
}

/**
 * La ficha clinica del lactante y ninez: las cuatro hojas del papel.
 *
 * La primera es la del nino —signos de peligro, quien es, sus padres, su
 * casa, su esquema de vacunas y sus antecedentes— y sale del carnet, que es
 * del paciente y no de la consulta. La segunda, apaisada, es la grafica de
 * peso para edad con las tablas de micronutrientes. La tercera es la de la
 * consulta de hoy: la matriz de problemas con su columna de tratamiento. La
 * cuarta, «Otros problemas, controles u observaciones», lleva las notas.
 */
export function HojaNinez({
  ficha,
  catalogo,
  paciente,
  antecedentes,
  carnet,
  catalogoCarnet,
}: {
  ficha: Ficha;
  catalogo: CatalogoFicha;
  paciente: Paciente;
  antecedentes: AntecedentesPaciente | null;
  carnet: Carnet | null;
  catalogoCarnet: CatalogoCarnet | null;
}) {
  const nombre = paciente.nombres + ' ' + paciente.apellidos;
  const direccion = [paciente.lugar?.nombre, paciente.comunidad?.nombre].filter(Boolean).join(', ');
  const edad = aniosYMeses(paciente.fechaNacimiento, ficha.fecha);
  const datos = carnet?.datos ?? null;
  const hogar = carnet?.hogar ?? null;
  const vacunas = catalogoCarnet ? [...catalogoCarnet.vacunas].sort((a, b) => a.orden - b.orden) : [];
  const micronutrientes = catalogoCarnet
    ? [...catalogoCarnet.micronutrientes].sort((a, b) => a.orden - b.orden)
    : [];
  const pesoLb = kgALibras(ficha.pesoKg);
  const punto = pesoLb ? { meses: edad.anios * 12 + edad.meses, libras: Number(pesoLb) } : null;
  const observaciones = [
    ficha.diagnostico ? 'Dx: ' + ficha.diagnostico : null,
    ficha.tratamiento ? 'Tx: ' + ficha.tratamiento : null,
    ficha.notas,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      <Pliego etiqueta="Ficha clínica del lactante y niñez, hoja 1">
        {/* El encabezado del papel: titulo arriba; fecha y expediente a la izquierda, DRPAP al centro, el area de salud a la derecha. */}
        <h1 className="hoja-titulo" style={{ margin: 0 }}>
          FICHA CLÍNICA DEL LACTANTE Y NIÑEZ
        </h1>
        <header style={{ display: 'grid', gridTemplateColumns: '22mm 76mm 1fr 34mm', gap: '3mm', alignItems: 'start', marginBottom: '2mm' }}>
          <HuecoDibujo />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm' }}>
            <RecuadroDato rotulo="Fecha:" valor={diaLocal(ficha.fecha)} ancho={50} />
            <RecuadroDato rotulo="No. Expediente:" valor={paciente.expediente?.numero} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '38mm' }}>
              <EmblemaDrpap />
            </div>
          </div>
          <EmblemaAreaDeSalud />
        </header>

        <div className="hoja-cuadro hoja-sombreado" style={{ padding: 0 }}>
          <Barra numero="1." titulo="Evalúe signos y síntomas de peligro" ancha />
          <div style={{ padding: '0.5mm 2mm 1mm' }}>
            <p className="hoja-negrita" style={{ margin: '0 0 0.5mm', textAlign: 'center', fontSize: '8pt' }}>
              (Proceda de acuerdo a nivel de resolución)
            </p>
            <SignosPeligroCasillas catalogo={catalogo} ficha={ficha} casillaPegada separador />
          </div>
        </div>

        <Barra numero="2." titulo="Identificación del servicio de salud" ancha />
        <Cuadro>
          <TipoEstablecimiento
            opciones={['PSF', 'C/S "A"', 'CENAPA', 'C/S "B"', 'CAP', 'CAIMI']}
            marcada={SERVICIO_DE_SALUD.tipo}
            repartidas
          />
          <Fila>
            <Campo rotulo="Nombre del Servicio:" valor={SERVICIO_DE_SALUD.nombre} llena />
            <Campo rotulo="Distrito:" valor={SERVICIO_DE_SALUD.distrito} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Comunidad:" valor={SERVICIO_DE_SALUD.comunidad} llena />
            <Campo rotulo="Área de Salud:" valor={SERVICIO_DE_SALUD.areaDeSalud} llena />
          </Fila>
        </Cuadro>

        <Cuadro>
          <Fila>
            <Barra numero="3." titulo="Datos generales del paciente" corta />
            <Campo rotulo="CUI" valor={paciente.dpi} ancho={30} />
          </Fila>
          <Fila>
            <Campo rotulo="Nombre y apellidos:" valor={nombre} llena />
            <Campo rotulo="Fecha de Nacimiento:" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={30} />
          </Fila>
          <Fila>
            <Campo rotulo="Lugar de nacimiento:" valor={datos?.lugarNacimiento} llena />
            <Campo rotulo="Dirección donde vive:" valor={direccion} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Nombre de Persona que acompaña al niño (a):" valor={datos?.acompananteNombre} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Edad" valor={edad.anios} sufijo="años" ancho={10} />
            <Campo valor={edad.meses} sufijo="meses," ancho={10} />
            <span className="hoja-sino">
              <span>Sexo:</span>
              <Casilla rotulo="F" marcada={paciente.sexo === 'F'} />
              <Casilla rotulo="M" marcada={paciente.sexo === 'M'} />
              <span>,</span>
            </span>
            <span className="hoja-sino">
              <span>Población migrante:</span>
              <Casilla rotulo="SI" marcada={paciente.migrante} />
              <Campo rotulo="(lugar)" valor={paciente.lugarOrigen} ancho={50} />
              <Casilla rotulo="NO" marcada={!paciente.migrante} />
            </span>
          </Fila>
        </Cuadro>

        <table className="hoja-tabla" style={{ marginTop: '0.5mm' }}>
          <tbody>
            <tr>
              <th rowSpan={3} style={{ width: '9mm', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                Padres
              </th>
              <td colSpan={2}>
                <Campo rotulo="Nombre y apellidos de la Madre" valor={datos?.madreNombre} llena />
              </td>
              <td style={{ width: '14mm' }}>
                <Campo rotulo="Edad" valor={datos?.madreEdad} ancho={6} />
              </td>
              <td>
                <Campo rotulo="Ocupación" valor={datos?.madreOcupacion} llena />
              </td>
              <td style={{ width: '22mm' }}>
                <div className="hoja-centrado">Sabe Leer</div>
                <div className="hoja-centrado" style={{ marginTop: '1mm' }}>
                  <SiNo valor={datos?.madreSabeLeer} />
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <div>Nivel de escolaridad de la madre</div>
                <div className="hoja-fila" style={{ paddingLeft: '6mm', gap: '1mm 2mm' }}>
                  {ESCOLARIDAD.map((e) => (
                    <span key={e.clave}>
                      <Casilla rotulo={e.texto} marcada={datos?.madreEscolaridad === e.clave} />,
                    </span>
                  ))}
                </div>
              </td>
              <td colSpan={2}>
                <div>Número de Hijos</div>
                <Fila>
                  <Campo rotulo="Total" valor={datos?.hijosTotal} ancho={12} />
                  <Campo rotulo="Vivos" valor={datos?.hijosVivos} ancho={12} />
                  <Campo rotulo="Muertos" valor={datos?.hijosMuertos} ancho={12} />
                </Fila>
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <Campo rotulo="Nombre y apellidos del padre" valor={datos?.padreNombre} llena />
              </td>
              <td>
                <Campo rotulo="Edad" valor={datos?.padreEdad} ancho={6} />
              </td>
              <td>
                <Campo rotulo="Ocupación" valor={datos?.padreOcupacion} llena />
              </td>
              <td>
                <div className="hoja-centrado">Sabe Leer</div>
                <div className="hoja-centrado" style={{ marginTop: '1mm' }}>
                  <SiNo valor={datos?.padreSabeLeer} />
                </div>
              </td>
            </tr>
            <tr>
              <th style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Casa</th>
              <td colSpan={3}>
                <div className="hoja-negrita">ABASTECIMIENTO DE AGUA</div>
                <div className="hoja-fila" style={{ gap: '1mm 2mm' }}>
                  {AGUA.map((a, i) => (
                    <span key={a.clave}>
                      <Casilla rotulo={a.texto} marcada={hogar?.agua === a.clave} />
                      {i < AGUA.length - 1 ? ',' : ''}
                    </span>
                  ))}
                  {hogar?.agua === 'OTRO' ? <Campo valor={hogar.aguaOtro} ancho={16} /> : null}
                </div>
              </td>
              <td colSpan={2}>
                <div className="hoja-negrita">DISPOSICIÓN DE EXCRETAS</div>
                <div className="hoja-fila" style={{ gap: '1mm 2mm' }}>
                  {EXCRETAS.map((e, i) => (
                    <span key={e.clave}>
                      <Casilla rotulo={e.texto} marcada={hogar?.excretas === e.clave} />
                      {i < EXCRETAS.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/*
          El esquema de vacunas, cruzado con lo que el nino tiene puesto. Las
          columnas de la izquierda son las edades recomendadas que imprime el
          papel; las de la derecha, la fecha y la edad en meses de cada dosis.
          Las casillas que la vacuna no lleva van en gris, como en el papel.
        */}
        <table className="hoja-tabla" style={{ marginTop: '1mm' }}>
          <thead>
            <tr>
              <th rowSpan={3} style={{ width: '20mm', fontSize: '8pt' }}>
                VACUNA
              </th>
              <th colSpan={5} rowSpan={2}>Edades Recomendadas para Administración</th>
              <th colSpan={10} style={{ fontSize: '8.5pt' }}>
                Fechas y Edades de Administración
              </th>
            </tr>
            <tr>
              {COLUMNAS_DOSIS.map((c, i) => (
                <th key={'f' + i} colSpan={2} style={{ fontSize: '6.5pt', width: '19mm' }}>
                  {c}
                </th>
              ))}
            </tr>
            <tr>
              {COLUMNAS_DOSIS.map((c, i) => (
                <th key={'r' + i} style={{ fontSize: '6.5pt' }}>
                  {c}
                </th>
              ))}
              {COLUMNAS_DOSIS.map((_, i) => (
                <th key={'fe' + i} colSpan={2} style={{ padding: 0, fontSize: '6.5pt' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <span style={{ borderRight: '0.3mm solid #000', padding: '0.4mm 0' }}>Fecha</span>
                    <span style={{ padding: '0.4mm 0' }}>Edad</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vacunas.length === 0 ? (
              <tr>
                <td colSpan={16} className="hoja-nota">
                  Esquema de vacunación no disponible.
                </td>
              </tr>
            ) : (
              vacunas.map((v) => {
                const casillas = carnet ? casillasDe(v, carnet) : v.dosis.map((d) => ({ ...d, fecha: '', edadEnMeses: null }));
                const columnas = Array.from({ length: 5 }, (_, i) => casillas[i] ?? null);
                const conEsquema = v.dosis.some((d) => d.edadRecomendada !== null);
                return (
                  <tr key={v.id} style={{ height: '5.5mm' }}>
                    <td className="hoja-centrado" style={{ fontSize: '8pt', verticalAlign: 'middle' }}>
                      {v.nombre}
                    </td>
                    {columnas.map((c, i) => (
                      <td
                        key={'r' + i}
                        className={'hoja-centrado' + celdaGris(c?.edadRecomendada ?? null, conEsquema)}
                        style={{ fontSize: '7pt', verticalAlign: 'middle' }}
                      >
                        {c?.edadRecomendada ?? ''}
                      </td>
                    ))}
                    {columnas.map((c, i) => (
                      <td
                        key={'f' + i}
                        colSpan={2}
                        className={'hoja-centrado' + celdaGris(c?.edadRecomendada ?? null, conEsquema)}
                        style={{ padding: 0, verticalAlign: 'middle' }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '5mm', alignItems: 'center' }}>
                          <span className={c?.fecha ? 'hoja-valor' : ''} style={{ borderRight: '0.3mm solid #000', fontSize: '6pt', minHeight: '5mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {c?.fecha ? fechaConBarras(c.fecha) : ''}
                          </span>
                          <span className={c?.fecha ? 'hoja-valor' : ''} style={{ fontSize: '6.5pt' }}>
                            {c?.fecha && c.edadEnMeses !== null ? c.edadEnMeses + ' m' : ''}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/*
          La seccion 4 del papel. El sistema no captura estos antecedentes
          para la ficha de ninez —el catalogo no los trae—, asi que sale la
          seccion tal cual, en blanco, para llenarla a mano como hasta ahora.
        */}
        <Cuadro>
          <Barra numero="4." titulo="Antecedentes" corta />
          <Fila>
            <span className="hoja-sino">
              <span className="hoja-negrita">Producto de embarazo</span>
              <span>normal</span>
              <Casilla rotulo="SI" marcada={false} />
              <Casilla rotulo="NO" marcada={false} />
              <Campo valor={null} ancho={30} />
              <span>,</span>
            </span>
            <span className="hoja-sino">
              <span>Parto Normal</span>
              <Casilla rotulo="SI" marcada={false} />
              <Casilla rotulo="NO" marcada={false} />
              <span>,</span>
              <Campo valor={null} ancho={30} />
            </span>
          </Fila>
          <Fila>
            <span className="hoja-sino" style={{ gap: '1mm' }}>
              <span>Atendido en:</span>
              {['Hospital', 'C/S', 'Domicilio', 'Vía Pública'].map((t) => (
                <span key={t}>
                  <Casilla rotulo={t} marcada={false} />,
                </span>
              ))}
              <Campo rotulo="Otro" valor={null} ancho={18} />
              <span>,</span>
            </span>
            <span className="hoja-sino" style={{ gap: '1mm' }}>
              <span className="hoja-negrita">Parto atendido por:</span>
              {['Médico', 'Enfermera', 'Auxiliar', 'Comadrona'].map((t) => (
                <span key={t}>
                  <Casilla rotulo={t} marcada={false} />,
                </span>
              ))}
              <Campo rotulo="Otro" valor={null} ancho={22} />
              <span>,</span>
            </span>
            <Campo rotulo="Peso al nacer" valor={null} sufijo="Lb." ancho={14} />
            <Campo valor={null} sufijo="Onz." ancho={12} />
          </Fila>
          <div className="hoja-negrita" style={{ marginTop: '1mm' }}>
            Médicos: Marque con un círculo para antecedentes personales (P), para familiares (F):
          </div>
          <div className="hoja-fila" style={{ gap: '0.5mm 5mm' }}>
            {[
              'Problemas de crecimiento o desnutrición',
              'Diabétes',
              'Hipertensión',
              'Cáncer',
              'Discapacidad',
              'Nefropatía',
              'ITS/VIH/SIDA',
              'Tuberculosis',
              'Otro',
            ].map((t) => (
              <span key={t} style={{ whiteSpace: 'nowrap' }}>
                {t} &nbsp;<b>P</b>&nbsp;&nbsp;&nbsp;&nbsp;<b>F</b>
              </span>
            ))}
          </div>
          <Fila>
            <span className="hoja-negrita" style={{ display: 'flex', flex: 1 }}>
              <Campo rotulo="Especificar:" valor={null} llena />
            </span>
          </Fila>
          <Fila>
            <span className="hoja-negrita" style={{ display: 'flex', flex: 1 }}>
              <Campo rotulo="Quirúrgicos:" valor={null} llena />
            </span>
          </Fila>
          <Fila>
            <span className="hoja-negrita">Psico-sociales:</span>
            <span className="hoja-sino">
              <Casilla rotulo="Problemas de relación intrafamiliar" marcada={false} />
              <span>,</span>
              <Casilla rotulo="violencia" marcada={false} />
            </span>
          </Fila>
          <AntecedentesRestantes catalogo={catalogo} antecedentes={antecedentes} colocados={[]} />
        </Cuadro>
      </Pliego>

      <Pliego etiqueta="Ficha clínica del lactante y niñez, gráfica de peso para edad" apaisada>
        <div className="hoja-sombreado" style={{ padding: '1mm' }}>
          <GraficaPesoEdad punto={punto} />
        </div>
        <TablaMicronutrientes
          titulo="Dosis de"
          productos={micronutrientes.filter((m) => esDosis(m.nombre))}
          carnet={carnet}
          ordinales={ORDINALES_DOSIS}
        />
        <TablaMicronutrientes
          titulo="Entregas de"
          productos={micronutrientes.filter((m) => !esDosis(m.nombre))}
          carnet={carnet}
          ordinales={ORDINALES_ENTREGAS}
        />
      </Pliego>

      <Pliego etiqueta="Ficha clínica del lactante y niñez, hoja de consulta">
        <div style={{ display: 'grid', gridTemplateColumns: '22mm 1fr', gap: '3mm', alignItems: 'start' }}>
          <HuecoDibujo />
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 34mm', gap: '2mm', alignItems: 'center' }}>
              <div className="hoja-recuadro hoja-sombreado" style={{ fontSize: '9.5pt', padding: '1mm 3mm' }}>
                SI ES RECONSULTA, VOLVER A INVESTIGAR SIGNOS DE PELIGRO
              </div>
              <Flecha>
                <span style={{ fontSize: '9pt' }}>Ver Hoja 1</span>
              </Flecha>
            </div>
            <Fila>
              <span className="hoja-negrita" style={{ display: 'flex', flex: 1 }}>
                <Campo rotulo="Nombre:" valor={nombre} llena />
              </span>
              <span className="hoja-negrita">
                <Campo rotulo="Fecha:" valor={diaLocal(ficha.fecha)} ancho={26} />
              </span>
              <span className="hoja-negrita">
                <Campo rotulo="No. de Expediente:" valor={paciente.expediente?.numero} ancho={34} />
              </span>
            </Fila>
            <Fila>
              <span className="hoja-negrita" style={{ display: 'flex', flex: 1 }}>
                <Campo rotulo="MOTIVO DE CONSULTA:" valor={ficha.motivo} llena />
              </span>
            </Fila>
            <Fila>
              <span className="hoja-negrita" style={{ display: 'flex', flex: 1 }}>
                <Campo rotulo="HISTORIA DEL PROBLEMA ACTUAL:" valor={ficha.historiaEnfermedad} llena />
              </span>
            </Fila>
          </div>
        </div>
        <Cuadro>
          <Fila>
            <span className="hoja-negrita" style={{ fontSize: '8.5pt' }}>
              SIGNOS VITALES:
            </span>
            <Campo rotulo="Temperatura:" valor={ficha.temperaturaC} sufijo="°C" ancho={16} />
            <Campo rotulo="Peso" valor={pesoLb} sufijo="Lb." ancho={16} />
            <Campo rotulo="Talla:" valor={ficha.tallaCm} ancho={16} />
            <Campo rotulo="Pulso:" valor={ficha.pulso} sufijo="X min." ancho={16} />
          </Fila>
        </Cuadro>

        <MatrizProblemas
          catalogo={catalogo}
          ficha={ficha}
          sino="bajoProblema"
          opcionesEnLineas
          compacta
          anchos={{ problema: 27, clasificar: 42, conducta: 42 }}
          anotacionBajoProblema={catalogo.problemas.filter((p) => p.nombre.startsWith('Fiebre')).map((p) => p.nombre)}
          filasSinSiNo={catalogo.problemas.filter((p) => p.nombre.startsWith('Presenta problemas')).map((p) => p.nombre)}
          extraInvestigue={(p) => (p.nombre.startsWith('Tos') ? <ReferenciaRespiracion ficha={ficha} /> : null)}
          extraClasificar={(p) =>
            p.nombre.startsWith('Signos de alerta en Cáncer') ? (
              <div className="hoja-cursiva">Anotar la región u órgano considerado afectado</div>
            ) : null
          }
          encabezados={{
            problema: (
              <>
                PREGUNTE SI
                <br />
                TIENE UN
                <br />
                PROBLEMA DE:
              </>
            ),
            evaluar: (
              <>
                INVESTIGUE Y COMPRUEBE
                <br />
                (Subraye el hallazgo
                <br />
                encontrado)
              </>
            ),
            clasificar: (
              <>
                CLASIFICACIÓN /<br />
                DIAGNÓSTICO
                <br />
                (Subraye el diagnóstico)
              </>
            ),
            conducta: (
              <>
                TRATAMIENTO
                <small>(Indique medicamento, dósis y días de tratamiento)</small>
              </>
            ),
          }}
          columnaConducta={
            <ColumnaConducta
              ficha={ficha}
              lineasReferencia={4}
              consejeriaBrindada={<ConsejeriaCasillas catalogo={catalogo} ficha={ficha} />}
              firma="Nombre de la persona que atendió la consulta:"
            />
          }
        />
        {ficha.consejeria ? (
          <Fila>
            <Campo rotulo="Consejería:" valor={ficha.consejeria} llena />
          </Fila>
        ) : null}
      </Pliego>

      <Pliego etiqueta="Ficha clínica del lactante y niñez, otros problemas, controles u observaciones">
        <h2 className="hoja-titulo" style={{ margin: '4mm 0 3mm', fontSize: '11pt' }}>
          OTROS PROBLEMAS, CONTROLES U OBSERVACIONES
        </h2>
        <div className="hoja-observaciones hoja-negrita" style={{ marginBottom: '1mm' }}>
          <div style={{ minHeight: 0, background: 'none', textAlign: 'center' }}>FECHA</div>
          <div style={{ minHeight: 0, background: 'none', textAlign: 'center' }}>
            OBSERVACIONES / HALLAZGOS ADICIONALES / TRATAMIENTOS
          </div>
        </div>
        <div className="hoja-observaciones" style={{ ['--paso' as string]: '9.4mm', ['--renglones' as string]: 27 }}>
          <div className="hoja-valor" style={{ textAlign: 'center', backgroundImage: 'none' }}>
            {observaciones ? diaLocal(ficha.fecha) : ''}
          </div>
          <div className="hoja-valor" style={{ borderLeft: '0.3mm solid #000', paddingLeft: '2mm' }}>
            {observaciones}
          </div>
        </div>
        <Firma rotulo="Nombre de la persona que atendió:" />
      </Pliego>
    </>
  );
}
