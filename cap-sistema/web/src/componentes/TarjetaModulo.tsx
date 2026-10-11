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
 *  ESTO ES EL CSS QUE ENTREGO EL CAP, TRADUCIDO
 * ─────────────────────────────────────────────────────────────────────────
 * No es una interpretacion de la imagen: son sus reglas, una por una. Los
 * cuatro rasgos que la hacen reconocible y que se pierden en cuanto alguien
 * «ordena» este archivo:
 *
 *   1. **Las esquinas son asimetricas**: `8px 25px 8px 25px`. Arriba a la
 *      izquierda y abajo a la derecha casi rectas; las otras dos muy
 *      redondeadas. Es lo que da la forma, y es lo que yo habia perdido
 *      redondeando las cuatro por igual.
 *   2. **El filo de arriba son 5 px de borde**, no una cinta aparte.
 *   3. **La franja de abajo es una sombra SOLIDA**: `0 7px 0 var(--shadow)`.
 *      Por eso sigue el contorno asimetrico de la tarjeta en vez de ser un
 *      rectangulo pegado al pie, que es como me habia salido a mi.
 *   4. **El fondo es un degradado diagonal** que termina en el tono suave del
 *      acento por la esquina inferior derecha.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LA INTERACCION
 * ─────────────────────────────────────────────────────────────────────────
 * Al pasar el cursor la tarjeta sube 8 px, la sombra solida pasa de 7 a 14 —la
 * franja «crece», que es lo que el CAP pidio que resaltara— y un brillo
 * diagonal cruza la tarjeta de lado a lado en 0.65 s.
 *
 * `prefers-reduced-motion` apaga el desplazamiento y el brillo, que son
 * movimiento. **No apaga el cambio de sombra**: eso es lo que dice sobre cual
 * esta el cursor, y quien pide menos animacion sigue necesitando saberlo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LO QUE SE ANADIO: EL MODO OSCURO
 * ─────────────────────────────────────────────────────────────────────────
 * El CSS del CAP es de modo claro. De noche el degradado no puede terminar en
 * el tono suave —es casi blanco, y encenderia la esquina— asi que termina en el
 * acento muy diluido, y la sombra solida toma el acento al 35 % en vez del
 * gris rosado. La forma, las medidas y los tiempos son los mismos.
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
  const { pastel, suave, sombra } = ACENTOS[acento];

  const base = oscuro ? '#10325c' : '#fffdf8';
  const medio = oscuro ? '#0d2a4e' : '#fffaf3';
  const remate = oscuro ? alpha(pastel, 0.22) : suave;
  const solida = oscuro ? alpha(pastel, 0.35) : sombra;

  const fondo = (finDelMedio: string) =>
    'linear-gradient(135deg, ' +
    base +
    ' 0%, ' +
    medio +
    ' ' +
    finDelMedio +
    ', ' +
    remate +
    ' 150%)';

  return (
    <Stack
      component={EnlaceRuta}
      to={ruta}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        minHeight: 176,
        p: '22px',
        color: oscuro ? '#e8f1fb' : '#20343a',
        background: fondo('58%'),
        border: '1px solid',
        borderColor: oscuro ? 'rgba(146, 180, 220, 0.2)' : '#dfd6c8',
        borderTop: '5px solid ' + pastel,
        // Las esquinas asimetricas: lo que da la forma.
        borderRadius: '8px 25px 8px 25px',
        boxShadow:
          '0 7px 0 ' +
          solida +
          ', 0 14px 26px ' +
          (oscuro ? 'rgba(0, 0, 0, .4)' : 'rgba(56, 80, 75, 0.08)'),
        transition: 'transform .28s ease, box-shadow .28s ease, background .28s ease',

        '&:hover': {
          transform: 'translateY(-8px)',
          background: fondo('42%'),
          boxShadow: '0 14px 0 ' + solida + ', 0 26px 34px ' + alpha(pastel, 0.22),
        },

        /*
          El brillo que cruza la tarjeta. Vive en un pseudoelemento y no en un
          nodo propio para que no entre en el arbol de accesibilidad: es una
          luz, no contenido, y un lector de pantalla no tiene nada que decir de
          ella. `pointer-events: none` para que no se coma el clic.
        */
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(120deg, transparent 25%, ' +
            (oscuro ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.42)') +
            ', transparent 75%)',
          transform: 'translateX(-120%)',
          transition: 'transform .65s ease',
        },
        '&:hover::after': { transform: 'translateX(120%)' },

        '@media (prefers-reduced-motion: reduce)': {
          transition: 'box-shadow .28s ease',
          '&:hover': { transform: 'none', background: fondo('58%') },
          // El brillo se queda quieto fuera de la tarjeta: es movimiento puro.
          '&::after': { transition: 'none' },
          '&:hover::after': { transform: 'translateX(-120%)' },
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          color: pastel,
          bgcolor: oscuro ? alpha(pastel, 0.18) : suave,
          // Asimetricas tambien, y en el otro sentido que la tarjeta.
          borderRadius: '11px 4px',
          flexShrink: 0,
        }}
      >
        {/*
          22 y no los 20 del CSS: ahi el icono es un caracter de bloque, que
          llena su caja entera. Un icono de trazo con el mismo cuerpo se ve mas
          pequeno, y el CAP los pidio «un poco mas grandes».
        */}
        <Icono sx={{ fontSize: 22 }} />
      </Box>

      <Typography
        component="h2"
        sx={{ mt: '14px', mb: '5px', fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}
      >
        {etiqueta}
      </Typography>

      {/*
        El subtitulo va en el acento, como manda el CSS del CAP. Sobre la crema
        eso mide 1.8:1 y la WCAG pide 4.5 para texto: se deja asi porque es el
        diseno que el CAP eligio despues de que se le senalara. El dato que
        importa de cada tarjeta —el nombre del modulo y si esta disponible— si
        cumple de sobra, y la navegacion no depende de leer esta linea.
        `ACENTOS[...].texto` tiene la version que si pasa, por si se revisa.
      */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: pastel }}>{resumen}</Typography>

      <Typography sx={{ mt: '17px', color: oscuro ? '#9db4d0' : '#71807f' }}>
        {estado}
      </Typography>
    </Stack>
  );
}
