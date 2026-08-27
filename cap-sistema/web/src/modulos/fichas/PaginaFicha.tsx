import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as EnlaceRuta, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../componentes/AvisoError';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { ETIQUETA_IDIOMA } from '../recepcion/servicio-pacientes';
import {
  avanceDe,
  borradorVacio,
  conAntecedentesPrevios,
  cuerpoDeAntecedentes,
  cuerpoDeFicha,
  hoy,
  reparosDe,
  tieneContenido,
  type Borrador,
  type CampoExamen,
  type CasillaAntecedente,
  type FilaMedicamento,
  type FilaProblema,
  type Obstetricos,
} from './borrador';
import {
  obtenerAntecedentes,
  obtenerCatalogo,
  obtenerPaciente,
  registrarFicha,
  guardarAntecedentes,
  type FichaCreada,
} from './servicio-fichas';
import { IndiceFicha, type EntradaIndice } from './IndiceFicha';
import { MatrizProblemas } from './MatrizProblemas';
import { SeccionAntecedentes } from './SeccionAntecedentes';
import { SeccionExamenFisico } from './SeccionExamenFisico';
import { SeccionPlan } from './SeccionPlan';
import { BloqueFicha, SeccionFicha } from './SeccionFicha';
import { LineaPregunta, SelectorSiNo } from './SelectorRespuesta';

/**
 * Memorizadas porque la ficha entera es un solo estado.
 *
 * Sin esto, cada letra escrita en el motivo de la consulta volveria a dibujar
 * las catorce filas de problemas con sus ciento catorce opciones. En una
 * maquina modesta —que es lo que hay en el CAP— eso se siente como que el
 * teclado se traba.
 */
const Antecedentes = memo(SeccionAntecedentes);
const Examen = memo(SeccionExamenFisico);
const Problemas = memo(MatrizProblemas);
const Plan = memo(SeccionPlan);

const SECCIONES: readonly EntradaIndice[] = [
  { clave: 'identificacion', numeral: 'I·II', titulo: 'Identificacion' },
  { clave: 'peligro', numeral: 'III', titulo: 'Signos de peligro' },
  { clave: 'consulta', numeral: 'IV·VI', titulo: 'Motivo e historia' },
  { clave: 'antecedentes', numeral: 'VII', titulo: 'Antecedentes' },
  { clave: 'examen', numeral: 'VIII', titulo: 'Examen fisico' },
  { clave: 'problemas', numeral: 'IX', titulo: 'Revision de problemas' },
  { clave: 'plan', numeral: 'IX', titulo: 'Conducta' },
  { clave: 'consejeria', numeral: 'X', titulo: 'Consejeria' },
];

/** La hoja de adultos empieza en la adolescencia; antes toca otra ficha. */
const EDAD_MINIMA_ADULTO = 10;

/**
 * Ficha clinica de adolescente, adulto y adulto mayor.
 *
 * Es el formulario mas largo del sistema: diez secciones y cerca de doscientos
 * campos. Dos decisiones lo gobiernan:
 *
 * 1. Una sola pagina, en el orden impreso. Quien captura tiene el papel al lado
 *    y va bajando; con pestanas tendria que buscar en la pantalla lo que en la
 *    hoja esta a la vista, y media ficha podria quedar sin llenar sin que nadie
 *    lo note.
 * 2. Todo alcanzable con el teclado. Las respuestas si/no se eligen con S y N,
 *    Alt+numero salta de seccion y Ctrl+Enter guarda. Es lo que exige el modo
 *    de digitalizacion (RF-08): miles de expedientes de papel transcritos a
 *    mano, donde cada viaje al raton se paga miles de veces.
 */
