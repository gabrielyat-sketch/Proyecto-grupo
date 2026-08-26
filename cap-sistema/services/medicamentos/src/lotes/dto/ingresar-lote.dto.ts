import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Length, Max, Min, MinDate } from 'class-validator';

export class IngresarLoteDto {
  @ApiProperty({ example: 'L-2026-0871', description: 'Numero impreso en la caja' })
  @IsString()
  @Length(1, 60)
  numeroLote!: string;

  @ApiProperty({ example: '2027-08-31' })
  @Type(() => Date)
  @IsDate({ message: 'La fecha de vencimiento no es valida.' })
  @MinDate(() => new Date(), {
    message: 'No se puede ingresar un lote que ya vencio.',
  })
  fechaVencimiento!: Date;

  @ApiProperty({ example: 500, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La cantidad debe ser mayor que cero.' })
  @Max(1000000)
  cantidad!: number;

  @ApiPropertyOptional({ example: 'Almacen departamental MSPAS' })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  proveedor?: string;
}
