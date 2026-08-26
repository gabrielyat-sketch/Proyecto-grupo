import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

/**
 * Marco de las pantallas previas a la sesion.
 *
 * Centrado y sin menu: antes de entrar no hay nada mas que hacer en esta
 * pantalla, y cualquier elemento adicional solo compite por la atencion de
 * alguien que quiza no usa una computadora todos los dias.
 */
export function MarcoAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 6,
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 460,
          p: { xs: 3, sm: 5 },
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.14em' }}>
              CAP Purulha
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {titulo}
            </Typography>
            {descripcion ? (
              <Typography variant="body2" color="text.secondary">
                {descripcion}
              </Typography>
            ) : null}
          </Stack>
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
