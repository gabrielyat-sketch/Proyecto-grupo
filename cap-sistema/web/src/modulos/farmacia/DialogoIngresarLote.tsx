import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { ETIQUETA_UNIDAD, ingresarLote, type MedicamentoDetalle } from './servicio-farmacia';

/** El día de hoy en Purulhá, como `aaaa-mm-dd` para el campo de fecha. */
function hoyLocal(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return ahora.getFullYear() + '-' + mes + '-' + dia;
}

/**
 * Ingreso de un lote al inventario.
 *
 * Los tres datos vienen de la caja que está sobre el mostrador: el número de
 * lote impreso por el fabricante, la fecha de vencimiento y cuánto entró. El
 * proveedor es opcional porque no siempre consta en la caja.
 *
 * La fecha se manda como `aaaa-mm-dd` tal como la devuelve el campo, sin
 * construir un `Date`: Guatemala es UTC-6 y convertirla movería el vencimiento
 * al día anterior.
 */
export function DialogoIngresarLote({
  medicamento,
  onCerrar,
}: {
  medicamento: MedicamentoDetalle;
  onCerrar: () => void;
}) {
  const consultas = useQueryClient();
  const [numeroLote, setNumeroLote] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [proveedor, setProveedor] = useState('');

  const guardar = useMutation({
    mutationFn: () =>
      ingresarLote(medicamento.id, {
        numeroLote: numeroLote.trim(),
        fechaVencimiento,
        cantidad: Number(cantidad),
        ...(proveedor.trim() ? { proveedor: proveedor.trim() } : {}),
      } as never),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['medicamento', medicamento.id] });
      void consultas.invalidateQueries({ queryKey: ['catalogo'] });
      void consultas.invalidateQueries({ queryKey: ['por-vencer'] });
      void consultas.invalidateQueries({ queryKey: ['bajo-minimo'] });
      onCerrar();
    },
  });

  const completo =
    numeroLote.trim() !== '' && fechaVencimiento !== '' && Number(cantidad) > 0;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (completo) guardar.mutate();
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="xs">
      <form onSubmit={enviar}>
        <DialogTitle>Ingresar lote</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {medicamento.nombreGenerico}
              {medicamento.concentracion ? ' ' + medicamento.concentracion : ''}
            </Typography>

            {guardar.isError ? <AvisoError error={guardar.error} /> : null}

            <TextField
              label="Numero de lote"
              value={numeroLote}
              onChange={(e) => setNumeroLote(e.target.value)}
              required
              autoFocus
              helperText="El impreso en la caja por el fabricante"
            />

            <TextField
              label="Fecha de vencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: hoyLocal() } }}
            />

            <TextField
              label="Cantidad"
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              slotProps={{
                htmlInput: { min: 1 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {ETIQUETA_UNIDAD[medicamento.unidad] ?? medicamento.unidad}
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Proveedor"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              helperText="Opcional. De donde llego el lote"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!completo || guardar.isPending}>
            Ingresar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
