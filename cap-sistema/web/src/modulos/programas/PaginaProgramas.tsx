import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AvisoError } from '../../componentes/AvisoError';
import { EncabezadoPagina, NotaPagina } from '../../componentes/EncabezadoPagina';
import { ARMAZON, AVISO, ERROR, EXITO, PRIMARIO } from '../../tema';
import { NombrePaciente } from './NombrePaciente';
import {
  diasDesde,
  embarazosDeAltoRiesgo,
  ETIQUETA_PRESION,
  hipertensosAtrasados,
  listarEmbarazos,
  listarHipertensos,
} from './servicio-programas';

/** «17/09/2026» */
const fecha = (iso: string | null) =>
  iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-GT') : '—';

/** El color de cada clasificacion de presion, del juego del panel. */
const COLOR_PRESION: Record<string, string> = {
  NORMAL: EXITO,
  ELEVADA: AVISO,
  ESTADIO_1: AVISO,
  ESTADIO_2: ERROR,
  CRISIS: ERROR,
};

function Etiqueta({ texto, color }: { texto: string; color: string }) {
  return (
    <Chip
      size="small"
      label={texto}
      sx={{
        bgcolor: alpha(color, 0.1),
        color,
        fontWeight: 600,
        border: '1px solid',
        borderColor: alpha(color, 0.25),
      }}
    />
  );
}

/**
 * Cuando toca el proximo control, dicho en dias.
 *
 * «Atrasado 12 dias» dice mas que una fecha: quien lee esta pantalla esta
 * decidiendo a quien llamar hoy, y para eso la cuenta ya hecha ahorra el
 * calculo mental fila por fila.
 */
function Proximo({ iso }: { iso: string | null }) {
  if (!iso) return <>—</>;
  const dias = diasDesde(iso);
  if (dias > 0) {
    return <Etiqueta texto={'Atrasado ' + dias + (dias === 1 ? ' dia' : ' dias')} color={ERROR} />;
  }
  if (dias === 0) return <Etiqueta texto="Hoy" color={AVISO} />;
  return (
    <Typography variant="body2" color="text.secondary">
      {fecha(iso)}
    </Typography>
  );
}

/**
 * Seguimiento de embarazo e hipertension.
 *
 * Son los dos programas que el CAP sigue mes a mes, y la pregunta que se le
 * hace a esta pantalla es siempre la misma: **a quien hay que buscar**. Por eso
 * cada programa abre en su lista de riesgo —los embarazos de alto riesgo, los
 * hipertensos que ya pasaron su fecha— y no en el listado completo: lo primero
 * que se ve tiene que ser lo que no puede esperar.
 */
export function PaginaProgramas() {
  const [pestana, setPestana] = useState(0);

  return (
    <Box>
      <EncabezadoPagina
        titulo="Programas"
        descripcion="Seguimiento de embarazo e hipertension: quien esta en riesgo y a quien se le paso el control."
      />

      <Tabs
        value={pestana}
        onChange={(_e, v) => setPestana(v)}
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label="Embarazo" />
        <Tab label="Hipertension" />
      </Tabs>

      {pestana === 0 ? <Embarazos /> : <Hipertensos />}
    </Box>
  );
}

