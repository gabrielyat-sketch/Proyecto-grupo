import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxDate,
  Min,
} from 'class-validator';

export class RegistrarAtencionDto {
  @ApiProperty({ example: 'Control de presion arterial' })
  @IsString()
  @Length(3, 500)
  motivo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  diagnostico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  tratamiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notas?: string;

  // ─── Signos vitales ────────────────────────────────────────────────────
  // Los rangos no son cosmetica: un peso de 700 kg tecleado por error
  // distorsiona los indicadores de desnutricion de toda una comunidad.

  @ApiPropertyOptional({ minimum: 0.5, maximum: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5, { message: 'El peso parece incorrecto.' })
  @Max(400, { message: 'El peso parece incorrecto.' })
  pesoKg?: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20, { message: 'La talla parece incorrecta.' })
  @Max(250, { message: 'La talla parece incorrecta.' })
  tallaCm?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(300)
  presionSistolica?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(200)
  presionDiastolica?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(30)
  @Max(45)
  temperaturaC?: number;

  @ApiPropertyOptional({
    description:
      'Fecha real de la atencion. Se usa al digitalizar papel: la consulta ocurrio hace anos.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'La fecha de la atencion no puede estar en el futuro.' })
  fecha?: Date;

  @ApiPropertyOptional({ description: 'Marca la atencion como transcrita desde papel.' })
  @IsOptional()
  @IsBoolean()
  digitalizada?: boolean;
}
