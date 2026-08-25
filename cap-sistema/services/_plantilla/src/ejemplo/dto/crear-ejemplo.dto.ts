import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CrearEjemploDto {
  @ApiProperty({ example: 'Comunidad El Rancho', maxLength: 120 })
  @IsString()
  @Length(1, 120, { message: 'El nombre debe tener entre 1 y 120 caracteres.' })
  nombre!: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
