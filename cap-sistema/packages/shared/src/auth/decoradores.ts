import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol, PeticionAutenticada, UsuarioAutenticado } from './roles';

export const CLAVE_PUBLICO = 'cap:publico';
export const CLAVE_ROLES = 'cap:roles';

/**
 * Marca un endpoint como accesible sin autenticacion.
 *
 * Se usa solo en healthchecks y en los endpoints que atiende el gateway
 * publico. Todo lo demas es privado por defecto: si alguien olvida poner un
 * guard, el endpoint queda cerrado, no abierto.
 */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/** Restringe un endpoint a los roles indicados. */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

/** Inyecta el usuario autenticado en un parametro del controlador. */
export const Usuario = createParamDecorator(
  (dato: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const peticion = ctx.switchToHttp().getRequest<PeticionAutenticada>();
    return dato ? peticion.usuario?.[dato] : peticion.usuario;
  },
);

/**
 * Inyecta la cabecera `Authorization` tal como llego, sin tocarla.
 *
 * El servicio de trazabilidad registra a nombre del USUARIO que origino la
 * accion, no del servicio que la ejecuta, y para eso necesita su token entero.
 * `@Usuario()` no sirve: devuelve el contenido ya verificado del token, no el
 * token, y volver a firmarlo desde el servicio produciria una bitacora que
 * prueba lo que el servicio dice, no lo que el usuario hizo.
 */
export const Autorizacion = createParamDecorator((_dato: unknown, ctx: ExecutionContext) => {
  const peticion = ctx.switchToHttp().getRequest<{ headers?: Record<string, unknown> }>();
  const cabecera = peticion.headers?.authorization;
  return typeof cabecera === 'string' ? cabecera : '';
});
