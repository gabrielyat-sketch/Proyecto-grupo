import type { ReactNode } from 'react';
import type { Ficha } from '../../expedientes/servicio-expedientes';
import { presion } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha, Paciente } from '../servicio-fichas';
import { SERVICIO_DE_SALUD } from '../servicio-fichas';
import {
  AntecedentesRestantes,
  ColumnasAntecedentes,
  LineaAntecedente,
  SiNoAntecedente,
  SignosPeligroSiNo,
} from './Bloques';
import {
  Barra,
  Campo,
  Casilla,
  Cuadro,
  Encabezado,
  Fila,
  Firma,
  Pliego,
  RecuadroDato,
  Renglones,
  SiNo,
  TipoEstablecimiento,
  diaLocal,
  fechaConBarras,
  kgALibras,
  siNoTexto,
} from './Hoja';

/** Donde pone la hoja prenatal cada antecedente medico: dos columnas y luego filas sueltas. */
const MEDICOS = [
  ['MED_ASMA', 'MED_HIPERTENSION', 'MED_CANCER', 'MED_ITS', 'MED_CHAGAS'],
  ['MED_DIABETES', 'MED_CARDIOPATIA', 'MED_TB', 'MED_NEUROPATIA', 'MED_INF_URINARIAS'],
];
const EN_FILAS = [
  'MED_MEDICAMENTOS',
  'MED_PSICOSOCIAL',
  'MED_VIOLENCIA_INTRAFAMILIAR',
  'MED_VIOLENCIA_GENERO',
  'MED_QUIRURGICOS',
  'HAB_FUMA',
  'HAB_ALCOHOL',
  'HAB_DROGAS',
  'MED_VACUNA_TD',
  'MED_SR',
  'MED_OTROS',
];
const COLOCADOS = [...MEDICOS.flat(), ...EN_FILAS];

const QUIEN_ATENDIO: Record<string, string> = {
  MD: 'Médico',
  EP: 'Enfermera profesional',
  AE: 'Auxiliar de enfermería',
  CT: 'Comadrona tradicional',
  OTRO: 'Otro',
};

/**
 * Las cuatro filas de consejeria de la hoja 3 del papel, con el texto del
 * papel, y que temas del catalogo posparto las contestan. La segunda junta
 * dos temas: SI si alguno se brindo, NO si los dos se negaron.
 */
const CONSEJERIA_PRIMER_CONTROL: { texto: string; temas: RegExp[] }[] = [
  { texto: 'Consejería en PF posparto', temas: [/planificaci/i] },
  {
    texto: 'Consejería en lactancia materna exclusiva y alimentación de la mujer lactante',
    temas: [/lactancia materna exclusiva/i, /alimentaci/i],
  },
  { texto: 'Consejería de lactancia materna a mujer VIH +', temas: [/lactancia materna a madre vih/i] },
  { texto: 'Consejería a mujer VIH +', temas: [/^mujer vih/i] },
];

/** «II. Datos generales de la paciente», igual en la hoja prenatal y en la del posparto. */
function DatosDeLaPaciente({ paciente }: { paciente: Paciente }) {
  const direccion = [paciente.lugar?.nombre, paciente.comunidad?.nombre].filter(Boolean).join(', ');
  return (
    <>
      <Barra numero="II." titulo="Datos generales de la paciente" />
      <Cuadro>
        <Fila>
          <Campo rotulo="Nombre:" valor={paciente.nombres + ' ' + paciente.apellidos} llena />
          <Campo rotulo="Edad:" valor={paciente.edad} sufijo="años" ancho={8} />
          <Campo rotulo="Fecha de Nacimiento:" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={24} />
        </Fila>
        <Fila>
          <Campo rotulo="Nombre de otro/a responsable:" valor={null} llena />
          <Campo rotulo="Tel:" valor={paciente.telefono} ancho={30} />
        </Fila>
        <Fila>
          <Campo rotulo="Dirección:" valor={direccion} llena />
          <Campo rotulo="Tel:" valor={null} ancho={30} />
        </Fila>
        <Fila>
          <SiNo rotulo="Migrante:" valor={paciente.migrante} />
          <Campo rotulo="Ocupación:" valor={null} llena />
          <Campo rotulo="DPI" valor={paciente.dpi} ancho={30} />
        </Fila>
      </Cuadro>
    </>
  );
}

