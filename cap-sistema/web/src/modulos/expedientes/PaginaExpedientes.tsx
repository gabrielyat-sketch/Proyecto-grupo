import { useRef, useState, type FormEvent } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { AvisoError } from '../../componentes/AvisoError';
import { desde } from '../../navegacion/usarVolver';
import { EncabezadoPagina } from '../../componentes/EncabezadoPagina';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { esErrorApi } from '../../api';
import { buscarExpediente } from './servicio-expedientes';

const ETIQUETA_DIGITALIZACION: Record<string, string> = {
  PENDIENTE: 'Sin transcribir',
  EN_PROCESO: 'Transcripcion a medias',
  COMPLETO: 'Transcrito',
  NO_LOCALIZADO: 'No aparece en el archivo',
};

const fecha = (valor: string | null) =>
  valor
    ? new Date(valor).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

/**
 * Buscar un expediente por su numero.
 *
 * Es la pregunta de quien tiene la carpeta en la mano: "de quien es esta". La
 * busqueda es EXACTA y no puede ser de otra forma: el numero vive cifrado y se
 * resuelve por su indice ciego, asi que no hay manera de buscar "los que
 * empiezan por 2026" sin descifrar los cien mil para comparar.
 *
 * Por eso tampoco busca mientras se escribe: se pulsa Enter cuando el numero
 * esta completo. Un numero a medias nunca va a encontrar nada, y consultar en
 * cada tecla solo produciria una pantalla que dice "no existe" mientras uno
 * teclea.
 */
export function PaginaExpedientes() {
  const [texto, setTexto] = useState('');
  const [numero, setNumero] = useState('');
  const campo = useRef<HTMLInputElement>(null);

  usarAtajo('k', () => {
    campo.current?.focus();
    campo.current?.select();
  });

  const expediente = useQuery({
    queryKey: ['expediente', numero],
    queryFn: () => buscarExpediente(numero),
    enabled: numero !== '',
    retry: false,
  });

  function buscar(e: FormEvent) {
    e.preventDefault();
    setNumero(texto.trim());
  }

  const noExiste =
    expediente.isError && esErrorApi(expediente.error) && expediente.error.estado === 404;

  return (
    <Box sx={{ maxWidth: 780 }}>
      <EncabezadoPagina
        titulo="Expedientes"
        descripcion="Escriba el número de la carpeta que tiene en la mano. El expediente es de la familia: aparecerán todos los que hay dentro."
      />

      <Paper
        elevation={0}
        component="form"
        onSubmit={buscar}
        sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
          <TextField
            inputRef={campo}
            label="Número de expediente"
            value={texto}
            onChange={(e) => setTexto(e.target.value.toUpperCase())}
            autoFocus
            fullWidth
            placeholder="2"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
            helperText="Tal como está escrito en la pestaña del folder"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={texto.trim() === ''}
            sx={{ alignSelf: { sm: 'flex-start' }, mt: { sm: 1 }, minWidth: 120 }}
          >
            Buscar
          </Button>
        </Stack>
      </Paper>

      {expediente.isFetching ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {noExiste ? (
        <Alert severity="info">
          No hay ningun expediente con el numero {numero}. Revise que este completo: la busqueda es
          exacta.
        </Alert>
      ) : expediente.isError ? (
        <AvisoError error={expediente.error} />
      ) : null}

      {/*
        Una tarjeta por persona, todas bajo el mismo numero.

        El expediente es de la FAMILIA: la carpeta de carton lleva un numero y
        dentro van las fichas de todos los que viven en esa casa. Quien tiene el
        folder en la mano y teclea su numero pregunta «de quien es esta
        carpeta», y la respuesta son las personas que hay dentro.

        Y como el numero se repite entre lugares, el resultado puede abarcar dos
        familias de barrios distintos. Por eso cada tarjeta dice su lugar y su
        carpeta: sin eso, elegir es adivinar, y abrir la ficha de quien no era
        es exactamente lo que esta pantalla tiene que evitar.
      */}
      {expediente.data && !expediente.isFetching ? (
        <Stack sx={{ gap: 2 }}>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: 'baseline', justifyContent: 'space-between' }}
          >
            <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              Expediente {expediente.data.numero}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {expediente.data.expedientes.length === 1
                ? '1 ficha'
                : expediente.data.expedientes.length + ' fichas con este número'}
            </Typography>
          </Stack>

          {expediente.data.expedientes.length > 1 ? (
            <Alert severity="info">
              Este número lo llevan varias fichas. Si son de la misma carpeta, es la familia
              entera. Si aparecen lugares distintos, son <b>carpetas distintas</b> que llevan el
              mismo número: fíjese en el lugar antes de abrir.
            </Alert>
          ) : null}

          {expediente.data.expedientes.map((e) => (
            <Paper key={e.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Stack sx={{ p: 2.5, gap: 2 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ gap: 1.5, alignItems: { sm: 'baseline' }, justifyContent: 'space-between' }}
                >
                  <Stack sx={{ gap: 0.25 }}>
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                      {e.paciente.apellidos}, {e.paciente.nombres}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {e.paciente.sexo === 'F' ? 'Femenino' : 'Masculino'} ·{' '}
                      {e.paciente.comunidad?.nombre}
                      {e.paciente.lugar ? ' · ' + e.paciente.lugar.nombre : ''}
                      {e.paciente.grupoFamiliar
                        ? ' · Carpeta No. ' +
                          e.paciente.grupoFamiliar.numero +
                          ' · Familia ' +
                          e.paciente.grupoFamiliar.apellidos
                        : ' · Sin carpeta'}
                      {fecha(e.aperturaEn as string | null)
                        ? ' · Abierto el ' + fecha(e.aperturaEn as string | null)
                        : ''}
                    </Typography>
                  </Stack>

                  {e.digitalizacion ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        (ETIQUETA_DIGITALIZACION[e.digitalizacion.estado] ??
                          e.digitalizacion.estado) +
                        (e.digitalizacion.atencionesTranscritas > 0
                          ? ' · ' + e.digitalizacion.atencionesTranscritas + ' hojas'
                          : '')
                      }
                    />
                  ) : null}
                </Stack>

                <Button
                  component={EnlaceRuta}
                  to={'/pacientes/' + e.paciente.id + '/expediente'}
                  state={desde('/expedientes', 'Expedientes')}
                  variant="contained"
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Abrir el expediente
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : null}

      {numero === '' && !expediente.isFetching ? (
        <Typography color="text.secondary">
          Si no tiene el numero a mano, busque al paciente por su nombre en Recepcion.
        </Typography>
      ) : null}
    </Box>
  );
}
