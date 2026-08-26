import { createTheme } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

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
      background: { default: '#f4f6f8', paper: '#ffffff' },
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
