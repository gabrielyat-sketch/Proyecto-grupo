import { useMemo, useRef, useState } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { AvisoError } from '../../componentes/AvisoError';
import { usarSesion } from '../sesion/contexto';
import { puedeEntrar } from '../../navegacion/menu';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { interpretarBusqueda, motivoSinBuscar } from './busqueda';
import { buscarPacientes, listarComunidades } from './servicio-pacientes';
import { TablaPacientes } from './TablaPacientes';

/**
 * Busqueda de recepcion: el camino critico del sistema.
 *
 * Debe resolverse en menos de 2 segundos con 100,000 pacientes (§9.7). El
 * backend ya esta probado a esa escala; aqui lo que importa es no agregar
 * demoras propias ni pasos de mas antes de poder escribir.
 */
export function PaginaRecepcion() {
  const { usuario } = usarSesion();
  // Enfermeria y los demas roles buscan pacientes, pero no los dan de alta.
  // Ofrecerles el boton terminaba en un 403 al guardar, despues de llenar el
  // formulario entero: la persona cree que el sistema fallo, cuando en realidad
  // esta haciendo lo correcto.
  const puedeRegistrar = puedeEntrar(usuario?.rol, '/recepcion/nuevo');

  const [texto, setTexto] = useState('');
  const [comunidadId, setComunidadId] = useState('');
  const [pagina, setPagina] = useState(1);
  const campo = useRef<HTMLInputElement>(null);

  // Ctrl+K devuelve el foco a la caja y selecciona lo escrito, para empezar
  // otra busqueda sin borrar a mano.
  usarAtajo('k', () => {
    campo.current?.focus();
    campo.current?.select();
  });

  const criterio = useMemo(() => interpretarBusqueda(texto), [texto]);
  const aviso = motivoSinBuscar(criterio);
  const puedeBuscar = criterio.tipo === 'dpi' || criterio.tipo === 'nombre';

  const comunidades = useQuery({
    queryKey: ['comunidades'],
    queryFn: listarComunidades,
    // Las comunidades del CAP no cambian durante una jornada.
    staleTime: 30 * 60_000,
  });

  const resultados = useQuery({
    queryKey: ['pacientes', criterio, comunidadId, pagina],
    queryFn: () => buscarPacientes(criterio, comunidadId || undefined, pagina),
    enabled: puedeBuscar,
  });

  function cambiarTexto(valor: string) {
    setTexto(valor);
    // Cambiar el criterio invalida la pagina: seguir en la 3 de una busqueda
    // nueva muestra una pantalla vacia que parece un error.
    setPagina(1);
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Recepcion
          </Typography>
          <Typography color="text.secondary">
            Busque por DPI o por el inicio del apellido.
          </Typography>
        </Stack>

        {puedeRegistrar ? (
          <Button
            component={EnlaceRuta}
            to="/recepcion/nuevo"
            variant="contained"
            startIcon={<PersonAddIcon />}
          >
            Registrar paciente
          </Button>
        ) : null}
      </Stack>

      <Paper
        elevation={0}
        sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            inputRef={campo}
            label="DPI, apellido o nombre"
            value={texto}
            onChange={(e) => cambiarTexto(e.target.value)}
            // El foco entra solo: quien llega aqui viene a escribir.
            autoFocus
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
            helperText="Ctrl+K para volver aqui desde cualquier parte"
          />

          <TextField
            select
            label="Comunidad"
            value={comunidadId}
            onChange={(e) => {
              setComunidadId(e.target.value);
              setPagina(1);
            }}
            sx={{ minWidth: { md: 260 } }}
            helperText="Opcional"
          >
            <MenuItem value="">Todas las comunidades</MenuItem>
            {(comunidades.data ?? []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nombre}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {aviso ? <Alert severity="info">{aviso}</Alert> : null}

      {criterio.tipo === 'vacio' && !comunidadId ? (
        <Typography color="text.secondary">
          {puedeRegistrar
            ? 'Escriba para buscar. Si el paciente no aparece, registrelo con el boton de arriba.'
            : 'Escriba para buscar.'}
        </Typography>
      ) : null}

      {resultados.isFetching ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {resultados.isError ? <AvisoError error={resultados.error} /> : null}

      {resultados.data && !resultados.isFetching ? (
        resultados.data.total === 0 ? (
          <Alert
            severity="info"
            action={
              puedeRegistrar ? (
                <Button component={EnlaceRuta} to="/recepcion/nuevo" size="small">
                  Registrar
                </Button>
              ) : undefined
            }
          >
            {puedeRegistrar
              ? 'No se encontro ningun paciente con ese criterio.'
              : 'No se encontro ningun paciente con ese criterio. Pida en recepcion que lo registren.'}
          </Alert>
        ) : (
          <TablaPacientes resultados={resultados.data} onPagina={setPagina} />
        )
      ) : null}
    </Box>
  );
}
