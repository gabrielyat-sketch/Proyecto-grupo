import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerificarMfaDto {
  @ApiProperty({ description: 'Token parcial devuelto por el login' })
  @IsString()
  tokenParcial!: string;

  @ApiProperty({ example: '123456', description: 'Codigo TOTP de 6 digitos o codigo de respaldo' })
  @IsString()
  @Length(6, 20)
  codigo!: string;
}
