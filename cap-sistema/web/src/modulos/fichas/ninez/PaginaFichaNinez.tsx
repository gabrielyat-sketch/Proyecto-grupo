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
import { ListaMedicamentos } from '../ListaMedicamentos';
import { LineaPregunta, SelectorSiNo } from '../SelectorRespuesta';
import { ETIQUETA_TIPO_LUGAR } from '../../recepcion/servicio-pacientes';
import {
  obtenerCatalogo,
  obtenerPaciente,
  registrarFicha,
  SERVICIO_DE_SALUD,
  SIN_CONFIRMAR,
  type CatalogoFicha,
} from '../servicio-fichas';
import type { AvanceSeccion } from '../borrador';
import {
  borradorNinezVacio,
  cuerpoDeFichaNinez,
  edadDicha,
  edadEnMeses,
  EDAD_MAXIMA_NINEZ_ANIOS,
  fueraDeRangoNinez,
  respiracionRapida,
  type BorradorNinez,
  type CampoVitalNinez,
} from './borrador-ninez';

/**
 * Las secciones, con el numeral que trae la hoja.
 *
 * El orden no es el de las otras dos fichas y no se puede copiar: aquí los
 * signos de peligro son la sección **1**, antes de identificar el servicio.
 * El papel los pone arriba del todo porque es lo primero que se mira al
 * recibir a un niño.
 *
 * De la 4 en adelante es la página 3, la hoja de consulta, que no lleva
 * numerales impresos: los suyos son los de las columnas de la matriz.
 */
const SECCIONES: readonly EntradaIndice[] = [
  { clave: 'peligro', numeral: '1', titulo: 'Signos y síntomas de peligro' },
  { clave: 'servicio', numeral: '2', titulo: 'Identificación del servicio' },
  { clave: 'datos', numeral: '3', titulo: 'Datos generales' },
  { clave: 'consulta', numeral: '·', titulo: 'Motivo y signos vitales' },
  { clave: 'problemas', numeral: '·', titulo: 'Revisión de problemas' },
  { clave: 'tratamiento', numeral: '·', titulo: 'Tratamiento y cierre' },
];

