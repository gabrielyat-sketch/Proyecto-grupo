import type { ComponentType, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material';
import { ACENTOS, type NombreAcento } from '../tema';
import { MENU } from '../navegacion/menu';

/**
 * Encabezado de un modulo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LO QUE CAMBIO Y POR QUE
 * ─────────────────────────────────────────────────────────────────────────
 * Era un titulo y un subtitulo sueltos sobre la crema. Funcionaba, pero las
 * nueve pantallas volvian a abrirse todas iguales —que es justo el problema
 * que la banda de color original intentaba resolver, y que al quitarla
 * regreso— y el encabezado no se separaba del trabajo: el titulo, los filtros
 * y la tabla flotaban en la misma superficie sin jerarquia.
 *
 * Ahora el encabezado trae tres cosas que antes no tenia:
 *
 *   1. **El icono del modulo**, en una baldosa con su acento. Es el mismo
 *      icono y el mismo color del menu lateral, asi que la pantalla confirma
 *      sin leer donde esta uno. Y se toma del propio menu: no hay que pasarlo
 *      en cada pagina ni mantenerlo en dos sitios.
 *   2. **Una linea al pie.** Separa el encabezado del area de trabajo. Es un
 *      filo de 1 px, no una banda: marca el limite sin competir con la tabla.
 *   3. **Ancho maximo en la descripcion.** Un subtitulo que cruza 1500 px es
 *      una linea que el ojo pierde al volver. Se corta cerca de los 75
 *      caracteres, que es donde se lee comodo.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE SE SACA DE LA RUTA Y NO SE PASA POR PROPIEDAD
 * ─────────────────────────────────────────────────────────────────────────
 * `MENU` ya sabe el icono y el acento de cada modulo —los pinta el panel
 * lateral y las tarjetas de inicio— asi que pedirselos tambien a cada pagina
 * seria mantener lo mismo en tres sitios y que acaben separandose. La pagina
 * sigue pudiendo imponerlos (`icono`, `acento`) para las pantallas que no son
 * un modulo del menu, como la ficha clinica o el detalle de un medicamento.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  icono,
  acento,
}: {
  titulo: string;
  descripcion?: ReactNode;
  /** Botones de la esquina derecha. */
  acciones?: ReactNode;
  /** Solo para pantallas que no son un modulo del menu. */
  icono?: ComponentType<SvgIconProps>;
  acento?: NombreAcento;
}) {
  const tema = useTheme();
  const { pathname } = useLocation();
  const oscuro = tema.palette.mode === 'dark';

  // La entrada mas especifica que cubra esta ruta: /farmacia/<id> es Farmacia.
  // Se ordena por largo para que /recepcion/nuevo no caiga en "/" si algun dia
  // existiera una entrada raiz.
  const modulo = [...MENU]
    .filter((e) => pathname === e.ruta || pathname.startsWith(e.ruta + '/'))
    .sort((a, b) => b.ruta.length - a.ruta.length)[0];

  const Icono = icono ?? modulo?.icono;
  const nombreAcento = acento ?? modulo?.acento;
  const tonos = nombreAcento ? ACENTOS[nombreAcento] : undefined;

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          gap: 2,
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          pb: 2,
        }}
      >
        <Stack direction="row" sx={{ gap: 2, alignItems: 'center', minWidth: 0 }}>
          {Icono && tonos ? (
            <Box
              aria-hidden
              sx={{
                width: 46,
                height: 46,
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                color: oscuro ? tonos.textoOscuro : tonos.texto,
                bgcolor: oscuro ? alpha(tonos.pastel, 0.16) : tonos.suave,
                // Asimetrica, como la baldosa de las tarjetas de inicio: es el
                // mismo sistema, y repetir la forma lo deja claro sin decirlo.
                borderRadius: '13px 5px',
              }}
            >
              <Icono sx={{ fontSize: 25 }} />
            </Box>
          ) : null}

          <Stack sx={{ gap: 0.25, minWidth: 0 }}>
            <Typography variant="h4" component="h1" sx={{ lineHeight: 1.15 }}>
              {titulo}
            </Typography>
            {descripcion ? (
              <Typography color="text.secondary" sx={{ maxWidth: '75ch' }}>
                {descripcion}
              </Typography>
            ) : null}
          </Stack>
        </Stack>

        {acciones ? <Box sx={{ flexShrink: 0 }}>{acciones}</Box> : null}
      </Stack>

      {/*
        El filo. Toma el acento muy diluido y no el gris del divisor: de un
        vistazo, el borde inferior del encabezado es otra marca del modulo, y
        en modo oscuro un gris puro sobre el navy no se ve.
      */}
      <Box
        sx={{
          height: 1,
          bgcolor: tonos
            ? alpha(tonos.pastel, oscuro ? 0.38 : 0.55)
            : 'divider',
        }}
      />
    </Box>
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
        // Del tono del tema y no un teal fijo: el 7 % de un teal claro sobre el
        // navy de noche no se distingue del navy, y la nota deja de verse como
        // un bloque.
        bgcolor: (t) =>
          t.palette.mode === 'dark'
            ? 'rgba(146, 180, 220, 0.1)'
            : 'rgba(16, 114, 115, 0.07)',
        color: 'text.primary',
        ...sx,
      }}
    >
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}
