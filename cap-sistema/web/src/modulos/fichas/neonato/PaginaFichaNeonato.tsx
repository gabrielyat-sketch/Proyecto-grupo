import { useMemo, useRef, useState } from 'react';
import { Link as EnlaceRuta, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../../componentes/AvisoError';
import { BloqueFicha, Dato, SeccionFicha } from '../SeccionFicha';
import { EncabezadoFicha } from '../EncabezadoFicha';
import { IndiceFicha, type EntradaIndice } from '../IndiceFicha';
import { MatrizProblemas } from '../MatrizProblemas';
import { LineaPregunta, SelectorSiNo } from '../SelectorRespuesta';
import { ETIQUETA_TIPO_LUGAR } from '../../recepcion/servicio-pacientes';
import {
  obtenerCatalogo,
  obtenerPaciente,
  registrarFicha,
  SERVICIO_DE_SALUD,
  type CatalogoFicha,
} from '../servicio-fichas';
import type { AvanceSeccion } from '../borrador';
import {
  bloqueDelSigno,
  borradorNeonatoVacio,
  CONDUCTA_DEL_BLOQUE,
  cuerpoDeFichaNeonato,
  edadEnDias,
  EDAD_MAXIMA_NEONATO_DIAS,
  fueraDeRangoNeonato,
  signosGravesMarcados,
  type BorradorNeonato,
  type CampoExamenNeonato,
} from './borrador-neonato';

const SECCIONES: readonly EntradaIndice[] = [
  { clave: 'servicio', numeral: '1', titulo: 'Identificación del servicio' },
  { clave: 'datos', numeral: '2', titulo: 'Datos generales' },
  { clave: 'evaluacion', numeral: '3', titulo: 'Evaluación del recién nacido' },
  { clave: 'antecedentes', numeral: '4', titulo: 'Antecedentes maternos y del parto' },
  { clave: 'examen', numeral: '5', titulo: 'Examen físico' },
  { clave: 'problemas', numeral: '6', titulo: 'Revisión de problemas' },
  { clave: 'consejeria', numeral: '7', titulo: 'Consejería' },
  { clave: 'plan', numeral: '8', titulo: 'Diagnóstico y tratamiento' },
];

/** Las siglas del papel, con lo que significan. */
const QUIEN_ATENDIO = [
  { valor: 'MD', texto: 'MD — Médico' },
  { valor: 'EP', texto: 'EP — Enfermera profesional' },
  { valor: 'AE', texto: 'AE — Auxiliar de enfermería' },
  { valor: 'CT', texto: 'CT — Comadrona tradicional' },
  { valor: 'OTRO', texto: 'Otro' },
];

const TIPOS_PARTO = [
  { valor: 'NORMAL', texto: 'Normal' },
  { valor: 'CESAREA', texto: 'Cesárea' },
  { valor: 'FORCEPS', texto: 'Distócico = Fórceps' },
  { valor: 'PODALICA', texto: 'Podálica' },
];

/**
 * Una fecha `aaaa-mm-dd` dicha como se lee en el papel.
 *
 * Se parte la cadena en vez de construir un `Date` con ella entera: Guatemala
 * es UTC-6 y `new Date('2026-08-20')` es medianoche UTC, que aquí todavía es
 * el 19. La fecha de nacimiento de un recién nacido corrida un día cambia su
 * edad en días, que es justo lo que esta ficha decide.
 */
function fechaImpresa(valor: string | null | undefined): string {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return '—';
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Lo que una respuesta destapa: el «¿Cuál?», el «¿Quién?», el número de dosis.
 *
 * Va **debajo** de la pregunta, no a su derecha. En el papel esas rayas están
 * siempre impresas y ocupan el ancho de la hoja; en pantalla, colgarlas al
 * lado de las casillas SI/NO empuja la fila, corre las casillas de sitio en
 * cuanto alguien responde que sí, y deja el campo tan estrecho que no se lee
 * lo que se escribió. Debajo y con fondo, la fila no se mueve y el detalle se
 * ve como lo que es: parte de la respuesta anterior.
 *
 * Es el mismo trato que la ficha de adultos le da a sus treinta y tres
 * antecedentes.
 */
function DetalleDeRespuesta({
  abierto,
  children,
}: {
  abierto: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapse in={abierto} unmountOnExit>
      <Box sx={{ pl: 2, py: 1.5, bgcolor: 'action.hover' }}>{children}</Box>
    </Collapse>
  );
}

/** Un campo del examen físico, con su unidad y su aviso de rango. */
function CampoExamen({
  etiqueta,
  campo,
  unidad,
  valor,
  onCambio,
}: {
  etiqueta: string;
  campo: CampoExamenNeonato;
  unidad: string;
  valor: string;
  onCambio: (v: string) => void;
}) {
  const raro = fueraDeRangoNeonato(campo, valor);
  return (
    <TextField
      label={etiqueta}
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      type="number"
      size="small"
      sx={{ width: 168 }}
      error={raro}
      helperText={raro ? 'Fuera de lo esperado. Verifique.' : unidad}
      slotProps={{ htmlInput: { step: 'any' } }}
    />
  );
}

/**
 * La ficha clínica para menor de 28 días.
 *
 * Se parece a la de adultos a propósito —el personal tiene el papel al lado y
 * salta entre los dos— y reutiliza sus componentes. Lo que cambia es lo que
 * cambia en el papel:
 *
 * **Los signos de peligro van en tres bloques, no en uno.** El formulario los
 * imprime en tres recuadros con conductas distintas, y cada uno lleva la suya
 * escrita al lado. Marcar uno solo de los veinte primeros significa enfermedad
 * grave: la pantalla lo dice **en el momento**, con la lista de cuáles, en vez
 * de dejarlo a que el personal lo recuerde al final.
 *
 * **El peso va en libras y onzas.** Dos campos, como el papel. Uno de los
 * signos de peligro impresos es "pesa menos de 5 libras 8 onzas", así que
 * convertir a kilos obligaría a deshacer la conversión para compararlo.
 *
 * **La consejería es una tabla**, no un texto: seis temas con su fecha de
 * reconsulta.
 */
export function PaginaFichaNeonato() {
  const { pacienteId = '' } = useParams();
  const navegar = useNavigate();
  const [activa, setActiva] = useState('datos');
  const secciones = useRef<Record<string, HTMLDivElement | null>>({});

  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });

  const catalogo = useQuery({
    queryKey: ['catalogo-ficha', 'NEONATO'],
    queryFn: () => obtenerCatalogo('NEONATO'),
  });

  const [borrador, setBorrador] = useState<BorradorNeonato | null>(null);
  const actual = useMemo(() => {
    if (borrador) return borrador;
    if (!catalogo.data) return null;
    return borradorNeonatoVacio(catalogo.data);
  }, [borrador, catalogo.data]);

  const guardar = useMutation({
    mutationFn: (cuerpo: ReturnType<typeof cuerpoDeFichaNeonato>) =>
      registrarFicha(paciente.data!.expediente!.id, cuerpo),
    onSuccess: () => navegar('/pacientes/' + pacienteId + '/expediente'),
  });

  function cambiar(cambios: Partial<BorradorNeonato>) {
    setBorrador((previo) => ({ ...(previo ?? actual!), ...cambios }));
  }

  function irA(clave: string) {
    setActiva(clave);
    secciones.current[clave]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (paciente.isPending || catalogo.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (paciente.isError) return <AvisoError error={paciente.error} />;
  if (catalogo.isError) return <AvisoError error={catalogo.error} />;
  if (!paciente.data || !catalogo.data || !actual) return null;

  const datos = paciente.data;
  const dias = edadEnDias(datos.fechaNacimiento as unknown as string);

  const volverA = '/pacientes/' + pacienteId + '/expediente';
  const volver = (
    <Button
      component={EnlaceRuta}
      to={volverA}
      startIcon={<ArrowBackIcon />}
      sx={{ alignSelf: 'flex-start', mb: 2 }}
    >
      Expediente
    </Button>
  );

  if (!datos.expediente) {
    return (
      <Box>
        {volver}
        <Alert severity="warning">
          Este paciente no tiene expediente abierto. Recepcion tiene que abrirlo antes de poder
          registrar una ficha.
        </Alert>
      </Box>
    );
  }

  // En Purulhá nadie tiene calle y número: la dirección es el barrio, caserío
  // o aldea dentro de su comunidad, que es lo que recepción pregunta.
  const lugar = datos.lugar;
  const comunidad = datos.comunidad?.nombre ?? '';
  const partesDireccion = [
    lugar ? (ETIQUETA_TIPO_LUGAR[lugar.tipo] ?? lugar.tipo) + ' ' + lugar.nombre : '',
    comunidad,
  ].filter((parte) => parte !== '');
  const direccion = partesDireccion.length > 0 ? partesDireccion.join(', ') : '—';

  const graves = signosGravesMarcados(actual, catalogo.data);
  const avance: Record<string, AvanceSeccion> = {};
  for (const s of SECCIONES) avance[s.clave] = { respondidas: 0, total: 0 };

  const cat: CatalogoFicha = catalogo.data;

  return (
    <Box>
      {/*
        El encabezado del papel: el nombre de la hoja, el recuadro de No.
        Expediente y el de Fecha. Es el mismo componente que usa la ficha de
        adultos, porque el personal salta entre las dos con el papel al lado.
      */}
      <EncabezadoFicha
        titulo="Ficha clínica para menor de 28 días"
        volverA={volverA}
        volverTexto="Expediente"
        nombre={datos.apellidos + ', ' + datos.nombres}
        resumen={
          dias +
          (dias === 1 ? ' día' : ' días') +
          ' de nacido · ' +
          (datos.sexo === 'F' ? 'Femenino' : 'Masculino') +
          ' · ' +
          (datos.comunidad?.nombre ?? 'Sin comunidad')
        }
        expediente={datos.expediente.numero}
        fecha={{ valor: actual.fecha, onCambio: (v) => cambiar({ fecha: v }) }}
      />

      {/*
        No se bloquea la captura: el CAP transcribe expedientes de papel, y una
        ficha de hace tres años se llena con la edad que el nino tenia entonces.
        Se avisa y se deja seguir.
      */}
      {dias > EDAD_MAXIMA_NEONATO_DIAS ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Este paciente tiene {dias} días. Esta ficha es para menores de{' '}
          {EDAD_MAXIMA_NEONATO_DIAS} días; para mayores va la de lactante y niñez. Si está
          transcribiendo una consulta antigua, continúe.
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ position: { md: 'sticky' }, top: 88, flexShrink: 0 }}>
          <IndiceFicha entradas={SECCIONES} avance={avance} activa={activa} onIr={irA} />
        </Box>

        <Stack sx={{ gap: 2, flex: 1, minWidth: 0 }}>
          {/* ────── 1. Identificación del servicio de salud ────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.servicio = n;
            }}
            numeral="1"
            titulo="Identificación del servicio de salud"
            nota="El papel trae seis casillas —PSF, C/S «A», CENAPA, C/S «B», CAP, CAIMI— porque se imprime igual para todo el país. Aquí no se pregunta: el sistema es de un solo establecimiento."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              <Dato titulo="Tipo de servicio" valor={SERVICIO_DE_SALUD.tipo} />
              <Dato titulo="Nombre del servicio" valor={SERVICIO_DE_SALUD.nombre} />
              <Dato titulo="Área de salud" valor={SERVICIO_DE_SALUD.areaDeSalud} />
            </Box>
          </SeccionFicha>

          {/* ───────────────── 2. Datos generales ───────────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.datos = n;
            }}
            numeral="2"
            titulo="Datos generales del paciente"
            nota="En esta ficha el paciente es el niño, pero casi todos los datos son de la madre. Lo que no se puede escribir aquí viene del registro de recepción: si algo está mal se corrige allí y no aquí, así el expediente y la ficha nunca dicen cosas distintas."
          >
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Nombre de la madre"
                value={actual.nombreMadre}
                onChange={(e) => cambiar({ nombreMadre: e.target.value })}
                fullWidth
              />

              {/*
                Los datos que el papel pide en esta sección y que recepción ya
                anotó. Se enseñan porque en la hoja impresa están, y quien
                llena la ficha no entra al registro del paciente: sin esto,
                leer la ficha no es leer la misma hoja.
              */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
                  gap: 1.5,
                }}
              >
                <Dato titulo="Dirección" valor={direccion} />
                <Dato
                  titulo="Fecha de nacimiento"
                  valor={fechaImpresa(datos.fechaNacimiento as unknown as string)}
                />
                <Dato titulo="Edad" valor={dias + (dias === 1 ? ' día' : ' días')} />
                <Dato titulo="Sexo" valor={datos.sexo === 'F' ? 'Femenino' : 'Masculino'} />
                <Dato titulo="Población migrante" valor={datos.migrante ? 'Sí' : 'No'} />
                <Dato titulo="Lugar de origen" valor={datos.lugarOrigen ?? '—'} />
              </Box>

              <TextField
                label="Motivo de consulta"
                value={actual.motivo}
                onChange={(e) => cambiar({ motivo: e.target.value })}
                required
                fullWidth
                multiline
                minRows={2}
              />
            </Stack>
          </SeccionFicha>

          {/* ─────────── 3. Evaluación del recién nacido ─────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.evaluacion = n;
            }}
            numeral="3"
            titulo="Evaluación del recién nacido"
            nota="Subraye los hallazgos que encuentre."
          >
            <Stack sx={{ gap: 3 }}>
              {graves.length > 0 ? (
                <Alert severity="error">
                  <AlertTitle>Tiene enfermedad grave</AlertTitle>
                  {CONDUCTA_DEL_BLOQUE.PELIGRO}
                  <Typography variant="body2" component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                    {graves.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </Typography>
                </Alert>
              ) : null}

              {(['PELIGRO', 'INFECCION', 'MALFORMACION'] as const).map((bloque) => {
                const delBloque = cat.signosPeligro.filter(
                  (s) => bloqueDelSigno(s.orden) === bloque,
                );
                if (delBloque.length === 0) return null;
                const titulo =
                  bloque === 'PELIGRO'
                    ? 'Evalué signos de peligro'
                    : bloque === 'INFECCION'
                      ? 'Evaluar infección'
                      : 'Evaluar malformaciones';
                return (
                  <BloqueFicha key={bloque} titulo={titulo}>
                    <Stack sx={{ gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {CONDUCTA_DEL_BLOQUE[bloque]}
                      </Typography>
                      {delBloque.map((s) => (
                        <LineaPregunta key={s.id} texto={s.orden + '. ' + s.texto}>
                          <SelectorSiNo
                            etiqueta={s.texto}
                            denso
                            valor={actual.signosPeligro[s.id]?.presente ?? null}
                            onCambio={(v) =>
                              cambiar({
                                signosPeligro: {
                                  ...actual.signosPeligro,
                                  [s.id]: { ...actual.signosPeligro[s.id], presente: v },
                                },
                              })
                            }
                          />
                        </LineaPregunta>
                      ))}
                    </Stack>
                  </BloqueFicha>
                );
              })}
            </Stack>
          </SeccionFicha>

          {/* ────── 4. Antecedentes maternos y del parto ────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.antecedentes = n;
            }}
            numeral="4"
            titulo="Antecedentes maternos y del parto"
            nota="Revisar ficha de control prenatal y post parto de la madre."
          >
            <Stack sx={{ gap: 3 }}>
              <BloqueFicha titulo="Antecedentes maternos">
                <Stack sx={{ gap: 0.5 }}>
                  {cat.antecedentes.map((a) => (
                    <Box key={a.id}>
                      <LineaPregunta texto={a.texto}>
                        <SelectorSiNo
                          etiqueta={a.texto}
                          denso
                          valor={actual.antecedentes[a.id]?.respuesta ?? null}
                          onCambio={(v) =>
                            cambiar({
                              antecedentes: {
                                ...actual.antecedentes,
                                [a.id]: { ...actual.antecedentes[a.id], respuesta: v },
                              },
                            })
                          }
                        />
                      </LineaPregunta>
                      {a.pideDetalle ? (
                        <DetalleDeRespuesta
                          abierto={actual.antecedentes[a.id]?.respuesta === true}
                        >
                          <TextField
                            label="¿Cuál?"
                            size="small"
                            value={actual.antecedentes[a.id]?.detalle ?? ''}
                            onChange={(e) =>
                              cambiar({
                                antecedentes: {
                                  ...actual.antecedentes,
                                  [a.id]: {
                                    ...actual.antecedentes[a.id],
                                    detalle: e.target.value,
                                  },
                                },
                              })
                            }
                          />
                        </DetalleDeRespuesta>
                      ) : null}
                    </Box>
                  ))}
                </Stack>
              </BloqueFicha>

              <BloqueFicha titulo="Antecedentes del parto">
                <Stack sx={{ gap: 2 }}>
                  {/*
                    Alineadas por arriba, no por el centro: solo «Onzas» lleva
                    aviso debajo, y centrar dos campos de distinta altura deja
                    una casilla más arriba que la otra.
                  */}
                  <Stack
                    direction="row"
                    sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 110, mt: 1.25 }}>
                      Peso al nacer
                    </Typography>
                    <TextField
                      label="Libras"
                      type="number"
                      size="small"
                      sx={{ width: 120 }}
                      value={actual.parto.pesoNacerLibras}
                      onChange={(e) =>
                        cambiar({ parto: { ...actual.parto, pesoNacerLibras: e.target.value } })
                      }
                    />
                    <TextField
                      label="Onzas"
                      type="number"
                      size="small"
                      sx={{ width: 120 }}
                      value={actual.parto.pesoNacerOnzas}
                      onChange={(e) =>
                        cambiar({ parto: { ...actual.parto, pesoNacerOnzas: e.target.value } })
                      }
                      helperText="0 a 15"
                    />
                  </Stack>

                  <LineaPregunta texto="Lloró rápido y fuerte al nacer">
                    <SelectorSiNo
                      etiqueta="Lloró rápido y fuerte al nacer"
                      valor={actual.parto.lloroAlNacer}
                      onCambio={(v) => cambiar({ parto: { ...actual.parto, lloroAlNacer: v } })}
                    />
                  </LineaPregunta>
                  <LineaPregunta texto="Nació cianótico">
                    <SelectorSiNo
                      etiqueta="Nació cianótico"
                      valor={actual.parto.nacioCianotico}
                      onCambio={(v) => cambiar({ parto: { ...actual.parto, nacioCianotico: v } })}
                    />
                  </LineaPregunta>

                  <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      label="Horas de trabajo de parto"
                      type="number"
                      size="small"
                      sx={{ width: 220 }}
                      value={actual.parto.horasTrabajoParto}
                      onChange={(e) =>
                        cambiar({ parto: { ...actual.parto, horasTrabajoParto: e.target.value } })
                      }
                    />
                    <TextField
                      select
                      label="¿Quién atendió el parto?"
                      size="small"
                      sx={{ width: 260 }}
                      value={actual.parto.quienAtendioParto}
                      onChange={(e) =>
                        cambiar({ parto: { ...actual.parto, quienAtendioParto: e.target.value } })
                      }
                    >
                      <MenuItem value="">Sin anotar</MenuItem>
                      {QUIEN_ATENDIO.map((q) => (
                        <MenuItem key={q.valor} value={q.valor}>
                          {q.texto}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <DetalleDeRespuesta abierto={actual.parto.quienAtendioParto === 'OTRO'}>
                    <TextField
                      label="¿Quién?"
                      size="small"
                      value={actual.parto.quienAtendioPartoOtro}
                      onChange={(e) =>
                        cambiar({
                          parto: { ...actual.parto, quienAtendioPartoOtro: e.target.value },
                        })
                      }
                    />
                  </DetalleDeRespuesta>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Complicaciones durante el embarazo
                    </Typography>
                    <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
                      {(
                        [
                          ['rupturaPrematuraMembranas', 'Ruptura prematura de membranas'],
                          ['trabajoPartoPrematuro', 'Trabajo de parto prematuro'],
                          ['partoProlongado', 'Parto prolongado'],
                        ] as const
                      ).map(([campo, texto]) => (
                        <FormControlLabel
                          key={campo}
                          control={
                            <Checkbox
                              checked={actual.parto[campo]}
                              onChange={(e) =>
                                cambiar({
                                  parto: { ...actual.parto, [campo]: e.target.checked },
                                })
                              }
                            />
                          }
                          label={texto}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <TextField
                    select
                    label="Tipo de parto"
                    size="small"
                    sx={{ width: 260 }}
                    value={actual.parto.tipoParto}
                    onChange={(e) =>
                      cambiar({ parto: { ...actual.parto, tipoParto: e.target.value } })
                    }
                  >
                    <MenuItem value="">Sin anotar</MenuItem>
                    {TIPOS_PARTO.map((t) => (
                      <MenuItem key={t.valor} value={t.valor}>
                        {t.texto}
                      </MenuItem>
                    ))}
                  </TextField>

                  <LineaPregunta texto="BCG">
                    <SelectorSiNo
                      etiqueta="BCG"
                      valor={actual.parto.bcg}
                      onCambio={(v) => cambiar({ parto: { ...actual.parto, bcg: v } })}
                    />
                  </LineaPregunta>
                  <Box>
                    <LineaPregunta texto="Td en la madre">
                      <SelectorSiNo
                        etiqueta="Td en la madre"
                        valor={actual.parto.tdMadre}
                        onCambio={(v) => cambiar({ parto: { ...actual.parto, tdMadre: v } })}
                      />
                    </LineaPregunta>
                    <DetalleDeRespuesta abierto={actual.parto.tdMadre === true}>
                      <TextField
                        label="N.º de dosis"
                        type="number"
                        size="small"
                        sx={{ width: 140 }}
                        value={actual.parto.tdMadreDosis}
                        onChange={(e) =>
                          cambiar({ parto: { ...actual.parto, tdMadreDosis: e.target.value } })
                        }
                      />
                    </DetalleDeRespuesta>
                  </Box>
                  <LineaPregunta texto="Lactancia materna exclusiva">
                    <SelectorSiNo
                      etiqueta="Lactancia materna exclusiva"
                      valor={actual.parto.lactanciaMaternaExclusiva}
                      onCambio={(v) =>
                        cambiar({ parto: { ...actual.parto, lactanciaMaternaExclusiva: v } })
                      }
                    />
                  </LineaPregunta>
                  {actual.parto.lactanciaMaternaExclusiva === false ? (
                    <Alert severity="info">Investigue y oriente.</Alert>
                  ) : null}
                </Stack>
              </BloqueFicha>
            </Stack>
          </SeccionFicha>

          {/* ───────────────── 5. Examen físico ───────────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.examen = n;
            }}
            numeral="5"
            titulo="Examen físico o evaluación"
          >
            <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
              <CampoExamen
                etiqueta="Temperatura"
                campo="temperaturaC"
                unidad="°C"
                valor={actual.examen.temperaturaC}
                onCambio={(v) => cambiar({ examen: { ...actual.examen, temperaturaC: v } })}
              />
              <CampoExamen
                etiqueta="Peso (libras)"
                campo="pesoLibras"
                unidad="Lb"
                valor={actual.examen.pesoLibras}
                onCambio={(v) => cambiar({ examen: { ...actual.examen, pesoLibras: v } })}
              />
              <CampoExamen
                etiqueta="Peso (onzas)"
                campo="pesoOnzas"
                unidad="Onz · 0 a 15"
                valor={actual.examen.pesoOnzas}
                onCambio={(v) => cambiar({ examen: { ...actual.examen, pesoOnzas: v } })}
              />
              <CampoExamen
                etiqueta="Frecuencia cardiaca"
                campo="pulso"
                unidad="x min"
                valor={actual.examen.pulso}
                onCambio={(v) => cambiar({ examen: { ...actual.examen, pulso: v } })}
              />
              <CampoExamen
                etiqueta="Respiraciones"
                campo="respiraciones"
                unidad="x min"
                valor={actual.examen.respiraciones}
                onCambio={(v) => cambiar({ examen: { ...actual.examen, respiraciones: v } })}
              />
              <CampoExamen
                etiqueta="Talla"
                campo="tallaCm"
                unidad="cm"
                valor={actual.examen.tallaCm}
                onCambio={(v) => cambiar({ examen: { ...actual.examen, tallaCm: v } })}
              />
              <CampoExamen
                etiqueta="Perímetro braquial"
                campo="perimetroBraquialCm"
                unidad="cm"
                valor={actual.examen.perimetroBraquialCm}
                onCambio={(v) =>
                  cambiar({ examen: { ...actual.examen, perimetroBraquialCm: v } })
                }
              />
              <CampoExamen
                etiqueta="Circunferencia cefálica"
                campo="circunferenciaCefalicaCm"
                unidad="cm · «CC» en el papel"
                valor={actual.examen.circunferenciaCefalicaCm}
                onCambio={(v) =>
                  cambiar({ examen: { ...actual.examen, circunferenciaCefalicaCm: v } })
                }
              />
            </Stack>
          </SeccionFicha>

          {/* ────────────── 6. Revisión de problemas ────────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.problemas = n;
            }}
            numeral="6"
            titulo="Revisión de problemas"
          >
            <MatrizProblemas
              problemas={cat.problemas}
              valores={actual.problemas}
              onCambio={(problemaId, fila) =>
                cambiar({ problemas: { ...actual.problemas, [problemaId]: fila } })
              }
            />
          </SeccionFicha>

          {/* ───────────────── 7. Consejería ───────────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.consejeria = n;
            }}
            numeral="7"
            titulo="Consejería"
            nota="Marque lo que se explicó y anote cuándo debe volver por cada tema."
          >
            <Stack sx={{ gap: 1 }}>
              {cat.temasConsejeria.map((t) => (
                <Stack
                  key={t.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ gap: 1.5, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={actual.consejeria[t.id]?.brindada ?? false}
                        onChange={(e) =>
                          cambiar({
                            consejeria: {
                              ...actual.consejeria,
                              [t.id]: {
                                ...actual.consejeria[t.id],
                                brindada: e.target.checked,
                              },
                            },
                          })
                        }
                      />
                    }
                    label={t.texto}
                  />
                  <TextField
                    label="Fecha de reconsulta"
                    type="date"
                    size="small"
                    sx={{ width: 210, flexShrink: 0 }}
                    value={actual.consejeria[t.id]?.fechaReconsulta ?? ''}
                    onChange={(e) =>
                      cambiar({
                        consejeria: {
                          ...actual.consejeria,
                          [t.id]: {
                            ...actual.consejeria[t.id],
                            fechaReconsulta: e.target.value,
                          },
                        },
                      })
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              ))}
            </Stack>
          </SeccionFicha>

          {/* ────────── 8. Diagnóstico y tratamiento ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.plan = n;
            }}
            numeral="8"
            titulo="Diagnóstico y tratamiento"
          >
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Diagnóstico"
                value={actual.diagnostico}
                onChange={(e) => cambiar({ diagnostico: e.target.value })}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Tratamiento"
                value={actual.tratamiento}
                onChange={(e) => cambiar({ tratamiento: e.target.value })}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Referencia"
                value={actual.referencia}
                onChange={(e) => cambiar({ referencia: e.target.value })}
                fullWidth
                helperText="A dónde se refirió, si se refirió"
              />
              <TextField
                label="Notas"
                value={actual.notas}
                onChange={(e) => cambiar({ notas: e.target.value })}
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Próxima visita"
                type="date"
                value={actual.fechaProximaVisita}
                onChange={(e) => cambiar({ fechaProximaVisita: e.target.value })}
                sx={{ width: 220 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </SeccionFicha>

          <Divider />

          {guardar.isError ? <AvisoError error={guardar.error} /> : null}

          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', pb: 4 }}>
            <Button
              variant="contained"
              size="large"
              disabled={actual.motivo.trim() === '' || guardar.isPending}
              onClick={() => guardar.mutate(cuerpoDeFichaNeonato(actual))}
            >
              {guardar.isPending ? 'Guardando...' : 'Guardar la ficha'}
            </Button>
            {actual.motivo.trim() === '' ? (
              <Typography variant="body2" color="text.secondary">
                Falta el motivo de consulta.
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
