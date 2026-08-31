import { Link as EnlaceRuta } from 'react-router-dom';
import {
  Box,
  Button,
  Link,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { ETIQUETA_IDIOMA, type PaginaPacientes } from './servicio-pacientes';
import { usarSesion } from '../sesion/contexto';
import { desde } from '../../navegacion/usarVolver';
import { puedeEntrar } from '../../navegacion/menu';
import { fichaParaPaciente } from '../fichas/ficha-por-edad';
import type { PacienteResumen } from './servicio-pacientes';

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
/**
 * El botón que abre la ficha, con la hoja que le corresponde al paciente.
 *
 * Antes llevaba siempre a la de adultos. Llenar la ficha equivocada no es un
 * error cosmético: cada hoja del MSPAS pregunta cosas distintas, y lo que se
 * capture en la que no toca no tiene respaldo en ningún papel firmado.
 *
 * La edad sale de la fecha de nacimiento, que recepción ya pide al registrar.
 * Cuando la hoja que toca existe en el papel pero su pantalla todavía no está
 * construida, el botón lo DICE en vez de ofrecer la equivocada.
 */
function BotonFicha({ paciente }: { paciente: PacienteResumen }) {
  const ficha = fichaParaPaciente(
    paciente.fechaNacimiento as unknown as string,
    paciente.id,
  );

  if (!ficha.ruta) {
    return (
      <Tooltip
        title={
          'Le corresponde la ficha de ' +
          ficha.nombre +
          ' (' +
          ficha.motivo.toLowerCase() +
          '), que todavía no está construida en el sistema.'
        }
      >
        {/* El span deja que el tooltip funcione sobre un botón deshabilitado. */}
        <span>
          <Button size="small" variant="outlined" disabled>
            Ficha de {ficha.nombre.toLowerCase()}
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={ficha.nombre + ' · ' + ficha.motivo}>
      <Button
        component={EnlaceRuta}
        to={ficha.ruta}
        size="small"
        variant="outlined"
        disabled={paciente.fallecido}
      >
        Abrir ficha
      </Button>
    </Tooltip>
  );
}

export function TablaPacientes({
  resultados,
  onPagina,
  onLlegada,
}: {
  resultados: PaginaPacientes;
  onPagina: (pagina: number) => void;
  /** Marcar que el paciente acaba de llegar al CAP. Solo lo hace recepcion. */
  onLlegada?: (paciente: PacienteResumen) => void;
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
              {onLlegada || puedeAtender ? <TableCell>Atencion</TableCell> : null}
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
                  {/*
                    El numero es el enlace al expediente. Es donde la mano va a
                    buscarlo: quien quiere ver el historial de alguien mira su
                    numero, no una columna de botones al final de la fila.
                  */}
                  {p.expediente ? (
                    <Link
                      component={EnlaceRuta}
                      to={'/pacientes/' + p.id + '/expediente'}
                      state={desde('/recepcion', 'Recepcion')}
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {p.expediente.numero}
                    </Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
                {onLlegada || puedeAtender ? (
                  <TableCell>
                    <Stack direction="row" sx={{ gap: 1 }}>
                      {onLlegada ? (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={p.fallecido}
                          onClick={() => onLlegada(p)}
                        >
                          Marcar llegada
                        </Button>
                      ) : null}
                      {puedeAtender ? <BotonFicha paciente={p} /> : null}
                    </Stack>
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
