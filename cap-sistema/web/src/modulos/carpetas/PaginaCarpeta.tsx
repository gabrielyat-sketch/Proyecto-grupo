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
import ChildCareOutlinedIcon from '@mui/icons-material/ChildCareOutlined';
import { usarSesion } from '../sesion/contexto';
import { puedeEntrar } from '../../navegacion/menu';

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
  const { usuario } = usarSesion();
  // Dar de alta es de Recepcion y Administracion. A los demas no se les ofrece
  // un boton que el servidor va a negarles.
  const puedeRegistrar = puedeEntrar(usuario?.rol, '/recepcion/nuevo');

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

        <Box sx={{ flexGrow: 1 }} />

        {/*
          Registrar al recien nacido desde la carpeta.

          Un bebe de horas no tiene nombre todavia, y la ficha de menor de 28
          dias no lo pide: pregunta por la madre. Sin registro propio el sistema
          no puede saber que hoja le toca —la elige por la fecha de nacimiento—
          y la enfermera se queda sin camino.

          La salida NO es dejar elegir la ficha y guardarla donde caiga: una
          ficha vive dentro de un expediente, y el unico que habria es el de la
          madre. La primera consulta del nino acabaria en el historial de ella,
          y el dia que se le registre, esa consulta se queda huerfana.

          Asi que se registra al nino, con lo que ya se sabe de la familia
          puesto de antemano y un nombre provisional que se corrige cuando lo
          tenga. Son treinta segundos y a partir de ahi todo lo demas funciona
          solo.
        */}
        {puedeRegistrar ? (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<ChildCareOutlinedIcon />}
            component={EnlaceRuta}
            to="/recepcion/nuevo"
            state={{
              recienNacido: {
                apellidos: c.apellidos,
                comunidadId: c.comunidad.id,
                lugarId: c.lugar?.id ?? '',
                grupoFamiliarId: c.id,
              },
            }}
          >
            Registrar recien nacido
          </Button>
        ) : null}
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
