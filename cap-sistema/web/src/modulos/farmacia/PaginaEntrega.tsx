import { useState } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AvisoError } from '../../componentes/AvisoError';
import { esErrorApi } from '../../api';
import type { PacienteResumen } from '../recepcion/servicio-pacientes';
import { SelectorPaciente } from './SelectorPaciente';
import { SelectorMedicamentos } from './SelectorMedicamentos';
import { conUnidad, fechaCorta } from './servicio-farmacia';
import {
  fechaHora,
  registrarEntrega,
  type Entrega,
  type LineaDespacho,
} from './servicio-entregas';

/** Encabezado de bloque con su número, para que el orden se lea solo. */
function Bloque({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
      <Stack sx={{ gap: 2 }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {numero}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {titulo}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

/**
 * Registrar una entrega de medicamentos.
 *
 * Es la pantalla más delicada del sistema: toca inventario de verdad, y un
 * error deja el stock mal contado. Tres cosas la gobiernan.
 *
 * **No se envía dos veces.** El botón se desactiva mientras la petición está en
 * curso y la pantalla pasa a un comprobante en cuanto responde, de modo que no
 * queda un botón activo sobre una entrega que ya se registró. El cliente de API
 * tampoco reintenta: renueva el token *antes* de enviar, nunca tras un 401,
 * justamente para que este POST no llegue dos veces.
 *
 * **Es todo o nada.** Si un solo medicamento no alcanza, el servidor no entrega
 * ninguno: una entrega a medias deja al paciente con parte del tratamiento y
 * descuenta inventario por algo que no resolvió la receta. La pantalla lo
 * comprueba antes de enviar y, si aun así el servidor lo rechaza, muestra
 * exactamente cuánto faltó de cada uno.
 *
 * **El sistema elige los lotes, no la persona.** Por FEFO: primero el que vence
 * antes. Dejar elegir a mano garantiza que se despache siempre del primero de
 * la lista y que el resto venza en el estante. El comprobante dice después de
 * qué lote salió cada cosa.
 */
export function PaginaEntrega() {
  const consultas = useQueryClient();
  const [paciente, setPaciente] = useState<PacienteResumen | null>(null);
  const [lineas, setLineas] = useState<LineaDespacho[]>([]);
  const [observaciones, setObservaciones] = useState('');
  const [comprobante, setComprobante] = useState<Entrega | null>(null);

  const entregar = useMutation({
    mutationFn: () =>
      registrarEntrega({
        pacienteId: paciente!.id,
        lineas: lineas.map((l) => ({ medicamentoId: l.medicamentoId, cantidad: l.cantidad })),
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      }),
    onSuccess: (entrega) => {
      // El inventario acaba de cambiar: todo lo que lo muestre queda viejo.
      void consultas.invalidateQueries({ queryKey: ['catalogo'] });
      void consultas.invalidateQueries({ queryKey: ['medicamento'] });
      void consultas.invalidateQueries({ queryKey: ['por-vencer'] });
      void consultas.invalidateQueries({ queryKey: ['bajo-minimo'] });
      void consultas.invalidateQueries({ queryKey: ['entregas'] });
      setComprobante(entrega);
    },
  });

  const volver = (
    <Button
      component={EnlaceRuta}
      to="/farmacia"
      startIcon={<ArrowBackIcon />}
      sx={{ alignSelf: 'flex-start', mb: 2 }}
    >
      Farmacia
    </Button>
  );

  // ─────────────────────────── el comprobante ───────────────────────────
  if (comprobante) {
    return (
      <Box sx={{ maxWidth: 820 }}>
        {volver}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack sx={{ gap: 2 }}>
            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
                Entrega registrada
              </Typography>
            </Stack>

            <Typography color="text.secondary">
              {paciente ? paciente.apellidos + ', ' + paciente.nombres + ' · ' : ''}
              {fechaHora(comprobante.fecha as unknown as string)}
            </Typography>

            <Divider />

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicamento</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Vence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comprobante.medicamentos.map((m, i) => (
                    <TableRow key={m.numeroLote + '-' + i}>
                      <TableCell sx={{ fontWeight: 600 }}>{m.nombre}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {conUnidad(m.cantidad, m.unidad)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{m.numeroLote}</TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {fechaCorta(m.fechaVencimiento as unknown as string)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" color="text.secondary">
              El lote lo eligio el sistema: sale primero el que vence antes.
            </Typography>

            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => {
                  setComprobante(null);
                  setPaciente(null);
                  setLineas([]);
                  setObservaciones('');
                  entregar.reset();
                }}
              >
                Registrar otra entrega
              </Button>
              <Button component={EnlaceRuta} to="/farmacia" variant="outlined">
                Volver al inventario
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // ─────────────────────────── el despacho ───────────────────────────
  const sinExistencia =
    entregar.isError && esErrorApi(entregar.error) && entregar.error.estado === 409;

  return (
    <Box sx={{ maxWidth: 900 }}>
      {volver}

      <Stack sx={{ gap: 0.5, mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Registrar entrega
        </Typography>
        <Typography color="text.secondary">
          El sistema elige de que lotes sale cada medicamento: primero el que vence antes.
        </Typography>
      </Stack>

      <Stack sx={{ gap: 2 }}>
        <Bloque numero={1} titulo="A quien se le entrega">
          {paciente ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ gap: 1.5, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack sx={{ gap: 0.25 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {paciente.apellidos}, {paciente.nombres}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {paciente.edad} anios · {paciente.comunidad?.nombre ?? 'Sin comunidad'}
                </Typography>
              </Stack>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPaciente(null)}
                disabled={entregar.isPending}
              >
                Cambiar
              </Button>
            </Stack>
          ) : (
            <SelectorPaciente onElegir={setPaciente} />
          )}
        </Bloque>

        <Bloque numero={2} titulo="Que se le entrega">
          <SelectorMedicamentos
            yaEnLaReceta={lineas.map((l) => l.medicamentoId)}
            onAgregar={(linea) => setLineas((previas) => [...previas, linea])}
          />

          {lineas.length > 0 ? (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Medicamento</TableCell>
                    <TableCell align="right">Cantidad</TableCell>
                    <TableCell align="right">Disponible</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineas.map((l) => (
                    <TableRow key={l.medicamentoId}>
                      <TableCell>
                        <Stack sx={{ gap: 0.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {l.nombre}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {l.codigo}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {conUnidad(l.cantidad, l.unidad)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                      >
                        {l.disponible}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={'Quitar ' + l.nombre}
                          disabled={entregar.isPending}
                          onClick={() =>
                            setLineas((previas) =>
                              previas.filter((p) => p.medicamentoId !== l.medicamentoId),
                            )
                          }
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" variant="body2">
              Todavia no hay ningun medicamento en la receta.
            </Typography>
          )}
        </Bloque>

        <Bloque numero={3} titulo="Confirmar">
          <TextField
            label="Observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={entregar.isPending}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            helperText="Opcional. Por ejemplo, quien recogio si no fue el paciente."
          />

          {sinExistencia ? (
            <Alert severity="warning">
              <AlertTitle>No hay existencia suficiente. No se entrego nada.</AlertTitle>
              {esErrorApi(entregar.error) && entregar.error.detalles.length > 0 ? (
                <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {entregar.error.detalles.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </Typography>
              ) : null}
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Ajuste las cantidades y vuelva a intentarlo. El inventario no cambio.
              </Typography>
            </Alert>
          ) : entregar.isError ? (
            <AvisoError error={entregar.error} />
          ) : null}

          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => entregar.mutate()}
              disabled={paciente === null || lineas.length === 0 || entregar.isPending}
            >
              {entregar.isPending ? 'Registrando...' : 'Registrar entrega'}
            </Button>
            {lineas.length > 0 ? (
              <Chip
                variant="outlined"
                label={
                  lineas.length === 1 ? '1 medicamento' : lineas.length + ' medicamentos'
                }
              />
            ) : null}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Es todo o nada: si algun medicamento no alcanza, no se entrega ninguno.
          </Typography>
        </Bloque>
      </Stack>
    </Box>
  );
}
