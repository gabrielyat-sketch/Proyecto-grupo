import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { ETIQUETA_ESTADO, type EstadoDigitalizacion, type ExpedienteEnCola } from './servicio-digitalizacion';

/**
 * Que significa cada estado y quien lo pone.
 *
 * Los dos primeros los mueve el sistema solo, con lo que sabe: una carpeta de
 * papel nace pendiente y pasa a "en proceso" en cuanto se transcribe su primera
 * hoja. Los dos ultimos dependen de mirar el papel —el sistema no sabe cuantas
 * hojas tiene una carpeta ni si esta en su cajon— y por eso los declara una
 * persona. Decirlo en pantalla evita que alguien crea que el sistema lo sabe.
 */
const ESTADOS: {
  valor: EstadoDigitalizacion;
  explicacion: string;
  automatico?: boolean;
}[] = [
  {
    valor: 'PENDIENTE',
    explicacion: 'La carpeta esta en el archivo y nadie ha transcrito ninguna hoja.',
    automatico: true,
  },
  {
    valor: 'EN_PROCESO',
    explicacion: 'Ya se transcribio al menos una hoja, pero la carpeta no se ha dado por terminada.',
    automatico: true,
  },
  {
    valor: 'COMPLETO',
    explicacion:
      'Todas las hojas del papel ya estan en el sistema. Lo decide usted: el sistema no sabe cuantas hojas trae la carpeta.',
  },
  {
    valor: 'NO_LOCALIZADO',
    explicacion: 'Se busco en el archivo y no aparece. Sale de la cola, pero queda registrada.',
  },
];

/**
 * Cambiar el estado de una carpeta.
 *
 * "No localizado" pide explicacion a proposito: un expediente que desaparece
 * del archivo es justo lo que despues nadie sabe explicar, y "no aparece" sin
 * mas no le sirve a quien lo busque dentro de seis meses.
 */
export function DialogoEstado({
  expediente,
  guardando,
  error,
  onCerrar,
  onGuardar,
}: {
  expediente: ExpedienteEnCola;
  guardando: boolean;
  error: unknown;
  onCerrar: () => void;
  onGuardar: (estado: EstadoDigitalizacion, observaciones: string) => void;
}) {
  // Arranca en el estado que la carpeta tiene ahora, no en uno por defecto.
  // Quien lo abre viene a corregir lo que ve, y proponerle otra cosa invita a
  // guardar sin leer. El padre lo monta con `key`, asi que este valor inicial
  // se vuelve a calcular con cada expediente.
  const [estado, setEstado] = useState<EstadoDigitalizacion>(
    expediente.estado as EstadoDigitalizacion,
  );
  const [observaciones, setObservaciones] = useState(expediente.observaciones ?? '');

  const exigeMotivo = estado === 'NO_LOCALIZADO';
  const falta = exigeMotivo && observaciones.trim() === '';

  return (
    <Dialog
      open
      onClose={onCerrar}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography component="span" sx={{ fontWeight: 700, display: 'block' }}>
          {expediente.apellidos}, {expediente.nombres}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {expediente.numero}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {error ? <AvisoError error={error} /> : null}

          <TextField
            select
            label="Estado de la carpeta"
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoDigitalizacion)}
            autoFocus
          >
            {ESTADOS.map((e) => (
              <MenuItem key={e.valor} value={e.valor}>
                {ETIQUETA_ESTADO[e.valor]}
              </MenuItem>
            ))}
          </TextField>

          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {ESTADOS.find((e) => e.valor === estado)?.explicacion}
            </Typography>
            {ESTADOS.find((e) => e.valor === estado)?.automatico ? (
              <Typography variant="caption" color="text.secondary">
                Este estado lo pone el sistema solo al transcribir. Cambiarlo a mano solo hace
                falta para corregir.
              </Typography>
            ) : null}
          </Stack>

          <TextField
            label={exigeMotivo ? 'Que paso *' : 'Observaciones'}
            multiline
            minRows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            error={falta}
            helperText={
              falta
                ? 'Explique por que no aparece: dentro de seis meses nadie lo recordara'
                : 'Opcional'
            }
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={guardando || falta}
          onClick={() => onGuardar(estado, observaciones.trim())}
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
