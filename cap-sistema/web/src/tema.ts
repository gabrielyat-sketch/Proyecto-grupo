import { createTheme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

/**
 * Verde azulado de los encabezados de pagina.
 *
 * Separa dos cosas que estaban del mismo color y no son lo mismo: el azul
 * queda para el armazon del panel —barra superior, cabeceras de tabla,
 * desplegables de filtro— y este verde azulado para las bandas de titulo. Al
 * abrir un modulo, el encabezado ya no se confunde con la barra de arriba.
 *
 * 6.0:1 con texto blanco.
 */
export const VERDE_AZULADO = '#136f63';

/**
 * Tema del panel del CAP.
 *
 * Las decisiones de aqui no son estéticas: salen del RNF de usabilidad. El personal
 * tiene distinto nivel de alfabetizacion digital y trabaja jornadas largas de captura,
 * a veces con luz de dia entrando a la sala.
 */
export const tema = createTheme(
  {
    palette: {
      // Azul institucional sobrio. El rojo queda RESERVADO para errores y alertas
      // clinicas: si se usa como color de marca, deja de comunicar urgencia.
      primary: { main: '#15607a' },
      secondary: { main: '#4a6572' },
      error: { main: '#b3261e' },
      warning: { main: '#8a5a00' },
      success: { main: '#1b5e20' },
      // Mas presente que un blanco roto: las tarjetas y las tablas son
      // blancas, y sobre un fondo casi blanco no se distinguian del papel de
      // la pantalla. Con este gris se ve donde termina cada superficie.
      background: { default: '#e7edf1', paper: '#ffffff' },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      // 16px base: por debajo de eso la lectura se vuelve costosa para usuarios
      // con presbicia, que son varios en el personal.
      fontSize: 16,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiTextField: {
        defaultProps: { size: 'medium', fullWidth: true },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          // 44px de alto: el minimo recomendado para acertar sin precision fina.
          root: { minHeight: 44, paddingInline: 20 },
        },
      },
      /**
       * La fila de titulos de CUALQUIER tabla, en el azul institucional.
       *
       * Va en el tema y no tabla por tabla porque son diez repartidas entre
       * recepcion, farmacia, digitalizacion, administracion y el carnet de
       * ninez: puesto en cada una, la siguiente tabla que alguien agregue
       * nacería distinta y habria que acordarse de copiarlo.
       *
       * Ayuda a leer, no solo a decorar. Varias de estas tablas se desplazan a
       * lo ancho en la pantalla de recepcion, y con la cabecera del mismo color
       * que las filas se pierde de vista cual columna se esta mirando.
       */
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: '#15607a',
            color: '#ffffff',
            fontWeight: 600,
            // La linea divisoria por defecto es gris sobre el azul: se ve como
            // una raya sucia bajo la cabecera.
            borderBottom: 'none',
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          // El foco DEBE verse. Sin esto, navegar por teclado —que es como se va a
          // digitalizar (§7.2)— se hace a ciegas.
          '*:focus-visible': {
            outline: '3px solid #15607a',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
  esES,
);
