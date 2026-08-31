import { useSyncExternalStore } from 'react';

function suscribir(avisar: () => void): () => void {
  window.addEventListener('online', avisar);
  window.addEventListener('offline', avisar);
  return () => {
    window.removeEventListener('online', avisar);
    window.removeEventListener('offline', avisar);
  };
}

/**
 * Si el navegador tiene red.
 *
 * Es la unica senal de conexion que existe de verdad en el panel: dice si esta
 * computadora puede hablar con los servicios, no si el servidor esta vivo ni si
 * otras personas estan dentro del sistema.
 *
 * Importa en el CAP mas que en otros sitios. La red del centro se cae a ratos,
 * y cuando pasa el panel sigue viendose normal: los formularios se llenan, los
 * botones responden, y el error solo aparece al guardar, con la ficha ya
 * escrita. Un indicador visible avisa antes de llegar a ese punto.
 *
 * En el servidor no hay `navigator`, y por eso el tercer argumento devuelve
 * `true`: al pintar sin navegador se asume conectado, que es el estado normal.
 */
export function usarConexion(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );
}
