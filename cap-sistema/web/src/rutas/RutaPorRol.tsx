import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usarSesion } from '../modulos/sesion/contexto';
import { puedeEntrar } from '../navegacion/menu';

/**
 * Deja pasar solo si el rol tiene esa opcion en su menu.
 *
 * Cubre el caso de escribir la ruta a mano. Igual que la otra guarda, esto NO
 * es el control de acceso —el backend responde 403 de todos modos— pero evita
 * pintar una pantalla que solo va a mostrar errores.
 */
export function RutaPorRol({ ruta, children }: { ruta: string; children: ReactNode }) {
  const { usuario } = usarSesion();

  if (!puedeEntrar(usuario?.rol, ruta)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
