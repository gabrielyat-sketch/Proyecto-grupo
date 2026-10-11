import { Box, Checkbox, FormControlLabel, FormHelperText, Stack, TextField, Typography } from '@mui/material';
import type { CasillaServicio } from './servicio-fichas';

/**
 * «Identificación del establecimiento de salud»: las casillas del papel.
 *
 * Antes el sistema dejaba fijo el CAP. El CAP pidió marcarlo a mano en cada
 * ficha, porque el establecimiento puede cambiar, así que la ficha nueva abre
 * sin ninguna marcada y no se guarda hasta que se elige una.
 *
 * Son casillas y no un desplegable porque así están en la hoja: quien
 * transcribe ve la X en el papel y la pone en el mismo sitio. Solo admite una;
 * pulsar la marcada la desmarca.
 */
export function CasillasServicio({
  casillas,
  valor,
  onCambio,
  error = false,
}: {
  casillas: readonly CasillaServicio[];
  valor: string;
  onCambio: (valor: string) => void;
  error?: boolean;
}) {
  return (
    <Box role="group" aria-label="Tipo de servicio de salud">
      <Typography
        variant="caption"
        sx={{ display: 'block', fontWeight: 600, color: error ? 'error.main' : 'text.secondary' }}
      >
        Tipo de servicio *
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 1 }}>
        {casillas.map((c) => (
          <FormControlLabel
            key={c.valor}
            control={
              <Checkbox
                size="small"
                checked={valor === c.valor}
                onChange={() => onCambio(valor === c.valor ? '' : c.valor)}
              />
            }
            label={c.texto}
          />
        ))}
      </Stack>
      {error ? <FormHelperText error>Marque el tipo de servicio, como en el papel.</FormHelperText> : null}
    </Box>
  );
}

/**
 * «Nombre y cargo de la persona que atendió», al pie de la ficha.
 *
 * Viene ya escrito con quien tiene la sesión abierta, y se puede corregir:
 * al digitalizar papel, quien captura no es quien atendió.
 */
export function CampoAtendio({
  valor,
  onCambio,
  rotulo = 'Nombre y cargo de la persona que atendió',
}: {
  valor: string;
  onCambio: (valor: string) => void;
  rotulo?: string;
}) {
  return (
    <TextField
      label={rotulo}
      size="small"
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      slotProps={{ htmlInput: { maxLength: 200 } }}
      helperText="Viene con quien tiene la sesión abierta. Corríjalo si atendió otra persona."
    />
  );
}
