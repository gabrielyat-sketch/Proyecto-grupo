import { useEffect, useMemo, useRef, useState } from 'react';
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
import { SeccionAntecedentes } from '../SeccionAntecedentes';
import { SeccionExamenFisico } from '../SeccionExamenFisico';
import { LineaPregunta, SelectorSiNo } from '../SelectorRespuesta';
import { AvisoDeEdad } from '../CambioDeFicha';
import {
  conAntecedentesPrevios,
  cuerpoDeAntecedentes,
  type AvanceSeccion,
  type CampoExamen,
} from '../borrador';
import {
  guardarAntecedentes,
  obtenerAntecedentes,
  obtenerCatalogo,
  obtenerPaciente,
  registrarFicha,
  SERVICIO_DE_SALUD,
  SIN_CONFIRMAR,
  type CatalogoFicha,
} from '../servicio-fichas';
import {
  borradorPrenatalVacio,
  cuerpoDeFichaPrenatal,
  type BorradorPrenatal,
  type HojaPrenatal,
} from './borrador-prenatal';

/**
 * Las secciones, con el numeral que trae la hoja.
 *
 * Es el orden impreso, que en esta ficha SÍ empieza por identificar el
 * establecimiento —al revés que la del lactante y niñez, donde los signos de
 * peligro son la sección 1—. Los numerales no se copian de una hoja a otra.
 */
const SECCIONES: readonly EntradaIndice[] = [
  { clave: 'servicio', numeral: 'I', titulo: 'Establecimiento y paciente' },
  { clave: 'peligro', numeral: 'III', titulo: 'Signos y síntomas de peligro' },
  { clave: 'consulta', numeral: 'V', titulo: 'Motivo e historia' },
  { clave: 'antecedentes', numeral: 'VII', titulo: 'Antecedentes' },
  { clave: 'examen', numeral: 'VIII', titulo: 'Examen de la embarazada' },
  { clave: 'laboratorio', numeral: '·', titulo: 'Laboratorio' },
  { clave: 'conducta', numeral: '·', titulo: 'Clasificación y conducta' },
  { clave: 'consejeria', numeral: '·', titulo: 'Consejería y cierre' },
];

/**
 * Los signos vitales que pide ESTA hoja.
 *
 * Cinco de los ocho que sabe dibujar `SeccionExamenFisico`. No están la talla
 * —que no cambia y ya vive en el expediente— ni la circunferencia de cintura,
 * que en un embarazo no significa lo que significa fuera de él. La «frecuencia
 * cardiaca materna» del papel es el `pulso`: es el mismo dato con otro nombre,
 * y darle columna propia habría dado dos sitios donde escribirlo.
 */
const VITALES: readonly CampoExamen[] = [
  'presionSistolica',
  'presionDiastolica',
  'temperaturaC',
  'pesoKg',
  'respiraciones',
  'pulso',
];

/** Los ocho renglones del laboratorio, en el orden impreso. */
const LABORATORIO: { campo: keyof HojaPrenatal; etiqueta: string; nota?: string }[] = [
  { campo: 'hemoglobinaHematocrito', etiqueta: 'Hemoglobina y hematocrito', nota: 'Ej. 11.2 / 34' },
  { campo: 'grupoRh', etiqueta: 'Grupo y RH' },
  { campo: 'orina', etiqueta: 'Orina', nota: 'Proteína, glucosa y cetona' },
  { campo: 'glicemia', etiqueta: 'Glicemia' },
  { campo: 'vdrl', etiqueta: 'VDRL' },
  { campo: 'vih', etiqueta: 'VIH', nota: 'Oferte la prueba con consejería' },
  { campo: 'papanicolau', etiqueta: 'Papanicolau' },
  { campo: 'infecciones', etiqueta: 'Infecciones' },
];

