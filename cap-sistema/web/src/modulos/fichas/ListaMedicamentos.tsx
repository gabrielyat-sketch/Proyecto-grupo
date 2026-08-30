import { Box, Button, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import type { FilaMedicamento } from './borrador';

/** El tope real lo pone el backend; aqui se deja de ofrecer al llegar. */
export const MAXIMO_MEDICAMENTOS = 20;

/**
 * Los medicamentos indicados en la consulta.
 *
 * En el papel caben cuatro, y las tres fichas construidas los piden igual:
 * nombre, dosis y días. Vive aparte para que cada hoja nueva no vuelva a
 * escribir el mismo editor —la del lactante y niñez es la segunda que lo usa—
 * y para que el límite y el comportamiento de quitar filas sean uno solo.
 *
 * La lista crece más allá de cuatro porque una hoja llena obliga hoy a escribir
 * el quinto al margen, y ese margen no se puede contar después en ningún
 * reporte de consumo.
 */
export function ListaMedicamentos({
  medicamentos,
  onCambio,
}: {
  medicamentos: readonly FilaMedicamento[];
  onCambio: (filas: FilaMedicamento[]) => void;
}) {
  const cambiar = (i: number, campo: keyof FilaMedicamento, valor: string) => {
    onCambio(medicamentos.map((m, j) => (i === j ? { ...m, [campo]: valor } : m)));
  };

  const agregar = () => onCambio([...medicamentos, { nombre: '', dosis: '', dias: '' }]);

  const quitar = (i: number) => {
    const restantes = medicamentos.filter((_m, j) => j !== i);
    // Siempre queda una fila: sin ninguna, recetar obligaria a pulsar "agregar"
    // primero, que es un paso de mas en el caso mas comun.
    onCambio(restantes.length ? restantes : [{ nombre: '', dosis: '', dias: '' }]);
  };

  return (
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
        <Button
          startIcon={<AddIcon />}
          onClick={agregar}
          size="small"
          disabled={medicamentos.length >= MAXIMO_MEDICAMENTOS}
        >
          Agregar medicamento
        </Button>
      </Box>
    </Stack>
  );
}
