import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import { usarSesion } from '../modulos/sesion/contexto';
import { menuPara } from '../navegacion/menu';

/**
 * Pantalla de entrada del panel.
 *
 * Muestra unicamente los modulos que el rol puede abrir. Es deliberado que no
 * haya nada mas: quien llega aqui viene a hacer una tarea concreta, y una
 * pantalla llena de tarjetas y cifras obliga a buscar antes de empezar.
 */
export function Inicio() {
  const { usuario } = usarSesion();
  const opciones = menuPara(usuario?.rol);

  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 4 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Buen dia, {usuario?.usuario}
        </Typography>
        <Typography color="text.secondary">
          Estos son los modulos disponibles para su rol.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        }}
      >
        {opciones.map(({ ruta, etiqueta, icono: Icono, pendiente }) => (
          <Card key={ruta} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardActionArea component={EnlaceRuta} to={ruta} sx={{ p: 2.5, height: '100%' }}>
              <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Icono color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {etiqueta}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pendiente ? 'En construccion' : 'Disponible'}
                </Typography>
              </Stack>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
