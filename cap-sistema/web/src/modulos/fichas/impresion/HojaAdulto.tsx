import type { Ficha } from '../../expedientes/servicio-expedientes';
import { presion } from '../../expedientes/servicio-expedientes';
import type { AntecedentesPaciente, CatalogoFicha, Paciente } from '../servicio-fichas';
import { SERVICIO_DE_SALUD } from '../servicio-fichas';
import { ColumnaConducta, MatrizProblemas, SignosPeligroSiNo } from './Bloques';
import { AntecedentesAdulto } from './AntecedentesAdulto';
import {
  Barra,
  Campo,
  Casilla,
  Cuadro,
  Encabezado,
  Fila,
  Firma,
  LogoDrpap,
  LogoSias,
  Pliego,
  Renglones,
  SiNo,
  TipoEstablecimiento,
  cmAMetros,
  diaLocal,
  fechaConBarras,
  kgALibras,
} from './Hoja';

/**
 * La ficha clinica de adolescente, adulto y adulto mayor: dos hojas.
 *
 * Sigue el papel seccion por seccion, con sus numerales romanos, para que
 * quien la reciba impresa la lea igual que las que se llenan a mano. Lo que
 * el sistema no captura —ocupacion, nombre del responsable, quirurgicos— sale
 * con su raya en blanco, como en el original, y no se inventa.
 */
