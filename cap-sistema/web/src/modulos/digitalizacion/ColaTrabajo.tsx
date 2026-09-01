import { useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
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
import { ETIQUETA_ESTADO, type ExpedienteEnCola, type PaginaCola } from './servicio-digitalizacion';

/**
 * El color de cada estado: un semaforo de lo que falta.
 *
 * - Pendiente en rojo (`error`): la carpeta sigue solo en papel, y mientras
 *   este asi su historia clinica no existe para el sistema.
 * - En proceso en cafe (`warning`): alguien la empezo y quedo a medias. Es la
 *   fila que conviene terminar antes de abrir otra.
 * - Completo en verde (`success`): el unico estado que no pide nada.
 * - No localizado en pizarra (`secondary`): fuera del semaforo a proposito. No
 *   es una etapa del trabajo sino un callejon sin salida —la carpeta no
 *   aparecio en el archivo—, y pintarlo de rojo o cafe lo pondria en la misma
 *   cola de lo que si se puede transcribir hoy.
 */
const COLOR_ESTADO: Record<string, 'error' | 'warning' | 'success' | 'secondary'> = {
  PENDIENTE: 'error',
  EN_PROCESO: 'warning',
  COMPLETO: 'success',
  NO_LOCALIZADO: 'secondary',
};

/**
 * Que carpeta toca transcribir.
 *
 * Se recorre con las flechas y se abre con Enter, sin tocar el raton: quien
 * esta aqui tiene una carpeta abierta en una mano y la otra en el teclado. Con
 * el raton, cada expediente costaria un viaje de ida y vuelta, y son miles
 * (RF-08, arquitectura 7.2).
 *
 * NO muestra DPI ni telefono. Esta pantalla se usa con carpetas sobre la mesa y
 * gente alrededor; el nombre y el numero bastan para encontrar la carpeta.
 */
export function ColaTrabajo({
  resultados,
  puedeTranscribir,
  puedeMarcar,
  onPagina,
  onMarcar,
}: {
  resultados: PaginaCola;
  puedeTranscribir: boolean;
  puedeMarcar: boolean;
  onPagina: (pagina: number) => void;
  onMarcar: (expediente: ExpedienteEnCola) => void;
}) {
  const navegar = useNavigate();
  const cuerpo = useRef<HTMLTableSectionElement>(null);

  const transcribir = (e: ExpedienteEnCola) =>
    navegar('/pacientes/' + e.pacienteId + '/ficha?digitalizacion=1');

  /** Flechas para moverse por la lista, Enter para abrir la carpeta. */
  function alTeclear(evento: KeyboardEvent<HTMLTableSectionElement>) {
    const filas = Array.from(cuerpo.current?.querySelectorAll<HTMLElement>('tr[tabindex]') ?? []);
    const actual = filas.indexOf(document.activeElement as HTMLElement);
    if (actual === -1) return;

    const paso =
      evento.key === 'ArrowDown' ? 1 : evento.key === 'ArrowUp' ? -1 : 0;
    if (paso !== 0) {
      evento.preventDefault();
      filas[Math.min(Math.max(actual + paso, 0), filas.length - 1)]?.focus();
      return;
    }

    if (evento.key === 'Enter' && puedeTranscribir) {
      evento.preventDefault();
      transcribir(resultados.datos[actual]);
    }
  }

  return (
    <Stack sx={{ gap: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          {resultados.total === 1
            ? '1 expediente en la cola'
            : resultados.total.toLocaleString('es-GT') + ' expedientes en la cola'}
        </Typography>
        {puedeTranscribir ? (
          <Typography variant="caption" color="text.secondary">
            Flechas para moverse, Enter para abrir la carpeta
          </Typography>
        ) : null}
      </Stack>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, overflowX: 'auto' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Expediente</TableCell>
              <TableCell>Paciente</TableCell>
              <TableCell align="right">Edad</TableCell>
              <TableCell>Comunidad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Fichas</TableCell>
              <TableCell align="right">Accion</TableCell>
            </TableRow>
          </TableHead>

          <TableBody ref={cuerpo} onKeyDown={alTeclear}>
            {resultados.datos.map((e) => (
              <TableRow
                key={e.expedienteId}
                hover
                tabIndex={0}
                onDoubleClick={() => (puedeTranscribir ? transcribir(e) : undefined)}
                sx={{ cursor: puedeTranscribir ? 'pointer' : 'default' }}
              >
                <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {e.numero}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {e.apellidos}, {e.nombres}
                  </Typography>
                  {e.observaciones ? (
                    <Typography variant="caption" color="text.secondary">
                      {e.observaciones}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell align="right">{e.edad}</TableCell>
                <TableCell>{e.comunidad}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={ETIQUETA_ESTADO[e.estado] ?? e.estado}
                    color={COLOR_ESTADO[e.estado] ?? 'default'}
                    // Los cuatro rellenos: delineado, el rojo de Pendiente se
                    // veria mas debil que el resto justo en el estado que mas
                    // filas ocupa.
                    variant="filled"
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {e.atencionesTranscritas}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
                    {puedeMarcar ? (
                      <Button size="small" variant="contained" onClick={() => onMarcar(e)}>
                        Estado
                      </Button>
                    ) : null}
                    {puedeTranscribir ? (
                      <Button size="small" variant="outlined" onClick={() => transcribir(e)}>
                        Transcribir
                      </Button>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {resultados.totalPaginas > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={resultados.totalPaginas}
            page={resultados.pagina}
            onChange={(_e, p) => onPagina(p)}
            color="primary"
            siblingCount={0}
          />
        </Box>
      ) : null}
    </Stack>
  );
}
