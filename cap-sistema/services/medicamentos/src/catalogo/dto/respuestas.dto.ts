import { ApiProperty } from '@nestjs/swagger';

export const UNIDADES = [
  'TABLETA', 'CAPSULA', 'JARABE_ML', 'AMPOLLA', 'FRASCO', 'SOBRE', 'UNIDAD', 'GRAMO',
];
export const ESTADOS_LOTE = ['DISPONIBLE', 'AGOTADO', 'VENCIDO', 'DADO_DE_BAJA'];
export const ESTADOS_VENCIMIENTO = ['VIGENTE', 'POR_VENCER', 'VENCIDO'];

/** El medicamento tal como esta en la base, sin existencia calculada. */
export class MedicamentoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Codigo interno del CAP, siempre en mayusculas.', example: 'AMOX500' })
  codigo!: string;

  @ApiProperty({ example: 'Amoxicilina' })
  nombreGenerico!: string;

  @ApiProperty({ type: String, nullable: true })
  nombreComercial!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Caja de 20' })
  presentacion!: string | null;

  @ApiProperty({ type: String, nullable: true, example: '500 mg' })
  concentracion!: string | null;

  @ApiProperty({ enum: UNIDADES })
  unidad!: string;

  @ApiProperty({ description: 'Un minimo en CERO desactiva la alerta de existencia.', example: 50 })
  stockMinimo!: number;

  @ApiProperty()
  requiereReceta!: boolean;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty({ format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn!: Date;
}

/** Fila del catalogo: la existencia se suma de los lotes disponibles. */
export class MedicamentoConExistenciaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'AMOX500' })
  codigo!: string;

  @ApiProperty()
  nombreGenerico!: string;

  @ApiProperty({ type: String, nullable: true })
  nombreComercial!: string | null;

  @ApiProperty({ type: String, nullable: true })
  presentacion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  concentracion!: string | null;

  @ApiProperty({ enum: UNIDADES })
  unidad!: string;

  @ApiProperty()
  requiereReceta!: boolean;

  @ApiProperty()
  activo!: boolean;

  @ApiProperty({ example: 50 })
  stockMinimo!: number;

  @ApiProperty({ description: 'Suma de los lotes DISPONIBLES.', example: 320 })
  existencia!: number;

  @ApiProperty({ description: 'false cuando el minimo es cero: la alerta esta desactivada.' })
  bajoMinimo!: boolean;
}

export class LoteDelMedicamentoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Numero impreso en la caja por el fabricante.', example: 'L-4471' })
  numeroLote!: string;

  @ApiProperty({ format: 'date-time' })
  fechaVencimiento!: Date;

  @ApiProperty({ example: 120 })
  cantidadDisponible!: number;

  @ApiProperty({ enum: ESTADOS_LOTE })
  estado!: string;

  @ApiProperty({
    enum: ESTADOS_VENCIMIENTO,
    description: 'Calculado contra el dia de hoy en Purulha y la ventana de alerta configurada.',
  })
  vencimiento!: string;
}

/** Detalle del medicamento con sus lotes. Es la pantalla de farmacia. */
export class MedicamentoDetalleDto extends MedicamentoConExistenciaDto {
  @ApiProperty({ type: [LoteDelMedicamentoDto], description: 'Ordenados por vencimiento: primero el que vence antes.' })
  lotes!: LoteDelMedicamentoDto[];
}

export class MedicamentoBajoMinimoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'AMOX500' })
  codigo!: string;

  @ApiProperty()
  nombreGenerico!: string;

  @ApiProperty({ enum: UNIDADES })
  unidad!: string;

  @ApiProperty({ example: 50 })
  stockMinimo!: number;

  @ApiProperty({ example: 12 })
  existencia!: number;
}
