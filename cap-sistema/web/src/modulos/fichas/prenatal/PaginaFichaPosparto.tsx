import { useEffect, useRef, useState } from 'react';
import { Link as EnlaceRuta, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../../componentes/AvisoError';
import { ALTO_BARRA } from '../../../tema';
import { BloqueFicha, Dato, SeccionFicha } from '../SeccionFicha';
import { EncabezadoFicha } from '../EncabezadoFicha';
import { IndiceFicha, type EntradaIndice } from '../IndiceFicha';
import { ListaMedicamentos } from '../ListaMedicamentos';
import { SeccionExamenFisico } from '../SeccionExamenFisico';
import { LineaPregunta, SelectorSiNo } from '../SelectorRespuesta';
import type { AvanceSeccion, CampoExamen } from '../borrador';
import {
  obtenerCatalogo,
  obtenerPaciente,
  registrarFicha,
  SERVICIO_DE_SALUD,
  type CatalogoFicha,
} from '../servicio-fichas';
import {
  borradorPospartoVacio,
  cuerpoDeFichaPosparto,
  type BorradorPosparto,
  type HojaPosparto,
} from './borrador-prenatal';

const SECCIONES: readonly EntradaIndice[] = [
  { clave: 'datos', numeral: 'II', titulo: 'Establecimiento y paciente' },
  { clave: 'peligro', numeral: 'III', titulo: 'Signos de peligro en el posparto' },
  { clave: 'control', numeral: 'V', titulo: 'El control' },
  { clave: 'conducta', numeral: 'VI', titulo: 'Suplementación y consejería' },
  { clave: 'cierre', numeral: '·', titulo: 'Cierre' },
];

/** Los signos vitales que pide esta hoja: P/A, FC y temperatura. */
const VITALES: readonly CampoExamen[] = [
  'presionSistolica',
  'presionDiastolica',
  'pulso',
  'temperaturaC',
];

/** Quién atendió el parto, con las siglas que el papel imprime. */
const QUIEN_ATENDIO: { valor: string; texto: string }[] = [
  { valor: 'MD', texto: 'Médico' },
  { valor: 'EP', texto: 'Enfermera profesional' },
  { valor: 'AE', texto: 'Auxiliar de enfermería' },
  { valor: 'CT', texto: 'Comadrona tradicional' },
  { valor: 'OTRO', texto: 'Otro' },
];

/**
 * La evaluación del posparto — páginas 3 y 4 del formulario.
 *
 * **Es su propia hoja, no la continuación de la prenatal.** El papel las grapa
 * juntas, pero esta reinicia la numeración de secciones, repite el encabezado y
 * trae otros ocho signos de peligro: el que cambia es «presentaciones fetales
 * anormales» —que cuando ya nació no significa nada— por «coágulos con mal
 * olor». Por eso es otro tipo de ficha y no una pestaña de la anterior.
 *
 * **El primer control tiene cinco preguntas que los demás no repiten**, y una
 * casilla decide si se piden: cuántos días después del parto, dónde y quién lo
 * atendió. La tabla de la página 4 empieza, literalmente, en «Control 2».
 *
 * **La suplementación se registra de dos maneras**, y las dos son del papel: la
 * hoja del primer control marca SI/NO, y la tabla de los siguientes anota el
 * número de tabletas. Deducir el número de un «sí» sería inventarlo, así que
 * caben las dos y ninguna rellena a la otra.
 */
export function PaginaFichaPosparto() {
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
    queryKey: ['catalogo-ficha', 'POSPARTO'],
    queryFn: () => obtenerCatalogo('POSPARTO'),
  });

  const [borrador, setBorrador] = useState<BorradorPosparto | null>(null);

  useEffect(() => {
    if (borrador || !catalogo.data) return;
    setBorrador(borradorPospartoVacio(catalogo.data));
    window.scrollTo({ top: 0 });
  }, [borrador, catalogo.data]);

  const registrar = useMutation({
    mutationFn: async () => {
      if (!borrador || !paciente.data?.expediente) throw new Error('La ficha todavia no esta lista.');
      return registrarFicha(paciente.data.expediente.id, cuerpoDeFichaPosparto(borrador));
    },
    onSuccess: () => navegar('/pacientes/' + pacienteId + '/expediente'),
  });

  function cambiar(cambios: Partial<BorradorPosparto>) {
    setBorrador((previo) => (previo ? { ...previo, ...cambios } : previo));
  }

  function cambiarHoja(cambios: Partial<HojaPosparto>) {
    setBorrador((previo) => (previo ? { ...previo, hoja: { ...previo.hoja, ...cambios } } : previo));
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
  if (!paciente.data || !catalogo.data || !borrador) return null;

  const datos = paciente.data;
  const cat: CatalogoFicha = catalogo.data;
  const volverA = '/pacientes/' + pacienteId + '/expediente';

  if (!datos.expediente) {
    return (
      <Box>
        <Button
          component={EnlaceRuta}
          to={volverA}
          startIcon={<ArrowBackIcon />}
          sx={{ alignSelf: 'flex-start', mb: 2 }}
        >
          Expediente
        </Button>
        <Alert severity="warning">
          Esta paciente no tiene expediente abierto. Recepción tiene que abrirlo antes de poder
          registrar una ficha.
        </Alert>
      </Box>
    );
  }

  const peligros = cat.signosPeligro
    .filter((s) => borrador.signosPeligro[s.id]?.presente === true)
    .map((s) => s.texto);

  const avance: Record<string, AvanceSeccion> = {};
  for (const s of SECCIONES) avance[s.clave] = { respondidas: 0, total: 0 };

  const comunidad = datos.comunidad?.nombre ?? '';
  const primero = borrador.hoja.esPrimerControl;

  return (
    <Box>
      <EncabezadoFicha
        titulo="Evaluación del posparto"
        volverA={volverA}
        volverTexto="Expediente"
        pacienteId={pacienteId}
        grupoFamiliarId={datos.grupoFamiliar?.id}
        nombre={datos.apellidos + ', ' + datos.nombres}
        resumen={(datos.sexo === 'F' ? 'Femenino' : 'Masculino') + ' · ' + (comunidad || 'Sin comunidad')}
        expediente={datos.expediente.numero}
        fecha={{ valor: borrador.fecha, onCambio: (v) => cambiar({ fecha: v }) }}
      >
        <Button
          component={EnlaceRuta}
          to={'/pacientes/' + pacienteId + '/ficha-prenatal'}
          variant="outlined"
          size="small"
        >
          Ficha prenatal
        </Button>
      </EncabezadoFicha>

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ position: { md: 'sticky' }, top: ALTO_BARRA + 24, flexShrink: 0 }}>
          <IndiceFicha entradas={SECCIONES} avance={avance} activa={activa} onIr={irA} />
        </Box>

        <Stack sx={{ gap: 2, flex: 1, minWidth: 0 }}>
          {/* ────────── II. Datos ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.datos = n;
            }}
            numeral="II"
            titulo="Establecimiento y datos de la paciente"
            nota="No se preguntan: ya están en el expediente."
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
              <Dato titulo="Establecimiento" valor={SERVICIO_DE_SALUD.nombre} />
              <Dato titulo="Nombre" valor={datos.apellidos + ', ' + datos.nombres} />
              <Dato titulo="Comunidad" valor={comunidad || '—'} />
              <Dato titulo="Expediente" valor={datos.expediente.numero} />
            </Box>
          </SeccionFicha>

          {/* ────────── III. Signos de peligro ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.peligro = n;
            }}
            numeral="III"
            titulo="Evalúe signos y síntomas de peligro en el posparto"
            nota="No son los mismos que en el embarazo: aquí entran los coágulos con mal olor, y sale la presentación fetal."
          >
            <Stack sx={{ gap: 0.5 }}>
              {peligros.length > 0 ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                  <AlertTitle>Trate o refiera de acuerdo al nivel de resolución</AlertTitle>
                  <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {peligros.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </Typography>
                </Alert>
              ) : null}

              {cat.signosPeligro.map((s) => (
                <LineaPregunta key={s.id} texto={s.orden + '. ' + s.texto}>
                  <SelectorSiNo
                    etiqueta={s.texto}
                    denso
                    valor={borrador.signosPeligro[s.id]?.presente ?? null}
                    onCambio={(v) =>
                      cambiar({
                        signosPeligro: {
                          ...borrador.signosPeligro,
                          [s.id]: { presente: v, detalle: borrador.signosPeligro[s.id]?.detalle ?? '' },
                        },
                      })
                    }
                  />
                </LineaPregunta>
              ))}
            </Stack>

            <BloqueFicha titulo="IV. Si refirió a la paciente, describa manejo y estabilización">
              <TextField
                label="Manejo y estabilización"
                value={borrador.manejoEstabilizacion}
                onChange={(e) => cambiar({ manejoEstabilizacion: e.target.value })}
                multiline
                minRows={2}
                fullWidth
                size="small"
              />
            </BloqueFicha>
          </SeccionFicha>

          {/* ────────── V. El control ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.control = n;
            }}
            numeral="V"
            titulo="El control"
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={primero}
                  onChange={(e) => cambiarHoja({ esPrimerControl: e.target.checked })}
                />
              }
              label={
                <Typography variant="body2">
                  Es el <strong>primer</strong> control posparto
                </Typography>
              }
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              El papel le da hoja propia y cinco preguntas que después no vuelve a hacer. La tabla
              de los controles siguientes empieza en el número 2.
            </Typography>

            {primero ? (
              <BloqueFicha titulo="Solo en el primer control">
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Días después del parto"
                    value={borrador.hoja.diasDespuesDelParto}
                    onChange={(e) => cambiarHoja({ diasDespuesDelParto: e.target.value })}
                    size="small"
                    inputMode="numeric"
                    sx={{ width: 200 }}
                  />
                  <TextField
                    label="Dónde fue atendido el parto"
                    value={borrador.hoja.dondeAtendioParto}
                    onChange={(e) => cambiarHoja({ dondeAtendioParto: e.target.value })}
                    size="small"
                    sx={{ width: 280 }}
                  />
                  <TextField
                    select
                    label="Quién le atendió el parto"
                    value={borrador.hoja.quienAtendioParto}
                    onChange={(e) => cambiarHoja({ quienAtendioParto: e.target.value })}
                    size="small"
                    sx={{ width: 260 }}
                  >
                    <MenuItem value="">Sin responder</MenuItem>
                    {QUIEN_ATENDIO.map((q) => (
                      <MenuItem key={q.valor} value={q.valor}>
                        {q.texto}
                      </MenuItem>
                    ))}
                  </TextField>
                  {borrador.hoja.quienAtendioParto === 'OTRO' ? (
                    <TextField
                      label="Cuál"
                      value={borrador.hoja.quienAtendioPartoOtro}
                      onChange={(e) => cambiarHoja({ quienAtendioPartoOtro: e.target.value })}
                      size="small"
                      sx={{ width: 260 }}
                    />
                  ) : null}
                </Stack>
              </BloqueFicha>
            ) : null}

            <BloqueFicha titulo="Signos vitales">
              <SeccionExamenFisico
                valores={borrador.examen}
                campos={VITALES}
                onCambio={(campo, valor) =>
                  cambiar({ examen: { ...borrador.examen, [campo]: valor } })
                }
              />
            </BloqueFicha>

            <BloqueFicha titulo="Examen">
              <Stack sx={{ gap: 2 }}>
                <TextField
                  label="Involución uterina"
                  value={borrador.hoja.involucionUterina}
                  onChange={(e) => cambiarHoja({ involucionUterina: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Examen de mamas"
                  value={borrador.hoja.examenMamas}
                  onChange={(e) => cambiarHoja({ examenMamas: e.target.value })}
                  fullWidth
                  size="small"
                  helperText="El papel pide describir, no marcar."
                />
                <TextField
                  label="Herida operatoria"
                  value={borrador.hoja.heridaOperatoria}
                  onChange={(e) => cambiarHoja({ heridaOperatoria: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Examen ginecológico"
                  value={borrador.hoja.examenGinecologico}
                  onChange={(e) => cambiarHoja({ examenGinecologico: e.target.value })}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  helperText="Hallazgos patológicos y características de loquios, episiorrafía."
                />

                <LineaPregunta texto="Lactancia materna exclusiva">
                  <SelectorSiNo
                    etiqueta="Lactancia materna exclusiva"
                    denso
                    valor={borrador.hoja.lactanciaMaternaExclusiva}
                    onCambio={(v) => cambiarHoja({ lactanciaMaternaExclusiva: v })}
                  />
                </LineaPregunta>
                {/*
                  El "¿por que no?" solo aparece cuando la respuesta es que no.
                  No es un adorno: esa respuesta es la que decide que consejeria
                  toca de las cinco de abajo.
                */}
                {borrador.hoja.lactanciaMaternaExclusiva === false ? (
                  <TextField
                    label="¿Por qué no?"
                    value={borrador.hoja.motivoSinLactancia}
                    onChange={(e) => cambiarHoja({ motivoSinLactancia: e.target.value })}
                    fullWidth
                    size="small"
                  />
                ) : null}

                <TextField
                  label="Problemas detectados"
                  value={borrador.hoja.problemasDetectados}
                  onChange={(e) => cambiarHoja({ problemasDetectados: e.target.value })}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                />
              </Stack>
            </BloqueFicha>
          </SeccionFicha>

          {/* ────────── VI. Suplementación y consejería ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.conducta = n;
            }}
            numeral="VI"
            titulo="Suplementación, medicamentos y consejería"
          >
            <BloqueFicha titulo="Suplementación">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {primero
                  ? 'La hoja del primer control solo pregunta si se entregó.'
                  : 'La tabla de los controles siguientes pide el número de tabletas.'}
              </Typography>
              <Stack sx={{ gap: 1 }}>
                {(
                  [
                    { clave: 'sulfatoFerroso', tabletas: 'sulfatoFerrosoTabletas', texto: 'Sulfato ferroso', unidad: 'tabletas' },
                    { clave: 'acidoFolico', tabletas: 'acidoFolicoTabletas', texto: 'Ácido fólico', unidad: 'tabletas' },
                    { clave: 'td', tabletas: 'tdDosis', texto: 'Td', unidad: 'dosis' },
                  ] as const
                ).map((s) => (
                  <Stack
                    key={s.clave}
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{ gap: 2, alignItems: { sm: 'center' } }}
                  >
                    <LineaPregunta texto={s.texto}>
                      <SelectorSiNo
                        etiqueta={s.texto}
                        denso
                        valor={borrador.hoja[s.clave]}
                        onCambio={(v) => cambiarHoja({ [s.clave]: v } as Partial<HojaPosparto>)}
                      />
                    </LineaPregunta>
                    <TextField
                      label={'Número de ' + s.unidad}
                      value={borrador.hoja[s.tabletas]}
                      onChange={(e) =>
                        cambiarHoja({ [s.tabletas]: e.target.value } as Partial<HojaPosparto>)
                      }
                      size="small"
                      inputMode="numeric"
                      sx={{ width: 200 }}
                    />
                  </Stack>
                ))}

                <LineaPregunta texto="Otro medicamento">
                  <SelectorSiNo
                    etiqueta="Otro medicamento"
                    denso
                    valor={borrador.hoja.otroMedicamento}
                    onCambio={(v) => cambiarHoja({ otroMedicamento: v })}
                  />
                </LineaPregunta>
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Medicamentos indicados">
              <ListaMedicamentos
                medicamentos={borrador.medicamentos}
                onCambio={(medicamentos) => cambiar({ medicamentos })}
              />
            </BloqueFicha>

            <BloqueFicha titulo="Consejería">
              <Stack sx={{ gap: 0.25 }}>
                {cat.temasConsejeria.map((t) => (
                  <FormControlLabel
                    key={t.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={borrador.consejeriaTemas[t.id] ?? false}
                        onChange={(e) =>
                          cambiar({
                            consejeriaTemas: { ...borrador.consejeriaTemas, [t.id]: e.target.checked },
                          })
                        }
                      />
                    }
                    label={<Typography variant="body2">{t.texto}</Typography>}
                  />
                ))}
              </Stack>
            </BloqueFicha>
          </SeccionFicha>

          {/* ────────── Cierre ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.cierre = n;
            }}
            numeral="·"
            titulo="Cierre"
          >
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Motivo de la consulta"
                value={borrador.motivo}
                onChange={(e) => cambiar({ motivo: e.target.value })}
                fullWidth
                size="small"
                required
              />
              <TextField
                label="Diagnóstico"
                value={borrador.diagnostico}
                onChange={(e) => cambiar({ diagnostico: e.target.value })}
                multiline
                minRows={2}
                fullWidth
                size="small"
              />
              <TextField
                label="Conducta y tratamiento"
                value={borrador.tratamiento}
                onChange={(e) => cambiar({ tratamiento: e.target.value })}
                multiline
                minRows={2}
                fullWidth
                size="small"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
                <TextField
                  label="Referencia"
                  value={borrador.referencia}
                  onChange={(e) => cambiar({ referencia: e.target.value })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Próxima visita"
                  type="date"
                  value={borrador.fechaProximaVisita}
                  onChange={(e) => cambiar({ fechaProximaVisita: e.target.value })}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 220 }}
                />
              </Stack>
            </Stack>
          </SeccionFicha>

          {registrar.isError ? <AvisoError error={registrar.error} /> : null}

          <Stack direction="row" sx={{ gap: 2, justifyContent: 'flex-end', pb: 4 }}>
            <Button component={EnlaceRuta} to={volverA} color="inherit">
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={() => registrar.mutate()}
              disabled={registrar.isPending || borrador.motivo.trim() === ''}
            >
              {registrar.isPending ? 'Guardando...' : 'Guardar evaluación'}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
