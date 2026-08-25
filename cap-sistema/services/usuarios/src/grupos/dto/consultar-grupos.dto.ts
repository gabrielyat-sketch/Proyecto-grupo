import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

export class ConsultarGruposDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comunidadId?: string;

  @ApiPropertyOptional({ description: 'Busca por inicio del codigo del grupo.' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  codigo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ default: 25, maximum: TAMANO_PAGINA_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TAMANO_PAGINA_MAXIMO)
  tamano?: number;
}