export function PaginaFicha() {
  const { pacienteId = '' } = useParams();
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardada, setGuardada] = useState<FichaCreada | null>(null);
  const [reparos, setReparos] = useState<string[]>([]);
  const [activa, setActiva] = useState('identificacion');
  const secciones = useRef<Record<string, HTMLDivElement | null>>({});

  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });

  const catalogo = useQuery({
    queryKey: ['catalogo-ficha', 'ADULTO'],
    queryFn: () => obtenerCatalogo('ADULTO'),
    // Solo cambia cuando el MSPAS reimprime el formulario.
    staleTime: 24 * 60 * 60_000,
  });

  const antecedentes = useQuery({
    queryKey: ['antecedentes', pacienteId],
    queryFn: () => obtenerAntecedentes(pacienteId),
    enabled: pacienteId !== '',
  });

  // El borrador se arma una vez que estan el catalogo y lo ya respondido: si se
  // armara solo con el catalogo, los antecedentes de visitas anteriores
  // apareceria en blanco durante un instante y quien mira rapido creeria que se
  // perdieron.
  useEffect(() => {
    if (!catalogo.data || antecedentes.isLoading || borrador) return;
    setBorrador(conAntecedentesPrevios(borradorVacio(catalogo.data), antecedentes.data));
    // La ficha se abre por el principio, en la seccion I. Al venir de la
    // busqueda el navegador conserva el desplazamiento de la pantalla anterior,
    // y empezar a media hoja obliga a subir con el raton para ver de que
    // paciente se trata.
    window.scrollTo({ top: 0 });
  }, [catalogo.data, antecedentes.data, antecedentes.isLoading, borrador]);

  // Memorizado porque recorre el borrador entero, y se consultaba en cada
  // pulsacion de tecla: con doscientos campos eso se paga en cada letra.
  const hayCambios = useMemo(
    () => borrador !== null && guardada === null && tieneContenido(borrador),
    [borrador, guardada],
  );

  // Aviso del navegador al recargar o cerrar con la ficha a medias. Veinte
  // minutos de captura no pueden irse por una tecla mal dada.
  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [hayCambios]);

  // Resalta en el indice la seccion que se esta viendo.
  useEffect(() => {
    if (!borrador || typeof IntersectionObserver === 'undefined') return;
    const vigia = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((e) => e.isIntersecting);
        const clave = visible?.target.getAttribute('data-seccion');
        if (clave) setActiva(clave);
      },
      { rootMargin: '-88px 0px -60% 0px' },
    );
    for (const nodo of Object.values(secciones.current)) if (nodo) vigia.observe(nodo);
    return () => vigia.disconnect();
  }, [borrador]);

  const irA = useCallback((clave: string) => {
    const nodo = secciones.current[clave];
    nodo?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // El foco viaja con la vista: sin esto, el tabulador seguiria donde estaba
    // y quien navega por teclado saltaria a un sitio que ya no ve.
    nodo?.querySelector<HTMLElement>('input, textarea, [role="radio"], button')?.focus();
    setActiva(clave);
  }, []);

  const registrar = useMutation({
    mutationFn: async () => {
      if (!borrador || !catalogo.data || !paciente.data?.expediente) {
        throw new Error('La ficha todavia no esta lista.');
      }

      // Los antecedentes van PRIMERO y aparte: pertenecen al paciente, no a
      // esta consulta. Si despues fallara el registro de la ficha, lo
      // preguntado hoy queda igualmente guardado en su historia, que es lo
      // correcto; al reves —ficha guardada y antecedentes perdidos— habria que
      // volver a preguntarselo todo.
      const cambios = cuerpoDeAntecedentes(borrador);
      if (cambios) await guardarAntecedentes(pacienteId, cambios);

      return registrarFicha(
        paciente.data.expediente.id,
        cuerpoDeFicha(borrador, catalogo.data.tipoFicha as 'ADULTO'),
      );
    },
    onSuccess: (ficha) => {
      setGuardada(ficha);
      setReparos([]);
      void clienteConsultas.invalidateQueries({ queryKey: ['antecedentes', pacienteId] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const guardar = useCallback(() => {
    if (!borrador || !catalogo.data || registrar.isPending) return;
    const encontrados = reparosDe(borrador, catalogo.data);
    if (encontrados.length > 0) {
      setReparos(encontrados.map((r) => r.mensaje));
      irA(encontrados[0].seccion);
      return;
    }
    setReparos([]);
    registrar.mutate();
  }, [borrador, catalogo.data, registrar, irA]);

  usarAtajo('Enter', guardar);

  // Alt+1 a Alt+8: saltar de seccion sin tocar el raton.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const indice = Number(e.key) - 1;
      if (!Number.isInteger(indice) || indice < 0 || indice >= SECCIONES.length) return;
      e.preventDefault();
      irA(SECCIONES[indice].clave);
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [irA]);

  // ─── Modificadores del borrador ──────────────────────────────────────────
  //
  // Todos con setState funcional y sin dependencias, para que su identidad no
  // cambie entre renders y las secciones memorizadas no se vuelvan a dibujar.

  const campo = useCallback(<C extends keyof Borrador>(nombre: C, valor: Borrador[C]) => {
    setBorrador((b) => (b ? { ...b, [nombre]: valor } : b));
  }, []);

  const cambiarAntecedente = useCallback((id: string, casilla: CasillaAntecedente) => {
    setBorrador((b) => (b ? { ...b, antecedentes: { ...b.antecedentes, [id]: casilla } } : b));
  }, []);

  const cambiarObstetricos = useCallback((obstetricos: Obstetricos) => {
    setBorrador((b) => (b ? { ...b, obstetricos } : b));
  }, []);

  const cambiarExamen = useCallback((nombre: CampoExamen, valor: string) => {
    setBorrador((b) => (b ? { ...b, examen: { ...b.examen, [nombre]: valor } } : b));
  }, []);

  const cambiarProblema = useCallback((id: string, fila: FilaProblema) => {
    setBorrador((b) => (b ? { ...b, problemas: { ...b.problemas, [id]: fila } } : b));
  }, []);

  const cambiarSignoPeligro = useCallback(
    (id: string, presente: boolean | null, detalle?: string) => {
      setBorrador((b) =>
        b
          ? {
              ...b,
              signosPeligro: {
                ...b.signosPeligro,
                [id]: {
                  presente,
                  detalle: detalle ?? b.signosPeligro[id]?.detalle ?? '',
                },
              },
            }
          : b,
      );
    },
    [],
  );

  const cambiarMedicamentos = useCallback((medicamentos: FilaMedicamento[]) => {
    setBorrador((b) => (b ? { ...b, medicamentos } : b));
  }, []);

  const cambiarTextoPlan = useCallback((nombre: string, valor: string) => {
    setBorrador((b) => (b ? { ...b, [nombre]: valor } : b));
  }, []);

  const avance = useMemo(
    () => (borrador && catalogo.data ? avanceDe(borrador, catalogo.data) : {}),
    [borrador, catalogo.data],
  );

  // ─── Estados previos a la ficha ──────────────────────────────────────────

  if (paciente.isLoading || catalogo.isLoading || antecedentes.isLoading || !borrador) {
    if (paciente.isError) return <AvisoError error={paciente.error} />;
    if (catalogo.isError) return <AvisoError error={catalogo.error} />;
    if (antecedentes.isError) return <AvisoError error={antecedentes.error} />;
    return (
      <Stack sx={{ alignItems: 'center', py: 8, gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Cargando el formulario...</Typography>
      </Stack>
    );
  }

  const datos = paciente.data;
  if (!datos || !catalogo.data) return <AvisoError error={paciente.error ?? catalogo.error} />;

  if (!datos.expediente) {
    return (
      <Alert severity="warning">
        <AlertTitle>Este paciente no tiene expediente abierto</AlertTitle>
        La ficha se guarda dentro del expediente. Pida en recepcion que lo abran antes de
        continuar.
      </Alert>
    );
  }

  if (datos.edad < EDAD_MINIMA_ADULTO) {
    return (
      <Alert severity="warning">
        <AlertTitle>Esta ficha no corresponde a la edad del paciente</AlertTitle>
        {datos.nombres} tiene {datos.edad} anos. El formulario de adolescente, adulto y adulto
        mayor empieza a los {EDAD_MINIMA_ADULTO}; para menores va la ficha de lactante y ninez,
        que todavia no esta construida.
      </Alert>
    );
  }

  const esMujer = datos.sexo === 'F';
  const asignarRef = (clave: string) => (nodo: HTMLDivElement | null) => {
    if (nodo) nodo.setAttribute('data-seccion', clave);
    secciones.current[clave] = nodo;
  };

  return (
    <Box>
      {/* ─── Barra fija: quien es el paciente y el boton de guardar ───────── */}
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          mb: 2,
          px: { xs: 1.5, md: 2 },
          py: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: 1.5, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', minWidth: 0 }}>
            <Button
              component={EnlaceRuta}
              to="/recepcion"
              startIcon={<ArrowBackIcon />}
              size="small"
              color="inherit"
            >
              Recepcion
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {datos.apellidos}, {datos.nombres}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {datos.edad} anos · {esMujer ? 'Femenino' : 'Masculino'} ·{' '}
                {datos.comunidad?.nombre} · Expediente{' '}
                <Box component="span" sx={{ fontFamily: 'monospace' }}>
                  {datos.expediente.numero}
                </Box>
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
            {hayCambios ? <Chip size="small" label="Sin guardar" color="warning" /> : null}
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', lg: 'block' } }}>
              Ctrl+Enter guarda
            </Typography>
            <Button variant="contained" onClick={guardar} disabled={registrar.isPending}>
              {registrar.isPending ? 'Guardando...' : 'Guardar ficha'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {guardada ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" sx={{ gap: 1 }}>
              <Button size="small" onClick={() => navegar('/recepcion')}>
                Ir a recepcion
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setGuardada(null);
                  setBorrador(conAntecedentesPrevios(borradorVacio(catalogo.data!), antecedentes.data));
                  window.scrollTo({ top: 0 });
                }}
              >
                Otra atencion
              </Button>
            </Stack>
          }
        >
          <AlertTitle>Ficha registrada</AlertTitle>
          Quedo guardada en el expediente {datos.expediente.numero} con fecha{' '}
          {new Date(guardada.fecha).toLocaleString('es-GT')}.
        </Alert>
      ) : null}

      {reparos.length > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setReparos([])}>
          <AlertTitle>Revise esto antes de guardar</AlertTitle>
          <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2.5 }}>
            {reparos.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </Typography>
        </Alert>
      ) : null}

      {registrar.isError ? (
        <Box sx={{ mb: 2 }}>
          <AvisoError error={registrar.error} />
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '188px minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <IndiceFicha entradas={SECCIONES} avance={avance} activa={activa} onIr={irA} />
        </Box>

        <Stack sx={{ gap: 2 }}>
          {/* ─── I y II ─────────────────────────────────────────────────── */}
          <SeccionFicha
            ref={asignarRef('identificacion')}
            numeral="I·II"
            titulo="Identificacion y datos generales"
            nota="Los datos del paciente vienen del registro de recepcion. Si algo esta mal, se corrige alli y no aqui: asi el expediente y la ficha nunca dicen cosas distintas."
          >
            <Stack sx={{ gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 1.5,
                }}
              >
                <Dato titulo="Nombre" valor={datos.apellidos + ', ' + datos.nombres} />
                <Dato titulo="Edad" valor={datos.edad + ' anos'} />
                <Dato titulo="Sexo" valor={esMujer ? 'Femenino' : 'Masculino'} />
                <Dato titulo="Comunidad" valor={datos.comunidad?.nombre ?? '—'} />
                <Dato titulo="Telefono" valor={datos.telefono ?? 'Sin registrar'} />
                <Dato titulo="Idioma" valor={ETIQUETA_IDIOMA[datos.idioma] ?? datos.idioma} />
                <Dato titulo="Establecimiento" valor="CAP Purulha" />
                <Dato titulo="Area de salud" valor="Baja Verapaz" />
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, alignItems: { md: 'center' } }}>
                <TextField
                  label="Fecha de la atencion"
                  type="date"
                  size="small"
                  value={borrador.fecha}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
                  onChange={(e) => campo('fecha', e.target.value)}
                  sx={{ maxWidth: { md: 220 } }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={borrador.digitalizada}
                      onChange={(e) => campo('digitalizada', e.target.checked)}
                    />
                  }
                  label="Viene de un expediente en papel"
                />
              </Stack>
            </Stack>
          </SeccionFicha>

          {/* ─── III ────────────────────────────────────────────────────── */}
          <SeccionFicha
            ref={asignarRef('peligro')}
            numeral="III"
            titulo="Signos y sintomas de peligro"
            avance={avance.peligro ? avance.peligro.respondidas + ' de ' + avance.peligro.total : undefined}
            nota="Con la casilla marcada, pulse S para si y N para no. Suprimir la deja de nuevo sin responder."
          >
            {catalogo.data.signosPeligro.map((s) => {
              const casilla = borrador.signosPeligro[s.id];
              return (
                <Box key={s.id}>
                  <LineaPregunta texto={s.texto}>
                    <SelectorSiNo
                      valor={casilla?.presente ?? null}
                      etiqueta={s.texto}
                      onCambio={(v) => cambiarSignoPeligro(s.id, v)}
                    />
                  </LineaPregunta>
                  {s.pideTexto && casilla?.presente ? (
                    <Box sx={{ pl: 2, py: 1, bgcolor: 'action.hover' }}>
                      <TextField
                        label="Describa"
                        size="small"
                        value={casilla.detalle}
                        onChange={(e) => cambiarSignoPeligro(s.id, true, e.target.value)}
                      />
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </SeccionFicha>

          {/* ─── IV a VI ────────────────────────────────────────────────── */}
          <SeccionFicha
            ref={asignarRef('consulta')}
            numeral="IV·VI"
            titulo="Manejo, motivo de consulta e historia"
          >
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Motivo de la consulta *"
                multiline
                minRows={2}
                value={borrador.motivo}
                onChange={(e) => campo('motivo', e.target.value)}
                helperText="Es lo unico obligatorio de toda la ficha"
              />
              <TextField
                label="Historia de la enfermedad actual"
                multiline
                minRows={3}
                value={borrador.historiaEnfermedad}
                onChange={(e) => campo('historiaEnfermedad', e.target.value)}
              />
              <TextField
                label="Manejo y estabilizacion del paciente referido"
                multiline
                minRows={2}
                value={borrador.manejoEstabilizacion}
                onChange={(e) => campo('manejoEstabilizacion', e.target.value)}
                helperText="Solo si el paciente llego referido de otro servicio"
              />
            </Stack>
          </SeccionFicha>

          {/* ─── VII ────────────────────────────────────────────────────── */}
          <SeccionFicha
            ref={asignarRef('antecedentes')}
            numeral="VII"
            titulo="Antecedentes"
            avance={
              avance.antecedentes
                ? avance.antecedentes.respondidas + ' de ' + avance.antecedentes.total
                : undefined
            }
            nota="Son del paciente, no de esta consulta: lo que se respondio en visitas anteriores ya viene marcado y se guarda por separado de la ficha."
          >
            <Antecedentes
              catalogo={catalogo.data.antecedentes}
              valores={borrador.antecedentes}
              obstetricos={borrador.obstetricos}
              esMujer={esMujer}
              onCambio={cambiarAntecedente}
              onCambioObstetricos={cambiarObstetricos}
            />
          </SeccionFicha>

          {/* ─── VIII ───────────────────────────────────────────────────── */}
          <SeccionFicha
            ref={asignarRef('examen')}
            numeral="VIII"
            titulo="Examen fisico"
            avance={avance.examen ? avance.examen.respondidas + ' de ' + avance.examen.total : undefined}
          >
            <Examen valores={borrador.examen} onCambio={cambiarExamen} />
          </SeccionFicha>

          {/* ─── IX ─────────────────────────────────────────────────────── */}
          <SeccionFicha
            ref={asignarRef('problemas')}
            numeral="IX"
            titulo="Revision de problemas"
            avance={
              avance.problemas ? avance.problemas.respondidas + ' de ' + avance.problemas.total : undefined
            }
            nota="Marque S en el problema que corresponda y se abriran los signos y diagnosticos de esa fila, los mismos que en el papel se subrayan."
          >
            <Problemas
              problemas={catalogo.data.problemas}
              valores={borrador.problemas}
              onCambio={cambiarProblema}
            />
          </SeccionFicha>

          {/* ─── Conducta ───────────────────────────────────────────────── */}
          <SeccionFicha ref={asignarRef('plan')} numeral="IX" titulo="Conducta y tratamiento">
            <Plan
              medicamentos={borrador.medicamentos}
              vacunaAdministrada={borrador.vacunaAdministrada}
              referencia={borrador.referencia}
              fechaProximaVisita={borrador.fechaProximaVisita}
              diagnostico={borrador.diagnostico}
              tratamiento={borrador.tratamiento}
              onMedicamentos={cambiarMedicamentos}
              onTexto={cambiarTextoPlan}
            />
          </SeccionFicha>

          {/* ─── X ──────────────────────────────────────────────────────── */}
          <SeccionFicha ref={asignarRef('consejeria')} numeral="X" titulo="Consejeria">
            <Stack sx={{ gap: 2 }}>
              <TextField
                label="Consejeria brindada"
                multiline
                minRows={3}
                value={borrador.consejeria}
                onChange={(e) => campo('consejeria', e.target.value)}
                helperText="Puede apoyarse con medicina popular tradicional de las Normas de atencion"
              />
              <BloqueFicha titulo="Observaciones">
                <TextField
                  label="Notas"
                  multiline
                  minRows={2}
                  value={borrador.notas}
                  onChange={(e) => campo('notas', e.target.value)}
                />
              </BloqueFicha>
            </Stack>
          </SeccionFicha>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ gap: 2, justifyContent: 'flex-end', pb: 4 }}
          >
            <Button component={EnlaceRuta} to="/recepcion" color="inherit">
              Salir sin guardar
            </Button>
            <Button variant="contained" size="large" onClick={guardar} disabled={registrar.isPending}>
              {registrar.isPending ? 'Guardando...' : 'Guardar ficha'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

/** Un dato que viene del registro del paciente y aqui solo se lee. */
function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Box>
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
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {valor}
      </Typography>
    </Box>
  );
}
