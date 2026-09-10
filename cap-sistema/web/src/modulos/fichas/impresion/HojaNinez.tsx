import type { Ficha } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha, Paciente } from '../servicio-fichas';
import { SERVICIO_DE_SALUD } from '../servicio-fichas';
import type { Carnet, CatalogoCarnet } from '../ninez/servicio-carnet';
import { COLUMNAS_DOSIS, casillasDe } from '../ninez/carnet-ninez';
import {
  ColumnaConducta,
  ConsejeriaCasillas,
  GrupoAntecedentes,
  MatrizProblemas,
  SignosPeligroCasillas,
} from './Bloques';
import {
  Barra,
  Campo,
  Casilla,
  Cuadro,
  Encabezado,
  EmblemaDrpap,
  Fila,
  Firma,
  Pliego,
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

/** El emblema del area de salud, en texto. */
function EmblemaAreaDeSalud() {
  return (
    <div className="hoja-emblema">
      <b>MSPAS</b>
      Ministerio de Salud Pública · Área de Salud {SERVICIO_DE_SALUD.areaDeSalud}
    </div>
  );
}

/**
 * La ficha clinica del lactante y ninez: dos hojas.
 *
 * La primera es la del nino —signos de peligro, quien es, sus padres, su
 * casa, su esquema de vacunas y sus antecedentes— y sale del carnet, que es
 * del paciente y no de la consulta. La segunda es la de la consulta de hoy:
 * la matriz de problemas con su columna de conducta. La grafica de peso para
 * edad (hoja 2 del papel) no se imprime todavia.
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

  return (
    <>
      <Pliego etiqueta="Ficha clínica del lactante y niñez, hoja 1">
        <Encabezado
          titulo="FICHA CLÍNICA DEL LACTANTE Y NIÑEZ"
          numeroExpediente={paciente.expediente?.numero}
          fecha={diaLocal(ficha.fecha)}
          emblemaIzquierdo={<EmblemaDrpap />}
          emblemaDerecho={<EmblemaAreaDeSalud />}
        />

        <Barra numero="1." titulo="Evalúe signos y síntomas de peligro" ancha />
        <Cuadro>
          <p className="hoja-nota hoja-negrita" style={{ margin: '0 0 0.5mm', textAlign: 'center' }}>
            (Proceda de acuerdo a nivel de resolución)
          </p>
          <SignosPeligroCasillas catalogo={catalogo} ficha={ficha} />
        </Cuadro>

        <Barra numero="2." titulo="Identificación del servicio de salud" ancha />
        <Cuadro>
          <TipoEstablecimiento
            opciones={['PSF', 'C/S "A"', 'CENAPA', 'C/S "B"', 'CAP', 'CAIMI']}
            marcada={SERVICIO_DE_SALUD.tipo}
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

        <Fila>
          <Barra numero="3." titulo="Datos generales del paciente" corta />
          <Campo rotulo="CUI" valor={paciente.dpi} ancho={30} />
        </Fila>
        <Cuadro>
          <Fila>
            <Campo rotulo="Nombre y apellidos:" valor={nombre} llena />
            <Campo rotulo="Fecha de Nacimiento:" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={22} />
          </Fila>
          <Fila>
            <Campo rotulo="Lugar de nacimiento:" valor={datos?.lugarNacimiento} llena />
            <Campo rotulo="Dirección donde vive:" valor={direccion} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Nombre de Persona que acompaña al niño (a):" valor={datos?.acompananteNombre} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Edad" valor={edad.anios} sufijo="años" ancho={8} />
            <Campo valor={edad.meses} sufijo="meses," ancho={8} />
            <span>Sexo:</span>
            <Casilla rotulo="F" marcada={paciente.sexo === 'F'} />
            <Casilla rotulo="M" marcada={paciente.sexo === 'M'} />
            <span>Población migrante:</span>
            <Casilla rotulo="SI" marcada={paciente.migrante} />
            <Campo rotulo="(lugar)" valor={paciente.lugarOrigen} ancho={24} />
            <Casilla rotulo="NO" marcada={!paciente.migrante} />
          </Fila>
        </Cuadro>

        <table className="hoja-tabla" style={{ marginTop: '1mm' }}>
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
                <div>Sabe Leer</div>
                <SiNo valor={datos?.madreSabeLeer} />
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <div>Nivel de escolaridad de la madre</div>
                <Fila>
                  {ESCOLARIDAD.map((e) => (
                    <Casilla key={e.clave} rotulo={e.texto} marcada={datos?.madreEscolaridad === e.clave} />
                  ))}
                </Fila>
              </td>
              <td colSpan={2}>
                <div>Número de Hijos</div>
                <Fila>
                  <Campo rotulo="Total" valor={datos?.hijosTotal} ancho={8} />
                  <Campo rotulo="Vivos" valor={datos?.hijosVivos} ancho={8} />
                  <Campo rotulo="Muertos" valor={datos?.hijosMuertos} ancho={8} />
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
                <div>Sabe Leer</div>
                <SiNo valor={datos?.padreSabeLeer} />
              </td>
            </tr>
            <tr>
              <th style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Casa</th>
              <td colSpan={3}>
                <div className="hoja-negrita">ABASTECIMIENTO DE AGUA</div>
                <Fila>
                  {AGUA.map((a) => (
                    <Casilla key={a.clave} rotulo={a.texto} marcada={hogar?.agua === a.clave} />
                  ))}
                  {hogar?.agua === 'OTRO' ? <Campo valor={hogar.aguaOtro} ancho={16} /> : null}
                </Fila>
              </td>
              <td colSpan={2}>
                <div className="hoja-negrita">DISPOSICIÓN DE EXCRETAS</div>
                <Fila>
                  {EXCRETAS.map((e) => (
                    <Casilla key={e.clave} rotulo={e.texto} marcada={hogar?.excretas === e.clave} />
                  ))}
                </Fila>
              </td>
            </tr>
          </tbody>
        </table>

        {/*
          El esquema de vacunas, cruzado con lo que el nino tiene puesto. Las
          columnas de la izquierda son las edades recomendadas que imprime el
          papel; las de la derecha, la fecha y la edad en meses de cada dosis.
        */}
        <table className="hoja-tabla" style={{ marginTop: '1mm' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: '20mm' }}>
                VACUNA
              </th>
              <th colSpan={5}>Edades Recomendadas para Administración</th>
              <th colSpan={10}>Fechas y Edades de Administración</th>
            </tr>
            <tr>
              {COLUMNAS_DOSIS.map((c, i) => (
                <th key={'r' + i} style={{ fontSize: '6.5pt' }}>
                  {c}
                </th>
              ))}
              {COLUMNAS_DOSIS.map((c, i) => (
                <th key={'f' + i} colSpan={2} style={{ fontSize: '6.5pt' }}>
                  {c}
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
                const casillas = carnet ? casillasDe(v, carnet) : [];
                const columnas = Array.from({ length: 5 }, (_, i) => casillas[i] ?? null);
                return (
                  <tr key={v.id}>
                    <td className="hoja-negrita">{v.nombre}</td>
                    {columnas.map((c, i) => (
                      <td key={'r' + i} className="hoja-centrado" style={{ fontSize: '6.5pt' }}>
                        {c?.edadRecomendada ?? ''}
                      </td>
                    ))}
                    {columnas.map((c, i) => (
                      <td key={'f' + i} colSpan={2} className={'hoja-centrado' + (c?.fecha ? ' hoja-valor' : '')} style={{ fontSize: '6.5pt' }}>
                        {c?.fecha ? fechaConBarras(c.fecha) + (c.edadEnMeses !== null ? ' · ' + c.edadEnMeses + ' m' : '') : ''}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Barra numero="4." titulo="Antecedentes" corta />
        <Cuadro>
          <div className="hoja-negrita">Médicos: personales (P) y familiares (F)</div>
          <GrupoAntecedentes catalogo={catalogo} antecedentes={antecedentes} grupo="MEDICO" />
          <GrupoAntecedentes catalogo={catalogo} antecedentes={antecedentes} grupo="FAMILIAR" />
          <GrupoAntecedentes catalogo={catalogo} antecedentes={antecedentes} grupo="HABITO" />
          <Fila>
            <Campo rotulo="Quirúrgicos:" valor={null} llena />
          </Fila>
        </Cuadro>
      </Pliego>

      <Pliego etiqueta="Ficha clínica del lactante y niñez, hoja de consulta">
        <div className="hoja-recuadro" style={{ justifyContent: 'center' }}>
          SI ES RECONSULTA, VOLVER A INVESTIGAR SIGNOS DE PELIGRO
        </div>
        <Fila>
          <Campo rotulo="Nombre:" valor={nombre} llena />
          <Campo rotulo="Fecha:" valor={diaLocal(ficha.fecha)} ancho={22} />
          <Campo rotulo="No. de Expediente:" valor={paciente.expediente?.numero} ancho={26} />
        </Fila>
        <Fila>
          <Campo rotulo="MOTIVO DE CONSULTA:" valor={ficha.motivo} llena />
        </Fila>
        <Fila>
          <Campo rotulo="HISTORIA DEL PROBLEMA ACTUAL:" valor={ficha.historiaEnfermedad} llena />
        </Fila>
        <Cuadro>
          <Fila>
            <span className="hoja-negrita">SIGNOS VITALES:</span>
            <Campo rotulo="Temperatura:" valor={ficha.temperaturaC} sufijo="°C" ancho={10} />
            <Campo rotulo="Peso" valor={kgALibras(ficha.pesoKg)} sufijo="Lb." ancho={10} />
            <Campo rotulo="Talla:" valor={ficha.tallaCm} sufijo="cm" ancho={10} />
            <Campo rotulo="Pulso:" valor={ficha.pulso} sufijo="X min" ancho={10} />
          </Fila>
        </Cuadro>

        <MatrizProblemas
          catalogo={catalogo}
          ficha={ficha}
          encabezados={{
            problema: 'PREGUNTE SI TIENE UN PROBLEMA DE:',
            evaluar: (
              <>
                INVESTIGUE Y COMPRUEBE<small>(Subraye el hallazgo encontrado)</small>
              </>
            ),
            clasificar: (
              <>
                CLASIFICACIÓN / DIAGNÓSTICO<small>(Subraye el diagnóstico)</small>
              </>
            ),
            conducta: (
              <>
                TRATAMIENTO<small>(Indique medicamento, dosis y días de tratamiento)</small>
              </>
            ),
          }}
          columnaConducta={
            <ColumnaConducta
              ficha={ficha}
              consejeriaBrindada={<ConsejeriaCasillas catalogo={catalogo} ficha={ficha} />}
            />
          }
        />
        {ficha.consejeria ? (
          <Fila>
            <Campo rotulo="Consejería:" valor={ficha.consejeria} llena />
          </Fila>
        ) : null}
        {ficha.diagnostico ? (
          <Fila>
            <Campo rotulo="Diagnóstico:" valor={ficha.diagnostico} llena />
          </Fila>
        ) : null}
        {ficha.tratamiento ? (
          <Fila>
            <Campo rotulo="Tratamiento:" valor={ficha.tratamiento} llena />
          </Fila>
        ) : null}

        <Firma rotulo="Nombre de la persona que atendió la consulta:" />
      </Pliego>
    </>
  );
}
