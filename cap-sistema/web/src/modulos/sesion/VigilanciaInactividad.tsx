import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Stack,
} from '@mui/material';
import { usarSesion } from './contexto';
import { MINUTOS_INACTIVIDAD, SEGUNDOS_AVISO } from './inactividad';
import { usarCierrePorInactividad } from './usarCierrePorInactividad';
import { salir } from './servicio-sesion';

/**
 * Vigila la inactividad mientras hay sesion y avisa antes de cerrarla.
 *
 * Se monta una sola vez dentro de la zona autenticada, no en cada pantalla:
 * asi la cuenta no se reinicia al navegar, que es justo lo que haria inutil el
 * cierre —alguien podria dejar el panel abierto toda la tarde con solo haber
 * cambiado de pantalla una vez.
 */
function Vigilancia() {
  const navegar = useNavigate();

  const cerrar = useCallback(() => {
    void salir();
    navegar('/acceso', {
      replace: true,
      state: {
        aviso:
          'Su sesion se cerro por ' + MINUTOS_INACTIVIDAD + ' minutos sin actividad. Ingrese de nuevo.',
      },
    });
  }, [navegar]);

  const { fase, segundosRestantes, continuar } = usarCierrePorInactividad(cerrar);

  return (
    <Dialog
      open={fase === 'aviso'}
      // No se cierra ni con Escape ni haciendo clic afuera: el aviso tiene que
      // obligar a una respuesta. Descartarlo sin querer devolveria al usuario a
      // una sesion que se cierra en segundos sin que se entere.
      //
      // MUI 9 quito disableEscapeKeyDown; ahora se consigue lo mismo dejando
      // que onClose no haga nada. Solo los botones deciden.
      onClose={() => undefined}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Su sesion esta por cerrarse</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            No se ha detectado actividad. La sesion se cerrara en{' '}
            <strong>{segundosRestantes} segundos</strong>.
          </DialogContentText>
          <LinearProgress
            variant="determinate"
            // Acotado: fuera del aviso, segundosRestantes son los del limite
            // completo y la barra recibia valores como 1500 sobre 100.
            value={(Math.min(segundosRestantes, SEGUNDOS_AVISO) / SEGUNDOS_AVISO) * 100}
            // El color de advertencia, no el de marca: esto no es informacion,
            // es algo que exige una accion ahora.
            color="warning"
          />
          <DialogContentText variant="body2">
            Las computadoras del CAP son compartidas entre turnos. Si se aleja del equipo, la sesion
            se cierra sola.
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => void cerrar()}>Cerrar sesion ahora</Button>
        <Button onClick={continuar} variant="contained" autoFocus>
          Continuar trabajando
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Solo vigila cuando hay sesion.
 *
 * Va en dos componentes porque los hooks no pueden llamarse condicionalmente:
 * este decide si hace falta vigilar, el de adentro vigila. Ademas, al montarse
 * de nuevo en cada inicio de sesion, la cuenta arranca limpia.
 */
export function VigilanciaInactividad() {
  const { autenticado } = usarSesion();
  return autenticado ? <Vigilancia /> : null;
}
