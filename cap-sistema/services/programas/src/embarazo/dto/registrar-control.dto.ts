import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class RegistrarControlPrenatalDto {
  @ApiPropertyOptional({ minimum: 30, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(30)
  @Max(200)
  pesoKg?: number;

  @ApiPropertyOptional({ minimum: 50, maximum: 300 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(300)
  sistolica?: number;

  @ApiPropertyOptional({ minimum: 30, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(200)
  diastolica?: number;

  @ApiPropertyOptional({ minimum: 5, maximum: 50, description: 'Altura uterina en centimetros' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(5)
  @Max(50)
  alturaUterinaCm?: number;

  @ApiPropertyOptional({ minimum: 60, maximum: 220, description: 'Frecuencia cardiaca fetal' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(220)
  fcf?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  edema?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  observaciones?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'El control no puede tener fecha futura.' })
  fecha?: Date;
}