function Embarazos() {
  const [pagina, setPagina] = useState(1);

  const riesgo = useQuery({
    queryKey: ['embarazos-alto-riesgo'],
    queryFn: embarazosDeAltoRiesgo,
  });
  const todos = useQuery({
    queryKey: ['embarazos', pagina],
    queryFn: () => listarEmbarazos(pagina),
  });

  if (todos.isError) return <AvisoError error={todos.error} />;
  if (todos.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {/*
        El alto riesgo va arriba y aparte, no como una columna mas del listado.

        Es la unica parte de la pantalla que obliga a hacer algo hoy; mezclada
        entre cuarenta filas ordenadas por fecha de parto, se pierde.
      */}
      {(riesgo.data ?? []).length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: alpha(ERROR, 0.4),
            bgcolor: alpha(ERROR, 0.04),
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, color: ERROR, mb: 1 }}>
            {riesgo.data!.length === 1
              ? '1 embarazo de alto riesgo'
              : riesgo.data!.length + ' embarazos de alto riesgo'}
          </Typography>
          <Stack spacing={1}>
            {riesgo.data!.map((e) => (
              <Stack
                key={e.id}
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ gap: 1.5, alignItems: { sm: 'center' } }}
              >
                <Box sx={{ minWidth: 220 }}>
                  <NombrePaciente pacienteId={e.pacienteId} />
                </Box>
                <Typography variant="body2">{e.semanasGestacion} semanas</Typography>
                <Typography variant="body2" color="text.secondary">
                  Parto: {fecha(e.fpp)}
                </Typography>
                {e.motivoRiesgo ? (
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    {e.motivoRiesgo}
                  </Typography>
                ) : null}
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {todos.data.datos.length === 0 ? (
        <NotaPagina>No hay ningun embarazo en seguimiento.</NotaPagina>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {todos.data.total === 1
              ? '1 embarazo en seguimiento'
              : todos.data.total + ' embarazos en seguimiento'}
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell align="right">Semanas</TableCell>
                  <TableCell>Fecha probable de parto</TableCell>
                  <TableCell>Riesgo</TableCell>
                  <TableCell>Proximo control</TableCell>
                  <TableCell>Alertas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todos.data.datos.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell>
                      <NombrePaciente pacienteId={e.pacienteId} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {e.semanasGestacion}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fecha(e.fpp)}</TableCell>
                    <TableCell>
                      {e.riesgo === 'ALTO' ? (
                        <Etiqueta texto="Alto" color={ERROR} />
                      ) : (
                        <Etiqueta texto="Bajo" color={ARMAZON} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Proximo iso={e.ultimoControl?.proximoControl ?? null} />
                    </TableCell>
                    <TableCell>
                      {(e.ultimoControl?.alertas ?? []).length > 0 ? (
                        <Stack sx={{ gap: 0.5 }}>
                          {e.ultimoControl!.alertas.map((a) => (
                            <Typography key={a} variant="caption" sx={{ color: ERROR }}>
                              {a}
                            </Typography>
                          ))}
                        </Stack>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {todos.data.totalPaginas > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={todos.data.totalPaginas}
                page={todos.data.pagina}
                onChange={(_e, p) => setPagina(p)}
                color="primary"
              />
            </Box>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}

function Hipertensos() {
  const [pagina, setPagina] = useState(1);

  const atrasados = useQuery({
    queryKey: ['hipertensos-atrasados'],
    queryFn: hipertensosAtrasados,
  });
  const todos = useQuery({
    queryKey: ['hipertensos', pagina],
    queryFn: () => listarHipertensos(pagina),
  });

  if (todos.isError) return <AvisoError error={todos.error} />;
  if (todos.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {(atrasados.data ?? []).length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: alpha(ERROR, 0.4),
            bgcolor: alpha(ERROR, 0.04),
            borderRadius: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, color: ERROR, mb: 1 }}>
            {atrasados.data!.length === 1
              ? '1 paciente con el control atrasado'
              : atrasados.data!.length + ' pacientes con el control atrasado'}
          </Typography>
          <Stack spacing={1}>
            {atrasados.data!.map((h) => (
              <Stack
                key={h.programaId}
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ gap: 1.5, alignItems: { sm: 'center' } }}
              >
                <Box sx={{ minWidth: 220 }}>
                  <NombrePaciente pacienteId={h.pacienteId} />
                </Box>
                {/*
                  Los dias los cuenta el SERVIDOR y vienen hechos. Recalcularlos
                  aqui seria arriesgarse a que las dos cuentas digan cosas
                  distintas por una diferencia de zona horaria.
                */}
                <Etiqueta
                  texto={
                    'Atrasado ' +
                    h.diasDeAtraso +
                    (h.diasDeAtraso === 1 ? ' dia' : ' dias')
                  }
                  color={ERROR}
                />
                <Typography variant="body2" color="text.secondary">
                  Tocaba el {fecha(h.proximoControl)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {todos.data.datos.length === 0 ? (
        <NotaPagina>No hay nadie inscrito en el programa de hipertension.</NotaPagina>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {todos.data.total === 1
              ? '1 paciente inscrito'
              : todos.data.total + ' pacientes inscritos'}
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Ultima presion</TableCell>
                  <TableCell>Clasificacion</TableCell>
                  <TableCell>En meta</TableCell>
                  <TableCell>Proximo control</TableCell>
                  <TableCell>Desde</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {todos.data.datos.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>
                      <NombrePaciente pacienteId={h.pacienteId} />
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {h.ultimoControl
                        ? h.ultimoControl.sistolica + '/' + h.ultimoControl.diastolica
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {h.ultimoControl ? (
                        <Etiqueta
                          texto={
                            ETIQUETA_PRESION[h.ultimoControl.clasificacion] ??
                            h.ultimoControl.clasificacion
                          }
                          color={COLOR_PRESION[h.ultimoControl.clasificacion] ?? ARMAZON}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {h.ultimoControl ? (
                        h.ultimoControl.enMeta ? (
                          <Etiqueta texto="Si" color={EXITO} />
                        ) : (
                          <Etiqueta
                            texto={'Meta ' + h.metaSistolica + '/' + h.metaDiastolica}
                            color={PRIMARIO}
                          />
                        )
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Proximo iso={h.ultimoControl?.proximoControl ?? null} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fecha(h.fechaIngreso)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {todos.data.totalPaginas > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={todos.data.totalPaginas}
                page={todos.data.pagina}
                onChange={(_e, p) => setPagina(p)}
                color="primary"
              />
            </Box>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
