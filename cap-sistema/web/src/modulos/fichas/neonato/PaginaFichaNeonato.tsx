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
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../../componentes/AvisoError';
import { BloqueFicha, SeccionFicha } from '../SeccionFicha';
import { IndiceFicha, type EntradaIndice } from '../IndiceFicha';
import { MatrizProblemas } from '../MatrizProblemas';
import { LineaPregunta, SelectorSiNo } from '../SelectorRespuesta';
import {
  obtenerCatalogo,
  obtenerPaciente,
  registrarFicha,
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

  const volver = (
    <Button
      component={EnlaceRuta}
      to={'/pacientes/' + pacienteId + '/expediente'}
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

  const graves = signosGravesMarcados(actual, catalogo.data);
  const avance: Record<string, AvanceSeccion> = {};
  for (const s of SECCIONES) avance[s.clave] = { respondidas: 0, total: 0 };

  const cat: CatalogoFicha = catalogo.data;

  return (
    <Box>
      {volver}

      <Stack sx={{ gap: 0.5, mb: 1 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Ficha clínica para menor de 28 días
        </Typography>
        <Typography color="text.secondary">
          {datos.apellidos}, {datos.nombres} · {dias} {dias === 1 ? 'día' : 'días'} de nacido
        </Typography>
      </Stack>

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
          {/* ───────────────── 2. Datos generales ───────────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.datos = n;
            }}
            numeral="2"
            titulo="Datos generales"
            nota="En esta ficha el paciente es el niño, pero casi todos los datos son de la madre."
          >
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Nombre de la madre"
                value={actual.nombreMadre}
                onChange={(e) => cambiar({ nombreMadre: e.target.value })}
                fullWidth
              />
              <TextField
                label="Motivo de consulta"
                value={actual.motivo}
                onChange={(e) => cambiar({ motivo: e.target.value })}
                required
                fullWidth
                multiline
                minRows={2}
              />
              <TextField
                label="Fecha de la consulta"
                type="date"
                value={actual.fecha}
                onChange={(e) => cambiar({ fecha: e.target.value })}
                sx={{ width: 220 }}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Cámbiela si está transcribiendo del papel"
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
                    <LineaPregunta key={a.id} texto={a.texto}>
                      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
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
                        {a.pideDetalle && actual.antecedentes[a.id]?.respuesta === true ? (
                          <TextField
                            size="small"
                            placeholder="¿Cuál?"
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
                        ) : null}
                      </Stack>
                    </LineaPregunta>
                  ))}
                </Stack>
              </BloqueFicha>

              <BloqueFicha titulo="Antecedentes del parto">
                <Stack sx={{ gap: 2 }}>
                  <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ minWidth: 110 }}>
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
                    {actual.parto.quienAtendioParto === 'OTRO' ? (
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
                    ) : null}
                  </Stack>

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
                  <LineaPregunta texto="Td en la madre">
                    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                      <SelectorSiNo
                        etiqueta="Td en la madre"
                        valor={actual.parto.tdMadre}
                        onCambio={(v) => cambiar({ parto: { ...actual.parto, tdMadre: v } })}
                      />
                      {actual.parto.tdMadre === true ? (
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
                      ) : null}
                    </Stack>
                  </LineaPregunta>
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
