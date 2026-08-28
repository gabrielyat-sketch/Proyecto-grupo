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
      <Stack sx={{ gap: 0.5, mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Expedientes
        </Typography>
        <Typography color="text.secondary">
          Escriba el numero completo de la carpeta que tiene en la mano.
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        component="form"
        onSubmit={buscar}
        sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
          <TextField
            inputRef={campo}
            label="Numero de expediente"
            value={texto}
            onChange={(e) => setTexto(e.target.value.toUpperCase())}
            autoFocus
            fullWidth
            placeholder="EXP-2026-000123"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
            helperText="El numero completo, tal como esta escrito en la carpeta"
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

      {expediente.data && !expediente.isFetching ? (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Stack sx={{ p: 2.5, gap: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ gap: 1.5, alignItems: { sm: 'baseline' }, justifyContent: 'space-between' }}
            >
              <Stack sx={{ gap: 0.25 }}>
                <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                  {expediente.data.numero}
                </Typography>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  {expediente.data.paciente.apellidos}, {expediente.data.paciente.nombres}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {expediente.data.paciente.sexo === 'F' ? 'Femenino' : 'Masculino'} ·{' '}
                  {expediente.data.paciente.comunidad?.nombre}
                  {fecha(expediente.data.aperturaEn as string | null)
                    ? ' · Abierto el ' + fecha(expediente.data.aperturaEn as string | null)
                    : ''}
                </Typography>
              </Stack>

              {expediente.data.digitalizacion ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    (ETIQUETA_DIGITALIZACION[expediente.data.digitalizacion.estado] ??
                      expediente.data.digitalizacion.estado) +
                    (expediente.data.digitalizacion.atencionesTranscritas > 0
                      ? ' · ' + expediente.data.digitalizacion.atencionesTranscritas + ' hojas'
                      : '')
                  }
                />
              ) : null}
            </Stack>

            <Button
              component={EnlaceRuta}
              to={'/pacientes/' + expediente.data.paciente.id + '/expediente'}
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
            >
              Abrir el expediente
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {numero === '' && !expediente.isFetching ? (
        <Typography color="text.secondary">
          Si no tiene el numero a mano, busque al paciente por su nombre en Recepcion.
        </Typography>
      ) : null}
    </Box>
  );
}
