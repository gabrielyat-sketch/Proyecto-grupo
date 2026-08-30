import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { conUnidad } from './servicio-farmacia';
import { fechaHora, listarEntregas } from './servicio-entregas';

/**
 * Historial de entregas, lo más reciente primero.
 *
 * Cada fila es UNA entrega, aunque lleve varios medicamentos: un paciente que
 * sale con tres tratamientos es una atención de farmacia, no tres. Contarlas
 * por medicamento inflaría el indicador que el CAP reporta.
 *
 * No muestra el nombre del paciente. El servicio de medicamentos guarda su id y
 * su comunidad, no sus datos personales, y resolver cien nombres contra el
 * servicio de usuarios para pintar una tabla sería exponer identidad de
 * pacientes en una pantalla que responde "qué salió del inventario", no "a
 * quién". Para ver lo de una persona concreta se entra por su expediente.
 */
export function PanelEntregas() {
  const [pagina, setPagina] = useState(1);
  const entregas = useQuery({
    queryKey: ['entregas', pagina],
    queryFn: () => listarEntregas(pagina),
  });

  if (entregas.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (entregas.isError) return <AvisoError error={entregas.error} />;
  if (!entregas.data) return null;

  if (entregas.data.total === 0) {
    return <Alert severity="info">Todavia no se ha registrado ninguna entrega.</Alert>;
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {entregas.data.total === 1 ? '1 entrega' : entregas.data.total + ' entregas'}, la mas
        reciente primero
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
      >
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Medicamentos</TableCell>
              <TableCell>Observaciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entregas.data.datos.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {fechaHora(e.fecha as unknown as string)}
                </TableCell>
                <TableCell>
                  <Stack sx={{ gap: 0.5 }}>
                    {e.medicamentos.map((m, i) => (
                      <Stack
                        key={m.numeroLote + '-' + i}
                        direction="row"
                        sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {m.nombre}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {conUnidad(m.cantidad, m.unidad)}
                        </Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={'Lote ' + m.numeroLote}
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{e.observaciones ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {entregas.data.totalPaginas > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={entregas.data.totalPaginas}
            page={entregas.data.pagina}
            onChange={(_e, p) => setPagina(p)}
            color="primary"
          />
        </Box>
      ) : null}
    </Stack>
  );
}
