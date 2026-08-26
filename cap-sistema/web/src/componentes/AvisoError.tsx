import { Alert, AlertTitle, Typography } from '@mui/material';
import { ErrorApi } from '../api';

/**
 * Muestra un error de la API.
 *
 * El `trazaId` solo aparece cuando el usuario NO puede hacer nada al respecto,
 * es decir cuando algo fallo del lado del servidor. En un error que la persona
 * si puede corregir —una contrasena mal escrita, un campo invalido— el codigo
 * de referencia no le sirve de nada: es ruido tecnico debajo de un mensaje que
 * ya era claro, y confunde a quien no sabe que es.
 *
 * Cuando si aparece, es lo unico que permite encontrar en los logs que le paso
 * exactamente a esa persona.
 */
export function AvisoError({ error }: { error: unknown }) {
  if (!error) return null;

  if (!(error instanceof ErrorApi)) {
    return <Alert severity="error">Ocurrio un error inesperado. Intente de nuevo.</Alert>;
  }

  const mostrarReferencia = error.codigo === 'ERROR_INTERNO' && error.trazaId !== '';

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
      {mostrarReferencia ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Si vuelve a ocurrir, reporte este codigo: {error.trazaId}
        </Typography>
      ) : null}
    </Alert>
  );
}
