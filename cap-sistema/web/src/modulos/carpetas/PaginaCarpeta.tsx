import { Link as EnlaceRuta, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../componentes/AvisoError';
import { NotaPagina } from '../../componentes/EncabezadoPagina';
import { desde, usarVolver } from '../../navegacion/usarVolver';
import { ETIQUETA_TIPO_LUGAR } from '../recepcion/servicio-pacientes';
import { obtenerCarpeta } from './servicio-carpetas';

/** «12 anos», o los meses cuando todavia no cumple uno. */
function edadDicha(anios: number): string {
  if (anios === 0) return 'Menos de 1 ano';
  return anios === 1 ? '1 ano' : anios + ' anos';
}

/**
 * Una carpeta abierta: la familia que tiene dentro.
 *
 * Del archivero se saca el folder y se ve quien esta en el. Desde cada
 * integrante se llega a su expediente, que es donde estan sus fichas: la
 * carpeta agrupa personas, no consultas.
 */
export function PaginaCarpeta() {
  const { carpetaId } = useParams<{ carpetaId: string }>();
  const volver = usarVolver({ a: '/carpetas', etiqueta: 'Carpetas' });

  const carpeta = useQuery({
    queryKey: ['carpeta', carpetaId],
    queryFn: () => obtenerCarpeta(carpetaId!),
    enabled: Boolean(carpetaId),
  });

  if (carpeta.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (carpeta.isError) return <AvisoError error={carpeta.error} />;

  const c = carpeta.data;
  const lugar = c.lugar
    ? (ETIQUETA_TIPO_LUGAR[c.lugar.tipo] ?? c.lugar.tipo) + ' ' + c.lugar.nombre
    : null;

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Button component={EnlaceRuta} to={volver.a} startIcon={<ArrowBackIcon />} size="small">
          {volver.etiqueta}
        </Button>
      </Stack>

      {/*
        El rotulo del folder, tal como esta escrito en el archivero: el
        apellido, el lugar y el numero. Puesto en ese orden se reconoce sin
        leerlo entero, que es como se reconoce el folder fisico.
      */}
      <Paper
        elevation={0}
        sx={{ p: { xs: 2, md: 3 }, mb: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: 2, justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}
        >
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              Familia {c.apellidos}
            </Typography>
            <Typography color="text.secondary">
              {(lugar ? lugar + ' · ' : '') + c.comunidad.nombre}
            </Typography>
            {c.direccion ? (
              <Typography variant="body2" color="text.secondary">
                {c.direccion}
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ textAlign: { md: 'right' } }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              No. de carpeta
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 28, fontWeight: 500 }}>
              {c.numero}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {c.integrantes.length === 0 ? (
        /*
          Una carpeta vacia casi siempre es un registro que quedo a medias: se
          abrio el folder y el alta del paciente no llego a guardarse. Decirlo
          es lo que permite corregirlo; dejar la tabla vacia sin explicacion
          hace pensar que la pantalla fallo.
        */
        <NotaPagina>
          Esta carpeta no tiene a nadie dentro. Su numero ya esta ocupado en este lugar, asi que
          conviene registrar en ella a la familia o darla de baja.
        </NotaPagina>
      ) : (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {c.integrantes.length === 1 ? '1 integrante' : c.integrantes.length + ' integrantes'}
          </Typography>

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre</TableCell>
                  <TableCell align="right">Edad</TableCell>
                  <TableCell>Sexo</TableCell>
                  <TableCell>Expediente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {c.integrantes.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Stack sx={{ gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {p.apellidos + ', ' + p.nombres}
                        </Typography>
                        {p.fallecido ? (
                          <Chip label="Fallecido" size="small" sx={{ width: 'fit-content' }} />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{edadDicha(p.edad)}</TableCell>
                    <TableCell>{p.sexo}</TableCell>
                    <TableCell>
                      {/*
                        La carpeta agrupa personas; las fichas viven en el
                        expediente de cada una. Por eso se sale de aqui hacia
                        el expediente y no hacia una ficha concreta: cual toca
                        depende de la edad y de para que se le atiende.
                      */}
                      <Link
                        component={EnlaceRuta}
                        to={'/pacientes/' + p.id + '/expediente'}
                        state={desde('/carpetas/' + c.id, 'la carpeta')}
                      >
                        Ver expediente
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </Box>
  );
}
