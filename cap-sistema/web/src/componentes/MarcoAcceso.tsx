import { useState, type ReactNode } from 'react';
import { Box, Button, Collapse, Paper, Stack, Typography } from '@mui/material';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import { LogoCap } from './LogoCap';

/**
 * Fondo de las pantallas de acceso.
 *
 * Es la sala de espera del CAP resumida en luz y color: la claridad calida que
 * entra por el ventanal arriba, el verde de las plantas a la izquierda, y el
 * teal del mobiliario clinico a la derecha.
 *
 * Va en gradientes y no en una fotografia porque todavia no hay una del CAP
 * libre de derechos. La unica disponible traia la marca de agua del servicio
 * que la genero, y una marca ajena en la pantalla de acceso de un centro de
 * salud no se puede publicar.
 *
 * Cuando aparezca la foto, se antepone su `url(...)` a esta lista: los
 * gradientes quedan debajo como respaldo mientras carga y si el archivo falta.
 */
const FONDO_ACCESO = [
  'radial-gradient(1100px 520px at 50% -10%, rgba(255, 206, 148, 0.42), rgba(255, 206, 148, 0) 70%)',
  'radial-gradient(760px 640px at 6% 62%, rgba(101, 148, 118, 0.28), rgba(101, 148, 118, 0) 68%)',
  'radial-gradient(900px 720px at 97% 82%, rgba(21, 96, 122, 0.26), rgba(21, 96, 122, 0) 70%)',
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
        // `cover` y centrado, listo para cuando la primera capa sea una foto.
        // Nada de `background-attachment: fixed`, que Safari de iOS dibuja mal
        // y hace tironear el desplazamiento.
        backgroundSize: 'cover',
        backgroundPosition: 'center 62%',
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
