import { ApiProperty } from '@nestjs/swagger';
import { ESTADOS_LOTE, ESTADOS_VENCIMIENTO, UNIDADES } from '../../catalogo/dto/respuestas.dto';

export class LoteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  medicamentoId!: string;

  @ApiProperty({ example: 'L-4471' })
  numeroLote!: string;

  @ApiProperty({ format: 'date-time' })
  fechaVencimiento!: Date;

  @ApiProperty({ format: 'date-time' })
  fechaIngreso!: Date;

  @ApiProperty({ type: String, nullable: true })
  proveedor!: string | null;

  @ApiProperty({ example: 500 })
  cantidadInicial!: number;

  @ApiProperty({
    description: 'Existencia actual. Desnormalizada a proposito; el libro mayor la explica.',
    example: 320,
  })
  cantidadDisponible!: number;

  @ApiProperty({ enum: ESTADOS_LOTE })
  estado!: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 200 })
  motivoBaja!: string | null;

  @ApiProperty({ format: 'date-time' })
  creadoEn!: Date;
}

class MedicamentoDelLoteDto {
  @ApiProperty({ example: 'AMOX500' })
  codigo!: string;

  @ApiProperty()
  nombreGenerico!: string;

  @ApiProperty({ enum: UNIDADES })
  unidad!: string;
}

/** Fila de la alerta de vencimientos proximos. */
export class LotePorVencerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'L-4471' })
  numeroLote!: string;

  @ApiProperty({ type: MedicamentoDelLoteDto })
  medicamento!: MedicamentoDelLoteDto;

  @ApiProperty({ format: 'date-time' })
  fechaVencimiento!: Date;

  @ApiProperty({ example: 120 })
  cantidadDisponible!: number;

  @ApiProperty({ description: 'Cero significa que vence HOY, y hoy todavia se puede entregar.', example: 34 })
  diasParaVencer!: number;

  @ApiProperty({ enum: ESTADOS_VENCIMIENTO })
  vencimiento!: string;
}

/**
 * Lote ya vencido que todavia figura con existencia.
 *
 * No se dan de baja solos: dar de baja medicamento es una decision con
 * responsable. El sistema impide entregarlos y los lista aqui para que alguien
 * actue.
 */
export class LoteVencidoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'L-4471' })
  numeroLote!: string;

  @ApiProperty({ type: MedicamentoDelLoteDto })
  medicamento!: MedicamentoDelLoteDto;

  @ApiProperty({ format: 'date-time' })
  fechaVencimiento!: Date;

  @ApiProperty({ example: 45 })
  cantidadDisponible!: number;

  @ApiProperty({ description: 'Dias transcurridos desde el vencimiento.', example: 12 })
  diasVencido!: number;
}
