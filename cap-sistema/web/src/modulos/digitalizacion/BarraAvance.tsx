import { Box, Stack, Typography } from '@mui/material';

/**
 * Cuanto se lleva transcrito.
 *
 * Es la pieza que sostiene la mitigacion del riesgo R-6: una digitalizacion de
 * miles de expedientes que nadie ve avanzar se abandona. La barra no es
 * decoracion, es la razon de que alguien vuelva manana.
 *
 * Los tres tramos van en el mismo orden siempre —hecho, en proceso, no
 * localizado— para que el ojo compare de un dia para otro sin releer la
 * leyenda.
 */
export function BarraAvance({
  total,
  completos,
  enProceso = 0,
  noLocalizados = 0,
  alto = 10,
}: {
  total: number;
  completos: number;
  enProceso?: number;
  noLocalizados?: number;
  alto?: number;
}) {
  const parte = (n: number) => (total === 0 ? 0 : (n / total) * 100);

  return (
    <Box
      role="img"
      aria-label={
        total === 0
          ? 'Sin expedientes'
          : completos + ' de ' + total + ' expedientes transcritos'
      }
      sx={{
        display: 'flex',
        height: alto,
        width: '100%',
        borderRadius: 0.5,
        overflow: 'hidden',
        bgcolor: 'action.hover',
      }}
    >
      <Box sx={{ width: parte(completos) + '%', bgcolor: 'success.main' }} />
      <Box sx={{ width: parte(enProceso) + '%', bgcolor: 'primary.main' }} />
      {/* Gris y no rojo: un expediente que no aparece en el archivo es un dato
          del inventario, no una alarma clinica. El rojo queda reservado. */}
      <Box sx={{ width: parte(noLocalizados) + '%', bgcolor: 'text.disabled' }} />
    </Box>
  );
}

/** Un numero grande con su rotulo. Para el encabezado del panel. */
export function Cifra({
  valor,
  rotulo,
  color = 'text.primary',
}: {
  valor: number | string;
  rotulo: string;
  color?: string;
}) {
  return (
    <Stack sx={{ gap: 0 }}>
      <Typography
        sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1, color, fontVariantNumeric: 'tabular-nums' }}
      >
        {valor}
      </Typography>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {rotulo}
      </Typography>
    </Stack>
  );
}
