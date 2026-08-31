import { useState } from 'react';
import { Button, Link, Stack, TextField, Typography } from '@mui/material';
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
  const [error, setError] = useState<unknown>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await verificarCodigo(tokenParcial, codigo.trim());
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
