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
