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
 * El texto queda en el color normal sobre #f2f5f6, muy por encima del 4.5:1
 * que exige la WCAG, y la opcion elegida se marca ademas con el peso de la
 * letra: en gris sobre gris el color solo no bastaria para verla.
 */
export const MENU_FILTRO = {
  slotProps: {
    paper: {
      sx: {
        bgcolor: '#f2f5f6',
        border: '1px solid',
        borderColor: '#d3dcdf',
        '& .MuiMenuItem-root': {
          '&:hover': { bgcolor: '#e3eaec' },
          '&.Mui-selected': {
            bgcolor: '#dbe4e7',
            fontWeight: 600,
            '&:hover': { bgcolor: '#dbe4e7' },
          },
        },
      },
    },
  },
} as const;
