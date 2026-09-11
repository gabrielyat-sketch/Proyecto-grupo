import type { Ficha } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha, Paciente } from '../servicio-fichas';
import { SERVICIO_DE_SALUD } from '../servicio-fichas';
import {
  AntecedentesRestantes,
  LineaAntecedente,
  MatrizProblemas,
  SiNoAntecedente,
  SignosPeligroCasillas,
  TablaConsejeria,
} from './Bloques';
import {
  Barra,
  Campo,
  Casilla,
  Cuadro,
  Fila,
  Firma,
  Flecha,
  LogoSias,
  MarcaEnRaya,
  Pliego,
  RecuadroDato,
  SiNo,
  TipoEstablecimiento,
  diaLocal,
  diasEntre,
  fechaConBarras,
} from './Hoja';

const QUIEN_ATENDIO = ['MD', 'EP', 'AE', 'CT'] as const;

/** El dibujo del bebe que lleva el papel arriba a la izquierda. */
function LogoBebe() {
  return <img className="hoja-logo" src="/emblema-bebe.jpg" alt="Bebé" />;
}

/** Los antecedentes maternos, en el orden y las filas del papel. */
const MEDICOS_MATERNOS: { codigo: string; rotulo: string }[] = [
  { codigo: 'MAT_DIABETES', rotulo: 'Diabetes' },
  { codigo: 'MAT_HIPERTENSION', rotulo: 'Hipertensión:' },
  { codigo: 'MAT_TB', rotulo: 'TB:' },
  { codigo: 'MAT_ITS', rotulo: 'ITS:' },
  { codigo: 'MAT_VIH_SIDA', rotulo: 'VIH/SIDA:' },
];
const HABITOS_MATERNOS: { codigo: string; rotulo: string }[] = [
  { codigo: 'MAT_FUMA', rotulo: 'Fuma:' },
  { codigo: 'MAT_ALCOHOL', rotulo: 'Bebe alcohol en abundancia:' },
  { codigo: 'MAT_DROGAS', rotulo: 'Utiliza Drogas' },
];
const COLOCADOS = [
  ...MEDICOS_MATERNOS.map((m) => m.codigo),
  'MAT_MEDICAMENTO',
  'MAT_OTRO',
  ...HABITOS_MATERNOS.map((h) => h.codigo),
  'MAT_QUIRURGICOS',
];
const TIPOS_DE_PARTO: { clave: string; texto: string }[] = [
  { clave: 'NORMAL', texto: 'Normal' },
  { clave: 'CESAREA', texto: 'Cesárea' },
  { clave: 'FORCEPS', texto: 'Distócico = Fórceps' },
  { clave: 'PODALICA', texto: 'Podálica' },
];

/**
 * La seccion 3 del papel son tres recuadros: los VEINTE signos de peligro
 * (enfermedad grave), tres de infeccion y cuatro de malformaciones. El
 * catalogo los trae en una sola lista, en ese orden, asi que se reparten por
 * posicion.
 */
const SIGNOS_DE_PELIGRO = 20;
const SIGNOS_DE_INFECCION = 3;

/** El rotulo en negrita seguido de las casillas, como «TB: SI□ NO□». */
function AntecedenteMaterno({
  catalogo,
  antecedentes,
  codigo,
  rotulo,
  negrita = false,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
  codigo: string;
  rotulo: string;
  negrita?: boolean;
}) {
  return (
    <span className={negrita ? 'hoja-negrita' : undefined}>
      <SiNoAntecedente
        catalogo={catalogo}
        antecedentes={antecedentes}
        codigo={codigo}
        rotulo={rotulo}
        rotuloDetalle="¿Cuál?"
        anchoDetalle={60}
      />
    </span>
  );
}

/**
 * La ficha clinica para menor de 28 dias: dos hojas.
 *
 * Aqui el paciente es el nino, pero casi toda la primera hoja es de la madre
 * y del parto; el papel lo pone asi y la impresion lo respeta. La revision de
 * problemas lleva el tratamiento por fila, no en una columna aparte.
 */
