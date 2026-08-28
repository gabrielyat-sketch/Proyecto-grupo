import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import {
  actualizarMedicamento,
  crearMedicamento,
  ETIQUETA_UNIDAD,
  type MedicamentoDetalle,
} from './servicio-farmacia';

const UNIDADES = [
  'TABLETA',
  'CAPSULA',
  'JARABE_ML',
  'AMPOLLA',
  'FRASCO',
  'SOBRE',
  'UNIDAD',
  'GRAMO',
] as const;

/**
 * Alta de un medicamento en el catálogo.
 *
 * El código es el del listado básico del MSPAS o el interno del CAP, y el
 * servidor lo pasa a mayúsculas: el campo hace lo mismo mientras se escribe
 * para que lo que se ve sea lo que se guarda.
 */
export function DialogoNuevoMedicamento({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const consultas = useQueryClient();
  const [codigo, setCodigo] = useState('');
  const [nombreGenerico, setNombreGenerico] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [presentacion, setPresentacion] = useState('');
  const [concentracion, setConcentracion] = useState('');
  const [unidad, setUnidad] = useState<string>('TABLETA');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [requiereReceta, setRequiereReceta] = useState(false);

  const guardar = useMutation({
    mutationFn: () =>
      crearMedicamento({
        codigo: codigo.trim().toUpperCase(),
        nombreGenerico: nombreGenerico.trim(),
        ...(nombreComercial.trim() ? { nombreComercial: nombreComercial.trim() } : {}),
        ...(presentacion.trim() ? { presentacion: presentacion.trim() } : {}),
        ...(concentracion.trim() ? { concentracion: concentracion.trim() } : {}),
        unidad: unidad as never,
        stockMinimo: Number(stockMinimo) || 0,
        requiereReceta,
      }),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['catalogo'] });
      void consultas.invalidateQueries({ queryKey: ['bajo-minimo'] });
      onCerrar();
    },
  });

  const completo = codigo.trim() !== '' && nombreGenerico.trim().length >= 2;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (completo) guardar.mutate();
  }

  return (
    <Dialog open={abierto} onClose={onCerrar} fullWidth maxWidth="sm">
      <form onSubmit={enviar}>
        <DialogTitle>Nuevo medicamento</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {guardar.isError ? <AvisoError error={guardar.error} /> : null}

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <TextField
                label="Codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                required
                autoFocus
                sx={{ minWidth: 160 }}
                helperText="Del listado basico del MSPAS o interno del CAP"
              />
              <TextField
                label="Nombre generico"
                value={nombreGenerico}
                onChange={(e) => setNombreGenerico(e.target.value)}
                required
                fullWidth
                helperText="Como aparece en el listado, no la marca"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <TextField
                label="Nombre comercial"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                fullWidth
              />
              <TextField
                label="Concentracion"
                value={concentracion}
                onChange={(e) => setConcentracion(e.target.value)}
                fullWidth
                placeholder="500 mg"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
              <TextField
                label="Presentacion"
                value={presentacion}
                onChange={(e) => setPresentacion(e.target.value)}
                fullWidth
                placeholder="Caja de 100 tabletas"
              />
              <TextField
                select
                label="Unidad"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                sx={{ minWidth: 180 }}
                helperText="En que se entrega"
              >
                {UNIDADES.map((u) => (
                  <MenuItem key={u} value={u}>
                    {ETIQUETA_UNIDAD[u]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Existencia minima"
              type="number"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              sx={{ maxWidth: 220 }}
              helperText="Cero desactiva la alerta"
              slotProps={{ htmlInput: { min: 0 } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={requiereReceta}
                  onChange={(e) => setRequiereReceta(e.target.checked)}
                />
              }
              label="Requiere receta"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={!completo || guardar.isPending}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/**
 * Edición de un medicamento ya dado de alta.
 *
 * Solo tres campos, y es a propósito. El código, el nombre y la unidad
 * identifican al medicamento, y los lotes que ya ingresaron se contaron en esa
 * unidad: cambiar "tabletas" por "frascos" convertiría 500 tabletas en 500
 * frascos sin que nadie lo note. El servidor tampoco los acepta.
 *
 * Se monta con `key` desde el padre para que el estado nazca con los valores
 * del medicamento que se abre. MUI 9 quitó `TransitionProps` de `Dialog`, que
 * era la otra forma de hacerlo.
 */
export function DialogoEditarMedicamento({
  medicamento,
  onCerrar,
}: {
  medicamento: MedicamentoDetalle;
  onCerrar: () => void;
}) {
  const consultas = useQueryClient();
  const [stockMinimo, setStockMinimo] = useState(String(medicamento.stockMinimo));
  const [activo, setActivo] = useState(medicamento.activo);
  const [requiereReceta, setRequiereReceta] = useState(medicamento.requiereReceta);

  const guardar = useMutation({
    mutationFn: () =>
      actualizarMedicamento(medicamento.id, {
        stockMinimo: Number(stockMinimo) || 0,
        activo,
        requiereReceta,
      }),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['medicamento', medicamento.id] });
      void consultas.invalidateQueries({ queryKey: ['catalogo'] });
      void consultas.invalidateQueries({ queryKey: ['bajo-minimo'] });
      onCerrar();
    },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    guardar.mutate();
  }

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="xs">
      <form onSubmit={enviar}>
        <DialogTitle>{medicamento.nombreGenerico}</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2, pt: 1 }}>
            {guardar.isError ? <AvisoError error={guardar.error} /> : null}

            <TextField
              label="Existencia minima"
              type="number"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              autoFocus
              helperText="Cero desactiva la alerta de reabastecimiento"
              slotProps={{ htmlInput: { min: 0 } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={requiereReceta}
                  onChange={(e) => setRequiereReceta(e.target.checked)}
                />
              }
              label="Requiere receta"
            />

            <FormControlLabel
              control={<Switch checked={activo} onChange={(e) => setActivo(e.target.checked)} />}
              label="Activo en el catalogo"
            />

            {!activo ? (
              <Alert severity="info">
                Desactivarlo lo saca del catalogo y no admitira lotes nuevos. Lo que ya ingreso
                sigue registrado.
              </Alert>
            ) : null}

            <Typography variant="caption" color="text.secondary">
              El codigo, el nombre y la unidad no se editan: identifican al medicamento, y los
              lotes ya ingresados se contaron en esa unidad. Si se registro mal, desactivelo y de
              de alta el correcto.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={guardar.isPending}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
