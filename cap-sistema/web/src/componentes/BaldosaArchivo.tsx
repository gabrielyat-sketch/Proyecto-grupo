import type { ReactNode } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { ACENTOS } from '../tema';

/**
 * Una baldosa del archivero: una carpeta familiar o la ficha de una persona.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE DEJO DE SER UNA TABLA
 * ─────────────────────────────────────────────────────────────────────────
 * Lo pidio el CAP con una imagen de referencia, y el motivo es el archivero
 * real: ahi nadie lee una lista de numeros, se mira el estante y se reconoce
 * el folder. Una tabla obliga a leer renglon por renglon hasta dar con el
 * apellido; una reticula de carpetas se recorre de un vistazo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  EL NUMERO SE QUEDA, PERO DEJA DE SER LA PUERTA
 * ─────────────────────────────────────────────────────────────────────────
 * Antes el numero ERA el enlace: para entrar en una carpeta habia que pulsar
 * sobre su numero. Eso lo convertia en dos cosas a la vez —el dato que se
 * copia para ir al archivo y el boton para entrar—, y la primera es la que
 * importa cuando alguien esta anotando numeros en un papel.
 *
 * Ahora se entra por la baldosa entera y el numero es solo lo que dice: donde
 * esta el folder. Sigue a la vista, abajo, con su lugar al lado —porque el
 * numero por si solo no identifica una carpeta: hay un No.1 en cada barrio—.
 */
export function BaldosaArchivo({
  a,
  tipo,
  nombre,
  detalle,
  insignia,
  aviso,
}: {
  /** A donde lleva. La baldosa ENTERA es el enlace, no una parte. */
  a: string;
  /** Carpeta de familia o ficha de una persona. */
  tipo: 'carpeta' | 'ficha';
  nombre: string;
  /** El numero y el lugar, o la edad y el expediente. Va bajo el nombre. */
  detalle: ReactNode;
  /** Cuantos integrantes, en la esquina. Solo en las carpetas. */
  insignia?: number;
  /** Una advertencia corta: «Vacia», «Fallecido». */
  aviso?: string;
}) {
  const tema = useTheme();
  const oscuro = tema.palette.mode === 'dark';
  // Verde para las carpetas y cian para las fichas, como la imagen del CAP.
  const { pastel, texto, textoOscuro } = ACENTOS[tipo === 'carpeta' ? 'menta' : 'cian'];
  const tinta = oscuro ? textoOscuro : texto;
  const Icono = tipo === 'carpeta' ? FolderRoundedIcon : DescriptionRoundedIcon;

  return (
    <Stack
      component={EnlaceRuta}
      to={a}
      sx={{
        position: 'relative',
        alignItems: 'center',
        textAlign: 'center',
        gap: 0.5,
        p: 2,
        pt: 2.25,
        borderRadius: '14px',
        textDecoration: 'none',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: tema.transitions.create(['border-color', 'box-shadow', 'transform'], {
          duration: 180,
          easing: 'cubic-bezier(.22,.61,.36,1)',
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(pastel, 0.9),
          boxShadow: oscuro
            ? '0 8px 20px rgba(0, 0, 0, .45)'
            : '0 8px 20px ' + alpha(pastel, 0.35),
        },
        '&:hover .tapa': { bgcolor: alpha(pastel, oscuro ? 0.3 : 0.34) },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
        },
      }}
    >
      <Box
        className="tapa"
        sx={{
          width: 56,
          height: 56,
          borderRadius: '14px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(pastel, oscuro ? 0.16 : 0.2),
          color: tinta,
          transition: tema.transitions.create('background-color', { duration: 180 }),
        }}
      >
        <Icono sx={{ fontSize: 30 }} />
      </Box>

      <Typography
        sx={{
          mt: 0.75,
          fontSize: 15,
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1.25,
          // Dos renglones como mucho, y despues puntos suspensivos: con el
          // nombre entero, una baldosa de un apellido largo creceria mas que
          // sus vecinas y la reticula dejaria de ser una reticula.
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {nombre}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
        {detalle}
      </Typography>

      {aviso ? (
        <Typography
          sx={{ fontSize: 12, fontWeight: 700, color: 'warning.main', mt: 0.25 }}
        >
          {aviso}
        </Typography>
      ) : null}

      {/*
        Cuantos van dentro, en la esquina, como en la imagen. Dice de un
        vistazo si la carpeta tiene a una persona o a una familia entera.
      */}
      {insignia !== undefined ? (
        <Stack
          direction="row"
          sx={{
            position: 'absolute',
            right: 10,
            bottom: 8,
            alignItems: 'center',
            gap: 0.4,
            color: 'text.secondary',
          }}
        >
          <GroupsRoundedIcon sx={{ fontSize: 15 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{insignia}</Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}

/** La reticula donde viven las baldosas. Igual en las dos pantallas. */
export function ReticulaArchivo({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
      }}
    >
      {children}
    </Box>
  );
}
