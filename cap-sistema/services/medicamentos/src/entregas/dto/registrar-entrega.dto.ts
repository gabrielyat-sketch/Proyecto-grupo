import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LineaEntregaDto {
  @ApiProperty()
  @IsString()
  medicamentoId!: string;

  @ApiProperty({ example: 20, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(100000)
  cantidad!: number;
}

export class RegistrarEntregaDto {
  @ApiProperty()
  @IsString()
  pacienteId!: string;

  @ApiProperty({
    type: [LineaEntregaDto],
    description: 'Los medicamentos de la receta. El sistema elige los lotes por FEFO.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'La entrega debe llevar al menos un medicamento.' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => LineaEntregaDto)
  lineas!: LineaEntregaDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  observaciones?: string;
}
