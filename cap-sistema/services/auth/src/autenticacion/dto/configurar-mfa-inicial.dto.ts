import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Primera configuracion del segundo factor, cuando todavia NO hay sesion.
 *
 * Es el unico camino para una cuenta con rol administrativo que nunca configuro
 * el TOTP: su rol le exige el segundo factor, pero para configurarlo por la via
 * normal necesitaria un token de acceso que solo se obtiene pasando ese mismo
 * segundo factor. Sin este endpoint, la cuenta inicial del sistema no puede
 * entrar nunca.
 */
export class ConfigurarMfaInicialDto {
  @ApiProperty({ description: 'Token parcial devuelto por el login' })
  @IsString()
  tokenParcial!: string;
}
