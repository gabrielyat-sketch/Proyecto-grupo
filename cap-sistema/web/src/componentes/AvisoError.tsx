import { Alert, AlertTitle, Typography } from '@mui/material';
import { ErrorApi } from '../api';

/**
 * Muestra un error de la API.
 *
 * El `trazaId` se imprime a proposito, en pequeno. Cuando alguien del CAP
 * llame para reportar una falla, ese codigo es lo unico que permite encontrar
 * en los logs exactamente que le paso. Sin el, la conversacion empieza con
 * "no me deja entrar" y no hay por donde agarrarla.
 */
export function AvisoError({ error }: { error: unknown }) {
  if (!error) return null;

  if (!(error instanceof ErrorApi)) {
    return (
      <Alert severity="error">Ocurrio un error inesperado. Intente de nuevo.</Alert>
    );
  }

  return (
    <Alert severity={error.sinConexion ? 'warning' : 'error'}>
      <AlertTitle sx={{ mb: error.detalles.length ? 0.5 : 0 }}>{error.mensaje}</AlertTitle>
      {error.detalles.length > 0 ? (
        <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2.5 }}>
          {error.detalles.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </Typography>
      ) : null}
      {error.trazaId ? (
        <Typography variant="caption" color="text.secondary"  sx={{ display: 'block', mt: 0.5 }}>
          Codigo de referencia: {error.trazaId}
        </Typography>
      ) : null}
    </Alert>
  );
}
