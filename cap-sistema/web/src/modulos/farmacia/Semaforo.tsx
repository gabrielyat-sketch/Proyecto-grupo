import { Box, Stack, Typography } from '@mui/material';
import { AVISO, ERROR, EXITO } from '../../tema';
import { ETIQUETA_SEMAFORO, SIGNIFICADO_SEMAFORO, venceEn } from './servicio-farmacia';

/**
 * Los colores del semáforo tal como están en el estante.
 *
 * El rojo y el verde son los del tema. El amarillo no: el ámbar del tema está
 * oscurecido para servir de texto legible, y como relleno de un círculo se
 * lee marrón. La etiqueta de papel del CAP es amarilla, y la de la pantalla
 * tiene que ser la misma para que se reconozcan como la misma cosa. El borde
 * ámbar oscuro le da el contraste que el amarillo puro no tiene sobre blanco.
 */
const RELLENO: Record<string, string> = {
  ROJO: ERROR,
  AMARILLO: '#f2c811',
  VERDE: EXITO,
};

const BORDE: Record<string, string> = {
  ROJO: '#8e1b1b',
  AMARILLO: AVISO,
  VERDE: '#0f5228',
};

/** El círculo de color, solo. Con su nombre para quien no lo ve. */
export function PuntoSemaforo({ color, tamano = 14 }: { color: string; tamano?: number }) {
  return (
    <Box
      role="img"
      aria-label={'Semaforo ' + (ETIQUETA_SEMAFORO[color] ?? color).toLowerCase()}
      sx={{
        width: tamano,
        height: tamano,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: RELLENO[color] ?? 'grey.400',
        border: '2px solid',
        borderColor: BORDE[color] ?? 'grey.600',
      }}
    />
  );
}

/**
 * El color del semáforo con su plazo al lado.
 *
 * Igual que en el resto del panel, un estado nunca se dice solo con color: va
 * con su palabra —Rojo, Amarillo, Verde— y con cuánto falta para vencer, que
 * es lo que decide qué se hace con ese lote. Sin existencia no hay color: no
 * hay nada en el estante que etiquetar.
 */
export function Semaforo({
  color,
  diasParaVencer,
}: {
  color: string | null | undefined;
  diasParaVencer: number | null | undefined;
}) {
  if (!color) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }
  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
      <PuntoSemaforo color={color} />
      <Stack sx={{ gap: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
          {ETIQUETA_SEMAFORO[color] ?? color}
        </Typography>
        {diasParaVencer !== null && diasParaVencer !== undefined ? (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
            {venceEn(diasParaVencer)}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

/**
 * La leyenda, como la figura de la norma: tres colores y qué significa cada
 * uno. Va a la vista y no en un tooltip porque el personal rota, y quien
 * llega nuevo tiene que poder leer el estante sin que nadie se lo explique.
 */
export function LeyendaSemaforo() {
  return (
    <Stack
      direction="row"
      sx={{ gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}
      aria-label="Leyenda del semaforo de vencimiento"
    >
      {(['ROJO', 'AMARILLO', 'VERDE'] as const).map((color) => (
        <Stack key={color} direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
          <PuntoSemaforo color={color} tamano={12} />
          <Typography variant="caption" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {ETIQUETA_SEMAFORO[color]}
            </Box>
            {' · ' + SIGNIFICADO_SEMAFORO[color]}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
