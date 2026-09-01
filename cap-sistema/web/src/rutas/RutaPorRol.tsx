import type { ReactNode } from 'react';
import { usarSesion } from '../modulos/sesion/contexto';
import { puedeEntrar } from '../navegacion/menu';
import { PaginaSinAcceso } from './PaginaNoDisponible';

/**
 * Deja pasar solo si el rol tiene esa opcion en su menu.
 *
 * Cubre el caso de escribir la ruta a mano. Igual que la otra guarda, esto NO
 * es el control de acceso —el backend responde 403 de todos modos— pero evita
 * pintar una pantalla que solo va a mostrar errores.
 */
export function RutaPorRol({ ruta, children }: { ruta: string; children: ReactNode }) {
  const { usuario } = usarSesion();

  /*
    Se DICE que no, en vez de mandar al inicio en silencio.

    Redirigir dejaba a quien escribia la direccion a mano —o seguia un enlace
    que le paso un companero— de golpe en el menu de inicio, sin saber si habia
    pulsado donde no era, si el sistema fallaba o si la pantalla ya no existia.
    Lo normal era volver a intentarlo dos o tres veces.
  */
  if (!puedeEntrar(usuario?.rol, ruta)) {
    return <PaginaSinAcceso />;
  }

  return <>{children}</>;
}
