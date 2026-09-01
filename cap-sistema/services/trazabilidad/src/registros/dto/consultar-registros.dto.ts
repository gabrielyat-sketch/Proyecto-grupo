import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';
import { Accion } from '../../../generado';

/**
 * Filtros de consulta de la bitacora.
 *
 * Sin paginacion obligatoria (§8.1) este endpoint devolveria la bitacora
 * entera, que es la tabla que mas crece del sistema.
 */
export class ConsultarRegistrosDto {
  @ApiPropertyOptional({ example: 'usuarios' }) @IsOptional() @IsString() @MaxLength(40)
  servicio?: string;

  @ApiPropertyOptional({ enum: Accion }) @IsOptional() @IsEnum(Accion)
  accion?: Accion;

  @ApiPropertyOptional({ example: 'expediente' }) @IsOptional() @IsString() @MaxLength(60)
  entidad?: string;

  @ApiPropertyOptional({ example: 'exp-000123' }) @IsOptional() @IsString() @MaxLength(64)
  entidadId?: string;

  @ApiPropertyOptional({ description: 'Quien ejecuto la accion.' })
  @IsOptional() @IsString() @MaxLength(64)
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Desde (inclusive), ISO-8601.', example: '2026-08-01T00:00:00.000Z' })
  @IsOptional() @IsISO8601()
  desde?: string;

  @ApiPropertyOptional({ description: 'Hasta (inclusive), ISO-8601.', example: '2026-08-31T23:59:59.999Z' })
  @IsOptional() @IsISO8601()
  hasta?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ default: 25, maximum: TAMANO_PAGINA_MAXIMO })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(TAMANO_PAGINA_MAXIMO)
  tamano?: number;
}
