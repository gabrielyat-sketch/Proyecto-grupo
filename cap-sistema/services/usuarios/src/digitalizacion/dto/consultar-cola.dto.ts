import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TAMANO_PAGINA_MAXIMO } from '@cap/shared';

export enum EstadoDigitalizacionDto {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETO = 'COMPLETO',
  NO_LOCALIZADO = 'NO_LOCALIZADO',
}

/**
 * Lo que se pide para armar la cola de trabajo.
 *
 * La comunidad no es un filtro cualquiera: el archivo de papel del CAP se
 * recorre por comunidad, y poder cerrar una entera es lo que hace que una
 * digitalizacion de meses no se abandone a la mitad (riesgo R-6).
 */
export class ConsultarColaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  comunidadId?: string;

  /**
   * El barrio o caserio, dentro de la comunidad.
   *
   * Purulha Centro son siete barrios y los caserios son cuarenta y seis: una
   * cola de «Purulha Centro» a secas es el municipio entero y no ayuda a
   * decidir que cajon del archivo se abre hoy. El archivo de papel se recorre
   * por sitio, y cerrar un barrio completo es lo que hace que el avance se
   * note.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  lugarId?: string;

  @ApiPropertyOptional({
    enum: EstadoDigitalizacionDto,
    description: 'Por defecto, los que faltan: pendientes y en proceso.',
  })
  @IsOptional()
  @IsEnum(EstadoDigitalizacionDto)
  estado?: EstadoDigitalizacionDto;

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
