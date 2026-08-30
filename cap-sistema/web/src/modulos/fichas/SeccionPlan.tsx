import { Stack, TextField, Typography } from '@mui/material';
import type { FilaMedicamento } from './borrador';
import { BloqueFicha } from './SeccionFicha';
import { ListaMedicamentos } from './ListaMedicamentos';

/**
 * La columna de conducta del formulario: lo que se indica al paciente.
 *
 * En el papel caben cuatro medicamentos. Aqui la lista crece porque una hoja
 * llena obliga hoy a escribir el quinto al margen, y ese margen no se puede
 * contar despues en ningun reporte de consumo. El limite real —veinte— lo pone
 * el backend, y no es clinico: es que un cliente equivocado no inserte miles de
 * filas en una peticion.
 */
export function SeccionPlan({
  medicamentos,
  vacunaAdministrada,
  referencia,
  fechaProximaVisita,
  diagnostico,
  tratamiento,
  onMedicamentos,
  onTexto,
}: {
  medicamentos: readonly FilaMedicamento[];
  vacunaAdministrada: string;
  referencia: string;
  fechaProximaVisita: string;
  diagnostico: string;
  tratamiento: string;
  onMedicamentos: (filas: FilaMedicamento[]) => void;
  onTexto: (
    campo: 'vacunaAdministrada' | 'referencia' | 'fechaProximaVisita' | 'diagnostico' | 'tratamiento',
    valor: string,
  ) => void;
}) {
  return (
    <Stack sx={{ gap: 2 }}>
      <BloqueFicha titulo="Medicamentos indicados">
        <ListaMedicamentos medicamentos={medicamentos} onCambio={onMedicamentos} />
      </BloqueFicha>

      <BloqueFicha titulo="Diagnostico y tratamiento en palabras">
        <Stack sx={{ gap: 2 }}>
          <TextField
            label="Diagnostico"
            multiline
            minRows={2}
            value={diagnostico}
            onChange={(e) => onTexto('diagnostico', e.target.value)}
            helperText="Resumen en texto, ademas de lo marcado en la revision de problemas"
          />
          <TextField
            label="Tratamiento"
            multiline
            minRows={2}
            value={tratamiento}
            onChange={(e) => onTexto('tratamiento', e.target.value)}
          />
        </Stack>
      </BloqueFicha>

      <BloqueFicha titulo="Cierre de la atencion">
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
          <TextField
            label="Vacuna administrada"
            size="small"
            value={vacunaAdministrada}
            onChange={(e) => onTexto('vacunaAdministrada', e.target.value)}
          />
          <TextField
            label="Referido a"
            size="small"
            value={referencia}
            onChange={(e) => onTexto('referencia', e.target.value)}
            helperText="Solo si se refirio al paciente"
          />
          <TextField
            label="Proxima visita"
            type="date"
            size="small"
            value={fechaProximaVisita}
            slotProps={{ inputLabel: { shrink: true } }}
            onChange={(e) => onTexto('fechaProximaVisita', e.target.value)}
          />
        </Stack>
      </BloqueFicha>

      <Typography variant="caption" color="text.secondary">
        Quien atiende queda registrado con la sesion; no hay que escribir el nombre.
      </Typography>
    </Stack>
  );
}
