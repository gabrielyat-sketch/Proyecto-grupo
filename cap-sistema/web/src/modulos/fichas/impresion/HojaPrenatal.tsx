import type { ReactNode } from 'react';
import type { Ficha } from '../../expedientes/servicio-expedientes';
import { presion } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha, Paciente } from '../servicio-fichas';
import { SERVICIO_DE_SALUD } from '../servicio-fichas';
import {
  AntecedentesObstetricos,
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
          <Campo rotulo="Fecha de Nacimiento:" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={22} />
        </Fila>
        <Fila>
          <Campo rotulo="Nombre de otro/a responsable:" valor={null} llena />
          <Campo rotulo="Tel:" valor={paciente.telefono} ancho={24} />
        </Fila>
        <Fila>
          <Campo rotulo="Dirección:" valor={direccion} llena />
          <Campo rotulo="Tel:" valor={null} ancho={24} />
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

/** Una fila de la tabla de controles: rotulo a la izquierda y el valor en la columna de hoy. */
function FilaControl({ rotulo, valor, columnas = 4 }: { rotulo: ReactNode; valor: ReactNode; columnas?: number }) {
  return (
    <tr>
      <td>{rotulo}</td>
      <td className="hoja-centrado hoja-valor">{valor}</td>
      {Array.from({ length: columnas - 1 }, (_, i) => (
        <td key={i} />
      ))}
    </tr>
  );
}

function BarraEnTabla({ titulo, columnas = 5 }: { titulo: string; columnas?: number }) {
  return (
    <tr>
      <td colSpan={columnas} style={{ padding: 0, border: 'none' }}>
        <Barra titulo={titulo} corta />
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

/**
 * La ficha clinica prenatal: la hoja 1 y la hoja 2 del papel.
 *
 * La hoja 2 tiene cuatro columnas, una por control, porque el papel acompana
 * a la mujer todo el embarazo. En el sistema cada control es una ficha, asi
 * que se imprime con la columna de ESTE control llena —encabezada con su
 * fecha en vez de «Control 1»— y las otras tres en blanco, para que la hoja
 * se lea igual que la original y se pueda seguir llenando a mano si hace
 * falta.
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
  const fur = antecedentes?.obstetricos?.fur ?? null;
  const temas = [...catalogo.temasConsejeria].sort((a, b) => a.orden - b.orden);
  const signosPresentes = ficha.signosPeligro.filter((s) => s.presente);

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
          />
          <Fila>
            <Campo rotulo="Distrito:" valor={SERVICIO_DE_SALUD.distrito} llena />
            <Campo rotulo="Área de Salud:" valor={SERVICIO_DE_SALUD.areaDeSalud} llena />
          </Fila>
        </Cuadro>

        <DatosDeLaPaciente paciente={paciente} />

        <Barra numero="III." titulo="Identifique y evalúe signos y síntomas de peligro" />
        <Cuadro>
          <p className="hoja-nota hoja-negrita" style={{ margin: '0 0 1mm' }}>
            Marque en los cuadros correspondientes de SI o NO lo encontrado en la evaluación. De
            acuerdo al nivel de resolución, trate o refiera.
          </p>
          <SignosPeligroSiNo catalogo={catalogo} ficha={ficha} />
        </Cuadro>

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
            <Campo valor={ficha.motivo} llena />
          </Fila>
        </Cuadro>

        <Barra numero="VI." titulo="Historia de la enfermedad actual" />
        <Cuadro>
          <Renglones texto={ficha.historiaEnfermedad} minimo={4} />
        </Cuadro>

        <Barra numero="VII." titulo="Antecedentes" />
        <Cuadro>
          <p className="hoja-nota hoja-negrita" style={{ margin: '0 0 1mm' }}>
            Marque con una “X” y complete la información solicitada. De acuerdo al tipo de
            antecedentes, evalúe la referencia oportuna para atención del parto en establecimiento de
            mayor capacidad resolutiva.
          </p>
          <div className="hoja-negrita">GINECO/OBSTÉTRICOS</div>
          <AntecedentesObstetricos antecedentes={antecedentes} completo />
          <div className="hoja-negrita" style={{ marginTop: '1mm' }}>
            MÉDICOS
          </div>
          <ColumnasAntecedentes catalogo={catalogo} antecedentes={antecedentes} codigos={MEDICOS} />
          <Fila>
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_MEDICAMENTOS" />
          </Fila>
          <Fila>
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_PSICOSOCIAL" rotulo="Trastorno Psico social" />
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_VIOLENCIA_INTRAFAMILIAR" />
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_VIOLENCIA_GENERO" />
          </Fila>
          <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_QUIRURGICOS" rotulo="Quirúrgicos:" />
          <Fila>
            <span className="hoja-negrita">Hábitos:</span>
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="HAB_FUMA" />
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="HAB_ALCOHOL" />
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="HAB_DROGAS" />
          </Fila>
          <Fila>
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_VACUNA_TD" />
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_SR" />
          </Fila>
          <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MED_OTROS" rotulo="Otros antecedentes:" />
          <AntecedentesRestantes catalogo={catalogo} antecedentes={antecedentes} colocados={COLOCADOS} />
        </Cuadro>
      </Pliego>

      <Pliego etiqueta="Ficha clínica prenatal, hoja 2">
        <Barra numero="VIII." titulo="Examen físico de la embarazada" />
        <table className="hoja-tabla hoja-tabla-controles">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', fontWeight: 400 }}>
                <Fila>
                  <Campo rotulo="FUR:" valor={fur ? fechaConBarras(fur) : null} ancho={18} />
                  <Campo rotulo="FPP:" valor={p?.fechaProbableParto ? fechaConBarras(p.fechaProbableParto) : null} ancho={18} />
                </Fila>
                <Fila>
                  <Campo
                    rotulo="Circunferencia del brazo en centímetros:"
                    valor={p?.circunferenciaBrazoCm}
                    ancho={10}
                  />
                </Fila>
                <div className="hoja-nota">(sólo si embarazo menor de 12 semanas)</div>
                <div>Fecha de la visita:</div>
              </th>
              <th>
                Control
                <small>{diaLocal(ficha.fecha)}</small>
                <small>Semanas de embarazo:</small>
                <span className="hoja-valor">{p?.semanasPorFurAu ?? p?.semanasGestacion ?? ''}</span>
              </th>
              {[2, 3, 4].map((n) => (
                <th key={n}>
                  Control {n}
                  <small>Meses (semanas) de embarazo:</small>
                  <small>__________</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <BarraEnTabla titulo="Signos o síntomas de peligro" />
            <FilaControl
              rotulo={
                <>
                  Presenta signos o síntomas de peligro. <b>Si</b> presenta, estabilice y refiera. Anote el
                  signo o síntoma de peligro detectado en la columna correspondiente
                </>
              }
              valor={
                <>
                  <SiNoCelda valor={signosPresentes.length > 0} />
                  <div>{signosPresentes.map((s) => s.texto).join(', ')}</div>
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
            <FilaControl
              rotulo="Estado general, palidez palmar, conjuntivas, uñas — ¿Normal?"
              valor={<SiNoCelda valor={p?.examenGeneralNormal} />}
            />
            <FilaControl rotulo="Examen buco dental (describa hallazgos)" valor={p?.examenBucodental} />
            <BarraEnTabla titulo="Examen obstétrico" />
            <FilaControl rotulo="Altura uterina" valor={p?.alturaUterinaCm ? p.alturaUterinaCm + ' cm' : null} />
            <FilaControl
              rotulo="Presencia de movimientos fetales (20 semanas o más)"
              valor={<SiNoCelda valor={p?.movimientosFetales} />}
            />
            <FilaControl rotulo="Frecuencia cardiaca fetal (si procede)" valor={p?.fcf} />
            <FilaControl rotulo="Presentación por Leopold (> 36 semanas)" valor={p?.presentacionLeopold} />
            <BarraEnTabla titulo="Examen ginecológico" />
            <FilaControl
              rotulo="Presencia de trazas de sangre o manchado (describa)"
              valor={
                <>
                  <SiNoCelda valor={p?.trazasSangre} />
                  <div>{p?.trazasSangreDescripcion ?? ''}</div>
                </>
              }
            />
            <FilaControl
              rotulo="Verrugas, herpes, papilomas, úlceras (describa)"
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
            <BarraEnTabla titulo="Conducta (medicamentos indicados, anotar dosis y días de tratamiento. Anotar si se hizo referencia)" />
            <FilaControl rotulo="Sulfato ferroso / anotar número de tabletas" valor={p?.sulfatoFerrosoTabletas} />
            <FilaControl rotulo="Ácido fólico / anotar número de tabletas" valor={p?.acidoFolicoTabletas} />
            <FilaControl rotulo="Vacunación madre (Td) / anotar dosis que se administra" valor={p?.tdDosis} />
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

  const esPrimero = s?.esPrimerControl ?? true;

  return (
    <Pliego etiqueta={esPrimero ? 'Evaluación del posparto, primer control' : 'Controles posparto'}>
      <h1 className="hoja-titulo" style={{ margin: '0 0 2mm', fontSize: '11pt' }}>
        EVALUACIÓN DEL POSPARTO
      </h1>
      <div className="hoja-cabecera-datos">
        <div className="hoja-recuadro" style={{ flex: '0 1 90mm' }}>
          <span>No. Expediente:</span>
          <span className="hoja-campo-valor hoja-valor" style={{ flex: 1 }}>
            {paciente.expediente?.numero ?? ' '}
          </span>
        </div>
        <div className="hoja-recuadro" style={{ flex: '0 1 46mm' }}>
          <span>Fecha:</span>
          <span className="hoja-valor">{diaLocal(ficha.fecha)}</span>
        </div>
      </div>

      {esPrimero ? (
        <>
          <DatosDeLaPaciente paciente={paciente} />

          <Barra numero="III." titulo="Evalúe signos y síntomas de peligro en el posparto" />
          <Cuadro>
            <p className="hoja-nota hoja-negrita" style={{ margin: '0 0 1mm' }}>
              Marque en los cuadros correspondientes de SI o NO lo encontrado en la evaluación. De
              acuerdo al nivel de resolución, trate o refiera.
            </p>
            <SignosPeligroSiNo catalogo={catalogo} ficha={ficha} />
          </Cuadro>

          <Barra numero="IV." titulo="Si refirió a la paciente, describa manejo y estabilización" />
          <Cuadro>
            <Renglones texto={ficha.manejoEstabilizacion} minimo={3} />
          </Cuadro>

          <Barra numero="V." titulo="Primer control posparto" ancha />
          <table className="hoja-tabla">
            <tbody>
              <tr>
                <td style={{ width: '40mm' }}>Cuántos días después del parto</td>
                <td className="hoja-valor" style={{ width: '48mm' }}>
                  {s?.diasDespuesDelParto ?? ''}
                </td>
                <td>
                  <Campo rotulo="P/A" valor={presion(ficha.presionSistolica, ficha.presionDiastolica)} sufijo="Mm/Hg" ancho={14} />
                </td>
              </tr>
              <tr>
                <td>Dónde fue atendido su parto</td>
                <td className="hoja-valor">{s?.dondeAtendioParto ?? ''}</td>
                <td>
                  <Campo rotulo="FC" valor={ficha.pulso} sufijo="X min" ancho={10} />
                </td>
              </tr>
              <tr>
                <td>Quién le atendió el parto</td>
                <td className="hoja-valor">{quien ?? ''}</td>
                <td>
                  <Campo rotulo="Temperatura" valor={ficha.temperaturaC} sufijo="°C" ancho={10} />
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
                <td colSpan={3}>
                  Examen ginecológico (Describa: hallazgos patológicos y características de loquios,
                  episiorrafia, etc.)
                  <Renglones texto={s?.examenGinecologico} minimo={3} />
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
                    <Campo rotulo="Conducta y Tratamiento:" valor={ficha.tratamiento} llena />
                  </Fila>
                  <Fila>
                    <Campo rotulo="Nombre y cargo de la persona que atiende:" valor={null} llena />
                  </Fila>
                </td>
              </tr>
            </tbody>
          </table>

          <Barra numero="VI." titulo="Suplementación, medicamentos y consejería en el posparto" ancha />
          <table className="hoja-tabla">
            <tbody>
              {[
                { rotulo: 'Sulfato Ferroso', valor: s?.sulfatoFerroso, cantidad: s?.sulfatoFerrosoTabletas },
                { rotulo: 'Ácido Fólico', valor: s?.acidoFolico, cantidad: s?.acidoFolicoTabletas },
                { rotulo: 'Otro medicamento', valor: s?.otroMedicamento, cantidad: null },
                { rotulo: 'Td', valor: s?.td, cantidad: s?.tdDosis },
              ].map((fila, i) => {
                const tema = temas[i] ?? null;
                const r = tema ? (ficha.consejeriaTemas.find((x) => x.temaId === tema.id) ?? null) : null;
                return (
                  <tr key={fila.rotulo}>
                    <td style={{ width: '32mm' }}>{fila.rotulo}</td>
                    <td style={{ width: '30mm' }}>
                      <SiNoCelda valor={fila.valor} />
                      {fila.cantidad !== null && fila.cantidad !== undefined ? (
                        <span className="hoja-valor"> {fila.cantidad}</span>
                      ) : null}
                    </td>
                    <td>{tema?.texto ?? ''}</td>
                    <td style={{ width: '24mm' }}>{tema ? <SiNoCelda valor={r ? r.brindada : null} /> : null}</td>
                  </tr>
                );
              })}
              {temas.slice(4).map((tema) => {
                const r = ficha.consejeriaTemas.find((x) => x.temaId === tema.id) ?? null;
                return (
                  <tr key={tema.id}>
                    <td />
                    <td />
                    <td>{tema.texto}</td>
                    <td>
                      <SiNoCelda valor={r ? r.brindada : null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <Barra numero="VII." titulo="Controles posparto" nota="(hasta 6 meses después del parto)" ancha />
          <table className="hoja-tabla hoja-tabla-controles">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontWeight: 400 }}>
                  <Campo rotulo="Nombre:" valor={paciente.nombres + ' ' + paciente.apellidos} llena />
                </th>
                <th>
                  Control
                  <small>{diaLocal(ficha.fecha)}</small>
                  <small>Días después del parto:</small>
                  <span className="hoja-valor">{s?.diasDespuesDelParto ?? ''}</span>
                </th>
                {[3, 4, 5].map((n) => (
                  <th key={n}>
                    Control {n}
                    <small>Meses (semanas) después del parto:</small>
                    <small>__________</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FilaControl rotulo="Fecha de la visita" valor={diaLocal(ficha.fecha)} />
              <FilaControl rotulo="Involución uterina" valor={s?.involucionUterina} />
              <FilaControl rotulo="Examen de mamas" valor={s?.examenMamas} />
              <FilaControl rotulo="Herida operatoria" valor={s?.heridaOperatoria} />
              <FilaControl
                rotulo="Examen ginecológico (Describa: hallazgos patológicos y otros)"
                valor={s?.examenGinecologico}
              />
              <FilaControl rotulo="P/A Mm/Hg" valor={presion(ficha.presionSistolica, ficha.presionDiastolica)} />
              <FilaControl rotulo="FC X min" valor={ficha.pulso} />
              <FilaControl rotulo="Temperatura °C" valor={ficha.temperaturaC} />
              <FilaControl
                rotulo="Lactancia materna exclusiva:"
                valor={
                  <>
                    <SiNoCelda valor={s?.lactanciaMaternaExclusiva} />
                    <div>{s?.motivoSinLactancia ?? ''}</div>
                  </>
                }
              />
              <BarraEnTabla titulo="Clasificación" />
              <FilaControl rotulo="Problemas detectados" valor={s?.problemasDetectados ?? ficha.diagnostico} />
              <BarraEnTabla titulo="Conducta (medicamentos indicados, anotar dosis y días de tratamiento. Anotar si se hizo referencia)" />
              <FilaControl
                rotulo="Sulfato ferroso / anotar número de tabletas"
                valor={s?.sulfatoFerrosoTabletas ?? siNoTexto(s?.sulfatoFerroso)}
              />
              <FilaControl
                rotulo="Ácido fólico / anotar número de tabletas"
                valor={s?.acidoFolicoTabletas ?? siNoTexto(s?.acidoFolico)}
              />
              <FilaControl
                rotulo="Vacunación madre (Td) / anotar dosis que se administra"
                valor={s?.tdDosis ?? siNoTexto(s?.td)}
              />
              <FilaControl
                rotulo="Medicamento"
                valor={[
                  ...ficha.medicamentos.map(
                    (m) => m.nombre + (m.dosis ? ' — ' + m.dosis : '') + (m.dias ? ' — ' + m.dias + ' días' : ''),
                  ),
                  ficha.referencia ? 'Referencia: ' + ficha.referencia : null,
                  ficha.tratamiento,
                ]
                  .filter(Boolean)
                  .join('; ')}
              />
              <BarraEnTabla titulo="Consejería" />
              {temas.map((t) => {
                const r = ficha.consejeriaTemas.find((x) => x.temaId === t.id) ?? null;
                return (
                  <FilaControl key={t.id} rotulo={t.texto} valor={<SiNoCelda valor={r ? r.brindada : null} />} />
                );
              })}
            </tbody>
          </table>
          <Firma />
        </>
      )}
    </Pliego>
  );
}