/**
 * La hoja prenatal — páginas 1 y 2 del formulario del MSPAS.
 *
 * Lo que la hace distinta de las tres ya construidas:
 *
 * **No tiene matriz de problemas.** Las otras tres traen una tabla de
 * problemas, signos y diagnósticos. Aquí el papel deja una raya que dice
 * «Problemas detectados», y eso es lo que se dibuja: un campo de texto. Forzar
 * la matriz habría sido inventar un catálogo que el MSPAS no imprimió.
 *
 * **El examen general es UNA casilla para cuatro hallazgos.** «Estado general,
 * palidez palmar, conjuntivas, uñas: ¿Normal?». Partirla en cuatro daría una
 * ficha que no se puede comparar con la que la enfermera llenó ayer en papel.
 *
 * **Las semanas de gestación se preguntan aunque el sistema sepa calcularlas.**
 * El rótulo dice «Semanas embarazo por FUR **y/o AU**»: el papel admite
 * estimarlas por altura uterina cuando la paciente no recuerda su última regla,
 * y eso es criterio clínico, no una resta de fechas. Lo calculado se enseña al
 * lado, en cuanto hay FUR, para que se vean las dos.
 *
 * **A quien no le toca por edad, se le avisa y no se le bloquea**, como en las
 * demás: el CAP transcribe expedientes de papel.
 */
