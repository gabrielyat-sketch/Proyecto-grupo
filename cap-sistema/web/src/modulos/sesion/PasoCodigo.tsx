import { useState } from 'react';
import {
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { verificarCodigo } from './servicio-sesion';
import { BOTON_ENTRAR } from '../../tema';

/**
 * Segundo factor. Acepta el codigo de 6 digitos de la aplicacion o uno de los
 * codigos de respaldo, que son mas largos.
 */
export function PasoCodigo({
  tokenParcial,
  alVolver,
  alEntrar,
}: {
  tokenParcial: string;
  alVolver: () => void;
  alEntrar: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  // Marcada por omision: es lo que la gente quiere casi siempre, y quien
  // trabaje en una computadora prestada puede desmarcarla.
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await verificarCodigo(tokenParcial, codigo.trim(), recordar);
      alEntrar();
    } catch (err) {
      setError(err);
      setCodigo('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Stack spacing={2.5}>
        <AvisoError error={error} />

        <TextField
          label="Codigo de verificacion"
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          // one-time-code deja que el telefono ofrezca el codigo directamente.
          autoComplete="one-time-code"
          inputMode="numeric"
          slotProps={{
            htmlInput: {
              maxLength: 20,
              style: { fontSize: '1.5rem', letterSpacing: '0.35em', textAlign: 'center' },
            },
          }}
          helperText="Los 6 digitos de su aplicacion, o un codigo de respaldo"
        />

        {/*
          Lo que de verdad quita la molestia.

          El codigo protege de que alguien con la contrasena robada entre
          desde fuera; pedirlo en cada entrada no aumenta esa proteccion,
          porque la primera vez del dia ya demostro que el telefono esta en
          manos de quien dice ser. Lo que si produce es que en una clinica
          donde se entra y sale varias veces al dia la gente busque como
          saltarselo —dejar la sesion abierta, compartir la cuenta— y ahi si
          se pierde todo.

          En una computadora prestada se desmarca, que es justo para lo que
          esta la casilla.
        */}
        <FormControlLabel
          control={
            <Checkbox checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
          }
          label={
            <Stack sx={{ gap: 0.25 }}>
              <Typography variant="body2">No volver a pedirlo en este equipo</Typography>
              <Typography variant="caption" color="text.secondary">
                Por 30 dias. Desmarquelo si la computadora no es suya.
              </Typography>
            </Stack>
          }
          sx={{ alignItems: 'flex-start', ml: 0, '& .MuiCheckbox-root': { pt: 0.25 } }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={BOTON_ENTRAR}
          disabled={enviando || codigo.trim().length < 6}
        >
          {enviando ? 'Verificando...' : 'Verificar'}
        </Button>

        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          <Link component="button" type="button" onClick={alVolver} underline="hover">
            Usar otra cuenta
          </Link>
        </Typography>
      </Stack>
    </form>
  );
}
