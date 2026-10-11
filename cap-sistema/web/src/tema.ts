import { createTheme, type Theme } from "@mui/material/styles";
import { esES } from "@mui/material/locale";

/**
 * Tema del panel del CAP.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  DE DONDE SALEN LOS COLORES
 * ─────────────────────────────────────────────────────────────────────────
 * De las dos imagenes que dio el CAP, muestreadas pixel a pixel y no
 * aproximadas a ojo: «nuevos colores» da el armazon —el azul del menu, el
 * fondo del area de trabajo y las dos variantes claro y oscuro— y «Nuevo
 * diseno de las tarjetas» da los pasteles de los modulos y la crema sobre la
 * que viven.
 *
 * La combinacion viene de ahi: armazon azul, area de trabajo en CREMA —no en
 * blanco, que es lo que el CAP pidio expresamente— y tarjetas con su pastel
 * propio. El azul ordena y el crema descansa.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LO QUE NO SALE DE LAS IMAGENES
 * ─────────────────────────────────────────────────────────────────────────
 * El contraste del TEXTO. Ese no se negocia con el gusto: sale del RNF de
 * usabilidad —personal con distinto nivel de alfabetizacion digital, jornadas
 * largas de captura, presbicia entre ellos—.
 *
 * Por eso cada acento tiene dos valores y no uno. El pastel de la imagen pinta
 * la cinta de la tarjeta y la baldosa del icono, que son decoracion; el
 * subtitulo usa una version oscurecida del MISMO tono. En la imagen el
 * subtitulo va en el pastel, y sobre la crema eso da 2.2:1 —menos de la mitad
 * del 4.5:1 que la WCAG exige para texto—. A simple vista casi no se
 * distinguen; la diferencia es que uno se lee.
 */

// ══════════════════════ Los tres modos ══════════════════════

/** Claro, oscuro, o lo que diga el sistema operativo. */
export type ModoColor = "claro" | "oscuro" | "sistema";

// ══════════════════════ El armazon ══════════════════════

/**
 * El azul del menu lateral.
 *
 * El de la imagen es #0ca2ee, y con texto blanco encima da **2.83:1**: muy por
 * debajo del 4.5 que la WCAG exige, y el menu es texto que se lee todo el dia.
 * Este es el MISMO tono —199 grados, la misma saturacion— bajado hasta que el
 * blanco pasa: 4.77:1. Se sigue leyendo como el azul nuevo del CAP; lo que
 * cambia es que las etiquetas se ven.
 *
 * El vivo de la imagen no se pierde: vive en `MENU_REALCE`, que es el fondo de
 * la fila bajo el cursor y el de la cabecera.
 *
 * En oscuro el menu se hunde en el navy profundo de la imagen, porque un azul
 * vivo a pantalla completa de noche es justo lo que el modo oscuro evita.
 */
export const MENU_CLARO = "#097aae";
export const MENU_OSCURO = "#062c53";

/** El azul vivo de la imagen, para los realces del menu en modo claro. */
export const MENU_REALCE = "#0ca2ee";

/** La opcion donde se esta. Cian brillante en claro, azul en oscuro. */
export const MENU_ACTIVO_CLARO = "#2de6fa";
export const MENU_ACTIVO_OSCURO = "#0b9eeb";

/**
 * El texto de la opcion activa en modo claro va OSCURO, no blanco.
 *
 * El cian #2de6fa con blanco encima da 1.5:1 —ilegible—. Con este navy da
 * 9.8:1. Es el unico sitio del menu donde el texto se invierte, y es porque el
 * fondo se aclara tanto que el blanco deja de servir.
 */
export const MENU_ACTIVO_TEXTO_CLARO = "#06283d";

/** El crema del area de trabajo. Lo pidio el CAP: ni blanco ni gris frio. */
export const FONDO_CLARO = "#f4efe6";
/** La superficie de las tarjetas sobre ese crema. */
export const PAPEL_CLARO = "#fffaf3";

/** El navy del area de trabajo de noche, y su superficie. */
export const FONDO_OSCURO = "#091638";
export const PAPEL_OSCURO = "#0d2a4e";

/** El azul de los titulos. Muestreado: #09136c. */
export const TITULO_CLARO = "#0b1a63";
export const TITULO_OSCURO = "#eaf3ff";

/**
 * Azul de las acciones principales: guardar, buscar, atender, entregar.
 *
 * Un boton tiene que verse como algo que se pulsa, y por eso NO es el color del
 * armazon: si los botones salen del mismo tono que el menu, no se despegan de
 * nada y la pantalla entera es un solo color.
 */
export const PRIMARIO = "#0b6bb5";
export const PRIMARIO_OSCURO = "#42b6f5";

