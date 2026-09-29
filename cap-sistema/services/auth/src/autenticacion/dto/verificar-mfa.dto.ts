import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class VerificarMfaDto {
  @ApiProperty({ description: 'Token parcial devuelto por el login' })
  @IsString()
  tokenParcial!: string;

  @ApiProperty({ example: '123456', description: 'Codigo TOTP de 6 digitos o codigo de respaldo' })
  @IsString()
  @Length(6, 20)
  codigo!: string;

  /** Si se marca, no se vuelve a pedir el codigo en este equipo por 30 dias. */
  @ApiPropertyOptional({ description: 'Recordar este equipo por 30 dias' })
  @IsOptional()
  @IsBoolean()
  recordarEquipo?: boolean;
}