export function HojaNeonato({
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
  const n = ficha.neonato;
  const direccion = [paciente.lugar?.nombre, paciente.comunidad?.nombre].filter(Boolean).join(', ');
  const dias = diasEntre(paciente.fechaNacimiento, ficha.fecha);
  const signos = [...catalogo.signosPeligro].sort((a, b) => a.orden - b.orden);
  const peligro = signos.slice(0, SIGNOS_DE_PELIGRO);
  const infeccion = signos.slice(SIGNOS_DE_PELIGRO, SIGNOS_DE_PELIGRO + SIGNOS_DE_INFECCION);
  const malformaciones = signos.slice(SIGNOS_DE_PELIGRO + SIGNOS_DE_INFECCION);

  return (
    <>
      <Pliego etiqueta="Ficha clínica para menor de 28 días, hoja 1">
        {/* El encabezado del papel: el bebe a la izquierda, titulo al centro con expediente y fecha debajo, SIAS a la derecha. */}
        <header style={{ display: 'grid', gridTemplateColumns: '22mm 1fr 44mm', gap: '3mm', alignItems: 'start' }}>
          <LogoBebe />
          <div>
            <h1 className="hoja-titulo" style={{ margin: 0 }}>
              FICHA CLÍNICA PARA
              <small>MENOR DE 28 DÍAS</small>
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5mm', width: '78mm', marginTop: '2mm' }}>
              <RecuadroDato rotulo="No. Expediente" valor={paciente.expediente?.numero} />
              <RecuadroDato rotulo="Fecha" valor={diaLocal(ficha.fecha)} />
            </div>
          </div>
          <LogoSias />
        </header>

        {/* Las secciones 1 y 2 van en un mismo recuadro, separadas por una raya. */}
        <Cuadro>
          <div style={{ margin: '-1mm -2mm 0' }}>
            <Barra numero="1." titulo="Identificación del servicio de salud" ancha />
          </div>
          <TipoEstablecimiento
            opciones={['PSF', 'C/S "A"', 'CENAPA', 'C/S "B"', 'CAP', 'CAIMI']}
            marcada={SERVICIO_DE_SALUD.tipo}
            repartidas
          />
          <Fila>
            <Campo rotulo="Nombre del servicio:" valor={SERVICIO_DE_SALUD.nombre} llena />
            <Campo rotulo="Área de Salud" valor={SERVICIO_DE_SALUD.areaDeSalud} llena />
          </Fila>
          <div style={{ borderTop: '0.3mm solid #000', margin: '1mm -2mm 0' }} />
          <Barra numero="2." titulo="Datos generales del paciente" corta />
          <Fila>
            <Campo rotulo="Nombre de la MADRE:" valor={n?.nombreMadre} llena />
            <Campo rotulo="Dirección:" valor={direccion} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Fecha de nacimiento del niño" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={30} />
            <Campo rotulo="edad" valor={dias} sufijo="días" ancho={8} />
            <span>Sexo:</span>
            <Casilla rotulo="F" marcada={paciente.sexo === 'F'} />
            <Casilla rotulo="M" marcada={paciente.sexo === 'M'} />
          </Fila>
          <Fila>
            <span>Población migrante</span>
            <Casilla rotulo="no" marcada={!paciente.migrante} />
            <Casilla rotulo="si" marcada={paciente.migrante} />
            <Campo rotulo="Lugar de origen:" valor={paciente.lugarOrigen} llena />
          </Fila>
          <Fila>
            <Campo rotulo="MOTIVO DE CONSULTA:" valor={ficha.motivo} llena />
          </Fila>
        </Cuadro>

        <p className="hoja-negrita" style={{ margin: '1.5mm 0 0', fontSize: '8.5pt' }}>
          3. ATENCIÓN DE RECIÉN NACIDO EN CONSULTA EXTERNA DE CENTROS DE SALUD
        </p>
        <p className="hoja-negrita" style={{ margin: '0.5mm 0 1mm 4mm' }}>* Subraye los hallazgos que encuentre</p>

        {/* Los tres recuadros de la seccion 3, con sus flechas. */}
        <div style={{ display: 'grid', gridTemplateColumns: '70mm 1fr', gap: '2mm', alignItems: 'start' }}>
          <Cuadro>
            <Barra titulo="Evalué signos de peligro:" corta />
            <div style={{ marginTop: '1mm' }}>
              <SignosPeligroCasillas catalogo={catalogo} ficha={ficha} signos={peligro} columnas={1} />
            </div>
          </Cuadro>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2mm' }}>
            <Flecha centrado>
              <div style={{ paddingRight: '10mm' }}>
                Si presenta alguno de estos problemas, TIENE ENFERMEDAD GRAVE, actúe de acuerdo a capacidad
                resolutiva o refiera INMEDIATAMENTE
              </div>
            </Flecha>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 30mm', gap: '2mm', alignItems: 'stretch' }}>
              <Cuadro>
                <div className="hoja-negrita" style={{ fontSize: '9pt', marginBottom: '0.5mm' }}>
                  EVALUAR INFECCIÓN
                </div>
                <SignosPeligroCasillas
                  catalogo={catalogo}
                  ficha={ficha}
                  signos={infeccion}
                  columnas={1}
                  negrita={false}
                />
              </Cuadro>
              <Flecha>Si tiene capacidad trate o refiera</Flecha>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 30mm', gap: '2mm', alignItems: 'stretch' }}>
              <Cuadro>
                <div className="hoja-negrita" style={{ fontSize: '9pt', marginBottom: '0.5mm' }}>
                  EVALUAR MALFORMACIONES
                </div>
                <SignosPeligroCasillas
                  catalogo={catalogo}
                  ficha={ficha}
                  signos={malformaciones}
                  columnas={1}
                  negrita={false}
                />
              </Cuadro>
              <Flecha>Refiera a donde corresponda</Flecha>
            </div>
          </div>
        </div>
        {ficha.manejoEstabilizacion ? (
          <Fila>
            <Campo rotulo="Manejo y estabilización:" valor={ficha.manejoEstabilizacion} llena />
          </Fila>
        ) : null}

        <div className="hoja-cuadro hoja-cuadro--holgado" style={{ marginTop: '2mm' }}>
          <Fila>
            <Barra numero="4." titulo="Antecedentes maternos y del parto" corta />
            <span className="hoja-negrita hoja-cursiva">
              (Revisar ficha de control prenatal y post parto de la madre)
            </span>
          </Fila>
          <div className="hoja-negrita">Antecedentes Maternos:</div>
          <Fila>
            <span className="hoja-negrita">Médicos:</span>
            {MEDICOS_MATERNOS.map((m) => (
              <AntecedenteMaterno
                key={m.codigo}
                catalogo={catalogo}
                antecedentes={antecedentes}
                codigo={m.codigo}
                rotulo={m.rotulo}
                negrita={m.codigo !== 'MAT_DIABETES'}
              />
            ))}
          </Fila>
          <Fila>
            <AntecedenteMaterno
              catalogo={catalogo}
              antecedentes={antecedentes}
              codigo="MAT_MEDICAMENTO"
              rotulo="Toma o tomó algún medicamento:"
            />
          </Fila>
          <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MAT_OTRO" rotulo="Otro antecedente" />
          <Fila>
            <span className="hoja-negrita">Hábitos:</span>
            {HABITOS_MATERNOS.map((h) => (
              <AntecedenteMaterno
                key={h.codigo}
                catalogo={catalogo}
                antecedentes={antecedentes}
                codigo={h.codigo}
                rotulo={h.rotulo}
              />
            ))}
          </Fila>
          <div className="hoja-negrita">
            <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MAT_QUIRURGICOS" rotulo="Quirurgicos:" />
          </div>
          <AntecedentesRestantes catalogo={catalogo} antecedentes={antecedentes} colocados={COLOCADOS} />

          <div className="hoja-negrita" style={{ marginTop: '1mm' }}>
            Antecedentes del Parto:
          </div>
          <Fila>
            <Campo rotulo="Peso al nacer" valor={n?.pesoNacerLibras} sufijo="Lb." ancho={8} />
            <Campo valor={n?.pesoNacerOnzas} sufijo="Onz." ancho={8} />
            <span>
              <SiNo rotulo="Lloró rápido y fuerte al nacer" valor={n?.lloroAlNacer} />,
            </span>
            <span>
              <SiNo rotulo="Nació cianótico:" valor={n?.nacioCianotico} />,
            </span>
          </Fila>
          <Fila>
            <Campo rotulo="Cuantas horas duró el trabajo de parto" valor={n?.horasTrabajoParto} sufijo="horas" ancho={16} />
          </Fila>
          <Fila>
            <span>¿Quién atendió el parto?</span>
            <span style={{ display: 'inline-flex', gap: '1mm' }}>
              {QUIEN_ATENDIO.map((q) => (
                <MarcaEnRaya key={q} rotulo={q} marcada={n?.quienAtendioParto === q} ancho={6} />
              ))}
              <MarcaEnRaya rotulo="Otro" marcada={n?.quienAtendioParto === 'OTRO'} ancho={6} />
              <Campo valor={n?.quienAtendioPartoOtro} ancho={18} />
            </span>
          </Fila>
          <Fila>
            <span>Complicaciones durante el embarazo:</span>
            <span>
              <Casilla rotulo="Ruptura prematura de membranas" marcada={n?.rupturaPrematuraMembranas === true} />,
            </span>
            <span>
              <Casilla rotulo="Trabajo de Parto Prematuro" marcada={n?.trabajoPartoPrematuro === true} />,
            </span>
          </Fila>
          <Fila>
            <Casilla rotulo="Parto prolongado" marcada={n?.partoProlongado === true} />
          </Fila>
          <Fila>
            <span>Tipo de parto:</span>
            {TIPOS_DE_PARTO.map((t) => (
              <span key={t.clave}>
                <Casilla rotulo={t.texto} marcada={n?.tipoParto === t.clave} />,
              </span>
            ))}
          </Fila>
          <Fila>
            <span className="hoja-negrita">
              <SiNo rotulo="BCG:" valor={n?.bcg} />
            </span>
            <span className="hoja-sino">
              <span className="hoja-negrita">Td en la madre:</span>
              <Casilla rotulo="SI" marcada={n?.tdMadre === true} />
              <Campo rotulo="# de dosis:" valor={n?.tdMadreDosis} ancho={18} />
              <span>
                , <Casilla rotulo="NO" marcada={n?.tdMadre === false} />
              </span>
            </span>
          </Fila>
          <Fila>
            <span className="hoja-negrita">Prácticas de alimentación:</span>
            <span className="hoja-sino">
              <span>Lactancia Materna Exclusiva</span>
              <Casilla rotulo="SI" marcada={n?.lactanciaMaternaExclusiva === true} />
              <span>bien,</span>
              <Casilla rotulo="NO" marcada={n?.lactanciaMaternaExclusiva === false} />
              <span>= investigue y oriente</span>
            </span>
          </Fila>
        </div>
      </Pliego>

      <Pliego etiqueta="Ficha clínica para menor de 28 días, hoja 2">
        <Cuadro>
          <Fila>
            <Barra numero="5." titulo="Examen físico" corta />
            <span className="hoja-negrita" style={{ fontSize: '8.5pt' }}>
              O EVALUACIÓN
            </span>
          </Fila>
          <Fila>
            <span className="hoja-negrita">SIGNOS VITALES:</span>
            <Campo rotulo="Temperatura" valor={ficha.temperaturaC} sufijo="°C," ancho={14} />
            <Campo rotulo="Peso:" valor={n?.pesoLibras} sufijo="Lb." ancho={14} />
            <Campo valor={n?.pesoOnzas} sufijo="Onz." ancho={14} />
            <Campo rotulo="FC:" valor={ficha.pulso} sufijo="X min." ancho={14} />
          </Fila>
          <Fila>
            <Campo rotulo="Respiraciones:" valor={ficha.respiraciones} sufijo="X min." ancho={14} />
            <Campo rotulo="Talla:" valor={ficha.tallaCm} sufijo="cm.," ancho={14} />
            <Campo rotulo="Perímetro braquial" valor={n?.perimetroBraquialCm} sufijo="cm." ancho={14} />
            <Campo rotulo="CC" valor={n?.circunferenciaCefalicaCm} sufijo="cm." ancho={10} />
          </Fila>
        </Cuadro>

        <Barra numero="6." titulo="Revisión de problemas" corta />
        <MatrizProblemas
          catalogo={catalogo}
          ficha={ficha}
          conductaPorFila
          sino="rayas"
          opcionesEnLineas
          filasSinSiNo={['VIH-SIDA']}
          anchos={{ problema: 26, clasificar: 56, conducta: 50 }}
          altoFila={11}
          encabezados={{
            problema: 'PROBLEMAS A REVISAR',
            evaluar: (
              <>
                INVESTIGUE
                <br />
                (pregunte y observe)
              </>
            ),
            clasificar: (
              <>
                DIAGNÓSTICO /<br />
                CLASIFIQUE
                <br />
                (subraye el diagnóstico)
              </>
            ),
            conducta: (
              <>
                TRATAMIENTO
                <br />
                (indique medicamento, dosis y días de tratamiento)
              </>
            ),
          }}
        />

        {ficha.medicamentos.length > 0 ? (
          <Fila>
            <Campo
              rotulo="Medicamentos:"
              valor={ficha.medicamentos
                .map((m) => m.nombre + (m.dosis ? ' — ' + m.dosis : '') + (m.dias ? ' — ' + m.dias + ' días' : ''))
                .join('; ')}
              llena
            />
          </Fila>
        ) : null}
        {ficha.referencia ? (
          <Fila>
            <Campo rotulo="Referencia a:" valor={ficha.referencia} llena />
          </Fila>
        ) : null}

        <div style={{ marginTop: '3mm' }}>
          <TablaConsejeria catalogo={catalogo} ficha={ficha} />
        </div>
        {ficha.consejeria ? (
          <Fila>
            <Campo rotulo="Consejería:" valor={ficha.consejeria} llena />
          </Fila>
        ) : null}

        <div style={{ marginLeft: '30%', marginTop: '8mm' }}>
          <Firma rotulo="Nombre de la persona que atendió" />
        </div>
      </Pliego>
    </>
  );
}
