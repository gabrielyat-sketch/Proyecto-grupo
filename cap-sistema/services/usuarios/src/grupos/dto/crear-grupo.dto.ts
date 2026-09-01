import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CrearGrupoDto {
  @ApiPropertyOptional({
    description:
      'Codigo del grupo familiar segun el registro del CAP. Si se omite, el sistema genera uno.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  codigo?: string;

  @ApiProperty()
  @IsString()
  comunidadId!: string;

  @ApiPropertyOptional({ example: 'Caserio El Rejon, casa 14' })
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
