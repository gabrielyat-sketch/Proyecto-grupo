import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

/**
 * La contraseña temporal, que solo se muestra una vez.
 *
 * No se guarda en claro en ningún lado: el servidor devuelve el texto una sola
 * vez y a partir de ahí solo existe su hash. Si esta ventana se cierra sin que
 * nadie la anote, la única salida es restablecerla otra vez.
 *
 * De ahí las tres decisiones de esta pantalla:
 *
 * **No se cierra sola.** Ni con Escape ni pulsando fuera, porque no recibe
 * `onClose`: el diálogo lo gobierna `open`, y sin un manejador que cambie ese
 * estado no hay nada capaz de cerrarlo salvo el botón de abajo. No hace falta
 * `disableEscapeKeyDown` —MUI 9 ya no lo acepta en `Dialog`— y perder una
 * contraseña por un clic despistado es justo el accidente que hay que impedir.
 *
 * **Hay que confirmar que se anotó.** Una casilla, no un botón directo. Es un
 * segundo de fricción a cambio de que nadie cierre en automático.
 *
 * **Se muestra en grande y separada en bloques.** Se transcribe a mano en un
 * papel que se le entrega a la persona. El alfabeto que la genera ya evita los
 * caracteres ambiguos (0/O, 1/l/I); el tamaño y el espaciado hacen el resto.
 */
export function DialogoContrasenaTemporal({
  usuario,
  contrasena,
  titulo,
  onCerrar,
}: {
  usuario: string;
  contrasena: string;
  titulo: string;
  onCerrar: () => void;
}) {
  const [anotada, setAnotada] = useState(false);
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada(true);
    } catch {
      // Sin permiso de portapapeles no pasa nada: la contrasena esta a la
      // vista y el caso normal es copiarla a mano en un papel.
      setCopiada(false);
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm">
      <DialogTitle>{titulo}</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          <Alert severity="warning">
            <AlertTitle>Anotela ahora: no se puede volver a consultar</AlertTitle>
            El sistema no guarda esta contrasena. Si se pierde, hay que
            restablecerla y generar otra.
          </Alert>

          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Usuario
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 600 }}>
              {usuario}
            </Typography>
          </Stack>

          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Contrasena temporal
            </Typography>
            <Box
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Typography
                component="output"
                aria-label="Contrasena temporal"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.6rem',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  wordBreak: 'break-all',
                  display: 'block',
                }}
              >
                {contrasena}
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="outlined"
            startIcon={copiada ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={() => void copiar()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {copiada ? 'Copiada' : 'Copiar'}
          </Button>

          <Typography variant="body2" color="text.secondary">
            Entreguesela a la persona. Al entrar por primera vez el sistema le va a
            pedir que la cambie por una suya.
          </Typography>

          <FormControlLabel
            control={
              <Checkbox checked={anotada} onChange={(e) => setAnotada(e.target.checked)} />
            }
            label="Ya la anote o la copie"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onCerrar} disabled={!anotada}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
