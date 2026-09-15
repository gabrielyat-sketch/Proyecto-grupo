import type { CSSProperties, ReactNode } from 'react';
import type { AntecedentesPaciente, CatalogoFicha } from '../servicio-fichas';
import { AntecedentesRestantes, BloqueConTitulo } from './Bloques';
import { Campo, Casilla, Fila, fechaConBarras } from './Hoja';

/**
 * La seccion VII de la hoja de adultos, renglon por renglon como el papel.
 *
 * No se reparte el catalogo en columnas: cada antecedente esta escrito en la
 * fila y la columna donde lo imprime el MSPAS, y las casillas de SI y NO de
 * cada columna forman su propia columna. Lo que el papel pone en un renglon
 * cruzado —«Cual: ____», «# dosis ___ Fecha de ultima dosis __/__/__ SR SI
 * NO No aplica»— va en un renglon cruzado. Es mas codigo que una lista, y es
 * lo que hace que la hoja se lea igual que la que se llena a mano.
 */

const METODOS_PF = ['Pildora', 'Inyeccion', 'Condon', 'T de cobre', 'AQV', 'Otro'] as const;
const ROTULO_METODO: Record<(typeof METODOS_PF)[number], string> = {
  Pildora: 'Píldora:',
  Inyeccion: 'Inyección:',
  Condon: 'Condón:',
  'T de cobre': 'T de cobre:',
  AQV: 'AQV:',
  Otro: 'Otro:',
};

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Una cuadricula de la seccion: pares [texto, casillas] alineados por columna. */
function Cuadricula({ columnas, children }: { columnas: string; children: ReactNode }) {
  const estilo: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: columnas,
    columnGap: '2mm',
    rowGap: '0.5mm',
    alignItems: 'baseline',
    alignContent: 'start',
  };
  return <div style={estilo}>{children}</div>;
}

/** Un elemento que ocupa varias columnas de la cuadricula. */
function Cruzado({ desde, hasta = -1, children }: { desde: number; hasta?: number; children: ReactNode }) {
  return (
    <div className="hoja-fila" style={{ gridColumn: desde + ' / ' + hasta, margin: 0, gap: '1mm 3mm' }}>
      {children}
    </div>
  );
}

