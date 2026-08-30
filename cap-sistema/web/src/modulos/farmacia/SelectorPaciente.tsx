import { useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search';
import { AvisoError } from '../../componentes/AvisoError';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { interpretarBusqueda, motivoSinBuscar } from '../recepcion/busqueda';
import { buscarPacientes, type PacienteResumen } from '../recepcion/servicio-pacientes';

/**
 * Elegir a quién se le entrega.
 *
 * Reutiliza la búsqueda de Recepción entera —una sola caja que interpreta si lo
 * escrito es un DPI o un apellido— porque es exactamente el mismo gesto: la
 * persona está enfrente y trae lo que trae. Tener dos búsquedas de pacientes
 * distintas en el sistema garantizaría que una de las dos se quedara atrás.
 *
 * No muestra el DPI en la lista, igual que en Recepción: el mostrador de
 * farmacia también tiene gente alrededor.
 */
export function SelectorPaciente({
  onElegir,
}: {
  onElegir: (paciente: PacienteResumen) => void;
}) {
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState(1);
  const campo = useRef<HTMLInputElement>(null);

  usarAtajo('k', () => {
    campo.current?.focus();
    campo.current?.select();
  });

  const criterio = interpretarBusqueda(texto);
  const aviso = motivoSinBuscar(criterio);
  const puedeBuscar = criterio.tipo === 'dpi' || criterio.tipo === 'nombre';

  const resultados = useQuery({
    queryKey: ['pacientes-entrega', texto, pagina],
    queryFn: () => buscarPacientes(criterio, undefined, pagina),
    enabled: puedeBuscar,
    placeholderData: keepPreviousData,
  });

  return (
    <Stack sx={{ gap: 2 }}>
      <TextField
        inputRef={campo}
        label="Paciente"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setPagina(1);
        }}
        autoFocus
        fullWidth
        placeholder="Apellido o DPI"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          },
        }}
        helperText={aviso ?? 'Por apellido o nombre, o por el DPI completo'}
      />

      {resultados.isError ? <AvisoError error={resultados.error} /> : null}

      {puedeBuscar && resultados.isPending ? (
        <Stack sx={{ alignItems: 'center', py: 3 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {puedeBuscar && resultados.data && resultados.data.total === 0 ? (
        <Alert severity="info">
          Ningun paciente coincide. Si es la primera vez que viene, Recepcion tiene que
          registrarlo antes.
        </Alert>
      ) : null}

      {resultados.data && resultados.data.total > 0 ? (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell align="right">Edad</TableCell>
                <TableCell>Comunidad</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {resultados.data.datos.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.apellidos}, {p.nombres}
                      </Typography>
                      {p.fallecido ? <Chip size="small" label="Fallecido" /> : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{p.edad}</TableCell>
                  <TableCell>{p.comunidad?.nombre ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      disabled={p.fallecido}
                      onClick={() => onElegir(p)}
                    >
                      Elegir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      {resultados.data && resultados.data.totalPaginas > 1 ? (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {resultados.data.total} pacientes. Afine la busqueda si el que atiende no aparece.
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