/** La barra de signos de peligro con su instruccion, igual en las dos hojas. */
function SignosDePeligro({
  numero,
  titulo,
  catalogo,
  ficha,
}: {
  numero: string;
  titulo: string;
  catalogo: CatalogoFicha;
  ficha: Ficha;
}) {
  return (
    <>
      <Barra numero={numero} titulo={titulo} />
      <Cuadro>
        <p className="hoja-negrita" style={{ margin: '0 0 1mm', textAlign: 'center' }}>
          Marque en los cuadros correspondientes de SI o NO lo encontrado en la evaluación. De acuerdo al
          nivel de resolución, trate o refiera.
        </p>
        <SignosPeligroSiNo catalogo={catalogo} ficha={ficha} intercalados />
      </Cuadro>
    </>
  );
}

/** Una fila de la tabla de controles: rotulo a la izquierda y el valor en la columna de hoy. */
function FilaControl({
  rotulo,
  valor,
  columnas = 4,
  alto,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  columnas?: number;
  /** Alto minimo en mm, para las celdas que el papel deja grandes. */
  alto?: number;
}) {
  return (
    <tr style={alto ? { height: alto + 'mm' } : undefined}>
      <td>{rotulo}</td>
      <td className="hoja-centrado hoja-valor">{valor}</td>
      {Array.from({ length: columnas - 1 }, (_, i) => (
        <td key={i} />
      ))}
    </tr>
  );
}

/** Una barra negra que ocupa la fila entera de la tabla, como en el papel. */
function BarraEnTabla({ titulo, nota, columnas = 5 }: { titulo: string; nota?: string; columnas?: number }) {
  return (
    <tr>
      <td colSpan={columnas} className="hoja-celda-barra">
        {titulo}
        {nota ? <span> {nota}</span> : null}
      </td>
    </tr>
  );
}

function SiNoCelda({ valor }: { valor: boolean | null | undefined }) {
  return (
    <span className="hoja-sino">
      <Casilla marcada={valor === true} rotulo="SI" />
      <Casilla marcada={valor === false} rotulo="NO" />
    </span>
  );
}

/** Los encabezados «Control N / Meses (semanas) ...» de las tablas de controles. */
function EncabezadoControl({ numero, nota, semanas }: { numero: number | string; nota: string; semanas?: ReactNode }) {
  return (
    <th style={{ fontWeight: 400, verticalAlign: 'top' }}>
      <span>Control {numero}</span>
      <br />
      {nota}
      <br />
      {semanas ?? <span className="hoja-campo-valor" style={{ minWidth: '18mm' }}> </span>}
    </th>
  );
}

/**
 * La ficha clinica prenatal: la hoja 1 y la hoja 2 del papel.
 *
 * La hoja 2 tiene cuatro columnas, una por control, porque el papel acompana
 * a la mujer todo el embarazo. En el sistema cada control es una ficha, asi
 * que se imprime con la columna del Control 1 llena con ESTE control y las
 * otras tres en blanco, para que la hoja se lea igual que la original y se
 * pueda seguir llenando a mano si hace falta.
 */
