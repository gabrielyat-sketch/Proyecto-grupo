import { Box, Stack, Typography, useTheme } from '@mui/material';
import { AVISO } from '../../tema';
import { ETIQUETA_SEMAFORO, SIGNIFICADO_SEMAFORO, venceEn } from './servicio-farmacia';

/**
 * Los colores del semáforo tal como están en el estante.
 *
 * El rojo y el verde son los del tema. El amarillo no: el ámbar del tema está
 * oscurecido para servir de texto legible, y como relleno de un círculo se
 * lee marrón. La etiqueta de papel del CAP es amarilla, y la de la pantalla
 * tiene que ser la misma para que se reconozcan como la misma cosa.
 *
 * **De noche el rojo y el verde se aclaran.** No es un capricho de estilo: el
 * verde del modo claro está oscurecido para leerse sobre crema, y sobre el navy
 * da 1.9:1 —un punto verde oscuro sobre fondo azul oscuro, que es exactamente
 * lo que no se ve—. El tono es el mismo; cambia el valor. El amarillo se queda
 * igual porque sobre los dos fondos se ve.
 *
 * El borde es lo que le da contraste al relleno contra el papel de la pantalla,
 * así que también se invierte: oscuro de día, claro de noche.
 */
function usarSemaforo() {
  const tema = useTheme();
  const oscuro = tema.palette.mode === 'dark';
  const relleno: Record<string, string> = {
    ROJO: tema.palette.error.main,
    AMARILLO: '#f2c811',
    VERDE: tema.palette.success.main,
  };
  const borde: Record<string, string> = {
    ROJO: oscuro ? '#ffb3b3' : '#8e1b1b',
    AMARILLO: oscuro ? '#6b4e00' : AVISO,
    VERDE: oscuro ? '#a9ecc4' : '#0f5228',
  };
  return { relleno, borde };
}

/**
 * El círculo de color, solo. Con su nombre para quien no lo ve.
 *
 * `decorativo` lo esconde del lector de pantalla: en la pestaña "Rojo" el
 * punto no añade nada a la palabra que tiene al lado, y leerlo dos veces
 * ("Semaforo rojo, Rojo") solo estorba.
 */
export function PuntoSemaforo({
  color,
  tamano = 14,
  decorativo = false,
}: {
  color: string;
  tamano?: number;
  decorativo?: boolean;
}) {
  const { relleno, borde } = usarSemaforo();

  return (
    <Box
      component="span"
      role={decorativo ? undefined : 'img'}
      aria-hidden={decorativo || undefined}
      aria-label={
        decorativo ? undefined : 'Semaforo ' + (ETIQUETA_SEMAFORO[color] ?? color).toLowerCase()
      }
      sx={{
        display: 'inline-block',
        width: tamano,
        height: tamano,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: relleno[color] ?? 'grey.400',
        border: '2px solid',
        borderColor: borde[color] ?? 'grey.600',
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
