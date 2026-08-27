import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

/**
 * Paginacion del listado de raices.
 *
 * Existe como DTO y no como `@Query('pagina')` sueltos por una razon concreta:
 * un parametro suelto sale en el contrato OpenAPI como `required: true` aunque
 * TypeScript lo declare opcional. Esa marca no se queda en el papel — el panel
 * web genera su cliente desde estos contratos, y acabaria obligado a enviar
 * siempre la pagina y el tamano.
 */
export class ConsultarRaicesDto {
  @ApiPropertyOptional({ default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ default: 25, example: 25, maximum: TAMANO_PAGINA_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TAMANO_PAGINA_MAXIMO)
  tamano?: number;
}
