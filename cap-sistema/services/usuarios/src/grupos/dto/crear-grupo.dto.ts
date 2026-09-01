import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CrearGrupoDto {
  /**
   * El numero de la pestana del folder.
   *
   * Opcional para que la pantalla pueda ofrecer el siguiente libre sin
   * obligar a escribirlo, pero quien registra puede poner otro: el folder de
   * carton manda, y a veces el que sigue en el archivero no es el que sigue
   * en la cuenta.
   */
  @ApiPropertyOptional({ description: 'Si se omite, se usa el siguiente libre de la serie.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero?: number;

  @ApiProperty({ example: 'Lopez Ac', description: 'El apellido con que se rotula la carpeta.' })
  @IsString()
  @Length(1, 120)
  apellidos!: string;

  @ApiProperty()
  @IsString()
  comunidadId!: string;

  @ApiPropertyOptional({ description: 'El barrio o caserio. Define la serie de numeracion.' })
  @IsOptional()
  @IsString()
  lugarId?: string;

  @ApiPropertyOptional({ example: 'Casa 14, frente a la escuela' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 20)
  telefono?: string;
}
