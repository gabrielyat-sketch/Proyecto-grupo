import { forwardRef, type ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

/**
 * Una seccion del formulario.
 *
 * La banda con el numeral romano no es adorno: es la misma marca que trae la
 * hoja impresa. Quien transcribe tiene el papel al lado y va saltando entre los
 * dos; si en la pantalla las secciones se llamaran distinto o vinieran en otro
 * orden, cada salto costaria una busqueda. Aqui "VII ANTECEDENTES" esta donde
 * el ojo ya lo espera.
 */
export const SeccionFicha = forwardRef<
  HTMLDivElement,
  {
    numeral: string;
    titulo: string;
    /** El recuento de casillas respondidas, cuando la seccion tiene casillas. */
    avance?: string;
    /** Aclaracion breve. Se omite donde el titulo impreso ya basta. */
    nota?: string;
    children: ReactNode;
  }
>(function SeccionFicha({ numeral, titulo, avance, nota, children }, ref) {
  return (
    <Paper
      ref={ref}
      component="section"
      elevation={0}
      aria-label={numeral + '. ' + titulo}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        // Sin redondeo: la hoja del MSPAS es una retícula de recuadros rectos.
        borderRadius: 0,
        overflow: 'hidden',
        // Deja sitio a la barra superior al saltar con el indice.
        scrollMarginTop: 88,
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'secondary.main',
          color: 'common.white',
          px: 1.5,
          py: 1,
        }}
      >
        <Box
          aria-hidden
          sx={{
            minWidth: 34,
            textAlign: 'center',
            bgcolor: 'common.white',
            color: 'secondary.main',
            fontWeight: 800,
            fontSize: 14,
            py: 0.25,
            borderRadius: 0.5,
          }}
        >
          {numeral}
        </Box>

        <Typography
          component="h2"
          sx={{
            flex: 1,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {titulo}
        </Typography>

        {avance ? (
          <Typography sx={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
            {avance}
          </Typography>
        ) : null}
      </Stack>

      {nota ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ px: { xs: 1.5, md: 2.5 }, pt: 1.5 }}
        >
          {nota}
        </Typography>
      ) : null}

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>{children}</Box>
    </Paper>
  );
});

/** Subtitulo dentro de una seccion, para los bloques que el papel separa. */
export function BloqueFicha({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 2, '&:first-of-type': { mt: 0 } }}>
      <Typography
        component="h3"
        sx={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          borderBottom: '2px solid',
          borderColor: 'divider',
          pb: 0.5,
          mb: 1,
        }}
      >
        {titulo}
      </Typography>
      {children}
    </Box>
  );
}
