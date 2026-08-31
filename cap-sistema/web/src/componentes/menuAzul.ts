/**
 * Desplegable en el azul institucional, con el texto en blanco.
 *
 * Se reserva para los desplegables que FILTRAN u ORDENAN el trabajo —la
 * comunidad en recepcion, el rol en administracion—, no para los campos de
 * datos de un formulario. Si se pintaran todos, el color dejaria de significar
 * nada y solo quedaria el ruido.
 *
 * Blanco sobre #15607a da una relacion de contraste de 7.2:1, muy por encima
 * del 4.5:1 que exige la WCAG para texto normal. En `primary.dark`, que es lo
 * que se usa al pasar el cursor y en la opcion elegida, sube todavia mas.
 */
export const MENU_AZUL = {
  slotProps: {
    paper: {
      sx: {
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        '& .MuiMenuItem-root': {
          color: 'inherit',
          '&:hover': { bgcolor: 'primary.dark' },
          // El resaltado por omision es el primario al 8 %, invisible sobre el
          // primario entero: la opcion elegida quedaba sin marcar.
          '&.Mui-selected': {
            bgcolor: 'primary.dark',
            '&:hover': { bgcolor: 'primary.dark' },
          },
        },
      },
    },
  },
} as const;
