import { useState, type ReactNode } from 'react';
import { Box, Button, Collapse, Paper, Stack, Typography } from '@mui/material';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import { LogoCap } from './LogoCap';

/**
 * Fondo de las pantallas de acceso: la sala de espera del CAP.
 *
 * Las capas van de arriba hacia abajo, que es el orden en que CSS las pinta.
 * Sobre la fotografia hay dos tintes —la luz calida del ventanal y el teal del
 * mobiliario— y un velo claro. Hacen dos trabajos: unen la foto con la paleta
 * del panel, y le bajan el contraste para que la tarjeta blanca se lea encima
 * sin esfuerzo.
 *
 * El degradado del final es el respaldo: es lo que se ve mientras el JPEG
 * carga, y lo que queda si el archivo faltara. La pantalla nunca aparece en
 * blanco.
 */
const FONDO_ACCESO = [
  'radial-gradient(1100px 520px at 50% -10%, rgba(255, 206, 148, 0.26), rgba(255, 206, 148, 0) 70%)',
  'radial-gradient(900px 720px at 97% 82%, rgba(21, 96, 122, 0.16), rgba(21, 96, 122, 0) 70%)',
  'linear-gradient(180deg, rgba(238, 243, 244, 0.24) 0%, rgba(221, 231, 234, 0.38) 100%)',
  'url("/fondo-acceso.jpg")',
  'linear-gradient(180deg, #eef3f4 0%, #dde7ea 100%)',
].join(', ');

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
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        py: 6,
        backgroundColor: 'background.default',
        backgroundImage: FONDO_ACCESO,
        // La foto es apaisada (1195x896) y `cover` la recorta por los lados en
        // pantallas mas anchas. Centrada, lo que sobrevive al recorte es lo que
        // interesa: las sillas a la izquierda y el mostrador a la derecha.
        //
        // Nada de `background-attachment: fixed`, que Safari de iOS dibuja mal
        // y hace tironear el desplazamiento.
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 460,
          // El relleno vive en las secciones y no en el Paper: asi la franja
          // del pie llega hasta los bordes, como en el diseno de referencia.
          p: 0,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'rgba(15, 50, 64, 0.09)',
          // Dos sombras: una larga que despega la tarjeta del fondo, y una
          // corta que le da el borde apoyado. Con una sola, o flota sin peso o
          // se ve pegada.
          boxShadow: '0 24px 60px -26px rgba(12, 45, 58, 0.38), 0 2px 6px rgba(12, 45, 58, 0.06)',
        }}
      >
        <Stack spacing={3} sx={{ p: { xs: 3, sm: 4.5 } }}>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <LogoCap tamano={30} />
              <Typography
                variant="overline"
                color="primary"
                sx={{ letterSpacing: '0.14em', fontWeight: 700, lineHeight: 1.2 }}
              >
                CAP Purulha
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                {titulo}
              </Typography>
              {descripcion ? (
                <Typography variant="body2" color="text.secondary">
                  {descripcion}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          {children}
        </Stack>

        <Box
          component="footer"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.25,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(21, 96, 122, 0.035)',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
          >
            <Button
              size="small"
              color="inherit"
              startIcon={<HelpOutlinedIcon />}
              onClick={() => setAyudaAbierta((abierta) => !abierta)}
              aria-expanded={ayudaAbierta}
              aria-controls="ayuda-acceso"
              sx={{ color: 'text.secondary', fontWeight: 500, minHeight: 36, px: 1 }}
            >
              ¿Ayuda?
            </Button>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'primary.main' }}>
              <LogoCap tamano={18} />
              <Typography variant="caption" color="text.secondary">
                Salud Comunitaria para Todos
              </Typography>
            </Stack>
          </Stack>

          {/* El texto de ayuda no es decorativo: sin el, quien no puede entrar
              no tiene a quien acudir y termina agotando los intentos hasta que
              la cuenta se bloquea. */}
          <Collapse in={ayudaAbierta} id="ayuda-acceso">
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1, pb: 0.5, px: 1 }}>
              Si olvido su contrasena o no puede entrar, pida al administrador del CAP que la
              restablezca. Nunca comparta su contrasena con otra persona.
            </Typography>
          </Collapse>
        </Box>
      </Paper>
    </Box>
  );
}
