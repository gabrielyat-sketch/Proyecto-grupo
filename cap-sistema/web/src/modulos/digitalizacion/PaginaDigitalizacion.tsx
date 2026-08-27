import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { usarSesion } from '../sesion/contexto';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { BarraAvance, Cifra } from './BarraAvance';
import { ColaTrabajo } from './ColaTrabajo';
import { DialogoEstado } from './DialogoEstado';
import { ListaComunidades } from './ListaComunidades';
import {
  ETIQUETA_ESTADO,
  marcarExpediente,
  obtenerCola,
  obtenerComunidades,
  type EstadoDigitalizacion,
  type ExpedienteEnCola,
} from './servicio-digitalizacion';

/** Quien llena las fichas del papel. Recepcion captura los datos personales. */
const TRANSCRIBEN = ['MEDICO', 'ENFERMERIA'];
/** Quien puede mover el estado de una carpeta en el archivo. */
const MARCAN = ['ADMINISTRADOR', 'RECEPCION', 'ENFERMERIA'];

const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'COMPLETO', 'NO_LOCALIZADO'];

/**
 * Modo de digitalizacion (RF-08).
 *
 * Existe para un riesgo concreto: que la transcripcion de los expedientes de
 * papel no se termine nunca (R-6). Es trabajo del personal del CAP, dura meses
 * y compite con atender pacientes, asi que la pantalla esta construida
 * alrededor de tres preguntas y en este orden:
 *
 *   1. Cuanto llevamos.        La barra de arriba. Es la razon de volver manana.
 *   2. Por donde voy.          Las comunidades: el archivo se recorre asi, y
 *                              terminar una entera es una meta alcanzable.
 *   3. Que carpeta sigue.      La cola, que se recorre con las flechas y se
 *                              abre con Enter.
 *
 * Un tablero que solo dijera "faltan 94,000" seria exacto y serviria para nada.
 */
