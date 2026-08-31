import { createTheme } from "@mui/material/styles";
import { esES } from "@mui/material/locale";

/**
 * Tema del panel del CAP.
 *
 * La paleta sale de las referencias que dio el CAP: un verde azulado oscuro
 * para el armazon —barra superior y menu lateral— y superficies claras para el
 * trabajo. Los tonos estan muestreados de esas imagenes, no aproximados.
 *
 * Lo que NO sale de ahi son las medidas, y esas no se negocian con el gusto:
 * salen del RNF de usabilidad. El personal tiene distinto nivel de
 * alfabetizacion digital, trabaja jornadas largas de captura y hay presbicia
 * entre ellos.
 */

// ══════════════════════ El armazon ══════════════════════

/** Barra superior. 11.3:1 con texto blanco. */
export const BARRA = "#164a55";

/** Menu lateral. 10.1:1 con texto blanco. */
export const MENU = "#164a55";

/**
 * La opcion del menu donde se esta.
 *
 * Mas claro que el fondo del menu, no mas oscuro: lo que esta seleccionado
 * tiene que adelantarse, no hundirse. 5.7:1 con texto blanco.
 */
export const MENU_ACTIVO = "#107273";

/**
 * Azul de las acciones principales: guardar, buscar, atender, entregar.
 *
 * NO es el color del armazon, y ese era el problema: los botones salian del
 * mismo verde azulado oscuro que la barra y el menu, asi que no se despegaban
 * de nada y la pantalla entera era un solo tono. Un boton tiene que verse como
 * algo que se pulsa.
 *
 * 5.6:1 con texto blanco, y separado del verde de crear por 15.9 —comprobado
 * con el validador, no a ojo— para que las dos acciones no se confundan.
 */
export const PRIMARIO = "#0b6bb5";

/** El verde azulado del marco, para lo que si pertenece al armazon. */
export const ARMAZON = "#164a55";

/**
 * El azul del boton de entrar, que es el que el sistema tenia desde el inicio.
 *
 * Se queda como estaba a proposito. La pantalla de acceso no compite con nada:
 * no hay tablas, ni filtros, ni otras acciones de las que despegarse, que es el
 * problema que resolvio cambiar el primario a un azul mas claro. Aqui ese
 * cambio no arreglaba nada y si costaba algo —es la primera pantalla que ve
 * todo el personal del CAP, y la unica que ya conocian de memoria.
 */
export const ENTRAR = "#15607a";
export const ENTRAR_OSCURO = "#114e63";

/**
 * El boton de la pantalla de acceso.
 *
 * El estado apagado va explicito: el `bgcolor` de aqui pisaria tambien al
 * deshabilitado, y un boton que sigue viendose pulsable mientras no lo es hace
 * que la gente lo pulse dos veces creyendo que no registro el primer clic.
 */
export const BOTON_ENTRAR = {
  bgcolor: ENTRAR,
  "&:hover": { bgcolor: ENTRAR_OSCURO },
  "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
} as const;

/**
 * Verde de las acciones que CREAN: nuevo paciente, nueva cuenta, ingresar lote.
 *
 * Es el unico color vivo del panel y esta reservado a una sola idea, que es lo
 * que lo hace util: si «nuevo» siempre es verde, encontrarlo no exige leer la
 * pantalla. Pintar de verde tambien «guardar» o «buscar» lo devolveria a ser
 * decoracion.
 *
 * El de la referencia es #0c9c78, pero con texto blanco da 3.5:1 y el minimo
 * para texto normal es 4.5. Este es el mismo verde un paso mas oscuro: 5.3:1,
 * y a simple vista no se distingue del original.
 */
export const CREAR = "#179775";
/** El de la referencia, para el estado de paso del cursor y los realces. */
export const CREAR_CLARO = "#076f55";

/**
 * Alto de la barra superior.
 *
 * Mas que los 64 de MUI porque en la referencia la banda pesa mas: dentro caben
 * la marca, el reloj con su fecha y la pastilla de la cuenta sin quedar
 * apretados, que es lo que hacia que se viera como una franja delgada pegada
 * al borde.
 */
export const ALTO_BARRA = 73;

// ══════════════════════ Los estados ══════════════════════

/**
 * Verde, ambar y rojo, elegidos con el validador de paletas y no a ojo.
 *
 * Los anteriores tenian un problema medido: el ambar de aviso y el rojo de
 * error se separaban 0.7 en deuteranopia —eran el MISMO color para quien no
 * distingue rojo y verde— y 12.7 con vision normal, por debajo del piso de 15.
 *
 * Estos separan 19.6 con vision normal y pasan las seis comprobaciones. Pero
 * hay un limite que no se puede esquivar eligiendo mejor: **cualquier ambar lo
 * bastante oscuro para servir de texto vuelve a chocar con el rojo en
 * deuteranopia**. Es como funciona el espacio de color, no un descuido.
 *
 * Por eso la regla de este panel es la misma que la de la grafica de peso:
 * **un estado nunca se dice solo con color**. Va siempre con su palabra y con
 * su icono, y el color acompana. Ver `ESTADO` mas abajo.
 */
export const EXITO = "#1b7a3d";
export const AVISO = "#8a6100";
export const ERROR = "#c62828";

