import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

/**
 * Todo listado se pagina. Con 100,000 registros, un endpoint sin paginar
 * funciona en desarrollo y tumba el servidor en produccion.
 */
export class ConsultarEjemploDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
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
  @Max(TAMANO_PAGINA_MAXIMO, { message: 'El tamano de pagina no puede superar ' + TAMANO_PAGINA_MAXIMO + '.' })
  tamano?: number;
}
