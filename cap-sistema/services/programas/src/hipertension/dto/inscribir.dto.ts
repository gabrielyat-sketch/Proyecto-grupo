import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class InscribirHipertensionDto {
  @ApiProperty({ description: 'Identificador del paciente en el servicio de usuarios' })
  @IsString()
  pacienteId!: string;

  @ApiPropertyOptional({ default: 140, description: 'Meta de presion sistolica acordada' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(180)
  metaSistolica?: number;

  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(110)
  metaDiastolica?: number;
}