/** El azul del marco, para lo que si pertenece al armazon. */
export const ARMAZON = "#0b3d6b";

/** El azul del boton de entrar, que es el que el sistema tenia desde el inicio. */
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
 * Reservado a una sola idea, que es lo que lo hace util: si «nuevo» siempre es
 * verde, encontrarlo no exige leer la pantalla. Pintar de verde tambien
 * «guardar» o «buscar» lo devolveria a ser decoracion.
 */
export const CREAR = "#179775";
/** El mismo, para el estado de paso del cursor y los realces. */
export const CREAR_CLARO = "#076f55";

/**
 * Cuanto baja un elemento pegajoso desde el borde de arriba.
 *
 * Era el alto de la barra superior. La barra ya no existe —el CAP pidio
 * quitarla y el menu lateral absorbio lo que llevaba—, asi que el encabezado de
 * una ficha se pega al borde mismo del area de trabajo. Sigue siendo una
 * constante y no un cero escrito en cinco sitios: si manana vuelve a haber algo
 * fijo arriba, se cambia aqui.
 */
export const TOPE_PEGAJOSO = 0;

// ══════════════════════ Los acentos de los modulos ══════════════════════

/**
 * El acento de un modulo: los tres valores que usa la tarjeta.
 *
 * Los nombres y los numeros salen del CSS que entrego el CAP, no de una
 * interpretacion: `pastel` es su `--accent`, `suave` su `--accent-soft` y
 * `sombra` su `--shadow`.
 */
export interface Acento {
  /** `--accent`: el filo de arriba, el icono y el subtitulo. */
  pastel: string;
  /** `--accent-soft`: la baldosa del icono y el final del degradado. */
  suave: string;
  /** `--shadow`: la sombra solida que hace de franja bajo la tarjeta. */
  sombra: string;
  /** El mismo tono oscurecido, para cuando hace falta que un texto se lea. */
  texto: string;
  /** El mismo tono aclarado, para cuando el fondo es el navy de noche. */
  textoOscuro: string;
}

/**
 * Los cinco acentos.
 *
 * Menta, rosa y naranja vienen tal cual del CSS del CAP. El cian y la lavanda
 * se construyeron con la misma receta para los modulos que ese CSS no cubria:
 * el suave es el acento a un 79 % hacia el blanco y la sombra, el mismo tono
 * apagado y bajado.
 *
 * Son cinco y no diez a proposito: con diez tonos distintos ninguno se
 * reconoce, y lo que hace util el color de una fila es que sea SIEMPRE el
 * mismo, no que ninguna se repita.
 */
export const ACENTOS = {
  menta: {
    pastel: "#65d5b4",
    suave: "#dff6ed",
    sombra: "#b4dacb",
    texto: "#0f7a5e",
    textoOscuro: "#6fe0c0",
  },
  rosa: {
    pastel: "#ed91a7",
    suave: "#fbe6eb",
    sombra: "#e6c0c5",
    texto: "#b0405a",
    textoOscuro: "#f7a9bb",
  },
  naranja: {
    pastel: "#f3a17b",
    suave: "#ffeadf",
    sombra: "#e8c5af",
    texto: "#a9521f",
    textoOscuro: "#f8b894",
  },
  cian: {
    pastel: "#62cacb",
    suave: "#dcf2f2",
    sombra: "#aed3d3",
    texto: "#0e6f78",
    textoOscuro: "#6fdbdd",
  },
  lavanda: {
    pastel: "#b2a6e8",
    suave: "#eae6fa",
    sombra: "#c8c2de",
    texto: "#5a44a8",
    textoOscuro: "#c3b7f2",
  },
} as const satisfies Record<string, Acento>;

export type NombreAcento = keyof typeof ACENTOS;

// ══════════════════════ Los estados ══════════════════════

/**
 * Verde, ambar y rojo, elegidos con el validador de paletas y no a ojo.
 *
 * Hay un limite que no se esquiva eligiendo mejor: **cualquier ambar lo bastante
 * oscuro para servir de texto vuelve a chocar con el rojo en deuteranopia**. Es
 * como funciona el espacio de color, no un descuido.
 *
 * Por eso la regla de este panel es la misma que la de la grafica de peso: **un
 * estado nunca se dice solo con color**. Va siempre con su palabra y con su
 * icono, y el color acompana.
 */
export const EXITO = "#1b7a3d";
export const AVISO = "#8a6100";
export const ERROR = "#c62828";

/**
 * Las etiquetas de estado: texto oscuro sobre su propio fondo claro.
 *
 * Las tres combinaciones pasan 4.5:1. Un chip con el color entero de fondo y
 * texto blanco tambien pasaria, pero llena la tabla de manchas fuertes y
 * compite con lo que hay que leer.
 */
