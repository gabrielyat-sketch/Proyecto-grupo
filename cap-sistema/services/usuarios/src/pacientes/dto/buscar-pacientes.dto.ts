import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

export class BuscarPacientesDto {
  @ApiPropertyOptional({
    example: '1234567890101',
    description: 'Busqueda exacta por DPI, resuelta con el indice ciego.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9\s-]{8,20}$/, { message: 'El DPI solo puede tener digitos, espacios y guiones.' })
  dpi?: string;

  @ApiPropertyOptional({
    example: 'perez',
    description: 'Busqueda por INICIO de apellido o nombre. No busca en medio del texto.',
  })
  @IsOptional()
  @IsString()
  @Length(2, 60, { message: 'Escriba al menos 2 letras para buscar por nombre.' })
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comunidadId?: string;

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
