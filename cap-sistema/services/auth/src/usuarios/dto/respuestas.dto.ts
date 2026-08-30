import { ApiProperty } from '@nestjs/swagger';
import { Rol } from '@cap/shared';

/**
 * Vista publica de una cuenta. Es exactamente CAMPOS_PUBLICOS del servicio:
 * nunca incluye el hash de la contrasena ni el secreto del segundo factor.
 */
export class CuentaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'jlopez' })
  usuario!: string;

  @ApiProperty({ example: 'Juana' })
  nombres!: string;

  @ApiProperty({ example: 'Lopez Chub' })
  apellidos!: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol' })
  rol!: string;

  @ApiProperty({ description: 'Una cuenta desactivada no puede iniciar sesion.' })
  activo!: boolean;

  @ApiProperty()
  debeCambiarContrasena!: boolean;

  @ApiProperty({
    description:
      'true si el segundo factor esta configurado y activo. Nunca se expone el secreto.',
  })
  mfaActivo!: boolean;

  @ApiProperty({
    description: 'true si la cuenta esta bloqueada AHORA por intentos fallidos.',
  })
  bloqueada!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Hasta cuando dura el bloqueo. Puede ser una fecha ya pasada.',
  })
  bloqueadoHasta!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'null si la cuenta nunca ha entrado.',
  })
  ultimoAcceso!: Date | null;

  @ApiProperty({ format: 'date-time' })
  creadoEn!: Date;
}

/**
 * Alta de cuenta. La contrasena temporal viaja UNA sola vez: no se guarda en
 * claro en ningun lado, asi que si el panel la pierde hay que restablecerla.
 */
export class CuentaCreadaDto extends CuentaDto {
  @ApiProperty({ description: 'Anotela y entreguela a la persona. No se puede volver a consultar.' })
  contrasenaTemporal!: string;
}

export class ContrasenaRestablecidaDto {
  @ApiProperty({ description: 'Nombre de usuario al que corresponde la contrasena nueva.' })
  usuario!: string;

  @ApiProperty({ description: 'Temporal: la persona debera cambiarla al entrar.' })
  contrasenaTemporal!: string;
}

/**
 * Resultado de reiniciar el segundo factor de una cuenta.
 *
 * No devuelve ningun secreto: el secreto nuevo lo genera la propia persona en
 * su siguiente acceso, con el mismo flujo de la primera vez.
 */
export class MfaReiniciadoDto {
  @ApiProperty({ description: 'Cuenta a la que se le reinicio el segundo factor.' })
  usuario!: string;

  @ApiProperty({
    description:
      'true si su rol lo exige: el sistema se lo volvera a pedir al entrar. Si es false, entrara sin el hasta que decida configurarlo.',
  })
  exigeSegundoFactor!: boolean;
}
