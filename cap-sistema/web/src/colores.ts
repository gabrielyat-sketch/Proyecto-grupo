import { alpha, useTheme } from '@mui/material/styles';
import { ARMAZON } from './tema';

/**
 * Los colores de accion, ya resueltos para el modo que se esta pintando.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  QUE PROBLEMA RESUELVE
 * ─────────────────────────────────────────────────────────────────────────
 * Media docena de pantallas importaban `PRIMARIO`, `ERROR` o `ARMAZON`
 * directamente del tema y los escribian en el `sx`. Eso funcionaba cuando solo
 * habia modo claro: son los tonos del modo claro.
 *
 * Con el modo oscuro dejaron de funcionar, y de la peor manera —no se rompen,
 * se desvanecen—:
 *
 *   - `PRIMARIO` es un azul medio pensado para fondo crema. Sobre el navy de
 *     noche queda casi del mismo valor que el fondo.
 *   - Y lo que de verdad desaparece son los TINTES: un boton con
 *     `alpha(PRIMARIO, .08)` encima del navy no se distingue del navy. Es lo
 *     que paso con los botones de atender de la sala de espera.
 *   - `ARMAZON` es el azul oscuro del marco. De noche es mas oscuro que el
 *     fondo sobre el que se dibuja.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE UN GANCHO Y NO CONSTANTES NUEVAS
 * ─────────────────────────────────────────────────────────────────────────
 * Porque el valor depende del tema que este activo, y eso solo se sabe dentro
 * de un componente. Cuatro de los cinco ya viven en la paleta de MUI y cambian
 * solos con el modo; este gancho los junta con el quinto —el del armazon, que
 * MUI no tiene— para que una pantalla pida «el color de lo principal» y no «el
 * azul #0b6bb5».
 */

/** El azul del marco cuando el fondo es el navy de noche. */
const ARMAZON_OSCURO = '#7fb6dd';

export interface ColoresDeAccion {
  /** Lo principal: guardar, buscar, atender, entregar. */
  principal: string;
  /** Lo que no tiene vuelta atras: borrar, dar de baja, lo urgente. */
  peligro: string;
  /** Lo que salio bien, y lo que CREA algo nuevo. */
  exito: string;
  /** Lo que hay que mirar antes de que sea un problema. */
  aviso: string;
  /** Lo que pertenece al armazon: cerrar, volver, lo que no es una accion. */
  armazon: string;
}

export function usarColores(): ColoresDeAccion {
  const tema = useTheme();
  return {
    principal: tema.palette.primary.main,
    peligro: tema.palette.error.main,
    exito: tema.palette.success.main,
    aviso: tema.palette.warning.main,
    armazon: tema.palette.mode === 'dark' ? ARMAZON_OSCURO : ARMAZON,
  };
}

/**
 * El color que tiene sentido para un tinte de fondo.
 *
 * Los tintes del modo claro van al 8 % y se ven porque el fondo es crema. Sobre
 * el navy, el 8 % de cualquier cosa es navy. De noche hacen falta tres veces
 * mas para que el ojo registre que ahi hay algo.
 */
export function usarTinte(): (color: string, fuerza?: 'suave' | 'fuerte') => string {
  const tema = useTheme();
  const oscuro = tema.palette.mode === 'dark';
  return (color, fuerza = 'suave') => {
    if (fuerza === 'fuerte') return alpha(color, oscuro ? 0.34 : 0.16);
    return alpha(color, oscuro ? 0.2 : 0.08);
  };
}
