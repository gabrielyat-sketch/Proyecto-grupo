import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  @Length(3, 60)
  usuario!: string;

  @ApiProperty({ example: 'Clave-Del-Personal-2026' })
  @IsString()
  @Length(1, 200)
  contrasena!: string;
}
