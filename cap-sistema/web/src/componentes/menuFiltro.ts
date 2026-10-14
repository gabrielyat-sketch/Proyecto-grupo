import type { Theme } from '@mui/material/styles';

/**
 * Desplegable de los filtros, en gris claro.
 *
 * Se reserva para los desplegables que FILTRAN u ORDENAN el trabajo —la
 * comunidad en recepcion, el rol en administracion—, no para los campos de
 * datos de un formulario. Si se pintaran todos, la distincion dejaria de
 * significar nada y solo quedaria el ruido.
 *
 * Antes era el azul institucional entero con el texto en blanco. Contrastaba
 * de sobra, pero un panel de color solido desplegado sobre una tabla se lleva
 * toda la atencion de la pantalla, y una lista de nueve comunidades no es una
 * alarma: es algo que se lee y se cierra. En gris claro se distingue igual de
 * los campos del formulario —que van en blanco— sin gritar.
 *
 * El texto queda en el color normal del tema, muy por encima del 4.5:1 que
 * exige la WCAG, y la opcion elegida se marca ademas con el peso de la letra:
 * en gris sobre gris —o en azul sobre azul— el color solo no bastaria.
 */
export const MENU_FILTRO = {
  slotProps: {
    paper: {
      /*
        Una funcion y no un objeto: necesita saber el modo.

        Escrito con los grises fijos de antes, de noche el desplegable salia
        gris CLARO con el texto claro del tema encima —letra blanca sobre fondo
        casi blanco, invisible—. Y no en una pantalla: en todos los filtros del
        sistema, que es donde se elige la comunidad, el lugar, el estado y el
        medicamento.
      */
      sx: (tema: Theme) => {
        const oscuro = tema.palette.mode === 'dark';
        return {
          bgcolor: oscuro ? '#13375f' : '#f2f5f6',
          border: '1px solid',
          borderColor: oscuro ? '#1d4e7d' : '#d3dcdf',
          '& .MuiMenuItem-root': {
            '&:hover': { bgcolor: oscuro ? '#1a456f' : '#e3eaec' },
            '&.Mui-selected': {
              bgcolor: oscuro ? '#1f5080' : '#dbe4e7',
              fontWeight: 600,
              '&:hover': { bgcolor: oscuro ? '#1f5080' : '#dbe4e7' },
            },
          },
        };
      },
    },
  },
} as const;
