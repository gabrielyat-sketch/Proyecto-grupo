import { ApiProperty } from '@nestjs/swagger';
import { UNIDADES } from '../../catalogo/dto/respuestas.dto';

export class MedicamentoEntregadoDto {
  @ApiProperty({ example: 'AMOX500' })
  codigo!: string;

  @ApiProperty({ example: 'Amoxicilina' })
  nombre!: string;

  @ApiProperty({ enum: UNIDADES })
  unidad!: string;

  @ApiProperty({ description: 'Lote del que salio. Lo eligio el sistema por FEFO.', example: 'L-4471' })
  numeroLote!: string;

  @ApiProperty({ format: 'date-time' })
  fechaVencimiento!: Date;

  @ApiProperty({ example: 20 })
  cantidad!: number;
}

/**
 * Una receta es UNA entrega.
 *
 * Un paciente que sale con tres medicamentos es una entrega con tres lineas, no
 * tres entregas: contarlas por medicamento inflaria el indicador de atenciones
 * de farmacia.
 *
 * Un mismo medicamento puede aparecer en varias lineas si hubo que tomarlo de
 * mas de un lote para completar la cantidad.
 */
export class EntregaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ format: 'uuid', description: 'Copiada del paciente al momento de la entrega.' })
  comunidadId!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ format: 'uuid' })
  registradoPor!: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 500 })
  observaciones!: string | null;

  @ApiProperty({ type: [MedicamentoEntregadoDto] })
  medicamentos!: MedicamentoEntregadoDto[];
}
