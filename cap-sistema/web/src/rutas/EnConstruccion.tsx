import { Box, Paper, Stack, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';

/**
 * Marcador de un modulo que todavia no existe.
 *
 * Se muestra en vez de esconder la opcion del menu: asi el personal ve desde el
 * principio la forma completa del sistema y sabe que falta, en lugar de que las
 * pantallas aparezcan de la nada entrega tras entrega. Y en las pruebas con el
 * personal (Etapa 14) permite preguntar por lo que aun no esta.
 */
export function EnConstruccion({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <Box>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        {titulo}
      </Typography>
      <Paper
        elevation={0}
        sx={{ p: 4, border: '1px solid', borderColor: 'divider', maxWidth: 620 }}
      >
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <ConstructionIcon color="disabled" sx={{ fontSize: 40 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Este modulo aun no esta construido
          </Typography>
          <Typography color="text.secondary">{descripcion}</Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