export function PaginaFichaPrenatal() {
  const { pacienteId = '' } = useParams();
  const navegar = useNavigate();
  const [activa, setActiva] = useState('servicio');
  const secciones = useRef<Record<string, HTMLDivElement | null>>({});

  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });

  const catalogo = useQuery({
    queryKey: ['catalogo-ficha', 'PRENATAL'],
    queryFn: () => obtenerCatalogo('PRENATAL'),
  });

  const antecedentes = useQuery({
    queryKey: ['antecedentes', pacienteId],
    queryFn: () => obtenerAntecedentes(pacienteId),
    enabled: pacienteId !== '',
  });

  const [borrador, setBorrador] = useState<BorradorPrenatal | null>(null);

  // Los antecedentes ya respondidos se traen a la hoja en cuanto llegan: en
  // esta ficha eso incluye la FUR y las gestas, que son la pagina 1 entera y
  // que nadie tiene por que volver a teclear en cada control.
  useEffect(() => {
    if (borrador || !catalogo.data || antecedentes.isLoading) return;
    const vacio = borradorPrenatalVacio(catalogo.data);
    setBorrador(
      antecedentes.data
        ? { ...conAntecedentesPrevios(vacio, antecedentes.data), hoja: vacio.hoja, consejeriaTemas: vacio.consejeriaTemas }
        : vacio,
    );
    window.scrollTo({ top: 0 });
  }, [borrador, catalogo.data, antecedentes.data, antecedentes.isLoading]);

  const registrar = useMutation({
    mutationFn: async () => {
      if (!borrador || !paciente.data?.expediente) throw new Error('La ficha todavia no esta lista.');

      // Los antecedentes van PRIMERO y aparte, como en la ficha de adultos:
      // pertenecen al paciente y no a esta consulta. Aqui pesa aun mas, porque
      // entre ellos va la FUR, de la que salen las semanas de TODOS los
      // controles siguientes.
      const cambios = cuerpoDeAntecedentes(borrador);
      if (cambios) await guardarAntecedentes(pacienteId, cambios);

      return registrarFicha(paciente.data.expediente.id, cuerpoDeFichaPrenatal(borrador));
    },
    onSuccess: () => navegar('/pacientes/' + pacienteId + '/expediente'),
  });

  const semanasCalculadas = useMemo(() => {
    const fur = borrador?.obstetricos.fur;
    if (!fur) return null;
    const [anio, mes, dia] = fur.slice(0, 10).split('-').map(Number);
    if (!anio || !mes || !dia) return null;
    const desde = new Date(anio, mes - 1, dia);
    const hasta = borrador.fecha ? new Date(borrador.fecha + 'T00:00:00') : new Date();
    const dias = Math.floor((hasta.getTime() - desde.getTime()) / 86_400_000);
    return dias < 0 ? null : Math.floor(dias / 7);
  }, [borrador?.obstetricos.fur, borrador?.fecha]);

  function cambiar(cambios: Partial<BorradorPrenatal>) {
    setBorrador((previo) => (previo ? { ...previo, ...cambios } : previo));
  }

  function cambiarHoja(cambios: Partial<HojaPrenatal>) {
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

  return (
    <Box>
      <AvisoDeEdad
        fechaNacimiento={datos.fechaNacimiento as unknown as string}
        pacienteId={pacienteId}
        nombres={datos.nombres}
        tipoDeEstaFicha="PRENATAL"
      />

      <EncabezadoFicha
        titulo="Ficha clínica prenatal"
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
          to={'/pacientes/' + pacienteId + '/ficha-posparto'}
          variant="outlined"
          size="small"
        >
          Evaluación del posparto
        </Button>
      </EncabezadoFicha>

      {datos.sexo !== 'F' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Este paciente está registrado como masculino. Esta hoja es la del control prenatal. Si el
          sexo está mal en el expediente, corríjalo en Recepción antes de seguir.
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ position: { md: 'sticky' }, top: ALTO_BARRA + 24, flexShrink: 0 }}>
          <IndiceFicha entradas={SECCIONES} avance={avance} activa={activa} onIr={irA} />
        </Box>

        <Stack sx={{ gap: 2, flex: 1, minWidth: 0 }}>
          {/* ────────── I y II. Establecimiento y paciente ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.servicio = n;
            }}
            numeral="I"
            titulo="Identificación del establecimiento y datos de la paciente"
            nota="No se preguntan: el sistema corre en un solo establecimiento y los datos de la paciente ya están en su expediente."
          >
            <BloqueFicha titulo="Establecimiento">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Dato titulo="Tipo" valor={SERVICIO_DE_SALUD.tipo} />
                <Dato titulo="Nombre" valor={SERVICIO_DE_SALUD.nombre} />
                <Dato titulo="Distrito" valor={SERVICIO_DE_SALUD.distrito ?? SIN_CONFIRMAR} />
                <Dato titulo="Área de salud" valor={SERVICIO_DE_SALUD.areaDeSalud} />
              </Box>
            </BloqueFicha>

            <BloqueFicha titulo="Paciente">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Dato titulo="Nombre" valor={datos.apellidos + ', ' + datos.nombres} />
                <Dato titulo="CUI o DPI" valor={datos.dpi ?? '—'} />
                <Dato titulo="Comunidad" valor={comunidad || '—'} />
                <Dato titulo="Expediente" valor={datos.expediente.numero} />
              </Box>
            </BloqueFicha>
          </SeccionFicha>

          {/* ────────── III. Signos y síntomas de peligro ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.peligro = n;
            }}
            numeral="III"
            titulo="Identifique y evalúe signos y síntomas de peligro"
            nota="De acuerdo al nivel de resolución, trate o refiera."
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

            <BloqueFicha titulo="IV. Si refirió a la paciente, registre manejo y estabilización">
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

          {/* ────────── V y VI. Motivo e historia ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.consulta = n;
            }}
            numeral="V"
            titulo="Motivo de la consulta e historia de la enfermedad actual"
          >
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Motivo de la consulta"
                value={borrador.motivo}
                onChange={(e) => cambiar({ motivo: e.target.value })}
                fullWidth
                size="small"
                required
                helperText="El papel ofrece embarazo, parto, posparto u otro. Se escribe para poder decir cuál."
              />
              <TextField
                label="VI. Historia de la enfermedad actual"
                value={borrador.historiaEnfermedad}
                onChange={(e) => cambiar({ historiaEnfermedad: e.target.value })}
                multiline
                minRows={3}
                fullWidth
                size="small"
              />
            </Stack>
          </SeccionFicha>

          {/* ────────── VII. Antecedentes ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.antecedentes = n;
            }}
            numeral="VII"
            titulo="Antecedentes"
            nota="Son de la paciente, no de esta consulta: lo ya respondido en otra visita viene marcado, y lo que se cambie aquí queda para las siguientes."
          >
            <SeccionAntecedentes
              catalogo={cat.antecedentes}
              valores={borrador.antecedentes}
              obstetricos={borrador.obstetricos}
              esMujer
              onCambio={(id, casilla) =>
                cambiar({ antecedentes: { ...borrador.antecedentes, [id]: casilla } })
              }
              onCambioObstetricos={(obstetricos) => cambiar({ obstetricos })}
            />
          </SeccionFicha>

          {/* ────────── VIII. Examen físico de la embarazada ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.examen = n;
            }}
            numeral="VIII"
            titulo="Examen físico de la embarazada"
          >
            <BloqueFicha titulo="Signos vitales">
              <SeccionExamenFisico
                valores={borrador.examen}
                campos={VITALES}
                onCambio={(campo, valor) =>
                  cambiar({ examen: { ...borrador.examen, [campo]: valor } })
                }
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                El papel llama «frecuencia cardiaca materna» al pulso, y pide el peso en libras: el
                equivalente aparece debajo del campo mientras se escribe.
              </Typography>
            </BloqueFicha>

            <BloqueFicha titulo="Examen general">
              <Stack sx={{ gap: 1 }}>
                <LineaPregunta texto="Estado general, palidez palmar, conjuntivas, uñas. ¿Normal?">
                  <SelectorSiNo
                    etiqueta="Examen general normal"
                    denso
                    valor={borrador.hoja.examenGeneralNormal}
                    onCambio={(v) => cambiarHoja({ examenGeneralNormal: v })}
                  />
                </LineaPregunta>
                <TextField
                  label="Examen buco dental (describa hallazgos)"
                  value={borrador.hoja.examenBucodental}
                  onChange={(e) => cambiarHoja({ examenBucodental: e.target.value })}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Circunferencia del brazo"
                  value={borrador.hoja.circunferenciaBrazoCm}
                  onChange={(e) => cambiarHoja({ circunferenciaBrazoCm: e.target.value })}
                  size="small"
                  inputMode="decimal"
                  sx={{ width: 260 }}
                  helperText="Solo si el embarazo es menor de 12 semanas · cm"
                />
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Examen obstétrico">
              <Stack sx={{ gap: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
                  <TextField
                    label="Altura uterina"
                    value={borrador.hoja.alturaUterinaCm}
                    onChange={(e) => cambiarHoja({ alturaUterinaCm: e.target.value })}
                    size="small"
                    inputMode="decimal"
                    helperText="cm"
                    sx={{ width: 180 }}
                  />
                  <TextField
                    label="Frecuencia cardiaca fetal"
                    value={borrador.hoja.fcf}
                    onChange={(e) => cambiarHoja({ fcf: e.target.value })}
                    size="small"
                    inputMode="numeric"
                    helperText="Si procede · latidos por minuto"
                    sx={{ width: 220 }}
                  />
                  <TextField
                    label="Presentación por Leopold"
                    value={borrador.hoja.presentacionLeopold}
                    onChange={(e) => cambiarHoja({ presentacionLeopold: e.target.value })}
                    size="small"
                    helperText="A partir de las 36 semanas"
                    sx={{ width: 240 }}
                  />
                </Stack>
                <LineaPregunta texto="Presencia de movimientos fetales (20 semanas o más)">
                  <SelectorSiNo
                    etiqueta="Movimientos fetales"
                    denso
                    valor={borrador.hoja.movimientosFetales}
                    onCambio={(v) => cambiarHoja({ movimientosFetales: v })}
                  />
                </LineaPregunta>
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Examen ginecológico">
              <Stack sx={{ gap: 1 }}>
                <LineaPregunta texto="Presencia de trazas de sangre o manchado">
                  <SelectorSiNo
                    etiqueta="Trazas de sangre o manchado"
                    denso
                    valor={borrador.hoja.trazasSangre}
                    onCambio={(v) => cambiarHoja({ trazasSangre: v })}
                  />
                </LineaPregunta>
                {/* La raya de "(describa)" solo aparece cuando hay algo que describir. */}
                {borrador.hoja.trazasSangre === true ? (
                  <TextField
                    label="Describa"
                    value={borrador.hoja.trazasSangreDescripcion}
                    onChange={(e) => cambiarHoja({ trazasSangreDescripcion: e.target.value })}
                    fullWidth
                    size="small"
                  />
                ) : null}

                <LineaPregunta texto="Verrugas, herpes, papilomas, úlceras">
                  <SelectorSiNo
                    etiqueta="Verrugas, herpes, papilomas o úlceras"
                    denso
                    valor={borrador.hoja.lesionesVulvares}
                    onCambio={(v) => cambiarHoja({ lesionesVulvares: v })}
                  />
                </LineaPregunta>
                {borrador.hoja.lesionesVulvares === true ? (
                  <TextField
                    label="Describa"
                    value={borrador.hoja.lesionesVulvaresDescripcion}
                    onChange={(e) => cambiarHoja({ lesionesVulvaresDescripcion: e.target.value })}
                    fullWidth
                    size="small"
                  />
                ) : null}

                <LineaPregunta texto="Flujo vaginal">
                  <SelectorSiNo
                    etiqueta="Flujo vaginal"
                    denso
                    valor={borrador.hoja.flujoVaginal}
                    onCambio={(v) => cambiarHoja({ flujoVaginal: v })}
                  />
                </LineaPregunta>
              </Stack>
            </BloqueFicha>
          </SeccionFicha>

          {/* ────────── Laboratorio ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.laboratorio = n;
            }}
            numeral="·"
            titulo="Exámenes de laboratorio o pruebas de gabinete"
            nota="Se anota el resultado tal como lo entrega el laboratorio. Todos se guardan cifrados."
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              {LABORATORIO.map(({ campo, etiqueta, nota }) => (
                <TextField
                  key={campo}
                  label={etiqueta}
                  value={borrador.hoja[campo] as string}
                  onChange={(e) => cambiarHoja({ [campo]: e.target.value } as Partial<HojaPrenatal>)}
                  size="small"
                  helperText={nota}
                />
              ))}
            </Box>
          </SeccionFicha>

          {/* ────────── Clasificación y conducta ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.conducta = n;
            }}
            numeral="·"
            titulo="Clasificación y conducta"
          >
            <BloqueFicha titulo="Clasificación">
              <Stack sx={{ gap: 1.5 }}>
                <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    label="Semanas de embarazo por FUR y/o AU"
                    value={borrador.hoja.semanasPorFurAu}
                    onChange={(e) => cambiarHoja({ semanasPorFurAu: e.target.value })}
                    size="small"
                    inputMode="numeric"
                    sx={{ width: 280 }}
                  />
                  {/*
                    Lo calculado se ensena al lado, no se mete en la casilla: el
                    papel admite estimar las semanas por altura uterina cuando la
                    paciente no recuerda su ultima regla, y esa es una lectura
                    clinica que el sistema no puede hacer por ella.
                  */}
                  <Typography variant="body2" color="text.secondary">
                    {semanasCalculadas === null
                      ? 'Sin FUR registrada, el sistema no puede calcularlas'
                      : 'Por la FUR del expediente: ' + semanasCalculadas + ' semanas'}
                  </Typography>
                </Stack>

                <TextField
                  label="Problemas detectados"
                  value={borrador.hoja.problemasDetectados}
                  onChange={(e) => cambiarHoja({ problemasDetectados: e.target.value })}
                  multiline
                  minRows={2}
                  fullWidth
                  size="small"
                  helperText="Esta hoja no trae la tabla de problemas de las otras tres: el papel deja una raya."
                />
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Conducta">
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
                <TextField
                  label="Sulfato ferroso"
                  value={borrador.hoja.sulfatoFerrosoTabletas}
                  onChange={(e) => cambiarHoja({ sulfatoFerrosoTabletas: e.target.value })}
                  size="small"
                  inputMode="numeric"
                  helperText="Número de tabletas"
                  sx={{ width: 200 }}
                />
                <TextField
                  label="Ácido fólico"
                  value={borrador.hoja.acidoFolicoTabletas}
                  onChange={(e) => cambiarHoja({ acidoFolicoTabletas: e.target.value })}
                  size="small"
                  inputMode="numeric"
                  helperText="Número de tabletas"
                  sx={{ width: 200 }}
                />
                <TextField
                  label="Vacunación (Td)"
                  value={borrador.hoja.tdDosis}
                  onChange={(e) => cambiarHoja({ tdDosis: e.target.value })}
                  size="small"
                  inputMode="numeric"
                  helperText="Dosis administrada"
                  sx={{ width: 200 }}
                />
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Medicamentos indicados">
              <ListaMedicamentos
                medicamentos={borrador.medicamentos}
                onCambio={(medicamentos) => cambiar({ medicamentos })}
              />
            </BloqueFicha>
          </SeccionFicha>

          {/* ────────── Consejería y cierre ────────── */}
          <SeccionFicha
            ref={(n) => {
              secciones.current.consejeria = n;
            }}
            numeral="·"
            titulo="Consejería y cierre"
          >
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
                            consejeriaTemas: {
                              ...borrador.consejeriaTemas,
                              [t.id]: e.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label={<Typography variant="body2">{t.texto}</Typography>}
                  />
                ))}
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Cierre">
              <Stack sx={{ gap: 2 }}>
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
                  label="Tratamiento"
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
            </BloqueFicha>
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
              {registrar.isPending ? 'Guardando...' : 'Guardar ficha'}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