export function PaginaDigitalizacion() {
  const { usuario } = usarSesion();
  const clienteConsultas = useQueryClient();

  const [comunidadId, setComunidadId] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [marcando, setMarcando] = useState<ExpedienteEnCola | null>(null);
  const cola = useRef<HTMLDivElement>(null);

  const puedeTranscribir = TRANSCRIBEN.includes(usuario?.rol ?? '');
  const puedeMarcar = MARCAN.includes(usuario?.rol ?? '');

  const comunidades = useQuery({
    queryKey: ['digitalizacion', 'comunidades'],
    queryFn: obtenerComunidades,
    staleTime: 60_000,
  });

  const expedientes = useQuery({
    queryKey: ['digitalizacion', 'cola', comunidadId, estado, pagina],
    queryFn: () => obtenerCola({ comunidadId: comunidadId || undefined, estado: (estado || undefined) as never, pagina }),
  });

  const marcar = useMutation({
    mutationFn: (datos: { id: string; estado: EstadoDigitalizacion; observaciones: string }) =>
      marcarExpediente(datos.id, datos.estado, datos.observaciones || undefined),
    onSuccess: () => {
      setMarcando(null);
      // La carpeta cambio de estado: tanto la cola como el avance de su
      // comunidad quedaron desfasados. Sin esto, marcar un expediente como
      // completo lo dejaria en pantalla como si nada hubiera pasado.
      void clienteConsultas.invalidateQueries({ queryKey: ['digitalizacion'] });
    },
  });

  function cambiarComunidad(id: string) {
    setComunidadId(id);
    setPagina(1);
  }

  // Ctrl+J lleva el foco a la cola desde cualquier parte de la pantalla.
  usarAtajo('j', () => {
    cola.current?.querySelector<HTMLElement>('tr[tabindex]')?.focus();
  });

  const total = (comunidades.data ?? []).reduce((a, c) => a + c.total, 0);
  const completos = (comunidades.data ?? []).reduce((a, c) => a + c.completos, 0);
  const faltantes = (comunidades.data ?? []).reduce((a, c) => a + c.faltantes, 0);
  const noLocalizados = (comunidades.data ?? []).reduce((a, c) => a + c.noLocalizados, 0);
  const porcentaje = total === 0 ? 0 : Math.round((completos / total) * 1000) / 10;

  return (
    <Box>
      <Stack sx={{ gap: 0.5, mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Digitalizacion de expedientes
        </Typography>
        <Typography color="text.secondary">
          {puedeTranscribir
            ? 'Elija una comunidad y transcriba sus carpetas al sistema.'
            : 'Avance de la transcripcion del archivo de papel.'}
        </Typography>
      </Stack>

      {/* ─── Cuanto llevamos ────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 2.5, mb: 2 }}
      >
        {comunidades.isLoading ? (
          <Stack sx={{ alignItems: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : comunidades.isError ? (
          <AvisoError error={comunidades.error} />
        ) : (
          <Stack sx={{ gap: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ gap: { xs: 2, sm: 5 }, alignItems: { sm: 'flex-end' } }}
            >
              <Cifra valor={porcentaje + '%'} rotulo="del archivo" color="success.main" />
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Cifra valor={completos.toLocaleString('es-GT')} rotulo="transcritos" />
              <Cifra valor={faltantes.toLocaleString('es-GT')} rotulo="por transcribir" />
              <Cifra
                valor={noLocalizados.toLocaleString('es-GT')}
                rotulo="no localizados"
                color="text.secondary"
              />
            </Stack>

            <BarraAvance
              total={total}
              completos={completos}
              noLocalizados={noLocalizados}
              alto={12}
            />
          </Stack>
        )}
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {/* ─── Por donde voy ───────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
            p: 1,
            maxHeight: { lg: '70vh' },
            overflowY: 'auto',
          }}
        >
          <ListaComunidades
            comunidades={comunidades.data ?? []}
            elegida={comunidadId}
            onElegir={cambiarComunidad}
          />
        </Paper>

        {/* ─── Que carpeta sigue ───────────────────────────────────────── */}
        <Stack ref={cola} sx={{ gap: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Estado"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setPagina(1);
              }}
              sx={{ minWidth: 220 }}
              helperText="Por defecto, lo que falta"
            >
              <MenuItem value="">Pendientes y en proceso</MenuItem>
              {ESTADOS.map((e) => (
                <MenuItem key={e} value={e}>
                  {ETIQUETA_ESTADO[e]}
                </MenuItem>
              ))}
            </TextField>

            {puedeTranscribir ? (
              <Typography variant="caption" color="text.secondary">
                Ctrl+J lleva el foco a la lista
              </Typography>
            ) : null}
          </Stack>

          {expedientes.isLoading ? (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : expedientes.isError ? (
            <AvisoError error={expedientes.error} />
          ) : expedientes.data && expedientes.data.total === 0 ? (
            <Alert severity="success">
              {estado === '' && comunidadId !== ''
                ? 'Esta comunidad ya esta transcrita por completo.'
                : 'No hay expedientes con ese criterio.'}
            </Alert>
          ) : expedientes.data ? (
            <ColaTrabajo
              resultados={expedientes.data}
              puedeTranscribir={puedeTranscribir}
              puedeMarcar={puedeMarcar}
              onPagina={setPagina}
              onMarcar={setMarcando}
            />
          ) : null}
        </Stack>
      </Box>

      {marcando ? (
        <DialogoEstado
          key={marcando.expedienteId}
          expediente={marcando}
          guardando={marcar.isPending}
          error={marcar.isError ? marcar.error : null}
          onCerrar={() => {
            setMarcando(null);
            marcar.reset();
          }}
          onGuardar={(nuevo, observaciones) =>
            marcar.mutate({ id: marcando.expedienteId, estado: nuevo, observaciones })
          }
        />
      ) : null}
    </Box>
  );
}
