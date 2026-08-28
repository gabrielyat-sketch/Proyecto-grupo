import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { usarSesion } from '../sesion/contexto';
import {
  actualizarCuenta,
  crearCuenta,
  ETIQUETA_ROL,
  EXIGEN_MFA,
  LISTA_ROLES,
  QUE_HACE_EL_ROL,
  type Cuenta,
  type CuentaCreada,
} from './servicio-cuentas';

/** El desplegable de rol, con la explicación de lo que hace el elegido. */
function CampoRol({
  valor,
  onCambiar,
  deshabilitado,
  ayuda,
}: {
  valor: string;
  onCambiar: (rol: string) => void;
  deshabilitado?: boolean;
  ayuda?: string;
}) {
  return (
    <TextField
      select
      label="Rol"
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      disabled={deshabilitado}
      fullWidth
      // Lo que hace el rol va debajo del campo, no en un manual: quien crea la
      // cuenta no tiene por que saberse la arquitectura para elegir bien.
      helperText={ayuda ?? QUE_HACE_EL_ROL[valor]}
    >
      {LISTA_ROLES.map((r) => (
        <MenuItem key={r} value={r}>
          {ETIQUETA_ROL[r]}
        </MenuItem>
      ))}
    </TextField>
  );
}

/**
 * Alta de una cuenta.
 *
 * No pide contraseña: la genera el servidor y se muestra una sola vez al
 * terminar. Nadie elige la contraseña de otra persona, y así tampoco hay una
 * contraseña conocida por dos personas desde el primer día.
 */
export function DialogoNuevaCuenta({
  onCerrar,
  onCreada,
}: {
  onCerrar: () => void;
  onCreada: (cuenta: CuentaCreada) => void;
}) {
  const consultas = useQueryClient();
  const [usuario, setUsuario] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [rol, setRol] = useState<string>('RECEPCION');

  const guardar = useMutation({
    mutationFn: () =>
      crearCuenta({
        usuario: usuario.trim().toLowerCase(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        rol: rol as never,
      }),
    onSuccess: (cuenta) => {
      void consultas.invalidateQueries({ queryKey: ['cuentas'] });
      onCreada(cuenta);
    },
  });

  const completo =
    usuario.trim().length >= 3 && nombres.trim() !== '' && apellidos.trim() !== '';

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (completo) guardar.mutate();
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={enviar}>
        <DialogTitle>Nueva cuenta</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {guardar.isError ? <AvisoError error={guardar.error} /> : null}

            <TextField
              label="Usuario"
              value={usuario}
              // A minusculas mientras se escribe: el servidor lo guarda asi, y
              // ver una cosa y que se guarde otra confunde al comprobar.
              onChange={(e) => setUsuario(e.target.value.toLowerCase())}
              required
              autoFocus
              helperText="Con el que va a iniciar sesion. Letras, numeros, punto, guion y guion bajo"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <TextField
                label="Nombres"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Apellidos"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                required
                fullWidth
              />
            </Stack>

            <CampoRol valor={rol} onCambiar={setRol} />

            {EXIGEN_MFA.includes(rol) ? (
              <Alert severity="info">
                Este rol exige segundo factor. La primera vez que entre, el sistema le va a pedir
                configurarlo con una aplicacion de autenticacion y le dara sus codigos de respaldo.
              </Alert>
            ) : null}

            <Typography variant="caption" color="text.secondary">
              La contrasena la genera el sistema y se muestra una sola vez al terminar.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!completo || guardar.isPending}>
            Crear cuenta
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/**
 * Edición de una cuenta.
 *
 * El **nombre de usuario no se edita**: es con lo que la persona inicia sesión
 * y lo que aparece en la traza de auditoría de todo lo que hizo. Cambiarlo
 * dejaría registros firmados por un usuario que ya no existe con ese nombre.
 *
 * Sobre la propia cuenta hay dos cosas que el servidor rechaza —desactivarse y
 * cambiarse el rol— porque el CAP podría quedarse sin ninguna cuenta capaz de
 * administrar el sistema. La pantalla las deshabilita en vez de dejar que el
 * servidor devuelva un 400 después de intentarlo.
 */
export function DialogoEditarCuenta({
  cuenta,
  onCerrar,
}: {
  cuenta: Cuenta;
  onCerrar: () => void;
}) {
  const consultas = useQueryClient();
  const { usuario: sesion } = usarSesion();
  const esMiCuenta = sesion?.id === cuenta.id;

  const [nombres, setNombres] = useState(cuenta.nombres);
  const [apellidos, setApellidos] = useState(cuenta.apellidos);
  const [rol, setRol] = useState<string>(cuenta.rol);
  const [activo, setActivo] = useState(cuenta.activo);

  const guardar = useMutation({
    mutationFn: () =>
      actualizarCuenta(cuenta.id, {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        rol: rol as never,
        activo,
      }),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['cuentas'] });
      onCerrar();
    },
  });

  const cambiaRol = rol !== cuenta.rol;
  const desactiva = !activo && cuenta.activo;
  const completo = nombres.trim() !== '' && apellidos.trim() !== '';

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (completo) guardar.mutate();
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={enviar}>
        <DialogTitle>{cuenta.usuario}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {guardar.isError ? <AvisoError error={guardar.error} /> : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <TextField
                label="Nombres"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                required
                autoFocus
                fullWidth
              />
              <TextField
                label="Apellidos"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                required
                fullWidth
              />
            </Stack>

            <CampoRol
              valor={rol}
              onCambiar={setRol}
              deshabilitado={esMiCuenta}
              ayuda={
                esMiCuenta
                  ? 'No puede cambiar su propio rol: el CAP podria quedarse sin administrador.'
                  : undefined
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  disabled={esMiCuenta}
                />
              }
              label={
                esMiCuenta
                  ? 'Activa (no puede desactivar su propia cuenta)'
                  : 'Cuenta activa'
              }
            />

            {desactiva ? (
              <Alert severity="warning">
                Al desactivarla no podra volver a entrar, y su sesion se cierra de inmediato. La
                cuenta y todo lo que registro se conservan.
              </Alert>
            ) : cambiaRol ? (
              <Alert severity="info">
                Al cambiar el rol se cierra su sesion de inmediato, para que el permiso nuevo
                tenga efecto ya y no dentro de quince minutos.
              </Alert>
            ) : null}

            <Typography variant="caption" color="text.secondary">
              El nombre de usuario no se edita: es con lo que inicia sesion y lo que queda firmado
              en la traza de todo lo que hizo.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!completo || guardar.isPending}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
