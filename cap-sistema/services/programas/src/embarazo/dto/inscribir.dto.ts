import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, MaxDate, Min } from 'class-validator';

export class InscribirEmbarazoDto {
  @ApiProperty()
  @IsString()
  pacienteId!: string;

  @ApiProperty({
    example: '2026-01-15',
    description: 'Fecha de ultima menstruacion. De aqui salen la FPP y las semanas de gestacion.',
  })
  @Type(() => Date)
  @IsDate({ message: 'La fecha de ultima menstruacion no es valida.' })
  @MaxDate(() => new Date(), { message: 'La FUM no puede estar en el futuro.' })
  fum!: Date;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  numeroGestacion?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  partosPrevios?: number;
}
