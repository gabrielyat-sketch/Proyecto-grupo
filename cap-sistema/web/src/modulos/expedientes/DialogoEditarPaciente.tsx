import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { MENU_FILTRO } from '../../componentes/menuFiltro';
import {
  actualizarPaciente,
  ETIQUETA_IDIOMA,
  listarComunidades,
  type CambiosPaciente,
} from '../recepcion/servicio-pacientes';

const IDIOMAS = ['ESPANOL', 'QEQCHI', 'ACHI', 'POQOMCHI'] as const;

/** Lo que la pantalla necesita saber del paciente para poder corregirlo. */
export interface PacienteEditable {
  id: string;
  nombres: string;
  apellidos: string;
  idioma: string;
  telefono?: string | null;
  ocupacion?: string | null;
  fallecido: boolean;
  comunidad?: { id: string; nombre: string } | null;
}

/**
 * Corregir los datos de un paciente ya registrado.
 *
 * **Lo que se puede corregir y lo que no.** Se corrige lo que se teclea mal:
 * el nombre, el apellido, el idioma, la comunidad, el teléfono. NO se corrige
 * el DPI, la fecha de nacimiento ni el sexo, y no es un descuido: un error en
 * esos tres no es un error de tecleo, es que se registró a otra persona. Eso
 * no se arregla editando encima —quedaría un expediente con la historia de
 * alguien y los datos de otro— sino dando de baja el registro equivocado.
 *
 * **Se manda solo lo que cambió.** Si únicamente se corrige el teléfono, a la
 * bitácora llega el teléfono y nada más. Mandar el registro entero haría que
 * cada corrección se leyera después como si se hubiera reescrito la persona
 * completa, y quien audite no podría distinguir una cosa de la otra.
 *
 * **«Fallecido» está aquí y no en un botón aparte** porque es un dato del
 * paciente, no una acción sobre él. Marcarlo hace que deje de ofrecerse para
 * fichas nuevas, pero no borra ni esconde su historial: lo que ya se atendió
 * siguió ocurriendo.
 */
export function DialogoEditarPaciente({
  paciente,
  onCerrar,
}: {
  paciente: PacienteEditable;
  onCerrar: () => void;
}) {
  const [nombres, setNombres] = useState(paciente.nombres);
  const [apellidos, setApellidos] = useState(paciente.apellidos);
  const [idioma, setIdioma] = useState(paciente.idioma);
  const [comunidadId, setComunidadId] = useState(paciente.comunidad?.id ?? '');
  const [telefono, setTelefono] = useState(paciente.telefono ?? '');
  const [ocupacion, setOcupacion] = useState(paciente.ocupacion ?? '');
  const [fallecido, setFallecido] = useState(paciente.fallecido);
  const clienteConsultas = useQueryClient();

  const comunidades = useQuery({
    queryKey: ['comunidades'],
    queryFn: listarComunidades,
    staleTime: 60 * 60_000,
  });

  // Solo lo que de verdad cambió. Un campo que se tocó y se dejó igual no
  // cuenta como cambio.
  const cambios: CambiosPaciente = {};
  if (nombres.trim() !== paciente.nombres) cambios.nombres = nombres.trim();
  if (apellidos.trim() !== paciente.apellidos) cambios.apellidos = apellidos.trim();
  if (idioma !== paciente.idioma) cambios.idioma = idioma as CambiosPaciente['idioma'];
  if (comunidadId && comunidadId !== paciente.comunidad?.id) cambios.comunidadId = comunidadId;
  if (telefono.trim() !== (paciente.telefono ?? '')) cambios.telefono = telefono.trim();
  // Vacia no se manda: el servidor no acepta una ocupacion en blanco, y dejarla
  // como estaba es lo que se espera de borrar la casilla por error.
  if (ocupacion.trim() && ocupacion.trim() !== (paciente.ocupacion ?? '')) {
    cambios.ocupacion = ocupacion.trim();
  }
  if (fallecido !== paciente.fallecido) cambios.fallecido = fallecido;

  const cuantos = Object.keys(cambios).length;

  const guardar = useMutation({
    mutationFn: () => actualizarPaciente(paciente.id, cambios),
    onSuccess: () => {
      void clienteConsultas.invalidateQueries({ queryKey: ['paciente', paciente.id] });
      void clienteConsultas.invalidateQueries({ queryKey: ['pacientes'] });
      void clienteConsultas.invalidateQueries({ queryKey: ['expediente'] });
      onCerrar();
    },
  });

  const falta = !nombres.trim() || !apellidos.trim();

  return (
    <Dialog open onClose={onCerrar} fullWidth maxWidth="sm">
      <DialogTitle>
        Corregir los datos
        <Typography variant="body2" color="text.secondary">
          {paciente.apellidos}, {paciente.nombres}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 2, pt: 1 }}>
          {guardar.isError ? <AvisoError error={guardar.error} /> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
            <TextField
              label="Nombres *"
              value={nombres}
              onChange={(e) => setNombres(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Apellidos *"
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2 }}>
            <TextField
              select
              label="Idioma de atencion"
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
              fullWidth
              slotProps={{ select: { MenuProps: MENU_FILTRO } }}
            >
              {IDIOMAS.map((i) => (
                <MenuItem key={i} value={i}>
                  {ETIQUETA_IDIOMA[i] ?? i}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Comunidad"
              value={comunidades.data ? comunidadId : ''}
              onChange={(e) => setComunidadId(e.target.value)}
              fullWidth
              disabled={comunidades.isLoading}
              helperText={comunidades.isLoading ? 'Cargando...' : undefined}
              slotProps={{ select: { MenuProps: MENU_FILTRO } }}
            >
              {(comunidades.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'tel' } }}
          />

          <TextField
            label="Ocupacion"
            value={ocupacion}
            onChange={(e) => setOcupacion(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />

          <FormControlLabel
            control={
              <Checkbox checked={fallecido} onChange={(e) => setFallecido(e.target.checked)} />
            }
            label="La persona falleció"
          />

          <Typography variant="caption" color="text.secondary">
            El DPI, la fecha de nacimiento y el sexo no se corrigen aquí: un error en esos datos
            significa que se registró a otra persona, y eso se resuelve dando de baja el registro.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={falta || cuantos === 0 || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending
            ? 'Guardando...'
            : cuantos === 0
              ? 'Sin cambios'
              : cuantos === 1
                ? 'Guardar 1 cambio'
                : 'Guardar ' + cuantos + ' cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
