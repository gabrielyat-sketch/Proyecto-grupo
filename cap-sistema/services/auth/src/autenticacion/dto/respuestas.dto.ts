import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '@cap/shared';

/**
 * Respuestas del modulo de autenticacion.
 *
 * Existen para que el contrato OpenAPI describa lo que el servicio DEVUELVE, no
 * solo lo que recibe. Sin esto el cliente generado tipa el envio y deja la
 * respuesta como `unknown`: alguien renombra un campo aqui, el frontend compila
 * igual, y el error aparece con el paciente enfrente.
 */
export class PerfilDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Nombre de usuario, siempre en minusculas.', example: 'jlopez' })
  usuario!: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol' })
  rol!: string;

  @ApiProperty({
    description: 'Si es true, el panel debe obligar al cambio antes de dejar trabajar.',
    example: false,
  })
  debeCambiarContrasena!: boolean;
}

export class PerfilPropioDto extends PerfilDto {
  @ApiProperty({ description: 'Segundo factor ya confirmado y en uso.' })
  mfaActivo!: boolean;
}

/** Login o verificacion de MFA completados: la sesion queda abierta. */
export class SesionAbiertaDto {
  @ApiProperty({ enum: [false], description: 'Discriminante: false significa que ya hay sesion.' })
  mfaRequerido!: false;

  @ApiProperty({ description: 'JWT de acceso. Vida corta; se renueva con el token de refresco.' })
  tokenAcceso!: string;

  @ApiProperty({ description: 'Token de refresco rotatorio. Reutilizarlo revoca toda la sesion.' })
  tokenRefresco!: string;

  @ApiProperty({ type: PerfilDto })
  usuario!: PerfilDto;
}

/**
 * El rol exige segundo factor: todavia NO hay sesion.
 *
 * `tokenParcial` se firma con una llave distinta a la de acceso, asi que no
 * sirve como credencial en ningun endpoint. Solo vale para /v1/auth/mfa/verificar.
 */
export class MfaRequeridoDto {
  @ApiProperty({ enum: [true], description: 'Discriminante: true significa que falta el segundo factor.' })
  mfaRequerido!: true;

  @ApiProperty({
    description: 'true cuando la cuenta aun no ha configurado el TOTP y debe hacerlo ahora.',
  })
  configuracionPendiente!: boolean;

  @ApiProperty({ description: 'Token de un solo uso para completar el login. No es un token de acceso.' })
  tokenParcial!: string;
}

export class RefrescoDto {
  @ApiProperty()
  tokenAcceso!: string;

  @ApiProperty()
  tokenRefresco!: string;

  @ApiProperty({ type: PerfilDto })
  usuario!: PerfilDto;
}

export class ConfiguracionMfaDto {
  @ApiProperty({
    description: 'URI otpauth. El panel la convierte en codigo QR para la app de autenticacion.',
    example: 'otpauth://totp/CAP%20Purulha:jlopez?secret=...',
  })
  uri!: string;

  @ApiProperty({ description: 'El mismo secreto en texto, por si hay que escribirlo a mano.' })
  secreto!: string;

  @ApiProperty({
    type: [String],
    description: 'Codigos de un solo uso. Es la UNICA vez que se muestran en claro.',
  })
  codigosRespaldo!: string[];
}
