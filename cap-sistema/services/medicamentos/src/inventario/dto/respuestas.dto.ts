import { ApiProperty } from '@nestjs/swagger';

class MedicamentoDelMovimientoDto {
  @ApiProperty({ example: 'AMOX500' })
  codigo!: string;

  @ApiProperty()
  nombreGenerico!: string;
}

/**
 * Fila del libro mayor. Explica un cambio de existencia.
 *
 * Es append-only por convencion: un movimiento no se corrige, se compensa con
 * uno de AJUSTE. Asi el historial siempre explica como se llego a la existencia
 * actual del lote.
 */
export class MovimientoInventarioDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ enum: ['INGRESO', 'ENTREGA', 'AJUSTE', 'BAJA', 'DEVOLUCION'] })
  tipo!: string;

  @ApiProperty({ description: 'NEGATIVA cuando la existencia baja (entrega, baja).', example: -20 })
  cantidad!: number;

  @ApiProperty({ description: 'Existencia del lote despues de aplicar este movimiento.', example: 300 })
  cantidadResultante!: number;

  @ApiProperty({ type: String, nullable: true, maxLength: 200 })
  motivo!: string | null;

  @ApiProperty({ format: 'uuid' })
  registradoPor!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Presente solo en movimientos de ENTREGA.' })
  entregaId!: string | null;

  @ApiProperty({ example: 'L-4471' })
  numeroLote!: string;

  @ApiProperty({ type: MedicamentoDelMovimientoDto })
  medicamento!: MedicamentoDelMovimientoDto;
}
