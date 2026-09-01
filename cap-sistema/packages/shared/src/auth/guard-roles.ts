import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CLAVE_PUBLICO, CLAVE_ROLES } from './decoradores';
import { exigeMfa, PeticionAutenticada, Rol } from './roles';

/**
 * Verifica que el usuario tenga uno de los roles exigidos por el endpoint.
 *
 * Se ejecuta despues de GuardJwt. Ademas comprueba que los roles que exigen MFA
 * hayan completado el segundo factor: un token emitido a medio proceso de login
 * no debe alcanzar endpoints administrativos.
 */
@Injectable()
export class GuardRoles implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) return true;

    const rolesExigidos = this.reflector.getAllAndOverride<Rol[]>(CLAVE_ROLES, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    const peticion = contexto.switchToHttp().getRequest<PeticionAutenticada>();
    const usuario = peticion.usuario;

    if (!usuario) {
      throw new ForbiddenException('La peticion no tiene un usuario autenticado.');
    }

    if (exigeMfa(usuario.rol) && !usuario.mfaVerificado) {
      throw new ForbiddenException(
        'Este rol requiere autenticacion de segundo factor para operar.',
      );
    }

    // Sin @Roles(), basta con estar autenticado.
    if (!rolesExigidos || rolesExigidos.length === 0) return true;

    if (!rolesExigidos.includes(usuario.rol)) {
      throw new ForbiddenException('El rol ' + usuario.rol + ' no tiene acceso a esta operacion.');
    }
    return true;
  }
}
