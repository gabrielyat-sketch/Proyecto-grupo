import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { AvisoError } from '../../componentes/AvisoError';
import { fechaCorta } from '../farmacia/servicio-farmacia';
import {
  imcDe,
  NOMBRE_FICHA,
  obtenerFicha,
  presion,
  type Atencion,
} from './servicio-expedientes';

const fechaLarga = (valor: string) =>
  new Date(valor).toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const hora = (valor: string) =>
  new Date(valor).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

/**
 * Una atencion del historial.
 *
 * Los signos vitales van SIEMPRE a la vista, no escondidos tras un despliegue.
 * Un expediente de papel se hojea y los numeros se leen de corrido: es asi como
 * se ve que la presion viene subiendo tres controles seguidos. Guardarlos
 * detras de un clic obligaria a abrir diez atenciones para notar lo que en el
 * papel salta a la vista.
 *
 * Lo que si se despliega es la ficha completa —sus problemas, signos y
 * diagnosticos—, que son decenas de renglones y solo se miran cuando interesa
 * esa consulta en concreto. Se pide al servidor al abrirla, no antes.
 */
export function EntradaHistorial({
  atencion,
  pacienteId,
}: {
  atencion: Atencion;
  /** Para el enlace de impresion: la hoja necesita al paciente ademas de la ficha. */
  pacienteId?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const esFicha = atencion.tipoFicha !== null;

  const ficha = useQuery({
    queryKey: ['ficha', atencion.id],
    queryFn: () => obtenerFicha(atencion.id),
    // Solo se pide cuando alguien la abre. Cargarlas todas por si acaso serian
    // decenas de peticiones para mirar una.
    enabled: abierta && esFicha,
    staleTime: 5 * 60_000,
  });

  const imc = imcDe(atencion.pesoKg, atencion.tallaCm);
  const pa = presion(atencion.presionSistolica, atencion.presionDiastolica);

  const vitales: { rotulo: string; valor: string }[] = [];
  if (atencion.pesoKg) vitales.push({ rotulo: 'Peso', valor: atencion.pesoKg + ' kg' });
  if (atencion.tallaCm) vitales.push({ rotulo: 'Talla', valor: atencion.tallaCm + ' cm' });
  if (imc !== null) vitales.push({ rotulo: 'IMC', valor: imc.toFixed(2) });
  if (pa) vitales.push({ rotulo: 'Presion', valor: pa });
  if (atencion.temperaturaC) vitales.push({ rotulo: 'Temp.', valor: atencion.temperaturaC + ' C' });

  return (
    <Box
      component="article"
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: { xs: 1.5, md: 2 } }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 1, alignItems: { md: 'baseline' }, justifyContent: 'space-between', mb: 1 }}
      >
        <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography component="h3" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {fechaLarga(atencion.fecha)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {hora(atencion.fecha)}
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ gap: 1 }}>
          {atencion.digitalizada ? (
            <Chip
              size="small"
              variant="outlined"
              label="Del papel"
              title="Transcrita de un expediente en papel"
            />
          ) : null}
          {esFicha ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={'Ficha ' + (NOMBRE_FICHA[atencion.tipoFicha!] ?? atencion.tipoFicha)}
            />
          ) : null}
        </Stack>
      </Stack>

      {atencion.motivo ? (
        <Typography sx={{ mb: 1 }}>{atencion.motivo}</Typography>
      ) : null}

      {vitales.length > 0 ? (
        <Stack
          direction="row"
          sx={{ gap: 2.5, flexWrap: 'wrap', mb: atencion.diagnostico ? 1 : 0 }}
        >
          {vitales.map((v) => (
            <Stack key={v.rotulo} direction="row" sx={{ gap: 0.6, alignItems: 'baseline' }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                {v.rotulo}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {v.valor}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : null}

      {atencion.diagnostico ? (
        <Dato titulo="Diagnostico" texto={atencion.diagnostico} />
      ) : null}
      {atencion.tratamiento ? (
        <Dato titulo="Tratamiento" texto={atencion.tratamiento} />
      ) : null}
      {atencion.notas ? <Dato titulo="Notas" texto={atencion.notas} /> : null}

      {esFicha ? (
        <>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={() => setAbierta((v) => !v)}
              sx={{ px: 0, minWidth: 0 }}
              aria-expanded={abierta}
            >
              {abierta ? 'Ocultar la ficha' : 'Ver la ficha completa'}
            </Button>
            {/*
              En la MISMA pestana. La sesion vive solo en memoria de la
              pestana —nada en localStorage, a proposito—, asi que una
              pestana nueva nace sin sesion y pide entrar otra vez. La hoja
              trae su boton para volver al expediente.
            */}
            {pacienteId ? (
              <Button
                size="small"
                component={EnlaceRuta}
                to={'/pacientes/' + pacienteId + '/fichas/' + atencion.id + '/imprimir'}
                startIcon={<PrintIcon />}
                sx={{ px: 0, minWidth: 0 }}
              >
                Imprimir
              </Button>
            ) : null}
          </Stack>

          {abierta ? (
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {ficha.isLoading ? (
                <Stack sx={{ alignItems: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : ficha.isError ? (
                <AvisoError error={ficha.error} />
              ) : ficha.data ? (
                <CuerpoFicha ficha={ficha.data} />
              ) : null}
            </Box>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

function Dato({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {titulo}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {texto}
      </Typography>
    </Box>
  );
}

/** El contenido de la ficha oficial: lo que en el papel se subrayo. */

/**
 * Como se dice cada forma de atender el parto.
 *
 * Son las SIGLAS que imprime el papel —y que guarda el enum— con el texto que
 * las pantallas de neonato y posparto ponen al lado. La primera version de
 * esta tabla tenia otras claves (`MEDICO`, `COMADRONA`, `FAMILIAR`) que nunca
 * existieron en el enum, asi que un parto atendido por comadrona salia en el
 * historial como «CT», a secas. La prueba no lo veia porque le daba el valor
 * inventado.
 */
const QUIEN_ATENDIO: Record<string, string> = {
  MD: 'Medico',
  EP: 'Enfermera profesional',
  AE: 'Auxiliar de enfermeria',
  CT: 'Comadrona tradicional',
  OTRO: 'Otro',
};

const TIPO_PARTO: Record<string, string> = {
  EUTOCICO: 'Eutocico',
  DISTOCICO: 'Distocico',
  CESAREA: 'Cesarea',
};

/** El peso como lo escribe el papel: libras y onzas, no kilos. */
function peso(libras: number | null, onzas: number | null): string | null {
  if (libras === null && onzas === null) return null;
  return (libras ?? 0) + ' lb ' + (onzas ?? 0) + ' oz';
}

const siNo = (v: boolean | null) => (v === null ? null : v ? 'Si' : 'No');

type FichaGuardada = NonNullable<
  ReturnType<typeof obtenerFicha> extends Promise<infer T> ? T : never
>;

/** Un renglon de lo que solo trae una hoja: se calla si no se lleno. */
interface Fila {
  titulo: string;
  texto: string | null;
}

const conTexto = (filas: Fila[]): Fila[] =>
  filas.filter((f) => f.texto !== null && f.texto !== '');

/** Quien atendio el parto, con su «otro» si lo hay. */
function quienAtendio(sigla: string | null, otro: string | null): string | null {
  if (!sigla) return null;
  return (QUIEN_ATENDIO[sigla] ?? sigla) + (otro ? ': ' + otro : '');
}

/**
 * Lo que solo trae la ficha de menor de 28 dias.
 *
 * No estaba, y eso hacia invisible todo lo que solo vive en esa hoja: el
 * nombre de la madre, el peso al nacer, quien atendio el parto, la BCG. Media
 * ficha se guardaba y no se podia volver a leer.
 */
function filasNeonato(n: NonNullable<FichaGuardada['neonato']>): Fila[] {
  return conTexto([
    { titulo: 'Nombre de la madre', texto: n.nombreMadre },
    { titulo: 'Peso', texto: peso(n.pesoLibras, n.pesoOnzas) },
    { titulo: 'Peso al nacer', texto: peso(n.pesoNacerLibras, n.pesoNacerOnzas) },
    {
      titulo: 'Perimetro braquial',
      texto: n.perimetroBraquialCm ? n.perimetroBraquialCm + ' cm' : null,
    },
    {
      titulo: 'Circunferencia cefalica',
      texto: n.circunferenciaCefalicaCm ? n.circunferenciaCefalicaCm + ' cm' : null,
    },
    { titulo: 'Lloro al nacer', texto: siNo(n.lloroAlNacer) },
    { titulo: 'Nacio cianotico', texto: siNo(n.nacioCianotico) },
    {
      titulo: 'Horas de trabajo de parto',
      texto: n.horasTrabajoParto === null ? null : String(n.horasTrabajoParto),
    },
    {
      titulo: 'Quien atendio el parto',
      texto: quienAtendio(n.quienAtendioParto, n.quienAtendioPartoOtro),
    },
    { titulo: 'Tipo de parto', texto: n.tipoParto ? (TIPO_PARTO[n.tipoParto] ?? n.tipoParto) : null },
    { titulo: 'Ruptura prematura de membranas', texto: siNo(n.rupturaPrematuraMembranas) },
    { titulo: 'Trabajo de parto prematuro', texto: siNo(n.trabajoPartoPrematuro) },
    { titulo: 'Parto prolongado', texto: siNo(n.partoProlongado) },
    { titulo: 'BCG', texto: siNo(n.bcg) },
    {
      titulo: 'Td en la madre',
      texto:
        n.tdMadre === null
          ? null
          : n.tdMadre
            ? 'Si' + (n.tdMadreDosis !== null ? ', ' + n.tdMadreDosis + ' dosis' : '')
            : 'No',
    },
  ]);
}

const numero = (v: number | null, unidad?: string) =>
  v === null ? null : String(v) + (unidad ? ' ' + unidad : '');

/** «Si: tal cosa» cuando la casilla va con su raya de «describa». */
const siConDetalle = (v: boolean | null, detalle: string | null) =>
  v === null ? null : v ? 'Si' + (detalle ? ': ' + detalle : '') : 'No';

/**
 * Lo que solo trae la hoja prenatal: la pagina 2 del papel.
 *
 * Es la misma trampa que ya mordio con la de neonato, y por eso va escrita
 * junto con las pantallas: los ocho laboratorios, el examen obstetrico y las
 * semanas se guardan cifrados y la API los devuelve, pero sin este bloque el
 * historial decia «de esta ficha solo se lleno el motivo».
 *
 * Las semanas van dos veces, como en el papel: las que anoto quien atendio
 * —que pueden venir de la altura uterina— y las que salen de la FUR.
 */
function filasPrenatal(p: NonNullable<FichaGuardada['prenatal']>): Fila[] {
  return conTexto([
    { titulo: 'Semanas por FUR y/o AU', texto: numero(p.semanasPorFurAu) },
    { titulo: 'Semanas por FUR (calculadas)', texto: numero(p.semanasGestacion) },
    {
      titulo: 'Fecha probable de parto',
      texto: p.fechaProbableParto ? fechaCorta(p.fechaProbableParto) : null,
    },
    {
      titulo: 'Circunferencia del brazo',
      texto: p.circunferenciaBrazoCm ? p.circunferenciaBrazoCm + ' cm' : null,
    },
    { titulo: 'Examen general normal', texto: siNo(p.examenGeneralNormal) },
    { titulo: 'Examen bucodental', texto: p.examenBucodental },
    { titulo: 'Altura uterina', texto: p.alturaUterinaCm ? p.alturaUterinaCm + ' cm' : null },
    { titulo: 'Movimientos fetales', texto: siNo(p.movimientosFetales) },
    { titulo: 'Frecuencia cardiaca fetal', texto: numero(p.fcf, 'lpm') },
    { titulo: 'Presentacion por Leopold', texto: p.presentacionLeopold },
    { titulo: 'Trazas de sangre', texto: siConDetalle(p.trazasSangre, p.trazasSangreDescripcion) },
    {
      titulo: 'Lesiones vulvares',
      texto: siConDetalle(p.lesionesVulvares, p.lesionesVulvaresDescripcion),
    },
    { titulo: 'Flujo vaginal', texto: siNo(p.flujoVaginal) },
    { titulo: 'Hemoglobina / hematocrito', texto: p.hemoglobinaHematocrito },
    { titulo: 'Grupo y Rh', texto: p.grupoRh },
    { titulo: 'Orina', texto: p.orina },
    { titulo: 'Glicemia', texto: p.glicemia },
    { titulo: 'VDRL', texto: p.vdrl },
    { titulo: 'VIH', texto: p.vih },
    { titulo: 'Papanicolau', texto: p.papanicolau },
    { titulo: 'Infecciones', texto: p.infecciones },
    { titulo: 'Problemas detectados', texto: p.problemasDetectados },
    { titulo: 'Sulfato ferroso', texto: numero(p.sulfatoFerrosoTabletas, 'tabletas') },
    { titulo: 'Acido folico', texto: numero(p.acidoFolicoTabletas, 'tabletas') },
    { titulo: 'Td', texto: numero(p.tdDosis, 'dosis') },
  ]);
}

/**
 * La suplementacion del posparto viene de dos maneras, y las dos son del
 * papel: la hoja del primer control marca SI/NO y la tabla de los siguientes
 * anota tabletas. Se ensena lo que haya —«Si», «30 tabletas» o «Si, 30
 * tabletas»— sin deducir una de la otra.
 */
function entregado(marcado: boolean | null, cantidad: number | null, unidad: string): string | null {
  if (marcado === null) return numero(cantidad, unidad);
  if (!marcado) return 'No';
  return cantidad === null ? 'Si' : 'Si, ' + cantidad + ' ' + unidad;
}

/** Lo que solo trae la evaluacion del posparto: las paginas 3 y 4. */
function filasPosparto(p: NonNullable<FichaGuardada['posparto']>): Fila[] {
  return conTexto([
    { titulo: 'Primer control', texto: p.esPrimerControl ? 'Si' : 'No' },
    { titulo: 'Dias despues del parto', texto: numero(p.diasDespuesDelParto) },
    { titulo: 'Donde se atendio el parto', texto: p.dondeAtendioParto },
    {
      titulo: 'Quien atendio el parto',
      texto: quienAtendio(p.quienAtendioParto, p.quienAtendioPartoOtro),
    },
    { titulo: 'Involucion uterina', texto: p.involucionUterina },
    { titulo: 'Examen de mamas', texto: p.examenMamas },
    { titulo: 'Herida operatoria', texto: p.heridaOperatoria },
    { titulo: 'Examen ginecologico', texto: p.examenGinecologico },
    { titulo: 'Lactancia materna exclusiva', texto: siNo(p.lactanciaMaternaExclusiva) },
    { titulo: 'Por que no', texto: p.motivoSinLactancia },
    { titulo: 'Problemas detectados', texto: p.problemasDetectados },
    {
      titulo: 'Sulfato ferroso',
      texto: entregado(p.sulfatoFerroso, p.sulfatoFerrosoTabletas, 'tabletas'),
    },
    { titulo: 'Acido folico', texto: entregado(p.acidoFolico, p.acidoFolicoTabletas, 'tabletas') },
    { titulo: 'Td', texto: entregado(p.td, p.tdDosis, 'dosis') },
    { titulo: 'Otro medicamento', texto: siNo(p.otroMedicamento) },
  ]);
}

/** Los renglones de una hoja bajo su rotulo; nada si no se lleno ninguno. */
function BloqueHoja({ titulo, filas }: { titulo: string; filas: Fila[] }) {
  if (filas.length === 0) return null;
  return (
    <Box>
      <Rotulo>{titulo}</Rotulo>
      {filas.map((f) => (
        <Dato key={f.titulo} titulo={f.titulo} texto={f.texto!} />
      ))}
    </Box>
  );
}


function CuerpoFicha({ ficha }: { ficha: FichaGuardada }) {
  const peligros = ficha.signosPeligro.filter((s) => s.presente);
  const problemas = ficha.problemas.filter((p) => p.presente);
  const temas = ficha.consejeriaTemas.filter((t) => t.brindada);

  // Lo que solo trae cada hoja. Como mucho hay uno, porque una atencion es de
  // un solo tipo de ficha.
  const neonato = ficha.neonato ? filasNeonato(ficha.neonato) : [];
  const prenatal = ficha.prenatal ? filasPrenatal(ficha.prenatal) : [];
  const posparto = ficha.posparto ? filasPosparto(ficha.posparto) : [];
  const propio = neonato.length + prenatal.length + posparto.length;

  return (
    <Stack sx={{ gap: 1.5 }}>
      {/*
        Lo que solo trae la ficha de menor de 28 dias.

        Se guardaba desde el primer dia —el panel lo envia, el servidor lo cifra
        y la API lo devuelve— pero esta pantalla nunca lo dibujaba: solo pintaba
        los campos comunes. Desde fuera eso no se distingue de que no se
        guardara, y quien lo llenaba concluia, con razon, que se perdia.

        Va PRIMERO porque en esta ficha el paciente es el nino y casi todo lo de
        aqui es de la madre y del parto: es el contexto con el que se lee el
        resto.
      */}
      <BloqueHoja titulo="Datos de la madre y del parto" filas={neonato} />

      {peligros.length > 0 ? (
        <Box>
          <Rotulo>Signos de peligro</Rotulo>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
            {peligros.map((s) => (
              <Chip
                key={s.signoId}
                size="small"
                color="warning"
                label={s.texto + (s.detalle ? ': ' + s.detalle : '')}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {ficha.historiaEnfermedad ? (
        <Dato titulo="Historia de la enfermedad" texto={ficha.historiaEnfermedad} />
      ) : null}

      {problemas.length > 0 ? (
        <Box>
          <Rotulo>Problemas encontrados</Rotulo>
          <Stack sx={{ gap: 1, mt: 0.75 }}>
            {problemas.map((p) => (
              <Box
                key={p.problemaId}
                sx={{ borderLeft: '2px solid', borderColor: 'primary.main', pl: 1.25 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {p.nombre}
                </Typography>
                {p.signos.length > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Signos: {p.signos.join(' · ')}
                  </Typography>
                ) : null}
                {p.diagnosticos.length > 0 || p.otroDiagnostico ? (
                  <Typography variant="body2">
                    Diagnostico:{' '}
                    {[...p.diagnosticos, p.otroDiagnostico].filter(Boolean).join(' · ')}
                  </Typography>
                ) : null}
                {p.conducta ? (
                  <Typography variant="body2" color="text.secondary">
                    Conducta: {p.conducta}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {ficha.medicamentos.length > 0 ? (
        <Box>
          <Rotulo>Medicamentos indicados</Rotulo>
          <Stack component="ul" sx={{ gap: 0.25, m: 0, mt: 0.5, pl: 2.5 }}>
            {ficha.medicamentos.map((m, i) => (
              <Typography key={i} component="li" variant="body2">
                {m.nombre}
                {m.dosis ? ' — ' + m.dosis : ''}
                {m.dias ? ' — ' + m.dias + ' dias' : ''}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      {/*
        Las hojas prenatal y del posparto van DESPUES de los signos, los
        problemas y los medicamentos: aqui la paciente es la propia mujer y lo
        comun se lee primero, como en el papel, donde la pagina 2 es la que
        sigue.
      */}
      <BloqueHoja titulo="Control prenatal" filas={prenatal} />
      <BloqueHoja titulo="Evaluacion del posparto" filas={posparto} />

      {ficha.consejeria ? <Dato titulo="Consejeria" texto={ficha.consejeria} /> : null}
      {/*
        La consejeria por casillas, de las fichas que la traen asi: neonato,
        ninez, prenatal y posparto. Se ensenan solo los temas marcados, igual
        que los signos de peligro: lo que no se brindo no se lista.
      */}
      {temas.length > 0 ? (
        <Box>
          <Rotulo>Consejeria</Rotulo>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 0.5 }}>
            {temas.map((t) => (
              <Chip
                key={t.temaId}
                size="small"
                variant="outlined"
                label={
                  t.texto + (t.fechaReconsulta ? ' · reconsulta ' + fechaCorta(t.fechaReconsulta) : '')
                }
              />
            ))}
          </Stack>
        </Box>
      ) : null}
      {ficha.referencia ? <Dato titulo="Referido a" texto={ficha.referencia} /> : null}
      {ficha.vacunaAdministrada ? (
        <Dato titulo="Vacuna administrada" texto={ficha.vacunaAdministrada} />
      ) : null}

      {peligros.length === 0 &&
      problemas.length === 0 &&
      ficha.medicamentos.length === 0 &&
      temas.length === 0 &&
      propio === 0 &&
      !ficha.historiaEnfermedad &&
      !ficha.consejeria ? (
        <>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            De esta ficha solo se lleno el motivo de la consulta.
          </Typography>
        </>
      ) : null}
    </Stack>
  );
}

function Rotulo({ children }: { children: string }) {
  return (
    <Typography
      component="h4"
      sx={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {children}
    </Typography>
  );
}