export function AntecedentesAdulto({
  catalogo,
  antecedentes,
}: {
  catalogo: CatalogoFicha;
  antecedentes: AntecedentesPaciente | null;
}) {
  const fila = (codigo: string) => catalogo.antecedentes.find((a) => a.codigo === codigo) ?? null;
  const marcado = (codigo: string) => {
    const a = fila(codigo);
    return a ? (antecedentes?.marcados.find((m) => m.antecedenteId === a.id) ?? null) : null;
  };
  const valor = (codigo: string): boolean | null => {
    const r = marcado(codigo);
    return r === null ? null : r.respuesta === 'SI' ? true : r.respuesta === 'NO' ? false : null;
  };

  /** «Texto:» y sus dos casillas, como dos celdas de la cuadricula. */
  const SN = ({ codigo, texto }: { codigo: string; texto: string }) => {
    const v = valor(codigo);
    return (
      <>
        <span>{texto}</span>
        <span className="hoja-sino" role="group" aria-label={texto.replace(/:$/, '')}>
          <Casilla marcada={v === true} rotulo="SI" />
          <Casilla marcada={v === false} rotulo="NO" />
        </span>
      </>
    );
  };
  /** Lo mismo pero en linea, para los renglones cruzados. */
  const SNL = ({ codigo, texto }: { codigo: string; texto: string }) => {
    const v = valor(codigo);
    return (
      <span className="hoja-sino" role="group" aria-label={texto.replace(/:$/, '')}>
        <span>{texto}</span>
        <Casilla marcada={v === true} rotulo="SI" />
        <Casilla marcada={v === false} rotulo="NO" />
      </span>
    );
  };
  const vacio = <span />;

  const o = antecedentes?.obstetricos ?? null;
  const metodo = o?.metodoPlanificacion ? normalizar(o.metodoPlanificacion) : null;
  const td = marcado('MED_VACUNA_TD');
  const sr = marcado('MED_SR');
  const otroFamiliar = marcado('FAM_OTRO');
  const fuma = marcado('HAB_FUMA');

  const colocados = [
    'MED_ASMA', 'MED_CARDIOPATIA', 'MED_ITS', 'MED_INF_URINARIAS', 'MED_MEDICAMENTOS', 'MED_PSICOSOCIAL',
    'MED_VIOLENCIA_GENERO', 'MED_VACUNA_TD', 'MED_DIABETES', 'MED_CANCER', 'MED_NEUROPATIA', 'MED_DESNUTRICION',
    'MED_VIOLENCIA_INTRAFAMILIAR', 'MED_CONDUCTAS_ANORMALES', 'MED_HIPERTENSION', 'MED_TB', 'MED_CHAGAS', 'MED_SR',
    'FAM_DIABETES', 'FAM_TUBERCULOSIS', 'FAM_HTA', 'FAM_NEFROPATIA', 'FAM_CANCER', 'FAM_OTRO',
    'HAB_FUMA', 'HAB_ALCOHOL', 'HAB_DROGAS', 'HAB_MULTIPLES_PAREJAS', 'HAB_CONDON',
    'HAB_ACTIVIDAD_MENOS_60', 'HAB_ACTIVIDAD_60_149', 'HAB_ACTIVIDAD_MAS_150', 'HAB_FRUTAS_VERDURAS',
  ];

  return (
    <>
      <BloqueConTitulo titulo="MÉDICOS">
        {/* Tres pares texto/casillas; las filas 5 a 8 cruzan desde la segunda columna. */}
        <Cuadricula columnas="max-content auto minmax(0, 1fr) auto max-content auto">
          <SN codigo="MED_ASMA" texto="Asma bronquial:" />
          <SN codigo="MED_DIABETES" texto="Diabetes:" />
          <SN codigo="MED_HIPERTENSION" texto="Hipertensión arterial:" />

          <SN codigo="MED_CARDIOPATIA" texto="Cardiopatía:" />
          <SN codigo="MED_CANCER" texto="Cáncer:" />
          <SN codigo="MED_TB" texto="Tb:" />

          <SN codigo="MED_ITS" texto="ITS:" />
          <SN codigo="MED_NEUROPATIA" texto="Neuropatía:" />
          <SN codigo="MED_CHAGAS" texto="Chagas:" />

          <SN codigo="MED_INF_URINARIAS" texto="Infecciones Urinarias:" />
          <SN codigo="MED_DESNUTRICION" texto="Desnutrición:" />
          {vacio}
          {vacio}

          <SN codigo="MED_MEDICAMENTOS" texto="Toma medicamentos:" />
          <Cruzado desde={3}>
            <Campo rotulo="Cuál:" valor={marcado('MED_MEDICAMENTOS')?.detalle} llena />
          </Cruzado>

          <SN codigo="MED_PSICOSOCIAL" texto="Trastorno Psico social:" />
          <Cruzado desde={3}>
            <SNL codigo="MED_VIOLENCIA_INTRAFAMILIAR" texto="Violencia intrafamiliar:" />
          </Cruzado>

          <SN codigo="MED_VIOLENCIA_GENERO" texto="Violencia basada en género:" />
          <Cruzado desde={3}>
            <SNL codigo="MED_CONDUCTAS_ANORMALES" texto="Conductas anormales (suicidas, alimentarias, etc.):" />
          </Cruzado>

          <SN codigo="MED_VACUNA_TD" texto="Antecedente de vacuna Td:" />
          <Cruzado desde={3}>
            <Campo rotulo="# dosis:" valor={td?.numero} ancho={14} />
            <Campo rotulo="Fecha de última dosis:" valor={td?.fecha ? fechaConBarras(td.fecha) : null} ancho={22} />
            <SNL codigo="MED_SR" texto="SR" />
            <Casilla rotulo="No aplica" marcada={sr?.respuesta === 'NO_APLICA'} />
          </Cruzado>
        </Cuadricula>
      </BloqueConTitulo>

      <BloqueConTitulo titulo="GINECO/OBSTÉTRICOS">
        <Fila>
          <Campo rotulo="FUR:" valor={o?.fur ? fechaConBarras(o.fur) : null} ancho={22} />
          <Campo rotulo="# Gestas:" valor={o?.gestas} ancho={12} />
          <Campo rotulo="Partos:" valor={o?.partos} ancho={12} />
          <Campo rotulo="AB:" valor={o?.abortos} ancho={12} />
          <Campo rotulo="Detección de cáncer de cérvix:" valor={null} ancho={20} />
        </Fila>
        <Fila>
          <Casilla rotulo="Papanicolau" marcada={o?.tamizajeCervix === 'PAPANICOLAU'} />
          <Casilla rotulo="IVAA" marcada={o?.tamizajeCervix === 'IVAA'} />
          <Campo rotulo="Fecha:" valor={o?.tamizajeFecha ? fechaConBarras(o.tamizajeFecha) : null} ancho={24} />
          <span className="hoja-sino" role="group" aria-label="Resultado Normal">
            <span>Resultado Normal:</span>
            <Casilla marcada={o?.tamizajeNormal === true} rotulo="SI" />
            <Casilla marcada={o?.tamizajeNormal === false} rotulo="NO" />
          </span>
        </Fila>
        <div className="hoja-fila hoja-fila--sin-envolver" style={{ gap: '1mm 2.5mm' }}>
          <span className="hoja-sino" role="group" aria-label="Planificación Familiar">
            <span>Utiliza o ha utilizado algún método de Planificación Familiar:</span>
            <Casilla marcada={o?.usaPlanificacion === true} rotulo="SI" />
            <Casilla marcada={o?.usaPlanificacion === false} rotulo="NO" />
          </span>
          {METODOS_PF.map((m) => (
            <Casilla key={m} rotulo={ROTULO_METODO[m]} marcada={metodo === normalizar(m)} />
          ))}
        </div>
        <Fila>
          <Campo rotulo="Tipo de Sangre: Grupo" valor={o?.tipoSangre} ancho={12} />
          <Casilla rotulo="RH (+)" marcada={o?.rhPositivo === true} rotuloDespues />
          <Casilla rotulo="RH (-)" marcada={o?.rhPositivo === false} rotuloDespues />
        </Fila>
      </BloqueConTitulo>

      <BloqueConTitulo titulo="QUIRÚRGICOS">
        <Fila>
          <Campo rotulo="Anote" valor={null} llena />
        </Fila>
      </BloqueConTitulo>

      <BloqueConTitulo titulo="FAMILIARES">
        <Cuadricula columnas="max-content auto minmax(0, 1fr) auto max-content auto minmax(0, 1fr)">
          <SN codigo="FAM_DIABETES" texto="Diabetes" />
          <SN codigo="FAM_HTA" texto="HTA:" />
          <SN codigo="FAM_CANCER" texto="Cáncer:" />
          {vacio}

          <SN codigo="FAM_TUBERCULOSIS" texto="Tuberculosis" />
          <SN codigo="FAM_NEFROPATIA" texto="Nefropatía:" />
          <SN codigo="FAM_OTRO" texto="Otro:" />
          <Campo rotulo="Especificar:" valor={otroFamiliar?.detalle} llena />
        </Cuadricula>
      </BloqueConTitulo>

      <BloqueConTitulo titulo="HÁBITOS">
        <Cuadricula columnas="minmax(0, 1fr) auto minmax(0, 1.12fr) auto">
          <Cruzado desde={1} hasta={3}>
            <SNL codigo="HAB_FUMA" texto="Fuma:" />
            <Campo rotulo="# al día" valor={fuma?.numero} ancho={16} />
          </Cruzado>
          <div style={{ gridColumn: '3 / -1', display: 'flex', justifyContent: 'space-between', gap: '2mm', whiteSpace: 'nowrap', minWidth: 0 }}>
            <SNL codigo="HAB_ALCOHOL" texto="Ingiere bebidas alcohólicas:" />
            <SNL codigo="HAB_DROGAS" texto="Consumo de drogas:" />
          </div>

          <SN codigo="HAB_MULTIPLES_PAREJAS" texto="Múltiples parejas sexuales (más de 1 pareja en los últimos tres meses)" />
          <SN codigo="HAB_CONDON" texto="Usa condón en las relaciones sexuales:" />

          <SN codigo="HAB_ACTIVIDAD_MENOS_60" texto="Realiza actividad física: Menos de 60 minutos/semana" />
          <SN codigo="HAB_ACTIVIDAD_60_149" texto="De 60-149 minutos/semana:" />

          <SN codigo="HAB_ACTIVIDAD_MAS_150" texto="Más de 150 minutos/semana" />
          <SN codigo="HAB_FRUTAS_VERDURAS" texto="Consume 5 porciones diarias de frutas y verduras:" />
        </Cuadricula>
      </BloqueConTitulo>

      <AntecedentesRestantes catalogo={catalogo} antecedentes={antecedentes} colocados={colocados} />
    </>
  );
}
