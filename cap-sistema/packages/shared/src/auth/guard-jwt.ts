import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CLAVE_PUBLICO } from './decoradores';
import { PeticionAutenticada, Rol, UsuarioAutenticado } from './roles';

/**
 * Valida el JWT y adjunta el usuario a la peticion.
 *
 * DEFENSA EN PROFUNDIDAD: el gateway ya valida el token, y aun asi cada
 * microservicio lo vuelve a validar con este guard. Si un atacante alcanza la
 * red interna, saltarse Nginx no le sirve de nada.
 *
 * Ver arquitectura-cap-purulha.md §10.1
 */
@Injectable()
export class GuardJwt implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) return true;

    const peticion = contexto.switchToHttp().getRequest<PeticionAutenticada>();
    const token = GuardJwt.extraerToken(peticion);
    if (!token) {
      throw new UnauthorizedException('No se recibio un token de acceso.');
    }

    let contenido: Record<string, unknown>;
    try {
      contenido = await this.jwt.verifyAsync(token);
    } catch {
      // Mensaje deliberadamente generico: distinguir "expirado" de "invalido"
      // le da informacion util a quien esta probando tokens.
      throw new UnauthorizedException('Token de acceso invalido o expirado.');
    }

    const usuario = GuardJwt.aUsuario(contenido);
    if (!usuario) {
      throw new UnauthorizedException('El token no contiene los datos esperados.');
    }

    peticion.usuario = usuario;
    return true;
  }

  private static extraerToken(peticion: PeticionAutenticada): string | undefined {
    const cabecera = peticion.headers?.authorization;
    const valor = Array.isArray(cabecera) ? cabecera[0] : cabecera;
    if (!valor) return undefined;
    const [esquema, token] = valor.split(' ');
    return esquema?.toLowerCase() === 'bearer' && token ? token : undefined;
  }

  private static aUsuario(c: Record<string, unknown>): UsuarioAutenticado | null {
    const id = c.sub ?? c.id;
    const rol = c.rol;
    if (typeof id !== 'string' || typeof rol !== 'string') return null;
    if (!Object.values(Rol).includes(rol as Rol)) return null;
    return {
      id,
      usuario: typeof c.usuario === 'string' ? c.usuario : '',
      rol: rol as Rol,
      sesionId: typeof c.sesionId === 'string' ? c.sesionId : '',
      mfaVerificado: c.mfaVerificado === true,
    };
  }
}
