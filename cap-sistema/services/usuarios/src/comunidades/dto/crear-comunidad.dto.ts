import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CrearComunidadDto {
  @ApiProperty({ example: 'Chilasco' })
  @IsString()
  @Length(2, 120)
  nombre!: string;

  @ApiPropertyOptional({ example: 'CHI-01' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Comunidad de dificil acceso. Se usa para priorizar visitas y seguimiento.',
  })
  @IsOptional()
  @IsBoolean()
  distante?: boolean;
}