/**
 * Una fecha `aaaa-mm-dd` dicha como se lee en el papel.
 *
 * Se parte la cadena en vez de construir un `Date` con ella entera: Guatemala
 * es UTC-6 y `new Date('2026-08-20')` es medianoche UTC, que aquí todavía es
 * el 19.
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

/** Un signo vital, con su unidad y su aviso de rango. */
function CampoVital({
  etiqueta,
  campo,
  unidad,
  valor,
  onCambio,
}: {
  etiqueta: string;
  campo: CampoVitalNinez;
  unidad: string;
  valor: string;
  onCambio: (v: string) => void;
}) {
  const raro = fueraDeRangoNinez(campo, valor);
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
 * La hoja de consulta de la ficha del lactante y niñez — página 3 del papel.
 *
 * **Esta ficha es un carnet, y esta pantalla es solo su hoja de consulta.** Las
 * páginas 1 y 2 —vacunas, micronutrientes, padres, casa— no son de la visita
 * sino del niño: se llenan a lo largo de años y necesitan tablas propias. Van
 * en la etapa B, y el porqué está en `docs/diseno-ficha-ninez.md`.
 *
 * Lo que la hace distinta de las dos ya construidas:
 *
 * **Los signos de peligro se preguntan en CADA visita.** El encabezado impreso
 * lo ordena: «si es reconsulta, volver a investigar signos de peligro». Con uno
 * marcado, la pantalla lo dice en el momento.
 *
 * **El peso se teclea en libras**, que es como el papel lo pide, y se guarda en
 * kilos, que es la única columna que alimenta los indicadores de desnutrición
 * de todo el sistema.
 *
 * **El umbral de respiración rápida lo calcula el sistema.** Está impreso en la
 * hoja para compararlo a mano —60 por debajo de dos meses, 50 hasta el año, 40
 * de ahí a los cinco—; aquí, que ya se conocen la edad y las respiraciones, se
 * dice en el momento. Avisa, no decide: quien atiende marca lo que corresponda.
 */
export function PaginaFichaNinez() {
  const { pacienteId = '' } = useParams();
  const navegar = useNavigate();
  const [activa, setActiva] = useState('peligro');
  const secciones = useRef<Record<string, HTMLDivElement | null>>({});

  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });

  const catalogo = useQuery({
    queryKey: ['catalogo-ficha', 'NINEZ'],
    queryFn: () => obtenerCatalogo('NINEZ'),
  });

  const [borrador, setBorrador] = useState<BorradorNinez | null>(null);
  const actual = useMemo(() => {
    if (borrador) return borrador;
    if (!catalogo.data) return null;
    return borradorNinezVacio(catalogo.data);
  }, [borrador, catalogo.data]);

  const guardar = useMutation({
    mutationFn: (cuerpo: ReturnType<typeof cuerpoDeFichaNinez>) =>
      registrarFicha(paciente.data!.expediente!.id, cuerpo),
    onSuccess: () => navegar('/pacientes/' + pacienteId + '/expediente'),
  });

  function cambiar(cambios: Partial<BorradorNinez>) {
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
  const meses = edadEnMeses(datos.fechaNacimiento as unknown as string);
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
          Este paciente no tiene expediente abierto. Recepción tiene que abrirlo antes de poder
          registrar una ficha.
        </Alert>
      </Box>
    );
  }

  const cat: CatalogoFicha = catalogo.data;

  // Los cuatro signos de peligro marcados. El papel no dice "enfermedad grave"
  // como en el neonato: dice "proceda de acuerdo a nivel de resolucion", que es
  // lo que la pantalla repite sin adornar.
  const peligros = cat.signosPeligro
    .filter((s) => actual.signosPeligro[s.id]?.presente === true)
    .map((s) => s.texto);

  const respiraciones = Number(actual.vitales.respiraciones);
  const aviso =
    actual.vitales.respiraciones.trim() !== '' && Number.isFinite(respiraciones)
      ? respiracionRapida(meses, respiraciones)
      : null;

  // En Purulha nadie tiene calle y numero: la direccion es el barrio, caserio o
  // aldea dentro de su comunidad, que es lo que recepcion pregunta.
  const lugar = datos.lugar;
  const comunidad = datos.comunidad?.nombre ?? '';
  const partesDireccion = [
    lugar ? (ETIQUETA_TIPO_LUGAR[lugar.tipo] ?? lugar.tipo) + ' ' + lugar.nombre : '',
    comunidad,
  ].filter((parte) => parte !== '');
  const direccion = partesDireccion.length > 0 ? partesDireccion.join(', ') : '—';

  const avance: Record<string, AvanceSeccion> = {};
  for (const s of SECCIONES) avance[s.clave] = { respondidas: 0, total: 0 };

  return (
    <Box>
      <EncabezadoFicha
        titulo="Ficha clínica del lactante y niñez"
        volverA={volverA}
        volverTexto="Expediente"
        nombre={datos.apellidos + ', ' + datos.nombres}
        resumen={
          edadDicha(meses) +
          ' · ' +
          (datos.sexo === 'F' ? 'Femenino' : 'Masculino') +
          ' · ' +
          (comunidad || 'Sin comunidad')
        }
        expediente={datos.expediente.numero}
        fecha={{ valor: actual.fecha, onCambio: (v) => cambiar({ fecha: v }) }}
      >
        {/*
          El carnet -vacunas, micronutrientes, padres y casa- vive aparte
          porque es del nino y no de esta visita. Se llega con un boton: la
          sesion vive solo en memoria y escribir la direccion a mano recarga la
          pagina y echa al usuario.
        */}
        <Button
          component={EnlaceRuta}
          to={'/pacientes/' + pacienteId + '/carnet'}
          variant="outlined"
          size="small"
        >
          Carnet
        </Button>
      </EncabezadoFicha>

      {/*
        No se bloquea la captura: el CAP transcribe expedientes de papel, y una
        ficha de hace tres anos se llena con la edad que el nino tenia entonces.
      */}
      {meses >= EDAD_MAXIMA_NINEZ_ANIOS * 12 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Este paciente tiene {edadDicha(meses)}. Esta hoja llega hasta los{' '}
          {EDAD_MAXIMA_NINEZ_ANIOS} años; de ahí en adelante va la de adolescente y adulto. Si
          está transcribiendo una consulta antigua, continúe.
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ position: { md: 'sticky' }, top: 88, flexShrink: 0 }}>
          <IndiceFicha entradas={SECCIONES} avance={avance} activa={activa} onIr={irA} />
        </Box>

        <Stack sx={{ gap: 2, flex: 1, minWidth: 0 }}>
          {/* ────────── 1. Signos y síntomas de peligro ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.peligro = n;
            }}
            numeral="1"
            titulo="Evalúe signos y síntomas de peligro"
            nota="Es lo primero de la hoja, antes que ningún otro dato. Y se vuelve a preguntar en cada reconsulta, no solo la primera vez."
          >
            <Stack sx={{ gap: 0.5 }}>
              {peligros.length > 0 ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                  <AlertTitle>Proceda de acuerdo a nivel de resolución</AlertTitle>
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
          </SeccionFicha>

          {/* ────────── 2. Identificación del servicio ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.servicio = n;
            }}
            numeral="2"
            titulo="Identificación del servicio de salud"
            nota="El papel trae seis casillas —PSF, C/S «A», CENAPA, C/S «B», CAP, CAIMI— porque se imprime igual para todo el país. Aquí no se pregunta: el sistema es de un solo establecimiento."
          >
            <Stack sx={{ gap: 1.5 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
                  gap: 1.5,
                }}
              >
                <Dato titulo="Tipo de servicio" valor={SERVICIO_DE_SALUD.tipo} />
                <Dato titulo="Nombre del servicio" valor={SERVICIO_DE_SALUD.nombre} />
                <Dato titulo="Distrito" valor={SERVICIO_DE_SALUD.distrito ?? SIN_CONFIRMAR} />
                <Dato titulo="Comunidad" valor={SERVICIO_DE_SALUD.comunidad ?? SIN_CONFIRMAR} />
                <Dato titulo="Área de salud" valor={SERVICIO_DE_SALUD.areaDeSalud} />
              </Box>

              {/*
                Se dice que faltan en vez de imprimir algo inventado: esto es
                una ficha oficial, y un distrito que nadie confirmo seria un
                dato falso con aspecto de bueno.
              */}
              {SERVICIO_DE_SALUD.distrito === null || SERVICIO_DE_SALUD.comunidad === null ? (
                <Alert severity="info">
                  El distrito y la comunidad del servicio los tiene que confirmar el CAP. Esta
                  hoja es la única de las cuatro que los pide.
                </Alert>
              ) : null}
            </Stack>
          </SeccionFicha>

          {/* ────────── 3. Datos generales del paciente ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.datos = n;
            }}
            numeral="3"
            titulo="Datos generales del paciente"
            nota="Vienen del registro de recepción. Si algo está mal se corrige allí y no aquí, así el expediente y la ficha nunca dicen cosas distintas."
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              <Dato titulo="Nombre" valor={datos.apellidos + ', ' + datos.nombres} />
              <Dato
                titulo="Fecha de nacimiento"
                valor={fechaImpresa(datos.fechaNacimiento as unknown as string)}
              />
              <Dato titulo="Edad" valor={edadDicha(meses)} />
              <Dato titulo="Sexo" valor={datos.sexo === 'F' ? 'Femenino' : 'Masculino'} />
              <Dato titulo="Dirección donde vive" valor={direccion} />
              <Dato titulo="Población migrante" valor={datos.migrante ? 'Sí' : 'No'} />
              <Dato titulo="Lugar de origen" valor={datos.lugarOrigen ?? '—'} />
            </Box>
          </SeccionFicha>

          {/* ────────── Motivo, historia y signos vitales ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.consulta = n;
            }}
            numeral="·"
            titulo="Motivo de consulta y signos vitales"
          >
            <Stack sx={{ gap: 2 }}>
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
                label="Historia del problema actual"
                value={actual.historiaProblemaActual}
                onChange={(e) => cambiar({ historiaProblemaActual: e.target.value })}
                fullWidth
                multiline
                minRows={2}
              />

              <BloqueFicha titulo="Signos vitales">
                <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <CampoVital
                    etiqueta="Temperatura"
                    campo="temperaturaC"
                    unidad="°C"
                    valor={actual.vitales.temperaturaC}
                    onCambio={(v) => cambiar({ vitales: { ...actual.vitales, temperaturaC: v } })}
                  />
                  <CampoVital
                    etiqueta="Peso"
                    campo="pesoLibras"
                    unidad="Lb · como lo pide el papel"
                    valor={actual.vitales.pesoLibras}
                    onCambio={(v) => cambiar({ vitales: { ...actual.vitales, pesoLibras: v } })}
                  />
                  <CampoVital
                    etiqueta="Talla"
                    campo="tallaCm"
                    unidad="cm"
                    valor={actual.vitales.tallaCm}
                    onCambio={(v) => cambiar({ vitales: { ...actual.vitales, tallaCm: v } })}
                  />
                  <CampoVital
                    etiqueta="Pulso"
                    campo="pulso"
                    unidad="x min"
                    valor={actual.vitales.pulso}
                    onCambio={(v) => cambiar({ vitales: { ...actual.vitales, pulso: v } })}
                  />
                  <CampoVital
                    etiqueta="Respiraciones"
                    campo="respiraciones"
                    unidad="x min"
                    valor={actual.vitales.respiraciones}
                    onCambio={(v) => cambiar({ vitales: { ...actual.vitales, respiraciones: v } })}
                  />
                </Stack>

                {/*
                  El umbral esta impreso en el papel para compararlo a mano.
                  Aqui ya se conocen la edad y las respiraciones, asi que se
                  dice en el momento. Avisa, no decide.
                */}
                {aviso ? (
                  <Alert severity={aviso.rapida ? 'warning' : 'info'} sx={{ mt: 1.5 }}>
                    {aviso.rapida ? 'Respiración rápida: ' : 'Dentro del umbral: '}
                    {respiraciones} por minuto, y a los {edadDicha(meses)} el papel marca{' '}
                    {aviso.umbral} o más.
                  </Alert>
                ) : null}
              </BloqueFicha>
            </Stack>
          </SeccionFicha>

          {/* ────────── La matriz de catorce problemas ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.problemas = n;
            }}
            numeral="·"
            titulo="Revisión de problemas"
            nota="Pregunte si tiene un problema de, investigue y compruebe, clasifique. Es la misma matriz de la ficha de adultos."
          >
            <MatrizProblemas
              problemas={cat.problemas}
              valores={actual.problemas}
              onCambio={(problemaId, fila) =>
                cambiar({ problemas: { ...actual.problemas, [problemaId]: fila } })
              }
            />
          </SeccionFicha>

          {/* ────────── Tratamiento y cierre ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.tratamiento = n;
            }}
            numeral="·"
            titulo="Tratamiento y cierre de la atención"
          >
            <Stack sx={{ gap: 2 }}>
              <BloqueFicha titulo="Medicamentos indicados">
                <ListaMedicamentos
                  medicamentos={actual.medicamentos}
                  onCambio={(filas) => cambiar({ medicamentos: filas })}
                />
              </BloqueFicha>

              <BloqueFicha titulo="Consejería brindada">
                {/*
                  Cuatro casillas y ninguna fecha. En la ficha del neonato cada
                  tema lleva su fecha de reconsulta; aqui el papel solo pregunta
                  si se explico o no.
                */}
                <Stack sx={{ gap: 0 }}>
                  {cat.temasConsejeria.map((t) => (
                    <FormControlLabel
                      key={t.id}
                      control={
                        <Checkbox
                          checked={actual.consejeria[t.id] ?? false}
                          onChange={(e) =>
                            cambiar({
                              consejeria: { ...actual.consejeria, [t.id]: e.target.checked },
                            })
                          }
                        />
                      }
                      label={t.orden + '. ' + t.texto}
                    />
                  ))}
                </Stack>
              </BloqueFicha>

              <BloqueFicha titulo="Cierre">
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
                  <TextField
                    label="Vacuna administrada"
                    size="small"
                    value={actual.vacunaAdministrada}
                    onChange={(e) => cambiar({ vacunaAdministrada: e.target.value })}
                  />
                  <TextField
                    label="Referido a"
                    size="small"
                    value={actual.referencia}
                    onChange={(e) => cambiar({ referencia: e.target.value })}
                    helperText="Solo si se refirió al paciente"
                  />
                  <TextField
                    label="Fecha de próxima visita"
                    type="date"
                    size="small"
                    value={actual.fechaProximaVisita}
                    onChange={(e) => cambiar({ fechaProximaVisita: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Quien atiende queda registrado con la sesión; no hay que escribir el nombre.
                </Typography>
              </BloqueFicha>
            </Stack>
          </SeccionFicha>

          <Divider />

          {guardar.isError ? <AvisoError error={guardar.error} /> : null}

          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', pb: 4 }}>
            <Button
              variant="contained"
              size="large"
              disabled={actual.motivo.trim() === '' || guardar.isPending}
              onClick={() => guardar.mutate(cuerpoDeFichaNinez(actual))}
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
