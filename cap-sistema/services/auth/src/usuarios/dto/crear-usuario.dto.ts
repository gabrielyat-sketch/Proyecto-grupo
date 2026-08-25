import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { Rol } from '@cap/shared';

export class CrearUsuarioDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  @Length(3, 60)
  @Matches(/^[a-z0-9._-]+$/i, {
    message: 'El usuario solo puede tener letras, numeros, punto, guion y guion bajo.',
  })
  usuario!: string;

  @ApiProperty({ example: 'Juana' })
  @IsString()
  @Length(1, 120)
  nombres!: string;

  @ApiProperty({ example: 'Perez Caal' })
  @IsString()
  @Length(1, 120)
  apellidos!: string;

  @ApiProperty({ enum: Rol })
  @IsEnum(Rol, { message: 'El rol no es uno de los definidos para el CAP.' })
  rol!: Rol;
}
