import { useCallback, useSyncExternalStore } from 'react';
import { almacenSesion, type Perfil } from '../../api';

const suscribir = (f: () => void) => almacenSesion.suscribir(f);
const leer = () => almacenSesion.obtener();

/**
 * La sesion vive fuera de React —el middleware del cliente de API la necesita
 * antes de cada peticion, y ahi no hay componentes— pero los componentes deben
 * re-renderizarse cuando cambia.
 *
 * `useSyncExternalStore` es exactamente eso: React se suscribe al almacen y no
 * hay dos copias del estado que puedan desincronizarse.
 */
export function usarSesion(): {
  usuario: Perfil | null;
  autenticado: boolean;
  cerrar: () => void;
} {
  const sesion = useSyncExternalStore(suscribir, leer, leer);
  const cerrar = useCallback(() => almacenSesion.limpiar(), []);

  return {
    usuario: sesion?.usuario ?? null,
    autenticado: sesion !== null,
    cerrar,
  };
}
