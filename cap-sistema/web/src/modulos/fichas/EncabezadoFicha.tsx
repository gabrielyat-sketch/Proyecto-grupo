import type { ReactNode } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * El encabezado que las cuatro fichas del MSPAS traen impreso arriba.
 *
 * En el papel es siempre el mismo bloque: el nombre de la hoja, el recuadro de
 * **No. Expediente** y el de **Fecha**. Aquí se le añade de quién es la ficha,
 * que en el papel no hace falta porque quien la sostiene ya lo sabe.
 *
 * Vive aparte y no dentro de cada pantalla porque el personal salta entre
 * hojas: si la de adultos y la de neonato dijeran lo mismo en sitios
 * distintos, cada salto costaría una búsqueda. Las dos que faltan —niñez y
 * prenatal— entran por aquí sin volver a decidir nada.
 *
 * Es pegajoso: en una hoja de doscientos campos, saber de quién es lo que se
 * está escribiendo no puede depender de subir hasta arriba.
 */
export function EncabezadoFicha({
  titulo,
  volverA,
  volverTexto,
  nombre,
  resumen,
  expediente,
  fecha,
  children,
}: {
  /** El nombre de la hoja, tal como está impreso. */
  titulo: string;
  volverA: string;
  volverTexto: string;
  /** «Apellidos, Nombres». */
  nombre: string;
  /** La línea de debajo: edad, sexo, comunidad. */
  resumen: string;
  /** El recuadro «No. Expediente» del papel. */
  expediente: string;
  /** El recuadro «Fecha». Se omite en las fichas que la piden en otro sitio. */
  fecha?: { valor: string; onCambio: (valor: string) => void };
  /** Lo que cada ficha pone a la derecha: guardar, avisos, atajos. */
  children?: ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 3,
        mb: 2,
        px: { xs: 1.5, md: 2 },
        py: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        // Sin redondeo: la hoja del MSPAS es una retícula de recuadros rectos.
        borderRadius: 0,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 1.5, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', minWidth: 0 }}>
          <Button
            component={EnlaceRuta}
            to={volverA}
            startIcon={<ArrowBackIcon />}
            size="small"
            color="inherit"
          >
            {volverTexto}
          </Button>

          <Box sx={{ minWidth: 0 }}>
            {/*
              El nombre de la hoja NO es un encabezado de nivel: los de nivel
              dos son las secciones numeradas del formulario, y el uno es de
              quién es la ficha. Meterlo en la jerarquía haría que un lector de
              pantalla anunciara una sección que en el papel no existe.
            */}
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
              noWrap
            >
              {titulo}
            </Typography>
            <Typography component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
              {nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {resumen}
            </Typography>
          </Box>
        </Stack>

        {/*
          Los dos recuadros del papel, uno encima del otro y en el mismo orden
          que la hoja: primero el expediente, después la fecha.
        */}
        <Stack sx={{ gap: 1, alignItems: { md: 'flex-end' }, flexShrink: 0 }}>
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
              No. de expediente
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
              {expediente}
            </Typography>
          </Box>

          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {fecha ? (
              <TextField
                label="Fecha"
                type="date"
                size="small"
                value={fecha.valor}
                onChange={(e) => fecha.onCambio(e.target.value)}
                sx={{ width: 180 }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            ) : null}
            {children}
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
