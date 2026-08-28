import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
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
import { esErrorApi } from '../../api';
import {
  ajustarLote,
  conUnidad,
  desvioEnPalabras,
  ETIQUETA_UNIDAD,
  fechaCorta,
} from './servicio-farmacia';
import type { LoteParaBaja } from './DialogoBaja';

const MOTIVO_MINIMO = 3;
const MOTIVO_MAXIMO = 200;

/**
 * Ajuste de un lote por conteo físico.
 *
 * El estante y el sistema se separan tarde o temprano: una caja mal ubicada,
 * una entrega que no se registró, un frasco roto que nadie anotó. Hasta ahora
 * la única salida era dar de baja el lote **entero**, lo que obligaba a
 * inventar un motivo y borraba de golpe existencia que sí estaba.
 *
 * Se escribe **lo contado**, no la diferencia. Quien recorre el estante cuenta
 * unidades: "hay 95". Pedirle la diferencia lo obliga a restar de cabeza y a
 * acertar el signo, y equivocarse ahí deja el inventario peor de como estaba.
 * El desvío lo calcula la pantalla y se dice en palabras —"Faltan 5"— porque un
 * número con signo obliga a interpretar de qué lado está el error.
 */
export function DialogoAjuste({ lote, onCerrar }: { lote: LoteParaBaja; onCerrar: () => void }) {
  const consultas = useQueryClient();
  const [contado, setContado] = useState('');
  const [motivo, setMotivo] = useState('');

  const ajustar = useMutation({
    mutationFn: () =>
      ajustarLote(lote.id, {
        cantidadContada: Number(contado),
        // La existencia que el sistema mostraba al abrir el diálogo. Con ella
        // el servidor detecta que alguien entregó o ingresó mientras se
        // contaba, y devuelve un 409 en vez de pisar ese movimiento.
        cantidadEnSistema: lote.cantidadDisponible,
        motivo: motivo.trim(),
      }),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['medicamento'] });
      void consultas.invalidateQueries({ queryKey: ['catalogo'] });
      void consultas.invalidateQueries({ queryKey: ['por-vencer'] });
      void consultas.invalidateQueries({ queryKey: ['vencidos'] });
      void consultas.invalidateQueries({ queryKey: ['bajo-minimo'] });
      onCerrar();
    },
  });

  const numero = contado.trim() === '' ? null : Number(contado);
  const valido =
    numero !== null &&
    Number.isInteger(numero) &&
    numero >= 0 &&
    numero !== lote.cantidadDisponible &&
    motivo.trim().length >= MOTIVO_MINIMO;

  const seMovio =
    ajustar.isError && esErrorApi(ajustar.error) && ajustar.error.estado === 409;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (valido) ajustar.mutate();
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={enviar}>
        <DialogTitle>Conteo fisico del lote {lote.numeroLote}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {lote.medicamento.nombreGenerico} · vence el {fechaCorta(lote.fechaVencimiento)}
            </Typography>

            <Alert severity="info">
              El sistema dice{' '}
              <strong>{conUnidad(lote.cantidadDisponible, lote.medicamento.unidad)}</strong>. Escriba
              lo que hay realmente en el estante.
            </Alert>

            {seMovio ? (
              <Alert severity="warning">
                La existencia cambio mientras contaba: alguien entrego o ingreso de este lote. No se
                ajusto nada. Cierre, vuelva a abrir el lote y cuente otra vez.
              </Alert>
            ) : ajustar.isError ? (
              <AvisoError error={ajustar.error} />
            ) : null}

            <TextField
              label="Cantidad contada"
              type="number"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              required
              autoFocus
              slotProps={{
                htmlInput: { min: 0, step: 1 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {ETIQUETA_UNIDAD[lote.medicamento.unidad] ?? lote.medicamento.unidad}
                    </InputAdornment>
                  ),
                },
              }}
              helperText={
                numero !== null && numero >= 0
                  ? desvioEnPalabras(numero, lote.cantidadDisponible, lote.medicamento.unidad)
                  : 'Las unidades que hay fisicamente'
              }
            />

            {numero !== null && numero === lote.cantidadDisponible ? (
              <Alert severity="success">
                El conteo cuadra con el sistema. No hace falta ajustar nada.
              </Alert>
            ) : null}

            <TextField
              label="Motivo del ajuste"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              multiline
              minRows={2}
              slotProps={{ htmlInput: { maxLength: MOTIVO_MAXIMO } }}
              helperText="Por que no coincide. Un descuadre sin explicar no sirve de nada."
            />

            <Typography variant="caption" color="text.secondary">
              El ajuste no borra el error: lo deja explicado. La existencia queda en lo contado y el
              desvio, con su motivo y su responsable, queda en el libro mayor.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!valido || ajustar.isPending}>
            Ajustar existencia
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
