import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material';
import type { ComponentType } from 'react';
import { ACENTOS, type NombreAcento } from '../tema';

/**
 * La tarjeta de un modulo en la pantalla de entrada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LA FORMA, MEDIDA DE LA IMAGEN
 * ─────────────────────────────────────────────────────────────────────────
 * No es una tarjeta con un borde de color: son tres piezas apiladas, y asi
 * estan medidas en el diseno que dio el CAP.
 *
 *   ┌───────────────────────┐  ← cinta de 6 px, el acento SOLIDO
 *   │                       │
 *   │   cuerpo en crema     │
 *   │                       │
 *   ├───────────────────────┤  ← linea de 1 px
 *   │                       │  ← franja de 16 px, el acento al 78 %
 *   └───────────────────────┘
 *
 * El 78 % no es un gusto: es lo que mide la imagen en las cuatro tarjetas
 * donde la franja se ve entera. Se consigue pintando el acento con esa
 * transparencia sobre el cuerpo, que es exactamente la mezcla que hay ahi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LA FRANJA DE ABAJO ES LA QUE RESPONDE AL CURSOR
 * ─────────────────────────────────────────────────────────────────────────
 * Al pasar por encima pasa al acento entero y crece cuatro pixeles. Lo pidio
 * el CAP y acierta: en una reticula de nueve tarjetas, lo que tiene que
 * quedar claro es CUAL se va a abrir, y una franja que se enciende en el
 * borde inferior se ve de reojo mejor que una sombra que se agranda.
 *
 * `prefers-reduced-motion` apaga el movimiento pero NO el encendido de la
 * franja: quien pide menos animacion sigue necesitando saber donde esta el
 * cursor. Se queda el cambio de color, que no se mueve.
 */
export function TarjetaModulo({
  ruta,
  etiqueta,
  resumen,
  acento,
  icono: Icono,
  estado,
}: {
  ruta: string;
  etiqueta: string;
  resumen: string;
  acento: NombreAcento;
  icono: ComponentType<SvgIconProps>;
  /** «Disponible», o «En construccion» si el modulo todavia no existe. */
  estado: string;
}) {
  const tema = useTheme();
  const oscuro = tema.palette.mode === 'dark';
  const { pastel, texto, textoOscuro } = ACENTOS[acento];

  /** La franja apagada. Mas tenue de noche: sobre el navy, 78 % grita. */
  const franjaEnReposo = alpha(pastel, oscuro ? 0.42 : 0.78);

  return (
    <Stack
      component={EnlaceRuta}
      to={ruta}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        borderRadius: '16px',
        bgcolor: 'background.paper',
        // Borde neutro y fino, como la imagen: el color lo ponen la cinta y la
        // franja, no el contorno.
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: oscuro ? 'none' : '0 2px 10px ' + alpha(pastel, 0.22),
        transition: tema.transitions.create(['transform', 'box-shadow'], {
          duration: 220,
          easing: 'cubic-bezier(.22,.61,.36,1)',
        }),
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: oscuro
            ? '0 10px 26px rgba(0, 0, 0, .45)'
            : '0 10px 26px ' + alpha(pastel, 0.45),
        },
        '&:hover .franja': { height: 20, backgroundColor: pastel },
        '&:hover .baldosa': { transform: 'scale(1.06)' },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
          // El color de la franja SI cambia: es lo que dice donde esta el
          // cursor, y eso no es decoracion.
          '&:hover .franja': { height: 16, backgroundColor: pastel },
          '&:hover .baldosa': { transform: 'none' },
        },
      }}
    >
      {/* La cinta de arriba: el acento solido, 6 px, como en la imagen. */}
      <Box sx={{ height: 6, bgcolor: pastel, flexShrink: 0 }} />

      <Stack sx={{ p: 2.5, pt: 2.25, pb: 2.5, gap: 0.25, flexGrow: 1 }}>
        <Box
          className="baldosa"
          sx={{
            width: 52,
            height: 52,
            borderRadius: '14px',
            display: 'grid',
            placeItems: 'center',
            mb: 1.5,
            // La baldosa es el pastel muy diluido y el icono va en el tono
            // legible: el icono tenido del mismo pastel sobre su propio pastel
            // desapareceria.
            bgcolor: alpha(pastel, oscuro ? 0.16 : 0.2),
            color: oscuro ? textoOscuro : texto,
            transition: tema.transitions.create('transform', { duration: 220 }),
          }}
        >
          {/*
            28 px y no los 24 de serie. El CAP pidio los iconos «un poco mas
            grandes», y un poco es esto: con 32 la baldosa queda llena y el
            icono pasa a competir con el nombre del modulo.
          */}
          <Icono sx={{ fontSize: 28 }} />
        </Box>

        <Typography
          component="h2"
          sx={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'text.primary',
            lineHeight: 1.2,
          }}
        >
          {etiqueta}
        </Typography>

        <Typography sx={{ fontSize: 14, fontWeight: 700, color: oscuro ? textoOscuro : texto }}>
          {resumen}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
          {estado}
        </Typography>
      </Stack>

      {/* La franja de abajo, que es la que se enciende con el cursor. */}
      <Box
        className="franja"
        sx={{
          height: 16,
          flexShrink: 0,
          backgroundColor: franjaEnReposo,
          borderTop: '1px solid',
          borderColor: 'divider',
          transition: tema.transitions.create(['height', 'background-color'], {
            duration: 220,
            easing: 'cubic-bezier(.22,.61,.36,1)',
          }),
        }}
      />
    </Stack>
  );
}
