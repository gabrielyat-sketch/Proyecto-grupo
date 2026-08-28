import { useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Pagination,
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { AvisoError } from '../../componentes/AvisoError';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { usarSesion } from '../sesion/contexto';
import { DialogoContrasenaTemporal } from './DialogoContrasenaTemporal';
import { DialogoEditarCuenta, DialogoNuevaCuenta } from './DialogoCuenta';
import {
  ETIQUETA_ROL,
  EXIGEN_MFA,
  LISTA_ROLES,
  listarCuentas,
  restablecerContrasena,
  ultimoAccesoEnPalabras,
  type Cuenta,
} from './servicio-cuentas';

/** Lo que hay que mostrar de una contraseña recién generada. */
interface Temporal {
  usuario: string;
  contrasena: string;
  titulo: string;
}

/**
 * Cuentas del personal del CAP.
 *
 * Mientras este módulo no existió, crear una cuenta o recuperar una contraseña
 * exigía correr un comando en la terminal del servidor. El CAP no va a hacer
 * eso, y sin esta pantalla las pruebas con el personal no se pueden ni empezar.
 *
 * Exclusiva del Administrador, igual que el controlador entero.
 */
export function PaginaAdministracion() {
  const consultas = useQueryClient();
  const { usuario: sesion } = usarSesion();
  const [buscar, setBuscar] = useState('');
  const [rol, setRol] = useState('');
  const [pagina, setPagina] = useState(1);
  const [alta, setAlta] = useState(false);
  const [editando, setEditando] = useState<Cuenta | null>(null);
  const [confirmando, setConfirmando] = useState<Cuenta | null>(null);
  const [temporal, setTemporal] = useState<Temporal | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  usarAtajo('k', () => {
    campo.current?.focus();
    campo.current?.select();
  });

  const cuentas = useQuery({
    queryKey: ['cuentas', buscar, rol, pagina],
    queryFn: () => listarCuentas(buscar, rol, pagina),
    placeholderData: keepPreviousData,
  });

  const restablecer = useMutation({
    mutationFn: (cuenta: Cuenta) => restablecerContrasena(cuenta.id),
    onSuccess: (respuesta) => {
      void consultas.invalidateQueries({ queryKey: ['cuentas'] });
      setConfirmando(null);
      setTemporal({
        usuario: respuesta.usuario,
        contrasena: respuesta.contrasenaTemporal,
        titulo: 'Contrasena restablecida',
      });
    },
  });

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, mb: 3, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
      >
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Administracion
          </Typography>
          <Typography color="text.secondary">
            Cuentas del personal del CAP, sus roles y sus contrasenas.
          </Typography>
        </Stack>

        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setAlta(true)}
          sx={{ flexShrink: 0 }}
        >
          Nueva cuenta
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, mb: 2 }}>
        <TextField
          inputRef={campo}
          label="Buscar"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value);
            setPagina(1);
          }}
          fullWidth
          placeholder="Nombre, apellido o usuario"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          label="Rol"
          value={rol}
          onChange={(e) => {
            setRol(e.target.value);
            setPagina(1);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {LISTA_ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {cuentas.isError ? <AvisoError error={cuentas.error} /> : null}
      {restablecer.isError ? <AvisoError error={restablecer.error} /> : null}

      {cuentas.isPending ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {cuentas.data && cuentas.data.total === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3 }}>
          Ninguna cuenta coincide con la busqueda.
        </Typography>
      ) : null}

      {cuentas.data && cuentas.data.total > 0 ? (
        <Stack sx={{ gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {cuentas.data.total === 1 ? '1 cuenta' : cuentas.data.total + ' cuentas'}
          </Typography>

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Persona</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Ultimo acceso</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cuentas.data.datos.map((c) => {
                  const esMiCuenta = sesion?.id === c.id;
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {c.apellidos}, {c.nombres}
                          </Typography>
                          {esMiCuenta ? (
                            <Chip size="small" variant="outlined" label="Usted" />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{c.usuario}</TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
                          {ETIQUETA_ROL[c.rol] ?? c.rol}
                          {EXIGEN_MFA.includes(c.rol) ? (
                            <Chip size="small" variant="outlined" label="2FA" />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                          {!c.activo ? (
                            <Chip size="small" color="default" label="Desactivada" />
                          ) : null}
                          {/*
                            "Contrasena sin cambiar" es el dato que dice que
                            alguien todavia no ha entrado con la temporal que se
                            le entrego, o que se le acaba de restablecer.
                          */}
                          {c.debeCambiarContrasena ? (
                            <Chip size="small" color="warning" label="Contrasena sin cambiar" />
                          ) : null}
                          {c.activo && !c.debeCambiarContrasena ? (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {ultimoAccesoEnPalabras(c.ultimoAcceso as unknown as string | null)}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                          <Button size="small" variant="outlined" onClick={() => setEditando(c)}>
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => setConfirmando(c)}
                          >
                            Restablecer contrasena
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {cuentas.data.totalPaginas > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={cuentas.data.totalPaginas}
                page={cuentas.data.pagina}
                onChange={(_e, p) => setPagina(p)}
                color="primary"
              />
            </Box>
          ) : null}
        </Stack>
      ) : null}

      {alta ? (
        <DialogoNuevaCuenta
          onCerrar={() => setAlta(false)}
          onCreada={(cuenta) => {
            setAlta(false);
            setTemporal({
              usuario: cuenta.usuario,
              contrasena: cuenta.contrasenaTemporal,
              titulo: 'Cuenta creada',
            });
          }}
        />
      ) : null}

      {/* Con key para que el estado nazca con la cuenta que se abre. */}
      {editando ? (
        <DialogoEditarCuenta
          key={editando.id}
          cuenta={editando}
          onCerrar={() => setEditando(null)}
        />
      ) : null}

      {confirmando ? (
        <Dialog open onClose={() => setConfirmando(null)} fullWidth maxWidth="xs">
          <DialogTitle>Restablecer la contrasena de {confirmando.usuario}</DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <DialogContentText>
                Se genera una contrasena temporal nueva, que va a tener que anotar y entregarle a
                la persona.
              </DialogContentText>
              <Alert severity="warning">
                Su sesion se cierra de inmediato y la contrasena anterior deja de servir. Si la
                cuenta estaba bloqueada por intentos fallidos, esto tambien la desbloquea.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmando(null)}>Cancelar</Button>
            <Button
              variant="contained"
              color="warning"
              disabled={restablecer.isPending}
              onClick={() => restablecer.mutate(confirmando)}
            >
              {restablecer.isPending ? 'Restableciendo...' : 'Restablecer'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {temporal ? (
        <DialogoContrasenaTemporal
          usuario={temporal.usuario}
          contrasena={temporal.contrasena}
          titulo={temporal.titulo}
          onCerrar={() => setTemporal(null)}
        />
      ) : null}
    </Box>
  );
}
