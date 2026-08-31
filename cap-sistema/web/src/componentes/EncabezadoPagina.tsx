import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

/**
 * Encabezado de un modulo, sobre el azul institucional.
 *
 * El panel tiene nueve modulos y todos se abren igual: un titulo gris sobre
 * fondo gris. Quien pasa la jornada saltando entre recepcion, sala de espera y
 * expedientes pierde el hilo de en cual esta, y el titulo —que es lo unico que
 * lo dice— no pesaba mas que cualquier otro texto de la pantalla.
 *
 * La banda de color lo resuelve sin agregar nada: no hay un elemento nuevo que
 * leer, solo el mismo titulo con el peso que le corresponde. Y al ser el color
 * de la barra superior, la pantalla queda enmarcada por arriba.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  /** Botones de la esquina derecha. Van dentro de la banda, no sueltos al lado. */
  acciones?: ReactNode;
}) {
  return (
    <Box
      sx={{
        mb: 3,
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
        borderRadius: 1,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        /*
          Los botones que llegan en `acciones` vienen con el estilo del resto
          del panel: `contained` en azul, que sobre esta banda desaparece. Se
          invierten aqui y no en cada pantalla, para que ninguna tenga que
          saber que esta dentro de una banda de color.
        */
        '& .MuiButton-contained': {
          bgcolor: '#fff',
          color: 'primary.main',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.86)' },
        },
        '& .MuiButton-outlined': {
          color: 'inherit',
          borderColor: 'rgba(255, 255, 255, 0.6)',
          '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Stack sx={{ gap: 0.5, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            {titulo}
          </Typography>
          {descripcion ? (
            // 0.92 y no un gris: sobre color, bajar la opacidad mantiene la
            // jerarquia sin ensuciar el tono ni perder contraste.
            <Typography sx={{ opacity: 0.92 }}>{descripcion}</Typography>
          ) : null}
        </Stack>
        {acciones ? <Box sx={{ flexShrink: 0 }}>{acciones}</Box> : null}
      </Stack>
    </Box>
  );
}

/**
 * Nota suelta dentro de una pantalla, en el mismo azul.
 *
 * Para los textos que guian el siguiente paso —"Escriba para buscar", el avance
 * de la transcripcion— cuando estan lejos del encabezado. Va en un tono mas
 * suave que la banda del titulo: si las dos pesaran igual, competirian, y la
 * que importa es la de arriba.
 */
export function NotaPagina({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 2.5 },
        py: 1.75,
        borderRadius: 1,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        ...sx,
      }}
    >
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}
