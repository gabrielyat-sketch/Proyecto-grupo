import { useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { EncabezadoPagina } from '../../componentes/EncabezadoPagina';
import { usarSesion } from '../sesion/contexto';
import { usarAtajo } from '../../navegacion/usarAtajo';
import {
  ESPERA_LARGA_MINUTOS,
  esperaEnPalabras,
  obtenerSalaDeEspera,
  retirarVisita,
  type VisitaEnEspera,
} from './servicio-espera';

const ATIENDEN = ['MEDICO', 'ENFERMERIA'];
const CIERRAN = ['RECEPCION', 'ADMINISTRADOR', 'ENFERMERIA'];

/** Cada cuanto se vuelve a preguntar quien espera. */
const REFRESCO_MS = 30_000;

/**
 * Sala de espera: quien esta AHORA en el CAP.
 *
 * Es la pieza que faltaba, y la que separa dos trabajos que se estaban
 * confundiendo. Aqui hay cinco o diez personas sentadas y si no se atienden hoy
 * alguien se va sin consulta; en digitalizacion hay miles de carpetas que
 * pueden esperar meses. Mezclarlas haria que lo urgente se perdiera entre lo
 * que no lo es.
 *
 * Por eso esta pantalla no tiene filtros ni buscador: si hay ocho personas
 * esperando, se ven ocho renglones. Buscar en una lista de ocho es mas trabajo
 * que leerla.
 */
export function PaginaSalaEspera() {
  const { usuario } = usarSesion();
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  const [retirando, setRetirando] = useState<VisitaEnEspera | null>(null);
  const [motivo, setMotivo] = useState('');
  const lista = useRef<HTMLDivElement>(null);

  const puedeAtender = ATIENDEN.includes(usuario?.rol ?? '');
  const puedeCerrar = CIERRAN.includes(usuario?.rol ?? '');

  const espera = useQuery({
    queryKey: ['sala-espera'],
    queryFn: obtenerSalaDeEspera,
    // La sala cambia sola: llega gente mientras la enfermera atiende. Sin
    // refresco habria que recordar recargar, y nadie recuerda recargar.
    refetchInterval: REFRESCO_MS,
    refetchOnWindowFocus: true,
  });

  const retirar = useMutation({
    mutationFn: (datos: { id: string; motivo: string }) => retirarVisita(datos.id, datos.motivo),
    onSuccess: () => {
      setRetirando(null);
      setMotivo('');
      void clienteConsultas.invalidateQueries({ queryKey: ['sala-espera'] });
    },
  });

  const atender = (v: VisitaEnEspera) => navegar('/pacientes/' + v.pacienteId + '/ficha');

  // Ctrl+J lleva el foco a la lista, igual que en digitalizacion.
  usarAtajo('j', () => {
    lista.current?.querySelector<HTMLElement>('[data-fila]')?.focus();
  });

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const filas = Array.from(lista.current?.querySelectorAll<HTMLElement>('[data-fila]') ?? []);
    const actual = filas.indexOf(document.activeElement as HTMLElement);
    if (actual === -1) return;

    const paso = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (paso !== 0) {
      e.preventDefault();
      filas[Math.min(Math.max(actual + paso, 0), filas.length - 1)]?.focus();
      return;
    }
    if (e.key === 'Enter' && puedeAtender) {
      e.preventDefault();
      atender(espera.data![actual]);
    }
  }

  const gente = espera.data ?? [];

  return (
    <Box>
      <EncabezadoPagina
        titulo="Sala de espera"
        descripcion={
          puedeAtender
            ? 'Quienes llegaron hoy y todavia no tienen ficha. En orden de llegada.'
            : 'Quienes llegaron hoy y esperan ser atendidos.'
        }
        acciones={
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
            {espera.isFetching ? (
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Actualizando...
              </Typography>
            ) : null}
            {puedeAtender ? (
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Flechas y Enter para atender
              </Typography>
            ) : null}
          </Stack>
        }
      />

      {espera.isError ? <AvisoError error={espera.error} /> : null}
      {retirar.isError ? (
        <Box sx={{ mb: 2 }}>
          <AvisoError error={retirar.error} />
        </Box>
      ) : null}

      {espera.isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : gente.length === 0 ? (
        <Alert severity="info">
          No hay nadie esperando. Recepcion marca la llegada de cada paciente al entrar.
        </Alert>
      ) : (
        <Stack ref={lista} onKeyDown={alTeclear} sx={{ gap: 1 }}>
          {gente.map((v, i) => {
            const mucho = v.esperandoMinutos >= ESPERA_LARGA_MINUTOS;
            return (
              <Paper
                key={v.id}
                data-fila
                tabIndex={0}
                elevation={0}
                onDoubleClick={() => (puedeAtender ? atender(v) : undefined)}
                sx={{
                  border: '1px solid',
                  borderColor: mucho ? 'warning.main' : 'divider',
                  borderRadius: 0,
                  p: 1.5,
                  cursor: puedeAtender ? 'pointer' : 'default',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  sx={{ gap: 1.5, alignItems: { md: 'center' } }}
                >
                  {/* El turno: es lo que la gente cuenta desde la silla. */}
                  <Typography
                    aria-hidden
                    sx={{
                      minWidth: 32,
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {i + 1}
                  </Typography>

                  <Stack sx={{ flex: 1, minWidth: 0, gap: 0.25 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {v.apellidos}, {v.nombres}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {v.edad} anos · {v.sexo === 'F' ? 'Femenino' : 'Masculino'} · {v.comunidad}
                      {v.numeroExpediente ? (
                        <>
                          {' · '}
                          <Box component="span" sx={{ fontFamily: 'monospace' }}>
                            {v.numeroExpediente}
                          </Box>
                        </>
                      ) : null}
                    </Typography>
                    {v.motivo ? (
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {v.motivo}
                      </Typography>
                    ) : null}
                  </Stack>

                  <Chip
                    size="small"
                    label={esperaEnPalabras(v.esperandoMinutos)}
                    color={mucho ? 'warning' : 'default'}
                    variant={mucho ? 'filled' : 'outlined'}
                  />

                  <Stack direction="row" sx={{ gap: 1 }}>
                    {puedeCerrar ? (
                      <Button size="small" color="inherit" onClick={() => {
                          setMotivo('');
                          setRetirando(v);
                        }}>
                        Se fue
                      </Button>
                    ) : null}
                    {puedeAtender ? (
                      <Button size="small" variant="contained" onClick={() => atender(v)}>
                        Atender
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {retirando ? (
        <Dialog open onClose={() => setRetirando(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {retirando.apellidos}, {retirando.nombres}
          </DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Sale de la sala sin ficha. Queda registrado, con el motivo.
              </Typography>
              <TextField
                label="Que paso *"
                autoFocus
                multiline
                minRows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                helperText='"Se fue" no le sirve a nadie dentro de un mes: diga si se canso de esperar o si lo mandaron a otro lado'
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setRetirando(null)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={motivo.trim().length < 3 || retirar.isPending}
              onClick={() => retirar.mutate({ id: retirando.id, motivo: motivo.trim() })}
            >
              {retirar.isPending ? 'Guardando...' : 'Sacar de la lista'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  );
}
