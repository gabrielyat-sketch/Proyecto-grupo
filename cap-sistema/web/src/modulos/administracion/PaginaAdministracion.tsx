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
import { AvatarUsuario } from '../../componentes/AvatarUsuario';
import { EncabezadoPagina } from '../../componentes/EncabezadoPagina';
import { MENU_AZUL } from '../../componentes/menuAzul';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { usarSesion } from '../sesion/contexto';
import { DialogoContrasenaTemporal } from './DialogoContrasenaTemporal';
import { DialogoEditarCuenta, DialogoNuevaCuenta } from './DialogoCuenta';
import {
  ETIQUETA_ROL,
  EXIGEN_MFA,
  LISTA_ROLES,
  listarCuentas,
  reiniciarMfa,
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
  const [reiniciando, setReiniciando] = useState<Cuenta | null>(null);
  const [avisoMfa, setAvisoMfa] = useState<string | null>(null);
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

  const mfa = useMutation({
    mutationFn: (cuenta: Cuenta) => reiniciarMfa(cuenta.id),
    onSuccess: (respuesta) => {
      void consultas.invalidateQueries({ queryKey: ['cuentas'] });
      setReiniciando(null);
      setAvisoMfa(
        respuesta.exigeSegundoFactor
          ? 'Segundo factor reiniciado para ' +
              respuesta.usuario +
              '. Su rol lo exige, asi que el sistema le pedira configurarlo de nuevo en su proximo acceso y le dara codigos de respaldo nuevos.'
          : 'Segundo factor reiniciado para ' +
              respuesta.usuario +
              '. Su rol no lo exige: entrara sin el hasta que decida volver a configurarlo.',
      );
    },
  });

  return (
    <Box>
      <EncabezadoPagina
        titulo="Administracion"
        descripcion="Cuentas del personal del CAP, sus roles y sus contrasenas."
        acciones={
          <Button
            variant="contained"
            color="success"
            startIcon={<PersonAddIcon />}
            onClick={() => setAlta(true)}
            sx={{ flexShrink: 0 }}
          >
            Nueva cuenta
          </Button>
        }
      />

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
          slotProps={{ select: { MenuProps: MENU_AZUL } }}
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
      {mfa.isError ? <AvisoError error={mfa.error} /> : null}

      {avisoMfa ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAvisoMfa(null)}>
          {avisoMfa}
        </Alert>
      ) : null}

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
                        <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                          {/*
                            Sin punto de presencia a proposito. El servidor no
                            sabe quien esta dentro ahora mismo: `ultimoAcceso`
                            se escribe al iniciar sesion, asi que quien entro a
                            las siete y sigue trabajando se veria igual que
                            quien se fue a media manana. Un punto verde ahi
                            afirmaria algo que nadie ha comprobado. La columna
                            "Ultimo acceso" dice la verdad que si se tiene.
                          */}
                          <AvatarUsuario
                            usuario={c.usuario}
                            nombres={c.nombres}
                            apellidos={c.apellidos}
                            tamano={32}
                            descripcion={c.nombres + ' ' + c.apellidos + ' (' + c.usuario + ')'}
                          />
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
                          {/*
                            Se distingue el segundo factor CONFIGURADO del que
                            solo esta exigido por el rol: una cuenta
                            administrativa recien creada exige 2FA y todavia no
                            lo tiene, y son dos situaciones distintas.
                          */}
                          {c.mfaActivo ? (
                            <Chip size="small" color="success" variant="outlined" label="2FA" />
                          ) : EXIGEN_MFA.includes(c.rol) ? (
                            <Chip size="small" variant="outlined" label="2FA pendiente" />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                          {!c.activo ? (
                            <Chip size="small" color="default" label="Desactivada" />
                          ) : null}
                          {/*
                            El bloqueo por intentos fallidos era invisible: la
                            cuenta se veia igual que cualquier otra, y habia que
                            restablecer la contrasena a ciegas porque alguien lo
                            pedia por telefono.
                          */}
                          {c.bloqueada ? (
                            <Chip size="small" color="error" label="Bloqueada" />
                          ) : null}
                          {/*
                            "Contrasena sin cambiar" es el dato que dice que
                            alguien todavia no ha entrado con la temporal que se
                            le entrego, o que se le acaba de restablecer.
                          */}
                          {c.debeCambiarContrasena ? (
                            <Chip size="small" color="warning" label="Contrasena sin cambiar" />
                          ) : null}
                          {c.activo && !c.debeCambiarContrasena && !c.bloqueada ? (
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
                          {/*
                            Rellenos, no delineados: en una tabla de seis
                            columnas los botones delineados se perdian entre las
                            lineas de las celdas. El color separa lo que hace
                            cada uno —azul para editar los datos de la cuenta,
                            cafe para lo que genera una contrasena nueva y
                            deja sin entrar a quien tenia la anterior.
                          */}
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => setEditando(c)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() => setConfirmando(c)}
                          >
                            Restablecer contrasena
                          </Button>
                          {/*
                            Solo si de verdad tiene algo que reiniciar. En una
                            cuenta sin segundo factor el servidor responde 400,
                            y ofrecer el boton seria prometer una accion que no
                            existe para ese caso.
                          */}
                          {c.mfaActivo ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() => setReiniciando(c)}
                            >
                              Reiniciar 2FA
                            </Button>
                          ) : null}
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

      {reiniciando ? (
        <Dialog open onClose={() => setReiniciando(null)} fullWidth maxWidth="xs">
          <DialogTitle>Reiniciar el segundo factor de {reiniciando.usuario}</DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2 }}>
              <DialogContentText>
                Para cuando alguien pierde el telefono con la aplicacion de autenticacion y ya no
                le quedan codigos de respaldo.
              </DialogContentText>
              <Alert severity="warning">
                Se borra su configuracion actual y sus codigos de respaldo, y su sesion se cierra.
                La proxima vez que entre configurara el segundo factor desde cero, como el primer
                dia.
              </Alert>
              <DialogContentText>
                Asegurese de que es esa persona quien lo pide, y no alguien haciendose pasar por
                ella.
              </DialogContentText>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReiniciando(null)}>Cancelar</Button>
            <Button
              variant="contained"
              color="warning"
              disabled={mfa.isPending}
              onClick={() => mfa.mutate(reiniciando)}
            >
              {mfa.isPending ? 'Reiniciando...' : 'Reiniciar'}
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
