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
