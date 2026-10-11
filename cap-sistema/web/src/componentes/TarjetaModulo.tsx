import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import type { SvgIconProps } from '@mui/material';
import type { ComponentType } from 'react';
import { ACENTOS, type NombreAcento } from '../tema';

/**
 * La tarjeta de un modulo en la pantalla de entrada.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  DE DONDE SALE
 * ─────────────────────────────────────────────────────────────────────────
 * Del diseno que dio el CAP, muestreado de la imagen: cinta de color arriba,
 * baldosa del icono tenida del mismo tono, nombre en navy, resumen en el color
 * del modulo y el estado en gris. La crema del fondo y los pasteles salen de
 * ahi tal cual.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LAS DOS COSAS QUE NO SE COPIARON LITERAL
 * ─────────────────────────────────────────────────────────────────────────
 * **El color del resumen.** En la imagen va en el pastel, y sobre la crema eso
 * da 2.2:1 —menos de la mitad del minimo que la WCAG exige para texto—. Aqui
 * usa la version oscurecida del mismo tono: a simple vista casi no cambia, y
 * se lee. La cinta y la baldosa si llevan el pastel exacto, porque son
 * decoracion y no tienen que leerse.
 *
 * **La sombra de color.** La imagen la tiene y aqui tambien, pero construida
 * con el tono del modulo en vez de un gris: es lo que hace que la tarjeta
 * parezca apoyada sobre su propio color y no recortada sobre el fondo. De
 * noche desaparece —una sombra sobre navy no se ve— y el trabajo lo hace el
 * borde.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LA ANIMACION
 * ─────────────────────────────────────────────────────────────────────────
 * Al pasar el cursor la tarjeta sube tres pixeles, la sombra crece y la cinta
 * engorda. Son tres cosas a la vez y a proposito: un solo cambio sutil en una
 * reticula de nueve tarjetas pasa desapercibido, y lo que tiene que quedar
 * claro es cual se va a abrir si se pulsa.
 *
 * `prefers-reduced-motion` la apaga entera. No es un detalle de cortesia: el
 * movimiento que a la mayoria le resulta agradable a algunas personas les
 * produce mareo, y una pantalla de trabajo se mira ocho horas.
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

  return (
    <Box
      component={EnlaceRuta}
      to={ruta}
      sx={{
        display: 'block',
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        borderRadius: 3,
        bgcolor: 'background.paper',
        // El borde entero del tono, muy diluido: de noche es lo unico que
        // separa la tarjeta del fondo, porque la sombra ahi no existe.
        border: '1px solid',
        borderColor: oscuro ? pastel + '38' : pastel + '55',
        boxShadow: oscuro ? 'none' : '0 2px 10px ' + pastel + '33',
        transition: tema.transitions.create(['transform', 'box-shadow', 'border-color'], {
          duration: 220,
          easing: 'cubic-bezier(.22,.61,.36,1)',
        }),
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: oscuro ? pastel + '70' : pastel + '99',
          boxShadow: oscuro
            ? '0 10px 26px rgba(0, 0, 0, .45)'
            : '0 10px 26px ' + pastel + '66',
        },
        '&:hover .cinta': { height: 10 },
        '&:hover .baldosa': { transform: 'scale(1.06)' },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
          '&:hover .cinta': { height: 7 },
          '&:hover .baldosa': { transform: 'none' },
        },
      }}
    >
      {/*
        La cinta de color de arriba, pegada al borde.

        Es lo que identifica el modulo antes de leer nada, y por eso engorda al
        pasar el cursor en vez de cambiar de color: crecer se nota de reojo,
        cambiar de tono obliga a recordar cual era.
      */}
      <Box
        className="cinta"
        sx={{
          height: 7,
          bgcolor: pastel,
          transition: tema.transitions.create('height', { duration: 220 }),
        }}
      />

      <Stack sx={{ p: 2.5, pt: 2.25, gap: 0.25 }}>
        <Box
          className="baldosa"
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            mb: 1.5,
            // La baldosa es el pastel muy diluido y el icono va en el tono
            // legible: el icono tenido del mismo pastel sobre su propio pastel
            // desapareceria.
            bgcolor: oscuro ? pastel + '26' : pastel + '33',
            color: oscuro ? textoOscuro : texto,
            transition: tema.transitions.create('transform', { duration: 220 }),
          }}
        >
          {/*
            28px y no los 24 de serie. El CAP pidio los iconos «un poco mas
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

        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: oscuro ? textoOscuro : texto,
          }}
        >
          {resumen}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
          {estado}
        </Typography>
      </Stack>
    </Box>
  );
}
