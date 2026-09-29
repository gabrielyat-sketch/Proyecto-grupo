import { useEffect, useRef } from 'react';

/**
 * Registra un atajo de teclado global.
 *
 * Los atajos no son un lujo: el RNF de usabilidad exige captura por teclado sin
 * depender del raton en los formularios de uso frecuente (arquitectura §7.2).
 * En recepcion, con la fila de espera enfrente, cada viaje al raton cuesta.
 */
export function usarAtajo(
  tecla: string,
  accion: () => void,
  opciones: { control?: boolean } = { control: true },
): void {
  const ejecutar = useRef(accion);
  ejecutar.current = accion;

  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      // `key` puede venir sin definir: lo hacen los gestores de contrasenas y
      // algunas extensiones, que despachan eventos de teclado sinteticos. Sin
      // esta guarda, `toLowerCase()` reventaba y llenaba la consola de errores
      // en cada uno de esos eventos —ruido que tapa los fallos de verdad.
      if (typeof e.key !== 'string') return;
      if (e.key.toLowerCase() !== tecla.toLowerCase()) return;
      // metaKey para que tambien funcione en Mac, donde se usa Cmd.
      if (opciones.control && !(e.ctrlKey || e.metaKey)) return;
      // Se evita el atajo del navegador: Ctrl+K abre la barra de direcciones
      // en algunos, y ahi el usuario perderia lo que estaba haciendo.
      e.preventDefault();
      ejecutar.current();
    }

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [tecla, opciones.control]);
}
