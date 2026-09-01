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

/**
 * Un dato que la ficha enseña pero no captura.
 *
 * El papel tiene una raya para escribirlos; aquí llegan ya escritos desde el
 * registro de recepción. Se muestran igual porque quien llena la ficha no
 * entra al registro, y porque en la hoja impresa están: leer la ficha sin
 * saber la edad ni la dirección del paciente no es leer la misma hoja.
 *
 * No se editan a propósito. Si el dato está mal se corrige en recepción, que
 * es donde vive: así el expediente y la ficha nunca dicen cosas distintas.
 */
export function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {titulo}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {valor}
      </Typography>
    </Box>
  );
}
