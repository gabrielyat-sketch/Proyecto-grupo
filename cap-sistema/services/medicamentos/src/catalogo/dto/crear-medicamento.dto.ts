import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export enum UnidadDto {
  TABLETA = 'TABLETA',
  CAPSULA = 'CAPSULA',
  JARABE_ML = 'JARABE_ML',
  AMPOLLA = 'AMPOLLA',
  FRASCO = 'FRASCO',
  SOBRE = 'SOBRE',
  UNIDAD = 'UNIDAD',
  GRAMO = 'GRAMO',
}

export class CrearMedicamentoDto {
  @ApiProperty({ example: 'MED-0142' })
  @IsString()
  @Length(1, 30)
  codigo!: string;

  @ApiProperty({ example: 'Amoxicilina' })
  @IsString()
  @Length(2, 160)
  nombreGenerico!: string;

  @ApiPropertyOptional({ example: 'Amoxil' })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  nombreComercial?: string;

  @ApiPropertyOptional({ example: 'Caja de 100 tabletas' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  presentacion?: string;

  @ApiPropertyOptional({ example: '500 mg' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  concentracion?: string;

  @ApiProperty({ enum: UnidadDto })
  @IsEnum(UnidadDto)
  unidad!: UnidadDto;

  @ApiPropertyOptional({
    default: 0,
    description: 'Debajo de esta existencia total aparece en la alerta. Cero desactiva la alerta.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  stockMinimo?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiereReceta?: boolean;
}
