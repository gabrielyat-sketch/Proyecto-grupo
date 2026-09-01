import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * Politica de contrasena.
 *
 * 10 caracteres con letras y numeros. Se eligio deliberadamente NO exigir
 * simbolos ni mayusculas obligatorias: en un CAP con computadoras compartidas,
 * una politica demasiado exigente termina en contrasenas escritas en un papel
 * pegado al monitor, que es peor que una contrasena algo mas simple.
 */
export class CambiarContrasenaDto {
  @ApiProperty()
  @IsString()
  contrasenaActual!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @Length(10, 200, { message: 'La contrasena nueva debe tener al menos 10 caracteres.' })
  @Matches(/[a-zA-Z]/, { message: 'La contrasena debe incluir al menos una letra.' })
  @Matches(/[0-9]/, { message: 'La contrasena debe incluir al menos un numero.' })
  contrasenaNueva!: string;
}
