import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import type { FilaMedicamento } from './borrador';
import { BloqueFicha } from './SeccionFicha';

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
  const cambiar = (i: number, campo: keyof FilaMedicamento, valor: string) => {
    const copia = medicamentos.map((m, j) => (i === j ? { ...m, [campo]: valor } : m));
    onMedicamentos(copia);
  };

  const agregar = () =>
    onMedicamentos([...medicamentos, { nombre: '', dosis: '', dias: '' }]);

  const quitar = (i: number) => {
    const restantes = medicamentos.filter((_m, j) => j !== i);
    // Siempre queda una fila: sin ninguna, recetar obligaria a pulsar "agregar"
    // primero, que es un paso de mas en el caso mas comun.
    onMedicamentos(restantes.length ? restantes : [{ nombre: '', dosis: '', dias: '' }]);
  };

  return (
    <Stack sx={{ gap: 2 }}>
      <BloqueFicha titulo="Medicamentos indicados">
        <Stack sx={{ gap: 1 }}>
          {medicamentos.map((m, i) => (
            <Stack
              key={i}
              direction={{ xs: 'column', md: 'row' }}
              sx={{ gap: 1.5, alignItems: { md: 'flex-start' } }}
            >
              <TextField
                label={'Medicamento ' + (i + 1)}
                size="small"
                value={m.nombre}
                onChange={(e) => cambiar(i, 'nombre', e.target.value)}
                sx={{ flex: 2 }}
              />
              <TextField
                label="Dosis"
                size="small"
                value={m.dosis}
                onChange={(e) => cambiar(i, 'dosis', e.target.value)}
                sx={{ flex: 2 }}
                placeholder="1 tableta cada 8 horas"
              />
              <TextField
                label="Dias"
                size="small"
                inputMode="numeric"
                value={m.dias}
                onChange={(e) => cambiar(i, 'dias', e.target.value)}
                sx={{ flex: 1 }}
              />
              <Tooltip title="Quitar esta linea">
                <IconButton
                  aria-label={'Quitar el medicamento ' + (i + 1)}
                  onClick={() => quitar(i)}
                  sx={{ mt: { md: 0.25 } }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}

          <Box>
            <Button startIcon={<AddIcon />} onClick={agregar} size="small" disabled={medicamentos.length >= 20}>
              Agregar medicamento
            </Button>
          </Box>
        </Stack>
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
