import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usarSesion } from '../modulos/sesion/contexto';

export const RUTA_ACCESO = '/acceso';
export const RUTA_CONTRASENA = '/contrasena';

/**
 * Deja pasar solo con sesion abierta y contrasena definitiva.
 *
 * Esto es comodidad de navegacion, NO seguridad. Quien no tenga un token valido
 * recibe 401 de cada servicio aunque logre pintar la pantalla: el control real
 * esta en el guard del backend, que revalida firma y rol en cada peticion
 * (arquitectura §10.1). Un guard de frontend solo evita mostrar pantallas
 * vacias.
 */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const { autenticado, usuario } = usarSesion();
  const ubicacion = useLocation();

  if (!autenticado) {
    // Se recuerda a donde iba para volver ahi despues de entrar.
    return <Navigate to={RUTA_ACCESO} replace state={{ desde: ubicacion.pathname }} />;
  }

  // La contrasena temporal la conoce quien creo la cuenta. Mientras siga en
  // uso, la sesion no es de una sola persona: no puede entrar al expediente de
  // nadie. Se retiene aqui, no en cada pantalla, para que no quede un hueco al
  // agregar la siguiente.
  if (usuario?.debeCambiarContrasena && ubicacion.pathname !== RUTA_CONTRASENA) {
    return <Navigate to={RUTA_CONTRASENA} replace />;
  }

  return <>{children}</>;
}
