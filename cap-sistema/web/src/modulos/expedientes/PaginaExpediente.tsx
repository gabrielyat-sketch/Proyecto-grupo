import { useState } from 'react';
import { Link as EnlaceRuta, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../componentes/AvisoError';
import { usarVolver } from '../../navegacion/usarVolver';
import { usarSesion } from '../sesion/contexto';
import { obtenerPaciente } from '../fichas/servicio-fichas';
import { ETIQUETA_IDIOMA } from '../recepcion/servicio-pacientes';
import { EntradaHistorial } from './EntradaHistorial';
import { obtenerHistorial } from './servicio-expedientes';
import { fichaParaPaciente } from '../fichas/ficha-por-edad';

/** El historial clinico no es de todos: Recepcion y Farmacia no entran. */
const VEN_EL_HISTORIAL = ['MEDICO', 'ENFERMERIA', 'DIRECTOR', 'ADMINISTRADOR'];
const ATIENDEN = ['MEDICO', 'ENFERMERIA'];

/**
 * El expediente de un paciente.
 *
 * Responde la pregunta que el CAP hace todos los dias y que hasta ahora el
 * sistema no podia contestar: "que le pusimos la vez pasada". Se capturaban
 * fichas y no habia forma de volver a verlas.
 *
 * Lo mas reciente primero, porque es lo que casi siempre se busca. Quien
 * necesita el historial completo baja; quien solo quiere saber como quedo la
 * ultima consulta lo tiene en la primera pantalla, sin desplazarse.
 */
export function PaginaExpediente() {
  const { pacienteId = '' } = useParams();
  const { usuario } = usarSesion();
  const [pagina, setPagina] = useState(1);

  const puedeVerHistorial = VEN_EL_HISTORIAL.includes(usuario?.rol ?? '');
  const puedeAtender = ATIENDEN.includes(usuario?.rol ?? '');

  // Antes de cualquier `return`: las reglas de los hooks no admiten
  // llamadas condicionales, y mas abajo hay salidas tempranas.
  const volver = usarVolver({ a: '/recepcion', etiqueta: 'Recepcion' });

  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });

  const expedienteId = paciente.data?.expediente?.id;

  const historial = useQuery({
    queryKey: ['historial', expedienteId, pagina],
    queryFn: () => obtenerHistorial(expedienteId!, pagina),
    enabled: Boolean(expedienteId) && puedeVerHistorial,
    placeholderData: keepPreviousData,
  });

  if (paciente.isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (paciente.isError) return <AvisoError error={paciente.error} />;
  if (!paciente.data) return null;

  const p = paciente.data;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Button
        component={EnlaceRuta}
        to={volver.a}
        startIcon={<ArrowBackIcon />}
        size="small"
        color="inherit"
        sx={{ mb: 1.5, ml: -1 }}
      >
        {volver.etiqueta}
      </Button>

      {/* ─── Quien es ──────────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 2.5, mb: 2 }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: 2, justifyContent: 'space-between' }}
        >
          <Stack sx={{ gap: 0.5, minWidth: 0 }}>
            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: 14 }}>
              {p.expediente?.numero ?? 'Sin expediente'}
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {p.apellidos}, {p.nombres}
            </Typography>
            <Typography color="text.secondary">
              {p.edad} anos · {p.sexo === 'F' ? 'Femenino' : 'Masculino'} · {p.comunidad?.nombre} ·{' '}
              {ETIQUETA_IDIOMA[p.idioma] ?? p.idioma}
            </Typography>
            {p.fallecido ? (
              <Chip label="Fallecido" size="small" sx={{ width: 'fit-content', mt: 0.5 }} />
            ) : null}
          </Stack>

          {/*
            La hoja que le toca por edad, no siempre la de adultos.

            Estaba escrita a mano —`/ficha` para todo el mundo— asi que desde el
            expediente de un recien nacido se abria la de adolescente, adulto y
            adulto mayor. Es el mismo criterio que ya aplican recepcion y la
            sala de espera; tenerlo en un solo sitio es lo que impide que se
            separen.
          */}
          {puedeAtender && !p.fallecido ? (
            <Button
              component={EnlaceRuta}
              to={
                fichaParaPaciente(p.fechaNacimiento as unknown as string, p.id).ruta ??
                '/pacientes/' + p.id + '/ficha'
              }
              variant="contained"
              sx={{ alignSelf: { md: 'flex-start' }, flexShrink: 0 }}
            >
              Nueva ficha
            </Button>
          ) : null}
        </Stack>
      </Paper>

      {/* ─── El historial ──────────────────────────────────────────────── */}
      {!puedeVerHistorial ? (
        <Alert severity="info">
          <AlertTitle>El historial clinico no esta disponible para su rol</AlertTitle>
          Puede consultar los datos del paciente y su numero de expediente, pero no sus
          diagnosticos. Es la misma restriccion que aplica el servidor.
        </Alert>
      ) : !p.expediente ? (
        <Alert severity="warning">
          Este paciente no tiene expediente abierto, asi que todavia no hay historial.
        </Alert>
      ) : (
        <Stack sx={{ gap: 2 }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Historial
            </Typography>
            {historial.data ? (
              <Typography variant="body2" color="text.secondary">
                {historial.data.total === 1
                  ? '1 atencion registrada'
                  : historial.data.total + ' atenciones registradas'}
              </Typography>
            ) : null}
          </Stack>

          {historial.isLoading && !historial.data ? (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : historial.isError ? (
            <AvisoError error={historial.error} />
          ) : historial.data && historial.data.total === 0 ? (
            <Alert severity="info">
              Este expediente todavia no tiene ninguna atencion registrada.
              {puedeAtender ? ' Puede empezar con una ficha nueva.' : ''}
            </Alert>
          ) : historial.data ? (
            <Box
              sx={{
                opacity: historial.isFetching ? 0.55 : 1,
                transition: 'opacity 120ms ease-out',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              }}
            >
              <Stack sx={{ gap: 1.5 }}>
                {historial.data.datos.map((a) => (
                  <EntradaHistorial key={a.id} atencion={a} />
                ))}
              </Stack>
            </Box>
          ) : null}

          {historial.data && historial.data.totalPaginas > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={historial.data.totalPaginas}
                page={historial.data.pagina}
                onChange={(_e, n) => {
                  setPagina(n);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                color="primary"
                siblingCount={0}
              />
            </Box>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
