import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  @Length(3, 60)
  usuario!: string;

  @ApiProperty({ example: 'Clave-Del-Personal-2026' })
  @IsString()
  @Length(1, 200)
  contrasena!: string;

  /**
   * Token del equipo, si este ya demostro el segundo factor antes.
   *
   * No es una credencial: sin usuario y contrasena correctos no abre nada.
   * Lo unico que evita es que se vuelva a pedir el codigo en el mismo equipo
   * durante 30 dias.
   */
  @ApiPropertyOptional({ description: 'Token de equipo recordado, si lo hay' })
  @IsOptional()
  @IsString()
  @Length(10, 200)
  tokenDispositivo?: string;
}
