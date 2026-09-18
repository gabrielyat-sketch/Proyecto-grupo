import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import {
  registrarControlHipertension,
  registrarControlPrenatal,
} from './servicio-programas';

/** Lo que se escribe en los campos: texto, aunque el servidor espere numeros. */
type Campos = Record<string, string>;

const numero = (v: string) => (v.trim() === '' ? undefined : Number(v));

/**
 * Registrar un control, prenatal o de hipertension.
 *
 * **Casi todo es opcional, y no por descuido.** Un control en el area rural no
 * siempre puede tomar todo: puede que la bascula no sirva ese dia o que la
 * paciente no se deje medir la altura uterina. Exigir el formulario completo
 * obligaria a inventar un numero para poder guardar los que si se tomaron, y un
 * peso inventado en un expediente clinico es peor que un peso ausente.
 *
 * La excepcion es la presion en hipertension: sin ella el control no dice nada,
 * porque es exactamente lo que el programa sigue.
 *
 * **La fecha se puede cambiar.** Por omision es hoy, pero el CAP transcribe
 * controles de papel y una jornada en comunidad se captura al volver.
 */
export function DialogoControl({
  programaId,
  tipo,
  nombre,
  onCerrar,
}: {
  programaId: string;
  tipo: 'embarazo' | 'hipertension';
  nombre: string;
  onCerrar: () => void;
}) {
  const [c, setC] = useState<Campos>({ fecha: new Date().toISOString().slice(0, 10) });
  const [adherencia, setAdherencia] = useState(true);
  const [edema, setEdema] = useState(false);
  const clienteConsultas = useQueryClient();

  const pon = (clave: string) => (e: { target: { value: string } }) =>
    setC((previo) => ({ ...previo, [clave]: e.target.value }));

  const guardar = useMutation({
    // Devuelve void: las dos ramas guardan tipos distintos —un control
    // prenatal y uno de hipertension no tienen las mismas columnas— y aqui no
    // se usa ninguno. Lo que importa del guardado es que la lista se recargue.
    mutationFn: async (): Promise<void> => {
      await (tipo === 'embarazo'
        ? registrarControlPrenatal(programaId, {
            ...(numero(c.pesoKg ?? '') !== undefined ? { pesoKg: numero(c.pesoKg) } : {}),
            ...(numero(c.sistolica ?? '') !== undefined ? { sistolica: numero(c.sistolica) } : {}),
            ...(numero(c.diastolica ?? '') !== undefined
              ? { diastolica: numero(c.diastolica) }
              : {}),
            ...(numero(c.alturaUterinaCm ?? '') !== undefined
              ? { alturaUterinaCm: numero(c.alturaUterinaCm) }
              : {}),
            ...(numero(c.fcf ?? '') !== undefined ? { fcf: numero(c.fcf) } : {}),
            edema,
            ...(c.observaciones?.trim() ? { observaciones: c.observaciones.trim() } : {}),
            ...(c.fecha ? { fecha: c.fecha } : {}),
          } as never)
        : registrarControlHipertension(programaId, {
            sistolica: numero(c.sistolica) as number,
            diastolica: numero(c.diastolica) as number,
            ...(numero(c.pesoKg ?? '') !== undefined ? { pesoKg: numero(c.pesoKg) } : {}),
            adherencia,
            ...(c.observaciones?.trim() ? { observaciones: c.observaciones.trim() } : {}),
            ...(c.fecha ? { fecha: c.fecha } : {}),
          } as never));
    },
    onSuccess: () => {
      // Cambia el ultimo control, y con el la fecha del proximo y quien queda
      // atrasado: se vuelven a pedir las dos listas.
      void clienteConsultas.invalidateQueries({ queryKey: ['embarazos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['embarazos-alto-riesgo'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['hipertensos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['hipertensos-atrasados'] });
      onCerrar();
    },
  });

  // En hipertension la presion es el control: sin ella no hay nada que guardar.
  const falta =
    tipo === 'hipertension' &&
    (numero(c.sistolica ?? '') === undefined || numero(c.diastolica ?? '') === undefined);

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle>
        Control de {tipo === 'embarazo' ? 'embarazo' : 'hipertension'}
        <Typography variant="body2" color="text.secondary">
          {nombre}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {guardar.isError ? <AvisoError error={guardar.error} /> : null}

          <TextField
            label="Fecha del control"
            type="date"
            value={c.fecha ?? ''}
            onChange={pon('fecha')}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: new Date().toISOString().slice(0, 10) },
            }}
            helperText="Hoy por omision. Se cambia al transcribir un control de papel."
          />

          <Stack direction="row" sx={{ gap: 2 }}>
            <TextField
              label={tipo === 'hipertension' ? 'Sistolica *' : 'Sistolica'}
              value={c.sistolica ?? ''}
              onChange={pon('sistolica')}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <TextField
              label={tipo === 'hipertension' ? 'Diastolica *' : 'Diastolica'}
              value={c.diastolica ?? ''}
              onChange={pon('diastolica')}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
            <TextField
              label="Peso (kg)"
              value={c.pesoKg ?? ''}
              onChange={pon('pesoKg')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
          </Stack>

          {tipo === 'embarazo' ? (
            <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
              <TextField
                label="Altura uterina (cm)"
                value={c.alturaUterinaCm ?? ''}
                onChange={pon('alturaUterinaCm')}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              <TextField
                label="Frecuencia cardiaca fetal"
                value={c.fcf ?? ''}
                onChange={pon('fcf')}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <FormControlLabel
                control={<Checkbox checked={edema} onChange={(e) => setEdema(e.target.checked)} />}
                label="Edema"
              />
            </Stack>
          ) : (
            <FormControlLabel
              control={
                <Checkbox
                  checked={adherencia}
                  onChange={(e) => setAdherencia(e.target.checked)}
                />
              }
              label="Esta tomando el tratamiento"
            />
          )}

          <TextField
            label="Observaciones"
            multiline
            minRows={2}
            value={c.observaciones ?? ''}
            onChange={pon('observaciones')}
          />

          <Typography variant="caption" color="text.secondary">
            Lo que no se pudo tomar se deja vacio. Un dato inventado en un expediente es peor que
            un dato ausente.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={falta || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? 'Guardando...' : 'Guardar el control'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
