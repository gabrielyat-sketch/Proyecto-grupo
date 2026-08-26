import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usarSesion } from '../modulos/sesion/contexto';

/**
 * Deja pasar solo con sesion abierta.
 *
 * Esto es comodidad de navegacion, NO seguridad. Quien no tenga un token valido
 * recibe 401 de cada servicio aunque logre pintar la pantalla: el control real
 * esta en el guard del backend, que revalida firma y rol en cada peticion
 * (arquitectura §10.1). Un guard de frontend solo evita mostrar pantallas
 * vacias.
 */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const { autenticado } = usarSesion();
  const ubicacion = useLocation();

  if (!autenticado) {
    // Se recuerda a donde iba para volver ahi despues de entrar.
    return <Navigate to="/acceso" replace state={{ desde: ubicacion.pathname }} />;
  }

  return <>{children}</>;
}
