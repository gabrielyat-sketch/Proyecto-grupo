import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { conUnidad, darDeBajaLote, fechaCorta } from './servicio-farmacia';

/** Lo mínimo que la pantalla necesita saber del lote que se va a dar de baja. */
export interface LoteParaBaja {
  id: string;
  numeroLote: string;
  fechaVencimiento: string | Date;
  cantidadDisponible: number;
  medicamento: { nombreGenerico: string; unidad: string };
}

const MOTIVO_MINIMO = 3;
const MOTIVO_MAXIMO = 200;

/**
 * Baja de lo que queda de un lote.
 *
 * El sistema no da de baja nada por su cuenta, ni siquiera un lote vencido:
 * destruir medicamento es una decisión con responsable, y la baja queda en el
 * libro mayor a nombre de quien la hizo.
 *
 * Por eso el motivo es obligatorio y va completo. El servidor lo limita a 200
 * caracteres —es lo que cabe en la columna— y el contador lo dice antes de
 * enviarlo, en vez de recortarlo por detrás: el motivo es lo único que explica
 * después por qué faltan esas cajas.
 */
export function DialogoBaja({ lote, onCerrar }: { lote: LoteParaBaja; onCerrar: () => void }) {
  const consultas = useQueryClient();
  const [motivo, setMotivo] = useState('');

  const dar = useMutation({
    mutationFn: () => darDeBajaLote(lote.id, motivo.trim()),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['vencidos'] });
      void consultas.invalidateQueries({ queryKey: ['por-vencer'] });
      void consultas.invalidateQueries({ queryKey: ['catalogo'] });
      void consultas.invalidateQueries({ queryKey: ['medicamento'] });
      void consultas.invalidateQueries({ queryKey: ['bajo-minimo'] });
      onCerrar();
    },
  });

  const largo = motivo.trim().length;
  const valido = largo >= MOTIVO_MINIMO && largo <= MOTIVO_MAXIMO;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (valido) dar.mutate();
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={enviar}>
        <DialogTitle>Dar de baja el lote {lote.numeroLote}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {lote.medicamento.nombreGenerico} · vence el{' '}
              {fechaCorta(lote.fechaVencimiento)}
            </Typography>

            <Alert severity="warning">
              Se descuentan {conUnidad(lote.cantidadDisponible, lote.medicamento.unidad)} y el lote
              deja de poder entregarse. No se puede deshacer.
            </Alert>

            {dar.isError ? <AvisoError error={dar.error} /> : null}

            <TextField
              label="Motivo de la baja"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              autoFocus
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: MOTIVO_MAXIMO } }}
              helperText={
                largo > 0 && largo < MOTIVO_MINIMO
                  ? 'Explique el motivo: al menos ' + MOTIVO_MINIMO + ' caracteres'
                  : largo + ' de ' + MOTIVO_MAXIMO + ' caracteres'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            color="warning"
            disabled={!valido || dar.isPending}
          >
            Dar de baja
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