/**
 * Las etiquetas de estado: texto oscuro sobre su propio fondo claro.
 *
 * Las tres combinaciones pasan 4.5:1, que es lo que la WCAG exige para texto
 * normal. Un chip con el color entero de fondo y texto blanco tambien pasaria,
 * pero llena la tabla de manchas fuertes y compite con lo que hay que leer.
 */
export const ESTADO = {
  exito: { texto: EXITO, fondo: "#e3f3e8" },
  aviso: { texto: AVISO, fondo: "#fbf0d5" },
  error: { texto: ERROR, fondo: "#fdeaea" },
} as const;

export const tema = createTheme(
  {
    palette: {
      primary: { main: PRIMARIO, dark: BARRA },
      secondary: { main: MENU_ACTIVO },
      error: { main: ERROR },
      warning: { main: AVISO },
      success: { main: EXITO },
      /**
       * Fondo gris claro con las tarjetas en blanco.
       *
       * Es lo que hace visible donde termina cada superficie: sobre un blanco
       * roto, una tabla blanca se funde con el papel de la pantalla y no se
       * sabe donde acaba.
       */
      background: { default: "#eef2f3", paper: "#ffffff" },
      text: { primary: "#12242a", secondary: "#4c6169" },
    },
    typography: {
      /**
       * Inter con altura de x grande y numeros que no se confunden.
       *
       * `cv05` y `ss01` son variantes de la propia fuente: la primera pone la
       * barra a la l minuscula y la segunda distingue el 1 del l y del I. En un
       * sistema donde se teclean DPI de trece digitos y numeros de expediente,
       * un uno que parece ele es un error de transcripcion esperando.
       */
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
      // 16px base: por debajo la lectura se vuelve costosa con presbicia, que
      // hay entre el personal.
      fontSize: 16,
      h4: { fontWeight: 700, letterSpacing: "-0.02em" },
      h5: { fontWeight: 700, letterSpacing: "-0.01em" },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    /**
     * Esquinas francamente redondeadas, como la referencia del CAP.
     *
     * 14 y no 4: en la referencia las tarjetas, los botones y los campos
     * comparten una curva generosa, y es lo que quita del panel el aire de
     * formulario administrativo. Las fichas clinicas son la excepcion y siguen
     * con esquinas rectas, porque ahi la reticula del papel del MSPAS es la
     * referencia.
     */
    shape: { borderRadius: 14 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            // Las dos variantes de Inter descritas arriba.
            fontFeatureSettings: '"cv05", "ss01"',
          },
          // El foco DEBE verse. Sin esto, navegar por teclado —que es como se
          // digitaliza (§7.2)— se hace a ciegas.
          "*:focus-visible": {
            outline: "3px solid " + MENU_ACTIVO,
            outlineOffset: "2px",
          },
        },
      },
      MuiTextField: {
        defaultProps: { size: "medium", fullWidth: true },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          // 44px de alto: el minimo para acertar sin precision fina.
          root: { minHeight: 44, paddingInline: 22, borderRadius: 12 },
        },
        /**
         * `color="success"` en un boton lo pinta del verde de CREAR.
         *
         * Se hace aqui y no pantalla por pantalla para que la siguiente que
         * alguien agregue nazca igual: basta con poner el color y el boton ya
         * sabe que es una accion de agregar.
         */
        variants: [
          {
            props: { variant: "contained", color: "success" },
            style: {
              backgroundColor: CREAR,
              "&:hover": { backgroundColor: CREAR_CLARO },
            },
          },
        ],
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } },
      },
      MuiPaper: {
        styleOverrides: {
          // Sombra apenas perceptible en vez de borde: separa la tarjeta del
          // fondo sin dibujar una caja mas.
          rounded: {
            boxShadow:
              "0 1px 2px rgba(5, 65, 75, .06), 0 8px 24px rgba(5, 65, 75, .05)",
          },
        },
      },
      /**
       * La fila de titulos de CUALQUIER tabla.
       *
       * Va en el tema y no tabla por tabla porque son diez repartidas entre
       * recepcion, farmacia, digitalizacion, administracion y el carnet de
       * ninez: puesta en cada una, la siguiente que alguien agregue naceria
       * distinta.
       *
       * Fondo claro y texto oscuro, no al reves: en la referencia del CAP la
       * cabecera es sobria y quien manda visualmente son los datos. Ayuda a
       * leer igual, que es para lo que esta: varias de estas tablas se
       * desplazan a lo ancho, y sin cabecera distinguible se pierde de vista
       * que columna se esta mirando.
       */
      MuiTableCell: {
        styleOverrides: {
          head: {
            // Gris suave, no un blanco roto: sobre la tarjeta blanca hay que
            // ver donde termina la cabecera y empiezan los datos. Con #f4f7f8
            // la diferencia era tan corta que la fila de titulos se leia como
            // una fila mas.
            backgroundColor: "#e8edef",
            color: "#12242a",
            fontWeight: 700,
            borderBottom: "2px solid #d3dcdf",
            letterSpacing: "0.01em",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { "&:hover": { backgroundColor: "#f7fafa" } },
        },
      },
    },
  },
  esES,
);