export function HojaPrenatal({
  ficha,
  catalogo,
  paciente,
  antecedentes,
}: {
  ficha: Ficha;
  catalogo: CatalogoFicha;
  paciente: Paciente;
  antecedentes: AntecedentesPaciente | null;
}) {
  const p = ficha.prenatal;
  const o = antecedentes?.obstetricos ?? null;
  const fur = o?.fur ?? null;
  const temas = [...catalogo.temasConsejeria].sort((a, b) => a.orden - b.orden);
  const signosPresentes = ficha.signosPeligro.filter((s) => s.presente);
  const semanas = p?.semanasPorFurAu ?? p?.semanasGestacion ?? null;

  return (
    <>
      <Pliego etiqueta="Ficha clínica prenatal, hoja 1">
        <Encabezado
          titulo="FICHA CLÍNICA"
          subtitulo="PRENATAL Y/O POSPARTO"
          numeroExpediente={paciente.expediente?.numero}
          fecha={diaLocal(ficha.fecha)}
        />

        <Barra numero="I." titulo="Identificación del establecimiento de salud" />
        <Cuadro>
          <TipoEstablecimiento
            opciones={['PS', 'PSF', 'C/S "B"', 'CENAPA', 'C/S "A"', 'CAP', 'CAIMI', 'CUM', 'HOSPITAL']}
            marcada={SERVICIO_DE_SALUD.tipo}
            repartidas
          />
          <Fila>
            <Campo rotulo="Distrito:" valor={SERVICIO_DE_SALUD.distrito} llena />
            <Campo rotulo="Área de Salud:" valor={SERVICIO_DE_SALUD.areaDeSalud} llena />
          </Fila>
        </Cuadro>

        <DatosDeLaPaciente paciente={paciente} />

        <SignosDePeligro
          numero="III."
          titulo="Identifique y evalúe signos y síntomas de peligro"
          catalogo={catalogo}
          ficha={ficha}
        />

        <Barra numero="IV." titulo="Si refirió a la paciente registre manejo y estabilización" />
        <Cuadro>
          <Renglones texto={ficha.manejoEstabilizacion} minimo={3} />
        </Cuadro>

        <Barra numero="V." titulo="Motivo de la consulta" />
        <Cuadro>
          <Fila>
            <Casilla rotulo="Embarazo" marcada />
            <Casilla rotulo="Parto" marcada={false} />
            <Casilla rotulo="Posparto" marcada={false} />
            <Casilla rotulo="Otro" marcada={false} />
          </Fila>
          <Fila>
            <Campo valor={ficha.motivo} llena />
          </Fila>
        </Cuadro>

        <Barra numero="VI." titulo="Historia de la enfermedad actual" />
        <Cuadro>
          <Renglones texto={ficha.historiaEnfermedad} minimo={4} />
        </Cuadro>

        <Barra numero="VII." titulo="Antecedentes" />
        <Cuadro>
          <p className="hoja-negrita" style={{ margin: '0 0 1mm' }}>
            Marque con una “X” y complete la información solicitada. De acuerdo al tipo de
            antecedentes, evalúe la referencia oportuna para atención del parto en establecimiento de
            mayor capacidad resolutiva.
          </p>
          {/* Los dos grupos, con su rotulo de pie a la izquierda y una raya entre ellos, como en el papel. */}
          <div style={{ display: 'grid', gridTemplateColumns: '6mm 1fr', borderTop: '0.3mm solid #000', margin: '0 -2mm' }}>
            <div className="hoja-negrita hoja-centrado" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '6.5pt', padding: '1mm 0' }}>
              GINECO/OBSTÉTRICOS
            </div>
            <div style={{ padding: '0.5mm 2mm 1mm 1mm' }}>
              <Fila>
                <Campo rotulo="FUR:" valor={fur ? fechaConBarras(fur) : null} ancho={22} />
                <Campo rotulo="# Gestas:" valor={o?.gestas} ancho={12} />
                <Campo rotulo="Partos:" valor={o?.partos} ancho={12} />
                <Campo rotulo="AB:" valor={o?.abortos} ancho={12} />
                <SiNo rotulo="AB consecutivos:" valor={o?.abortosConsecutivos} />
                <span className="hoja-negrita">
                  <Campo rotulo="# LIU:" valor={o?.legradosLiu} ancho={12} />
                </span>
              </Fila>
              <Fila>
                <Campo rotulo="# Nacidos Vivos:" valor={o?.nacidosVivos} ancho={10} />
                <Campo rotulo="# Nacidos Muertos:" valor={o?.nacidosMuertos} ancho={10} />
                <Campo rotulo="# Hijos Vivos:" valor={o?.hijosVivos} ancho={10} />
                <Campo rotulo="# Hijos Muertos:" valor={o?.hijosMuertos} ancho={10} />
                <span className="hoja-negrita">
                  <Campo rotulo="# de Cesáreas:" valor={o?.cesareas} ancho={10} />
                </span>
              </Fila>
              <Fila>
                <SiNo rotulo="Embarazos múltiples:" valor={o?.embarazosMultiples} />
                <Campo
                  rotulo="Fecha último parto:"
                  valor={o?.fechaUltimoParto ? fechaConBarras(o.fechaUltimoParto) : null}
                  ancho={24}
                />
                <span className="hoja-negrita">
                  <Campo rotulo="# Niños(as) nacidos antes de los 8 meses:" valor={o?.prematurosAntes8Meses} ancho={22} />
                </span>
              </Fila>
              <Fila>
                <SiNo rotulo="Preeclampsia:" valor={o?.preeclampsia} />
                <SiNo rotulo="Último RN pesó menos de 5 libras y media:" valor={null} />
                <span className="hoja-negrita">
                  <SiNo rotulo="Último RN pesó más de 7 lbs. 12 onz:" valor={null} />
                </span>
              </Fila>
              <Fila>
                <span>Detección de cáncer de cérvix:</span>
                <Casilla rotulo="Papanicolaou" marcada={o?.tamizajeCervix === 'PAPANICOLAU'} />
                <Casilla rotulo="IVAA" marcada={o?.tamizajeCervix === 'IVAA'} />
                <Campo rotulo="Fecha:" valor={o?.tamizajeFecha ? fechaConBarras(o.tamizajeFecha) : null} ancho={26} />
                <SiNo rotulo="Resultado Normal:" valor={o?.tamizajeNormal} />
              </Fila>
              <Fila>
                <SiNo rotulo="Utilizó algún método de Planificación Familiar:" valor={o?.usaPlanificacion} />
                <Campo rotulo="Cuál:" valor={o?.metodoPlanificacion} ancho={50} />
              </Fila>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '6mm 1fr', borderTop: '0.3mm solid #000', margin: '0 -2mm -1mm' }}>
            <div className="hoja-negrita hoja-centrado" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '6.5pt', padding: '1mm 0' }}>
              MÉDICOS
            </div>
            <div style={{ padding: '0.5mm 2mm 1mm 1mm' }}>
              <ColumnasAntecedentes catalogo={catalogo} antecedentes={antecedentes} codigos={MEDICOS} />
              <Fila>
                <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_MEDICAMENTOS" anchoDetalle={40} />
                <span className="hoja-sino">
                  <Campo rotulo="Tipo de sangre: Grupo" valor={o?.tipoSangre} ancho={12} />
                  <Casilla rotulo="RH (+)" rotuloDespues marcada={o?.rhPositivo === true} />
                  <Casilla rotulo="RH (-)" rotuloDespues marcada={o?.rhPositivo === false} />
                </span>
              </Fila>
              <Fila>
                <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_PSICOSOCIAL" rotulo="Trastorno Psico social:" />
                <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_VIOLENCIA_INTRAFAMILIAR" rotulo="Violencia intrafamiliar:" />
                <span className="hoja-negrita">
                  <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_VIOLENCIA_GENERO" rotulo="Violencia basada en género:" />
                </span>
              </Fila>
              <div className="hoja-negrita">
                <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_QUIRURGICOS" rotulo="Quirúrgicos:" />
              </div>
              <Fila>
                <span className="hoja-negrita">Hábitos:</span>
                <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="HAB_FUMA" rotulo="Fuma" />
                <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="HAB_ALCOHOL" rotulo="Ingiere bebidas alcohólicas:" />
                <span className="hoja-negrita">
                  <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="HAB_DROGAS" rotulo="Consumo de drogas:" />
                </span>
              </Fila>
              <Fila>
                <span className="hoja-negrita">
                  <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_VACUNA_TD" rotulo="Antecedente de vacuna Td:" />
                </span>
                <span className="hoja-negrita">
                  <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_SR" rotulo="SR:" soloNoAplicaMarcado />
                </span>
              </Fila>
              <div className="hoja-negrita">
                <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_OTROS" rotulo="Otros antecedentes:" />
              </div>
              <AntecedentesRestantes catalogo={catalogo} antecedentes={antecedentes} colocados={COLOCADOS} />
            </div>
          </div>
        </Cuadro>
      </Pliego>

      <Pliego etiqueta="Ficha clínica prenatal, hoja 2">
        <Barra numero="VIII." titulo="Examen físico de la embarazada" />
        <table className="hoja-tabla hoja-tabla-controles" style={{ marginTop: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontWeight: 400, verticalAlign: 'top' }}>
                <Fila>
                  <Campo rotulo="FUR:" valor={fur ? fechaConBarras(fur) : null} ancho={18} />
                  <Campo rotulo="FPP:" valor={p?.fechaProbableParto ? fechaConBarras(p.fechaProbableParto) : null} ancho={18} />
                </Fila>
                <div>Circunferencia del brazo</div>
                <Fila>
                  <Campo rotulo="en centímetros:" valor={p?.circunferenciaBrazoCm} ancho={24} />
                </Fila>
                <div>(sólo si embarazo menor de 12 semanas</div>
              </th>
              <EncabezadoControl
                numero={1}
                nota="Meses (semanas) de embarazo:"
                semanas={semanas !== null ? <span className="hoja-campo-valor hoja-valor" style={{ minWidth: '18mm' }}>{semanas}</span> : undefined}
              />
              {[2, 3, 4].map((n) => (
                <EncabezadoControl key={n} numero={n} nota="Meses (semanas) de embarazo:" />
              ))}
            </tr>
          </thead>
          <tbody>
            <FilaControl rotulo="Fecha de la visita:" valor={diaLocal(ficha.fecha)} />
            <BarraEnTabla titulo="Signos o síntomas de peligro" />
            <FilaControl
              alto={16}
              rotulo={
                <>
                  Presenta signos o síntomas de peligro
                  <br />
                  <b>Si</b> presenta, estabilice y refiera
                  <br />
                  Anote el signo o síntoma de peligro detectado en la columna correspondiente
                </>
              }
              valor={
                <>
                  <SiNoCelda valor={signosPresentes.length > 0} />
                  <div className={signosPresentes.length > 0 ? '' : 'hoja-campo-valor'} style={{ marginTop: '1mm' }}>
                    {signosPresentes.map((s) => s.texto).join(', ') || ' '}
                  </div>
                </>
              }
            />
            <BarraEnTabla titulo="Signos vitales" />
            <FilaControl rotulo="Presión arterial" valor={presion(ficha.presionSistolica, ficha.presionDiastolica)} />
            <FilaControl rotulo="Temperatura corporal en °C" valor={ficha.temperaturaC} />
            <FilaControl rotulo="Peso en libras" valor={kgALibras(ficha.pesoKg)} />
            <FilaControl rotulo="Respiraciones por minuto" valor={ficha.respiraciones} />
            <FilaControl rotulo="Frecuencia cardiaca materna" valor={ficha.pulso} />
            <BarraEnTabla titulo="Examen general" />
            <tr>
              <td />
              {[1, 2, 3, 4].map((n) => (
                <td key={n} className="hoja-centrado">
                  ¿Normal?
                </td>
              ))}
            </tr>
            <FilaControl
              rotulo={
                <>
                  Estado general, palidez palmar,
                  <br />
                  conjuntivas, uñas
                </>
              }
              valor={<SiNoCelda valor={p?.examenGeneralNormal} />}
            />
            <FilaControl rotulo="Examen buco dental (describa hallazgos)" valor={p?.examenBucodental} />
            <BarraEnTabla titulo="Examen obstétrico" />
            <FilaControl rotulo="Altura uterina" valor={p?.alturaUterinaCm ? p.alturaUterinaCm + ' cm' : null} />
            <FilaControl
              rotulo={
                <>
                  Presencia de movimientos fetales
                  <br />( 20 semanas o más )
                </>
              }
              valor={<SiNoCelda valor={p?.movimientosFetales} />}
            />
            <FilaControl rotulo="Frecuencia cardiaca fetal (si procede)" valor={p?.fcf} />
            <FilaControl rotulo="Presentación por Leopold ( > 36 semanas)" valor={p?.presentacionLeopold} />
            <BarraEnTabla titulo="Examen ginecológico" />
            <FilaControl
              rotulo={
                <>
                  Presencia de trazas de sangre o<br />
                  manchado (describa)
                </>
              }
              valor={
                <>
                  <SiNoCelda valor={p?.trazasSangre} />
                  <div>{p?.trazasSangreDescripcion ?? ''}</div>
                </>
              }
            />
            <FilaControl
              rotulo={
                <>
                  Verrugas, herpes, papilomas,
                  <br />
                  úlceras (describa)
                </>
              }
              valor={
                <>
                  <SiNoCelda valor={p?.lesionesVulvares} />
                  <div>{p?.lesionesVulvaresDescripcion ?? ''}</div>
                </>
              }
            />
            <FilaControl rotulo="Flujo vaginal" valor={<SiNoCelda valor={p?.flujoVaginal} />} />
            <BarraEnTabla titulo="Exámenes de laboratorio o pruebas de gabinete" />
            <FilaControl rotulo="Hemoglobina y Hematocrito" valor={p?.hemoglobinaHematocrito} />
            <FilaControl rotulo="Grupo y RH" valor={p?.grupoRh} />
            <FilaControl rotulo="Orina (proteína, glucosa y cetona)" valor={p?.orina} />
            <FilaControl rotulo="Glicemia" valor={p?.glicemia} />
            <FilaControl rotulo="VDRL" valor={p?.vdrl} />
            <FilaControl rotulo="VIH (Oferte prueba con consejería)" valor={p?.vih} />
            <FilaControl rotulo="Papanicolaou" valor={p?.papanicolau} />
            <FilaControl rotulo="Infecciones" valor={p?.infecciones} />
            <BarraEnTabla titulo="Clasificación" />
            <FilaControl rotulo="Semanas embarazo por FUR y/o AU" valor={p?.semanasPorFurAu} />
            <FilaControl rotulo="Problemas detectados" valor={p?.problemasDetectados} />
            <BarraEnTabla
              titulo="Conducta"
              nota="(medicamentos indicados, anotar dosis y días de tratamiento. Anotar si se hizo referencia)"
            />
            <FilaControl rotulo="Sulfato ferroso /anotar número de tabletas" valor={p?.sulfatoFerrosoTabletas} />
            <FilaControl rotulo="Ácido fólico / anotar número de tabletas" valor={p?.acidoFolicoTabletas} />
            <FilaControl
              rotulo={
                <>
                  Vacunación madre (Td) /anotar dosis que
                  <br />
                  se administra
                </>
              }
              valor={p?.tdDosis}
            />
            {ficha.medicamentos.length > 0 || ficha.referencia ? (
              <FilaControl
                rotulo="Otros medicamentos / referencia"
                valor={[
                  ...ficha.medicamentos.map(
                    (m) => m.nombre + (m.dosis ? ' — ' + m.dosis : '') + (m.dias ? ' — ' + m.dias + ' días' : ''),
                  ),
                  ficha.referencia ? 'Referencia: ' + ficha.referencia : null,
                ]
                  .filter(Boolean)
                  .join('; ')}
              />
            ) : null}
            <BarraEnTabla titulo="Consejería" />
            {temas.map((t) => {
              const r = ficha.consejeriaTemas.find((x) => x.temaId === t.id) ?? null;
              return (
                <FilaControl
                  key={t.id}
                  rotulo={t.texto}
                  valor={<SiNoCelda valor={r ? r.brindada : null} />}
                />
              );
            })}
          </tbody>
        </table>
        {ficha.consejeria ? (
          <Fila>
            <Campo rotulo="Consejería:" valor={ficha.consejeria} llena />
          </Fila>
        ) : null}
        <Firma />
      </Pliego>
    </>
  );
}

