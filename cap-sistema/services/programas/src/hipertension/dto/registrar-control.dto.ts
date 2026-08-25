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

export class RegistrarControlHipertensionDto {
  @ApiProperty({ example: 148, minimum: 50, maximum: 300 })
  @Type(() => Number)
  @IsInt()
  @Min(50, { message: 'La presion sistolica parece incorrecta.' })
  @Max(300, { message: 'La presion sistolica parece incorrecta.' })
  sistolica!: number;

  @ApiProperty({ example: 94, minimum: 30, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(30, { message: 'La presion diastolica parece incorrecta.' })
  @Max(200, { message: 'La presion diastolica parece incorrecta.' })
  diastolica!: number;

  @ApiPropertyOptional({ minimum: 20, maximum: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(20)
  @Max(400)
  pesoKg?: number;

  @ApiPropertyOptional({ description: 'Si el paciente refiere estar tomando el tratamiento' })
  @IsOptional()
  @IsBoolean()
  adherencia?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Fecha real del control. Se usa al digitalizar papel.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'El control no puede tener fecha futura.' })
  fecha?: Date;
}
