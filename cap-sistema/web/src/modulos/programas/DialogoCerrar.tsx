import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { MENU_FILTRO } from '../../componentes/menuFiltro';
import {
  cerrarEmbarazo,
  egresarHipertenso,
  MOTIVOS_EGRESO,
  RESULTADOS_EMBARAZO,
} from './servicio-programas';

/**
 * Cerrar un seguimiento.
 *
 * **Es lo que convierte el programa en un dato y no en una lista que solo
 * crece.** Sin cerrar, una mujer que ya dio a luz sigue apareciendo como
 * embarazo activo y contando para el «a quien hay que buscar»; al cabo de un
 * ano la lista ya no dice nada porque casi nadie de los que salen sigue
 * realmente en seguimiento.
 *
 * **El motivo es obligatorio en hipertension**, y esa asimetria es a proposito:
 * «abandono» y «trasladado» son dos formas muy distintas de dejar de venir, y
 * la diferencia solo vive en lo que se escriba aqui. En embarazo el resultado
 * ya lo dice —parto normal, cesarea, aborto— y no hace falta repetirlo.
 *
 * **No se puede deshacer desde la pantalla.** El servidor rechaza cerrar dos
 * veces; si se cierra por error hay que corregirlo en la base, asi que el boton
 * pide confirmar leyendo lo que se eligio.
 */
export function DialogoCerrar({
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
  const [valor, setValor] = useState(tipo === 'embarazo' ? 'PARTO_NORMAL' : 'EGRESADO');
  const [motivo, setMotivo] = useState('');
  const clienteConsultas = useQueryClient();

  const guardar = useMutation({
    mutationFn: async (): Promise<void> => {
      if (tipo === 'embarazo') await cerrarEmbarazo(programaId, valor);
      else await egresarHipertenso(programaId, valor, motivo.trim());
    },
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['embarazos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['embarazos-alto-riesgo'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['hipertensos'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['hipertensos-atrasados'] });
      onCerrar();
    },
  });

  const opciones = tipo === 'embarazo' ? RESULTADOS_EMBARAZO : MOTIVOS_EGRESO;
  const falta = tipo === 'hipertension' && motivo.trim().length < 3;

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle>
        {tipo === 'embarazo' ? 'Cerrar el seguimiento' : 'Egresar del programa'}
        <Typography variant="body2" color="text.secondary">
          {nombre}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {guardar.isError ? <AvisoError error={guardar.error} /> : null}

          <TextField
            select
            label={tipo === 'embarazo' ? 'Como termino *' : 'Por que sale *'}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            slotProps={{ select: { MenuProps: MENU_FILTRO } }}
          >
            {opciones.map((o) => (
              <MenuItem key={o.valor} value={o.valor}>
                {o.texto}
              </MenuItem>
            ))}
          </TextField>

          {tipo === 'hipertension' ? (
            <TextField
              label="Motivo *"
              multiline
              minRows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Se traslado a Salama con su hija; no aparece desde marzo..."
              helperText="Lo que el estado no alcanza a contar. Sin esto, dentro de un ano nadie sabra por que se dejo de seguirle."
            />
          ) : null}

          <Typography variant="caption" color="text.secondary">
            Una vez cerrado no se puede reabrir desde el sistema.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={falta || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending
            ? 'Cerrando...'
            : tipo === 'embarazo'
              ? 'Cerrar el seguimiento'
              : 'Egresar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
