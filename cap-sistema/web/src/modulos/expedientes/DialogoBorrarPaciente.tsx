import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertTitle,
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
import { borrarPaciente } from '../recepcion/servicio-pacientes';

/**
 * Confirmar el borrado de un paciente.
 *
 * **No se puede deshacer, así que no basta con un «¿está seguro?».** Un cuadro
 * con dos botones se contesta que sí por reflejo: quien lleva veinte minutos
 * en el sistema ya pulsó «Aceptar» treinta veces. Aquí hay que **escribir el
 * apellido** de la persona. No es un obstáculo por deporte — obliga a mirar de
 * quién se trata antes de borrarlo, que es justo el error que este cuadro
 * existe para evitar: borrar al paciente equivocado.
 *
 * **El servidor manda.** Si el paciente ya tiene historial clínico, la
 * petición se rechaza aunque quien la haga sea administrador, y el motivo
 * —cuántas atenciones, cuántas vacunas— se muestra tal cual. Esta pantalla no
 * lo comprueba por su cuenta: sabe menos que el servidor y comprobarlo aquí
 * solo crearía una segunda verdad que puede quedar desfasada.
 */
export function DialogoBorrarPaciente({
  id,
  nombres,
  apellidos,
  onCerrar,
}: {
  id: string;
  nombres: string;
  apellidos: string;
  onCerrar: () => void;
}) {
  const [escrito, setEscrito] = useState('');
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  // Se compara sin tildes ni mayúsculas: el apellido está para que se lea,
  // no para que se transcriba con exactitud de notario.
  const llano = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  const coincide = llano(escrito) === llano(apellidos);

  const borrar = useMutation({
    mutationFn: () => borrarPaciente(id),
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['pacientes'] });
      clienteConsultas.removeQueries({ queryKey: ['paciente', id] });
      navegar('/recepcion', { replace: true });
    },
  });

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle sx={{ color: 'error.main' }}>Borrar este paciente</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {borrar.isError ? <AvisoError error={borrar.error} /> : null}

          <Alert severity="error" icon={false}>
            <AlertTitle sx={{ fontWeight: 700 }}>
              {apellidos}, {nombres}
            </AlertTitle>
            Se borrarán su registro y su número de expediente. <b>No se puede deshacer.</b>
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Esto es para un registro creado por error o repetido. Si la persona existe y solo están
            mal sus datos, ciérrelo y use <b>Corregir datos</b>.
          </Typography>

          <TextField
            label="Escriba el apellido para confirmar"
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            placeholder={apellidos}
            autoFocus
            error={escrito.length > 0 && !coincide}
            helperText={
              escrito.length > 0 && !coincide
                ? 'No coincide con el apellido de este paciente'
                : 'Para asegurarnos de que es a esta persona y no a otra'
            }
          />

          <Typography variant="caption" color="text.secondary">
            Queda registrado en la bitácora: quién lo borró, cuándo, y qué decía el registro.
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
          disabled={!coincide || borrar.isPending}
          onClick={() => borrar.mutate()}
        >
          {borrar.isPending ? 'Borrando...' : 'Borrar definitivamente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
