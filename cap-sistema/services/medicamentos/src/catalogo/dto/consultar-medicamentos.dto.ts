import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

export class ConsultarMedicamentosDto {
  @ApiPropertyOptional({ description: 'Busca por inicio del nombre generico o del codigo.' })
  @IsOptional()
  @IsString()
  @Length(2, 60, { message: 'Escriba al menos 2 letras para buscar.' })
  buscar?: string;

  @ApiPropertyOptional({ description: 'true para incluir los medicamentos desactivados.' })
  @IsOptional()
  @IsBooleanString()
  incluirInactivos?: string;

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
