import { useMemo, useRef, useState } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { buscarPacientes, listarComunidades, type PacienteResumen } from './servicio-pacientes';
import { MENU_AZUL } from '../../componentes/menuAzul';
import { EncabezadoPagina, NotaPagina } from '../../componentes/EncabezadoPagina';
import { marcarLlegada } from '../espera/servicio-espera';
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
  const [llegando, setLlegando] = useState<PacienteResumen | null>(null);
  const [motivo, setMotivo] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const clienteConsultas = useQueryClient();

  const llegada = useMutation({
    mutationFn: (datos: { pacienteId: string; motivo: string }) =>
      marcarLlegada(datos.pacienteId, datos.motivo || undefined),
    onSuccess: () => {
      setLlegando(null);
      setMotivo('');
      void clienteConsultas.invalidateQueries({ queryKey: ['sala-espera'] });
    },
  });

  // Ctrl+K devuelve el foco a la caja y selecciona lo escrito, para empezar
  // otra busqueda sin borrar a mano.
  usarAtajo('k', () => {
    campo.current?.focus();
    campo.current?.select();
  });

  const criterio = useMemo(() => interpretarBusqueda(texto), [texto]);
  const aviso = motivoSinBuscar(criterio);

  /**
   * La comunidad por si sola YA es una busqueda.
   *
   * Antes hacia falta escribir tambien un nombre o un DPI, y elegir la
   * comunidad no mostraba nada: parecia que el filtro no funcionaba. Pero es
   * de las consultas mas utiles que hace el CAP —"quienes son mis pacientes de
   * Panima"— y el servidor siempre supo responderla; era el panel el que no la
   * pedia.
   *
   * Si ademas hay texto a medias, se busca solo por comunidad y el aviso de
   * abajo explica que las letras todavia no cuentan.
   */
  const puedeBuscar =
    criterio.tipo === 'dpi' || criterio.tipo === 'nombre' || comunidadId !== '';

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
      <EncabezadoPagina
        titulo="Recepcion"
        descripcion="Busque por DPI o por el inicio del apellido."
        acciones={
          puedeRegistrar ? (
            <Button
              component={EnlaceRuta}
              to="/recepcion/nuevo"
              variant="contained"
              color="success"
              startIcon={<PersonAddIcon />}
            >
              Registrar paciente
            </Button>
          ) : null
        }
      />

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
            slotProps={{ select: { MenuProps: MENU_AZUL } }}
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
        <NotaPagina>
          {puedeRegistrar
            ? 'Escriba para buscar, o elija una comunidad para ver a todos sus pacientes. Si el paciente no aparece, registrelo con el boton de arriba.'
            : 'Escriba para buscar, o elija una comunidad para ver a todos sus pacientes.'}
        </NotaPagina>
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
          <TablaPacientes
            resultados={resultados.data}
            onPagina={setPagina}
            // Marcar la llegada es de recepcion, igual que dar de alta: son
            // quienes estan en la ventanilla y ven entrar a la gente.
            onLlegada={
              puedeRegistrar
                ? (p) => {
                    setMotivo('');
                    llegada.reset();
                    setLlegando(p);
                  }
                : undefined
            }
          />
        )
      ) : null}

      {/*
        Marcar la llegada es un solo boton, no un formulario: la persona esta
        parada en la ventanilla. El motivo es opcional y de una linea, para que
        la enfermera sepa a que viene antes de llamarla.
      */}
      {llegando ? (
        <Dialog open onClose={() => setLlegando(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {llegando.apellidos}, {llegando.nombres}
          </DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              {llegada.isError ? <AvisoError error={llegada.error} /> : null}
              <Typography variant="body2" color="text.secondary">
                Pasa a la sala de espera. Cuando le llenen la ficha, sale sola de la lista.
              </Typography>
              <TextField
                label="A que viene"
                autoFocus
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                helperText="Opcional, una linea. Se guarda cifrado."
                placeholder="Control de embarazo"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setLlegando(null)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={llegada.isPending}
              onClick={() =>
                llegada.mutate({ pacienteId: llegando.id, motivo: motivo.trim() })
              }
            >
              {llegada.isPending ? 'Guardando...' : 'Marcar llegada'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  );
}