export const ESTADO = {
  exito: { texto: EXITO, fondo: "#e3f3e8" },
  aviso: { texto: AVISO, fondo: "#fbf0d5" },
  error: { texto: ERROR, fondo: "#fdeaea" },
} as const;

// ══════════════════════ El tema ══════════════════════

/**
 * Construye el tema para un modo concreto.
 *
 * Toma «claro» u «oscuro» ya resueltos: quien decide que significa «sistema» es
 * `ProveedorModoColor`, que escucha la preferencia del sistema operativo. Aqui
 * llega la respuesta, no la pregunta.
 */
export function crearTema(modo: "claro" | "oscuro"): Theme {
  const oscuro = modo === "oscuro";

  return createTheme(
    {
      palette: {
        mode: oscuro ? "dark" : "light",
        primary: { main: oscuro ? PRIMARIO_OSCURO : PRIMARIO, dark: ARMAZON },
        secondary: { main: oscuro ? MENU_ACTIVO_OSCURO : "#0e7490" },
        error: { main: oscuro ? "#f26a6a" : ERROR },
        warning: { main: oscuro ? "#e0a93a" : AVISO },
        success: { main: oscuro ? "#4cc27a" : EXITO },
        /**
         * Crema de dia, navy de noche. En los dos casos la tarjeta se separa
         * del suelo por su tono, no por un borde: sobre un blanco roto una
         * tabla blanca se funde con el papel de la pantalla y no se sabe donde
         * acaba.
         */
        background: {
          default: oscuro ? FONDO_OSCURO : FONDO_CLARO,
          paper: oscuro ? PAPEL_OSCURO : PAPEL_CLARO,
        },
        text: {
          primary: oscuro ? "#e8f1fb" : "#17233f",
          secondary: oscuro ? "#9db4d0" : "#5b6b85",
        },
        divider: oscuro ? "rgba(146, 180, 220, 0.18)" : "rgba(32, 52, 88, 0.12)",
      },
      typography: {
        /**
         * Inter con altura de x grande y numeros que no se confunden.
         *
         * `cv05` y `ss01` son variantes de la propia fuente: la primera pone la
         * barra a la l minuscula y la segunda distingue el 1 del l y del I. En
         * un sistema donde se teclean DPI de trece digitos, un uno que parece
         * ele es un error de transcripcion esperando.
         */
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        // 16px base: por debajo la lectura se vuelve costosa con presbicia, que
        // hay entre el personal.
        fontSize: 16,
        h4: {
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: oscuro ? TITULO_OSCURO : TITULO_CLARO,
        },
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
              // Que los desplegables del navegador y la barra de desplazamiento
              // nazcan del color correcto sin pintarlos uno a uno.
              colorScheme: oscuro ? "dark" : "light",
            },
            // El foco DEBE verse. Sin esto, navegar por teclado —que es como se
            // digitaliza (§7.2)— se hace a ciegas.
            "*:focus-visible": {
              outline: "3px solid " + (oscuro ? MENU_ACTIVO_OSCURO : PRIMARIO),
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
            // fondo sin dibujar una caja mas. De noche la sombra no se ve, asi
            // que ahi el trabajo lo hace el tono del papel.
            rounded: {
              boxShadow: oscuro
                ? "0 1px 2px rgba(0, 0, 0, .4)"
                : "0 1px 2px rgba(32, 52, 88, .06), 0 8px 24px rgba(32, 52, 88, .05)",
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
         */
        MuiTableCell: {
          styleOverrides: {
            head: {
              // Sobre la tarjeta hay que ver donde termina la cabecera y
              // empiezan los datos; con una diferencia mas corta la fila de
              // titulos se lee como una fila mas.
              backgroundColor: oscuro ? "#12395f" : "#ece3d4",
              color: oscuro ? "#e8f1fb" : "#17233f",
              fontWeight: 700,
              borderBottom: "2px solid " + (oscuro ? "#1b4a76" : "#ddd0ba"),
              letterSpacing: "0.01em",
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              "&:hover": {
                backgroundColor: oscuro ? "rgba(146, 180, 220, 0.06)" : "#f8f2e8",
              },
            },
          },
        },
      },
    },
    esES,
  );
}

/**
 * El tema claro, ya construido.
 *
 * Existe para los sitios que necesitan UN tema sin preguntar por el modo: las
 * pruebas que montan una pantalla suelta y la pantalla de acceso, que es la
 * unica que no vive dentro del proveedor.
 */
export const tema = crearTema("claro");
