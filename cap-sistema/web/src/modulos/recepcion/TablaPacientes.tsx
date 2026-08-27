import { Link as EnlaceRuta } from 'react-router-dom';
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
import { ETIQUETA_IDIOMA, type PaginaPacientes } from './servicio-pacientes';
import { usarSesion } from '../sesion/contexto';
import { puedeEntrar } from '../../navegacion/menu';

const fecha = (valor: string | Date) =>
  new Date(valor).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Resultados de la busqueda.
 *
 * NO muestra DPI ni telefono a proposito: este listado se ve en la pantalla de
 * recepcion, a la vista de la fila de espera. El dato identificador aparece
 * solo al abrir la ficha de una persona concreta. El backend tampoco los envia
 * en este endpoint, asi que la restriccion esta en las dos capas.
 */
export function TablaPacientes({
  resultados,
  onPagina,
}: {
  resultados: PaginaPacientes;
  onPagina: (pagina: number) => void;
}) {
  const { usuario } = usarSesion();
  // La columna de la ficha solo aparece a quien puede registrarla. Ofrecersela
  // a Recepcion o a Farmacia terminaria en un 403 que parece una falla.
  const puedeAtender = puedeEntrar(usuario?.rol, '/ficha');

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {resultados.total === 1
          ? '1 paciente encontrado'
          : resultados.total + ' pacientes encontrados'}
      </Typography>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
      >
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Nacimiento</TableCell>
              <TableCell align="right">Edad</TableCell>
              <TableCell>Sexo</TableCell>
              <TableCell>Comunidad</TableCell>
              <TableCell>Idioma</TableCell>
              <TableCell>Expediente</TableCell>
              {puedeAtender ? <TableCell>Atencion</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {resultados.datos.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Stack spacing={0}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.apellidos}, {p.nombres}
                    </Typography>
                    {p.fallecido ? (
                      <Chip label="Fallecido" size="small" color="default" sx={{ mt: 0.5, width: 'fit-content' }} />
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>{fecha(p.fechaNacimiento)}</TableCell>
                <TableCell align="right">{p.edad}</TableCell>
                <TableCell>{p.sexo}</TableCell>
                <TableCell>{p.comunidad?.nombre}</TableCell>
                <TableCell>{ETIQUETA_IDIOMA[p.idioma] ?? p.idioma}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {p.expediente?.numero ?? '-'}
                </TableCell>
                {puedeAtender ? (
                  <TableCell>
                    <Button
                      component={EnlaceRuta}
                      to={'/pacientes/' + p.id + '/ficha'}
                      size="small"
                      variant="outlined"
                      disabled={p.fallecido}
                    >
                      Abrir ficha
                    </Button>
                  </TableCell>
                ) : null}
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
          />
        </Box>
      ) : null}
    </Stack>
  );
}
