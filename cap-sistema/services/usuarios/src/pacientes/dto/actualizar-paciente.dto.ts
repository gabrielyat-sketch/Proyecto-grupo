import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { IdiomaDto } from './crear-paciente.dto';

/**
 * El DPI y la fecha de nacimiento NO se pueden modificar por esta via.
 * Corregir un DPI cambia la identidad del paciente y debe pasar por un
 * procedimiento con registro de auditoria, no por una edicion normal.
 */
export class ActualizarPacienteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  nombres?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  apellidos?: string;

  @ApiPropertyOptional({ enum: IdiomaDto })
  @IsOptional()
  @IsEnum(IdiomaDto)
  idioma?: IdiomaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comunidadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grupoFamiliarId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 20)
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fallecido?: boolean;
}
