import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import { usarSesion } from '../modulos/sesion/contexto';
import { salir } from '../modulos/sesion/servicio-sesion';

/**
 * Provisional: confirma que la sesion quedo abierta y muestra quien entro.
 * La reemplaza el layout con el menu por rol.
 */
export function Inicio() {
  const { usuario } = usarSesion();

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10 }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.14em' }}>
              CAP Purulha
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Sesion abierta
            </Typography>
          </Stack>

          <Divider />

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Usuario
            </Typography>
            <Typography>{usuario?.usuario}</Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Rol
            </Typography>
            <Typography>{usuario?.rol}</Typography>
          </Stack>

          <Button variant="outlined" onClick={() => void salir()} sx={{ alignSelf: 'flex-start' }}>
            Cerrar sesion
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
