import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

/**
 * Encabezado de un modulo.
 *
 * Antes era una banda de color, para que el titulo pesara mas que el resto de
 * la pantalla. Resolvia un problema real —nueve modulos que se abrian todos
 * igual, un titulo gris sobre fondo gris— pero de una forma que competia con
 * el trabajo: la banda era lo primero que se veia en cada pantalla, siempre, y
 * lo primero que hay que ver es la tabla.
 *
 * Ahora el peso lo da la tipografia: titulo grande y oscuro sobre la
 * superficie clara, como en la referencia del CAP. El color queda donde
 * orienta de verdad, que es el menu lateral: ahi se ve en que modulo se esta
 * sin leer nada.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  /** Botones de la esquina derecha. */
  acciones?: ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        mb: 3,
        gap: 2,
        justifyContent: 'space-between',
        alignItems: { sm: 'flex-end' },
      }}
    >
      <Stack sx={{ gap: 0.5, minWidth: 0 }}>
        <Typography variant="h4" component="h1">
          {titulo}
        </Typography>
        {descripcion ? (
          <Typography color="text.secondary">{descripcion}</Typography>
        ) : null}
      </Stack>
      {acciones ? <Box sx={{ flexShrink: 0 }}>{acciones}</Box> : null}
    </Stack>
  );
}

/**
 * Nota suelta dentro de una pantalla.
 *
 * Para los textos que guian el siguiente paso —"Escriba para buscar", el
 * avance de la transcripcion— cuando estan lejos del encabezado.
 *
 * Fondo tenue y una linea de color a la izquierda, no un bloque entero: es una
 * indicacion, no una alarma, y en una pantalla que ya tiene tabla, filtros y
 * botones, un rectangulo de color solido se lleva la atencion que necesita el
 * trabajo.
 */
export function NotaPagina({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 2.5 },
        py: 1.75,
        borderRadius: 1,
        borderLeft: '4px solid',
        borderColor: 'secondary.main',
        bgcolor: 'rgba(16, 114, 115, 0.07)',
        color: 'text.primary',
        ...sx,
      }}
    >
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}