/** Lo que el sistema anota como conducta: medicamentos, referencia y tratamiento, en una linea. */
function conductaEnLinea(ficha: Ficha): string {
  return [
    ...ficha.medicamentos.map(
      (m) => m.nombre + (m.dosis ? ' — ' + m.dosis : '') + (m.dias ? ' — ' + m.dias + ' días' : ''),
    ),
    ficha.referencia ? 'Referencia: ' + ficha.referencia : null,
    ficha.tratamiento,
  ]
    .filter(Boolean)
    .join('; ');
}

/**
 * La evaluacion del posparto: la hoja 3 del papel para el primer control y
 * la hoja 4 —la tabla de controles siguientes— para los demas.
 */
export function HojaPosparto({
  ficha,
  catalogo,
  paciente,
}: {
  ficha: Ficha;
  catalogo: CatalogoFicha;
  paciente: Paciente;
}) {
  const s = ficha.posparto;
  const temas = [...catalogo.temasConsejeria].sort((a, b) => a.orden - b.orden);
  const quien = s?.quienAtendioParto
    ? (QUIEN_ATENDIO[s.quienAtendioParto] ?? s.quienAtendioParto) +
      (s.quienAtendioPartoOtro ? ': ' + s.quienAtendioPartoOtro : '')
    : null;
  const brindada = (tema: { id: string }) => {
    const r = ficha.consejeriaTemas.find((x) => x.temaId === tema.id) ?? null;
    return r ? r.brindada : null;
  };
  /** SI si alguno de los temas que juntan se brindo; NO si todos se negaron; nada si no se contesto. */
  const brindadaAlguno = (patrones: RegExp[]): boolean | null => {
    const respuestas = temas.filter((t) => patrones.some((re) => re.test(t.texto))).map(brindada);
    if (respuestas.some((r) => r === true)) return true;
    if (respuestas.length > 0 && respuestas.every((r) => r === false)) return false;
    return null;
  };

  const esPrimero = s?.esPrimerControl ?? true;

  return (
    <Pliego etiqueta={esPrimero ? 'Evaluación del posparto, primer control' : 'Controles posparto'}>
      <h1 className="hoja-titulo" style={{ margin: '0 0 3mm', fontSize: '11pt' }}>
        EVALUACIÓN DEL POSPARTO
      </h1>
      <div className="hoja-cabecera-datos" style={{ marginBottom: '3mm' }}>
        <RecuadroDato rotulo="No. Expediente:" valor={paciente.expediente?.numero} ancho={90} />
        <RecuadroDato rotulo="Fecha:" valor={diaLocal(ficha.fecha)} ancho={46} />
      </div>

      {esPrimero ? (
        <>
          <DatosDeLaPaciente paciente={paciente} />

          <SignosDePeligro
            numero="III."
            titulo="Evalúe signos y síntomas de peligro en el posparto"
            catalogo={catalogo}
            ficha={ficha}
          />

          <Barra numero="IV." titulo="Si refirió a la paciente, describa manejo y estabilización" />
          <Cuadro>
            <Renglones texto={ficha.manejoEstabilizacion} minimo={3} />
          </Cuadro>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginTop: '1.4mm' }}>
            <Barra numero="V." titulo="Primer control posparto" />
            <div className="hoja-recuadro" style={{ flex: 1, padding: '0.6mm 2mm', marginBottom: '-0.35mm' }}>
              <span>Fecha:</span>
              <span className="hoja-valor">{diaLocal(ficha.fecha)}</span>
            </div>
          </div>
          <table className="hoja-tabla" style={{ marginTop: 0 }}>
            <tbody>
              <tr>
                <td style={{ width: '58mm' }}>Cuántos días después del parto</td>
                <td className="hoja-valor" style={{ width: '58mm' }}>
                  {s?.diasDespuesDelParto ?? ''}
                </td>
                <td>
                  <Campo rotulo="P/A" valor={presion(ficha.presionSistolica, ficha.presionDiastolica)} sufijo="Mm/Hg" ancho={20} />
                </td>
              </tr>
              <tr>
                <td>Dónde fue atendido su parto</td>
                <td className="hoja-valor">{s?.dondeAtendioParto ?? ''}</td>
                <td>
                  <Campo rotulo="FC" valor={ficha.pulso} sufijo="X min" ancho={20} />
                </td>
              </tr>
              <tr>
                <td>Quién le atendió el parto</td>
                <td className="hoja-valor">{quien ?? ''}</td>
                <td>
                  <Campo rotulo="Temperatura" valor={ficha.temperaturaC} sufijo="°C" ancho={20} />
                </td>
              </tr>
              <tr>
                <td>Herida operatoria</td>
                <td className="hoja-valor">{s?.heridaOperatoria ?? ''}</td>
                <td rowSpan={2}>
                  Examen de mamas: (describa)
                  <div className="hoja-valor">{s?.examenMamas ?? ''}</div>
                </td>
              </tr>
              <tr>
                <td>Involución Uterina</td>
                <td className="hoja-valor">{s?.involucionUterina ?? ''}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ height: '24mm', verticalAlign: 'top' }}>
                  Examen ginecológico (Describa: hallazgos patológicos y características de loquios,
                  episiorrafía, etc.)
                  <div className="hoja-valor" style={{ marginTop: '1mm', whiteSpace: 'pre-wrap' }}>
                    {s?.examenGinecologico ?? ''}
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <Fila>
                    <SiNo rotulo="Lactancia materna exclusiva:" valor={s?.lactanciaMaternaExclusiva} />
                    <Campo rotulo="¿Por qué no?" valor={s?.motivoSinLactancia} llena />
                  </Fila>
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <Fila>
                    <Campo rotulo="Diagnóstico:" valor={s?.problemasDetectados ?? ficha.diagnostico} llena />
                  </Fila>
                  <Fila>
                    <Campo rotulo="Conducta y Tratamiento:" valor={conductaEnLinea(ficha) || null} llena />
                  </Fila>
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <Fila>
                    <Campo rotulo="Nombre y cargo de la persona que atiende:" valor={null} llena />
                  </Fila>
                </td>
              </tr>
            </tbody>
          </table>

          <Barra numero="VI." titulo="Suplementación, medicamentos y consejería en el posparto" />
          <table className="hoja-tabla" style={{ marginTop: 0 }}>
            <tbody>
              {[
                { rotulo: 'Sulfato Ferroso', valor: s?.sulfatoFerroso, cantidad: s?.sulfatoFerrosoTabletas },
                { rotulo: 'Ácido Fólico', valor: s?.acidoFolico, cantidad: s?.acidoFolicoTabletas },
                { rotulo: 'Otro medicamento', valor: s?.otroMedicamento, cantidad: null },
                { rotulo: 'Td', valor: s?.td, cantidad: s?.tdDosis },
              ].map((fila, i) => {
                const consejeria = CONSEJERIA_PRIMER_CONTROL[i];
                return (
                  <tr key={fila.rotulo}>
                    <td style={{ width: '32mm' }}>{fila.rotulo}</td>
                    <td style={{ width: '30mm' }}>
                      <SiNoCelda valor={fila.valor} />
                      {fila.cantidad !== null && fila.cantidad !== undefined ? (
                        <span className="hoja-valor"> {fila.cantidad}</span>
                      ) : null}
                    </td>
                    <td>{consejeria.texto}</td>
                    <td style={{ width: '30mm' }} className="hoja-centrado">
                      <SiNoCelda valor={brindadaAlguno(consejeria.temas)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <table className="hoja-tabla hoja-tabla-controles" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <td colSpan={5} className="hoja-celda-barra">
                  VII. Controles posparto <span>(hasta 6 meses después del parto)</span>
                </td>
              </tr>
              <tr>
                <th style={{ width: '62mm' }} />
                <EncabezadoControl
                  numero=""
                  nota="Meses (semanas) después del parto:"
                  semanas={
                    s?.diasDespuesDelParto !== null && s?.diasDespuesDelParto !== undefined ? (
                      <span className="hoja-campo-valor hoja-valor" style={{ minWidth: '18mm' }}>
                        {s.diasDespuesDelParto} días
                      </span>
                    ) : undefined
                  }
                />
                {[3, 4, 5].map((n) => (
                  <EncabezadoControl key={n} numero={n} nota="Meses (semanas) después del parto:" />
                ))}
              </tr>
            </thead>
            <tbody>
              <FilaControl rotulo="Fecha de la visita" valor={diaLocal(ficha.fecha)} />
              <FilaControl rotulo="Involución uterina" valor={s?.involucionUterina} />
              <FilaControl rotulo="Examen de mamas" valor={s?.examenMamas} />
              <FilaControl rotulo="Herida operatoria" valor={s?.heridaOperatoria} />
              <FilaControl
                alto={22}
                rotulo={
                  <>
                    Examen ginecológico
                    <br />
                    (Describa: hallazgos patológicos y otros)
                  </>
                }
                valor={s?.examenGinecologico}
              />
              <FilaControl rotulo="P/A" valor={presion(ficha.presionSistolica, ficha.presionDiastolica)} />
              <FilaControl rotulo="Mm/Hg" valor={null} />
              <FilaControl rotulo="FC X min" valor={ficha.pulso} />
              <FilaControl rotulo="Temperatura °C" valor={ficha.temperaturaC} />
              <FilaControl
                rotulo="Lactancia materna exclusiva:"
                valor={
                  <>
                    <SiNoCelda valor={s?.lactanciaMaternaExclusiva} />
                    {s?.motivoSinLactancia ? <div>{s.motivoSinLactancia}</div> : null}
                  </>
                }
              />
              <BarraEnTabla titulo="Clasificación" />
              <FilaControl rotulo="Problemas detectados" valor={s?.problemasDetectados ?? ficha.diagnostico} />
              <BarraEnTabla
                titulo="Conducta"
                nota="(medicamentos indicados, anotar dosis y días de tratamiento. Anotar si se hizo referencia)"
              />
              <FilaControl
                rotulo={
                  <>
                    Sulfato ferroso /anotar número de table-
                    <br />
                    tas
                  </>
                }
                valor={s?.sulfatoFerrosoTabletas ?? siNoTexto(s?.sulfatoFerroso)}
              />
              <FilaControl
                rotulo="Ácido fólico / anotar número de tabletas"
                valor={s?.acidoFolicoTabletas ?? siNoTexto(s?.acidoFolico)}
              />
              <FilaControl
                rotulo={
                  <>
                    Vacunación madre (Td) /anotar dosis que
                    <br />
                    se administra
                  </>
                }
                valor={s?.tdDosis ?? siNoTexto(s?.td)}
              />
              <FilaControl rotulo="Medicamento" valor={conductaEnLinea(ficha)} />
              <BarraEnTabla titulo="Consejería" />
              {temas.map((t) => (
                <FilaControl key={t.id} rotulo={t.texto} valor={<SiNoCelda valor={brindada(t)} />} />
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '3mm' }}>
            <Barra titulo="Otros controles y observaciones" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '28mm 1fr', columnGap: '3mm', marginTop: '0.5mm' }}>
            <Barra titulo="Fecha" ancha />
            <Barra titulo="Observaciones /Hallazgos adicionales" ancha />
          </div>
          <div className="hoja-observaciones" style={{ ['--renglones' as string]: 16 }}>
            <div className="hoja-valor" style={{ textAlign: 'center' }}>
              {ficha.notas || ficha.consejeria ? diaLocal(ficha.fecha) : ''}
            </div>
            <div className="hoja-valor">{[ficha.notas, ficha.consejeria].filter(Boolean).join('\n')}</div>
          </div>
          <Firma />
        </>
      )}
    </Pliego>
  );
}
