import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

export class ConsultarGruposDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comunidadId?: string;

  @ApiPropertyOptional({ description: 'El barrio o caserio.' })
  @IsOptional()
  @IsString()
  lugarId?: string;

  /**
   * El apellido de la carpeta, por coincidencia parcial.
   *
   * Parcial y no exacta porque quien busca escribe «Lopez» y la carpeta dice
   * «Lopez Ac»; exigir el rotulo completo obligaria a acertarlo de memoria.
   */
  @ApiPropertyOptional({ description: 'Coincidencia parcial, sin distinguir mayusculas.' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  apellidos?: string;

  @ApiPropertyOptional({ description: 'El numero de la pestana, exacto.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero?: number;

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
