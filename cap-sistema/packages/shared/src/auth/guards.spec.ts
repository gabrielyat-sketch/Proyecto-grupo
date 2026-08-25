import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { GuardJwt } from './guard-jwt';
import { GuardRoles } from './guard-roles';
import { CLAVE_PUBLICO, CLAVE_ROLES } from './decoradores';
import { Rol } from './roles';

const SECRETO = 'secreto-solo-para-pruebas';

function contextoCon(peticion: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => peticion }),
    getHandler: () => function manejador() {},
    getClass: () => class Controlador {},
  } as unknown as ExecutionContext;
}

function reflectorCon(valores: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (clave: string) => valores[clave],
  } as unknown as Reflector;
}

describe('GuardJwt', () => {
  const jwt = new JwtService({ secret: SECRETO, signOptions: { expiresIn: '15m' } });

  const tokenValido = () =>
    jwt.sign({ sub: 'u-1', usuario: 'jperez', rol: Rol.MEDICO, sesionId: 's-1' });

  it('deja pasar un endpoint marcado como publico sin token', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({ [CLAVE_PUBLICO]: true }));
    await expect(guard.canActivate(contextoCon({ headers: {} }))).resolves.toBe(true);
  });

  it('rechaza una peticion sin cabecera Authorization', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({}));
    await expect(guard.canActivate(contextoCon({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un esquema distinto de Bearer', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({}));
    const ctx = contextoCon({ headers: { authorization: 'Basic ' + tokenValido() } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const otro = new JwtService({ secret: 'otro-secreto' });
    const guard = new GuardJwt(jwt, reflectorCon({}));
    const token = otro.sign({ sub: 'u-1', rol: Rol.MEDICO });
    const ctx = contextoCon({ headers: { authorization: 'Bearer ' + token } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza un token ya expirado', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({}));
    const token = jwt.sign({ sub: 'u-1', rol: Rol.MEDICO }, { expiresIn: '-1s' });
    const ctx = contextoCon({ headers: { authorization: 'Bearer ' + token } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(/invalido o expirado/);
  });

  it('rechaza un token con un rol que no existe en el sistema', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({}));
    const token = jwt.sign({ sub: 'u-1', rol: 'SUPERUSUARIO' });
    const ctx = contextoCon({ headers: { authorization: 'Bearer ' + token } });
    await expect(guard.canActivate(ctx)).rejects.toThrow(/datos esperados/);
  });

  it('adjunta el usuario a la peticion cuando el token es valido', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({}));
    const peticion: Record<string, unknown> = {
      headers: { authorization: 'Bearer ' + tokenValido() },
    };
    await expect(guard.canActivate(contextoCon(peticion))).resolves.toBe(true);
    expect(peticion.usuario).toMatchObject({ id: 'u-1', usuario: 'jperez', rol: Rol.MEDICO });
  });

  it('marca mfaVerificado en false si el token no lo trae', async () => {
    const guard = new GuardJwt(jwt, reflectorCon({}));
    const peticion: Record<string, unknown> = {
      headers: { authorization: 'Bearer ' + tokenValido() },
    };
    await guard.canActivate(contextoCon(peticion));
    expect((peticion.usuario as { mfaVerificado: boolean }).mfaVerificado).toBe(false);
  });
});

describe('GuardRoles', () => {
  const medico = { id: 'u-1', usuario: 'jperez', rol: Rol.MEDICO, sesionId: 's', mfaVerificado: false };
  const director = { id: 'u-2', usuario: 'dir', rol: Rol.DIRECTOR, sesionId: 's', mfaVerificado: false };

  it('deja pasar un endpoint publico', () => {
    const guard = new GuardRoles(reflectorCon({ [CLAVE_PUBLICO]: true }));
    expect(guard.canActivate(contextoCon({}))).toBe(true);
  });

  it('rechaza si no hay usuario autenticado', () => {
    const guard = new GuardRoles(reflectorCon({}));
    expect(() => guard.canActivate(contextoCon({}))).toThrow(ForbiddenException);
  });

  it('deja pasar a un rol permitido', () => {
    const guard = new GuardRoles(reflectorCon({ [CLAVE_ROLES]: [Rol.MEDICO, Rol.ENFERMERIA] }));
    expect(guard.canActivate(contextoCon({ usuario: medico }))).toBe(true);
  });

  it('rechaza a un rol no permitido', () => {
    const guard = new GuardRoles(reflectorCon({ [CLAVE_ROLES]: [Rol.FARMACIA] }));
    expect(() => guard.canActivate(contextoCon({ usuario: medico }))).toThrow(/no tiene acceso/);
  });

  it('sin @Roles basta con estar autenticado', () => {
    const guard = new GuardRoles(reflectorCon({}));
    expect(guard.canActivate(contextoCon({ usuario: medico }))).toBe(true);
  });

  it('bloquea a un rol con MFA obligatorio que no completo el segundo factor', () => {
    const guard = new GuardRoles(reflectorCon({ [CLAVE_ROLES]: [Rol.DIRECTOR] }));
    expect(() => guard.canActivate(contextoCon({ usuario: director }))).toThrow(/segundo factor/);
  });

  it('deja pasar al director cuando si verifico el MFA', () => {
    const guard = new GuardRoles(reflectorCon({ [CLAVE_ROLES]: [Rol.DIRECTOR] }));
    const ctx = contextoCon({ usuario: { ...director, mfaVerificado: true } });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
