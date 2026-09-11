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
  Encabezado,
  EmblemaDrpap,
  EmblemaSias,
  Fila,
  Firma,
  Pliego,
  SiNo,
  TipoEstablecimiento,
  diaLocal,
  diasEntre,
  fechaConBarras,
} from './Hoja';

const QUIEN_ATENDIO = ['MD', 'EP', 'AE', 'CT'] as const;

/** Los antecedentes maternos, en el orden y las filas del papel. */
const MEDICOS_MATERNOS = ['MAT_DIABETES', 'MAT_HIPERTENSION', 'MAT_TB', 'MAT_ITS', 'MAT_VIH_SIDA'];
const HABITOS_MATERNOS = ['MAT_FUMA', 'MAT_ALCOHOL', 'MAT_DROGAS'];
const COLOCADOS = [...MEDICOS_MATERNOS, 'MAT_MEDICAMENTO', 'MAT_OTRO', ...HABITOS_MATERNOS, 'MAT_QUIRURGICOS'];
const TIPOS_DE_PARTO: { clave: string; texto: string }[] = [
  { clave: 'NORMAL', texto: 'Normal' },
  { clave: 'CESAREA', texto: 'Cesárea' },
  { clave: 'FORCEPS', texto: 'Distócico = Fórceps' },
  { clave: 'PODALICA', texto: 'Podálica' },
];

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

  return (
    <>
      <Pliego etiqueta="Ficha clínica para menor de 28 días, hoja 1">
        <Encabezado
          titulo="FICHA CLÍNICA PARA"
          subtitulo="MENOR DE 28 DÍAS"
          numeroExpediente={paciente.expediente?.numero}
          fecha={diaLocal(ficha.fecha)}
          emblemaIzquierdo={<EmblemaSias />}
          emblemaDerecho={<EmblemaDrpap />}
        />

        <Barra numero="1." titulo="Identificación del servicio de salud" ancha />
        <Cuadro>
          <TipoEstablecimiento
            opciones={['PSF', 'C/S "A"', 'CENAPA', 'C/S "B"', 'CAP', 'CAIMI']}
            marcada={SERVICIO_DE_SALUD.tipo}
          />
          <Fila>
            <Campo rotulo="Nombre del servicio:" valor={SERVICIO_DE_SALUD.nombre} llena />
            <Campo rotulo="Área de Salud" valor={SERVICIO_DE_SALUD.areaDeSalud} llena />
          </Fila>
        </Cuadro>

        <Barra numero="2." titulo="Datos generales del paciente" corta />
        <Cuadro>
          <Fila>
            <Campo rotulo="Nombre de la MADRE:" valor={n?.nombreMadre} llena />
            <Campo rotulo="Dirección:" valor={direccion} llena />
          </Fila>
          <Fila>
            <Campo rotulo="Fecha de nacimiento del niño" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={22} />
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

        <p className="hoja-negrita" style={{ margin: '2mm 0 0.5mm', fontSize: '8.5pt' }}>
          3. ATENCIÓN DE RECIÉN NACIDO EN CONSULTA EXTERNA DE CENTROS DE SALUD
        </p>
        <p className="hoja-nota hoja-negrita" style={{ margin: '0 0 1mm' }}>
          * Subraye los hallazgos que encuentre
        </p>
        <Cuadro>
          <Barra titulo="Evalué signos de peligro:" corta />
          <div style={{ marginTop: '1mm' }}>
            <SignosPeligroCasillas catalogo={catalogo} ficha={ficha} />
          </div>
          <p className="hoja-nota hoja-negrita" style={{ margin: '1.5mm 0 0', textAlign: 'center' }}>
            Si presenta alguno de estos problemas, TIENE ENFERMEDAD GRAVE, actúe de acuerdo a capacidad
            resolutiva o refiera INMEDIATAMENTE
          </p>
          {ficha.manejoEstabilizacion ? (
            <Fila>
              <Campo rotulo="Manejo y estabilización:" valor={ficha.manejoEstabilizacion} llena />
            </Fila>
          ) : null}
        </Cuadro>

        <Barra
          numero="4."
          titulo="Antecedentes maternos y del parto"
          nota="(Revisar ficha de control prenatal y post parto de la madre)"
          ancha
        />
        <Cuadro>
          <div className="hoja-negrita">Antecedentes Maternos:</div>
          <Fila>
            <span className="hoja-negrita">Médicos:</span>
            {MEDICOS_MATERNOS.map((c) => (
              <SiNoAntecedente key={c} catalogo={catalogo} antecedentes={antecedentes} codigo={c} />
            ))}
          </Fila>
          <Fila>
            <SiNoAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MAT_MEDICAMENTO" />
          </Fila>
          <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MAT_OTRO" rotulo="Otro antecedente" />
          <Fila>
            <span className="hoja-negrita">Hábitos:</span>
            {HABITOS_MATERNOS.map((c) => (
              <SiNoAntecedente key={c} catalogo={catalogo} antecedentes={antecedentes} codigo={c} />
            ))}
          </Fila>
          <LineaAntecedente catalogo={catalogo} antecedentes={antecedentes} codigo="MAT_QUIRURGICOS" rotulo="Quirúrgicos:" />
          <AntecedentesRestantes catalogo={catalogo} antecedentes={antecedentes} colocados={COLOCADOS} />

          <div className="hoja-negrita" style={{ marginTop: '1mm' }}>
            Antecedentes del Parto:
          </div>
          <Fila>
            <Campo rotulo="Peso al nacer" valor={n?.pesoNacerLibras} sufijo="Lb." ancho={8} />
            <Campo valor={n?.pesoNacerOnzas} sufijo="Onz." ancho={8} />
            <SiNo rotulo="Lloró rápido y fuerte al nacer" valor={n?.lloroAlNacer} />
            <SiNo rotulo="Nació cianótico:" valor={n?.nacioCianotico} />
          </Fila>
          <Fila>
            <Campo rotulo="Cuantas horas duró el trabajo de parto" valor={n?.horasTrabajoParto} sufijo="horas" ancho={10} />
          </Fila>
          <Fila>
            <span>¿Quién atendió el parto?</span>
            {QUIEN_ATENDIO.map((q) => (
              <Casilla key={q} rotulo={q} marcada={n?.quienAtendioParto === q} />
            ))}
            <Casilla rotulo="Otro" marcada={n?.quienAtendioParto === 'OTRO'} />
            <Campo valor={n?.quienAtendioPartoOtro} ancho={20} />
          </Fila>
          <Fila>
            <span>Complicaciones durante el embarazo:</span>
            <Casilla rotulo="Ruptura prematura de membranas" marcada={n?.rupturaPrematuraMembranas === true} />
            <Casilla rotulo="Trabajo de Parto Prematuro" marcada={n?.trabajoPartoPrematuro === true} />
            <Casilla rotulo="Parto prolongado" marcada={n?.partoProlongado === true} />
          </Fila>
          <Fila>
            <span>Tipo de parto:</span>
            {TIPOS_DE_PARTO.map((t) => (
              <Casilla key={t.clave} rotulo={t.texto} marcada={n?.tipoParto === t.clave} />
            ))}
          </Fila>
          <Fila>
            <SiNo rotulo="BCG:" valor={n?.bcg} />
            <SiNo rotulo="Td en la madre:" valor={n?.tdMadre} />
            <Campo rotulo="# de dosis:" valor={n?.tdMadreDosis} ancho={8} />
          </Fila>
          <Fila>
            <span className="hoja-negrita">Prácticas de alimentación:</span>
            <SiNo rotulo="Lactancia Materna Exclusiva" valor={n?.lactanciaMaternaExclusiva} />
            <span className="hoja-nota">SI = bien, NO = investigue y oriente</span>
          </Fila>
        </Cuadro>
      </Pliego>

      <Pliego etiqueta="Ficha clínica para menor de 28 días, hoja 2">
        <Fila>
          <Barra numero="5." titulo="Examen físico" corta />
          <span className="hoja-negrita">O EVALUACIÓN</span>
        </Fila>
        <Cuadro>
          <Fila>
            <span className="hoja-negrita">SIGNOS VITALES:</span>
            <Campo rotulo="Temperatura" valor={ficha.temperaturaC} sufijo="°C," ancho={10} />
            <Campo rotulo="Peso:" valor={n?.pesoLibras} sufijo="Lb." ancho={8} />
            <Campo valor={n?.pesoOnzas} sufijo="Onz." ancho={8} />
            <Campo rotulo="FC:" valor={ficha.pulso} sufijo="X min" ancho={10} />
          </Fila>
          <Fila>
            <Campo rotulo="Respiraciones:" valor={ficha.respiraciones} sufijo="X min." ancho={10} />
            <Campo rotulo="Talla:" valor={ficha.tallaCm} sufijo="cm.," ancho={10} />
            <Campo rotulo="Perímetro braquial" valor={n?.perimetroBraquialCm} sufijo="cm." ancho={10} />
            <Campo rotulo="CC" valor={n?.circunferenciaCefalicaCm} sufijo="cm." ancho={10} />
          </Fila>
        </Cuadro>

        <Barra numero="6." titulo="Revisión de problemas" corta />
        <MatrizProblemas
          catalogo={catalogo}
          ficha={ficha}
          conductaPorFila
          encabezados={{
            problema: 'PROBLEMAS A REVISAR',
            evaluar: (
              <>
                INVESTIGUE<small>(pregunte y observe)</small>
              </>
            ),
            clasificar: (
              <>
                DIAGNÓSTICO / CLASIFIQUE<small>(subraye el diagnóstico)</small>
              </>
            ),
            conducta: (
              <>
                TRATAMIENTO<small>(indique medicamento, dosis y días de tratamiento)</small>
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

        <div style={{ marginTop: '2mm' }}>
          <TablaConsejeria catalogo={catalogo} ficha={ficha} />
        </div>
        {ficha.consejeria ? (
          <Fila>
            <Campo rotulo="Consejería:" valor={ficha.consejeria} llena />
          </Fila>
        ) : null}

        <Firma rotulo="Nombre de la persona que atendió" />
      </Pliego>
    </>
  );
}