export function HojaAdulto({
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
  const nombre = paciente.nombres + ' ' + paciente.apellidos;
  const direccion = [paciente.lugar?.nombre, paciente.comunidad?.nombre].filter(Boolean).join(', ');

  return (
    <>
      <Pliego etiqueta="Ficha clínica, hoja 1">
        <Encabezado
          titulo="FICHA CLÍNICA"
          subtitulo="ADOLESCENTE, ADULTO Y ADULTO MAYOR"
          numeroExpediente={paciente.expediente?.numero}
          fecha={diaLocal(ficha.fecha)}
          emblemaIzquierdo={<LogoDrpap />}
          emblemaDerecho={<LogoSias />}
        />

        <Barra numero="I." titulo="Identificación del establecimiento de salud" />
        <Cuadro>
          <TipoEstablecimiento
            opciones={['PS', 'PSF', 'C/S "B"', 'CENAPA', 'C/S "A"', 'CAP', 'CAIMI', 'CUM', 'HOSPITAL']}
            marcada={SERVICIO_DE_SALUD.tipo}
          />
          <Fila>
            <Campo rotulo="Nombre del distrito:" valor={SERVICIO_DE_SALUD.distrito} llena />
            <Campo rotulo="Área de Salud:" valor={SERVICIO_DE_SALUD.areaDeSalud} llena />
          </Fila>
        </Cuadro>

        <Barra numero="II." titulo="Datos generales del paciente" />
        <Cuadro>
          <Fila>
            <Campo rotulo="Nombre:" valor={nombre} llena />
            <Campo rotulo="Edad:" valor={paciente.edad} sufijo="años" ancho={8} />
            <Campo rotulo="Fecha de nacimiento:" valor={fechaConBarras(paciente.fechaNacimiento)} ancho={22} />
          </Fila>
          <Fila>
            <Campo rotulo="Nombre de la madre o responsable:" valor={null} llena />
            <Campo rotulo="Tel:" valor={paciente.telefono} ancho={24} />
          </Fila>
          <Fila>
            <Campo rotulo="Dirección:" valor={direccion} llena />
          </Fila>
          <Fila>
            <span>Sexo:</span>
            <Casilla rotulo="F" marcada={paciente.sexo === 'F'} />
            <Casilla rotulo="M" marcada={paciente.sexo === 'M'} />
            <SiNo rotulo="Migrante:" valor={paciente.migrante} />
            {paciente.migrante && paciente.lugarOrigen ? (
              <Campo rotulo="Lugar:" valor={paciente.lugarOrigen} ancho={20} />
            ) : null}
            <Campo rotulo="Ocupación:" valor={null} llena />
          </Fila>
        </Cuadro>

        <Barra numero="III." titulo="Evalúe signos y síntomas del peligro" />
        <Cuadro>
          <p className="hoja-nota hoja-negrita" style={{ margin: '0 0 1mm' }}>
            Marque en los cuadros correspondientes de SI o NO lo encontrado en la evaluación. (De
            acuerdo al nivel de resolución, trate o refiera)
          </p>
          <SignosPeligroSiNo catalogo={catalogo} ficha={ficha} />
        </Cuadro>

        <Barra numero="IV." titulo="Registre manejo y estabilización del paciente referido" />
        <Cuadro>
          <Renglones texto={ficha.manejoEstabilizacion} minimo={3} />
        </Cuadro>

        <Barra numero="V." titulo="Motivo de la consulta" />
        <Cuadro>
          <Renglones texto={ficha.motivo} minimo={1} />
        </Cuadro>

        <Barra numero="VI." titulo="Historia de la enfermedad actual:" />
        <Cuadro>
          <Renglones texto={ficha.historiaEnfermedad} minimo={4} />
        </Cuadro>

        <Barra numero="VII." titulo="Antecedentes" nota="(Marque con una “X” o complete la información solicitada)" />
        <Cuadro>
          <AntecedentesAdulto catalogo={catalogo} antecedentes={antecedentes} />
        </Cuadro>

        <Barra numero="VIII." titulo="Examen físico" />
        <Cuadro>
          <Fila sinEnvolver>
            <span className="hoja-negrita">SIGNOS VITALES:</span>
            <Campo rotulo="Temperatura:" valor={ficha.temperaturaC} sufijo="°C" ancho={10} />
            <Campo
              rotulo="P/A"
              valor={presion(ficha.presionSistolica, ficha.presionDiastolica)}
              sufijo="mmHg"
              ancho={14}
            />
            <Campo rotulo="Pulso" valor={ficha.pulso} sufijo="x min." ancho={10} />
            <Campo rotulo="Respiraciones" valor={ficha.respiraciones} sufijo="x min." ancho={10} />
          </Fila>
          <Fila sinEnvolver>
            <span className="hoja-negrita">ANTROPOMETRÍA:</span>
            <Campo rotulo="Peso" valor={kgALibras(ficha.pesoKg)} sufijo="Lb." ancho={9} />
            <Campo rotulo="Talla" valor={cmAMetros(ficha.tallaCm)} sufijo="mt." ancho={9} />
            <Campo
              rotulo="IMC (Índice de masa corporal)"
              valor={ficha.imc !== null ? ficha.imc.toFixed(2) : null}
              ancho={9}
            />
            <Campo rotulo="Circunferencia de cintura" valor={ficha.circunferenciaCinturaCm} sufijo="cms." ancho={9} />
          </Fila>
        </Cuadro>
      </Pliego>

      <Pliego etiqueta="Ficha clínica, hoja 2">
        <Barra numero="IX." titulo="Revisión de problemas" />
        <MatrizProblemas
          catalogo={catalogo}
          ficha={ficha}
          encabezados={{
            problema: 'PROBLEMAS A INVESTIGAR',
            evaluar: (
              <>
                EVALUAR<small>(Pregunte y observe. Subraye los signos encontrados)</small>
              </>
            ),
            clasificar: (
              <>
                DIAGNOSTICAR/ CLASIFICAR<small>(Subraye el diagnóstico o clasificación)</small>
              </>
            ),
            conducta: (
              <>
                CONDUCTA/ TRATAMIENTO
                <small>(Indique medicamento, dosis y días de tratamiento; Referencia)</small>
              </>
            ),
          }}
          columnaConducta={<ColumnaConducta ficha={ficha} />}
        />

        {ficha.diagnostico ? (
          <Fila>
            <Campo rotulo="Diagnóstico:" valor={ficha.diagnostico} llena />
          </Fila>
        ) : null}

        <Barra numero="X." titulo="Consejería" />
        <Cuadro>
          <Renglones texto={ficha.consejeria} minimo={1} />
        </Cuadro>

        <Fila>
          <span className="hoja-barra hoja-barra--corta" style={{ marginTop: 0 }}>
            TRATAMIENTO:
          </span>
          <span className="hoja-nota">
            Puede apoyarse con medicina Popular Tradicional de las Normas de atención.
          </span>
        </Fila>
        {ficha.tratamiento ? (
          <Fila>
            <Campo valor={ficha.tratamiento} llena />
          </Fila>
        ) : null}
        {ficha.notas ? (
          <Fila>
            <Campo rotulo="Notas:" valor={ficha.notas} llena />
          </Fila>
        ) : null}

        <Firma />
      </Pliego>
    </>
  );
}
