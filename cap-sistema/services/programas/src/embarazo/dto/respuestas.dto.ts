import { ApiProperty } from '@nestjs/swagger';

const ESTADOS = ['ACTIVO', 'EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO'];
const RESULTADOS = ['PARTO_NORMAL', 'CESAREA', 'ABORTO', 'OBITO', 'TRASLADO', 'OTRO'];

/**
 * Seguimiento de embarazo.
 *
 * `semanasGestacion` NO esta en la base: se calcula al responder, sobre el dia
 * del calendario en Purulha (UTC-6). Guardarlo dejaria un dato que envejece
 * solo y que mostraria semanas distintas segun cuando se guardo.
 */
export class ProgramaEmbarazoBaseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ format: 'date-time', description: 'Fecha de ultima menstruacion.' })
  fum!: Date;

  @ApiProperty({ format: 'date-time', description: 'Fecha probable de parto: FUM + 280 dias (regla de Naegele).' })
  fpp!: Date;

  @ApiProperty({ example: 3 })
  numeroGestacion!: number;

  @ApiProperty({ example: 2 })
  partosPrevios!: number;

  @ApiProperty({ enum: ['BAJO', 'ALTO'] })
  riesgo!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    maxLength: 300,
    description: 'Por que se clasifico como alto riesgo, para que el siguiente turno sepa a que atenerse.',
  })
  motivoRiesgo!: string | null;

  @ApiProperty({ enum: ESTADOS })
  estado!: string;

  @ApiProperty({ enum: RESULTADOS, nullable: true })
  resultado!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fechaCierre!: Date | null;

  @ApiProperty({ format: 'uuid' })
  inscritoPor!: string;

  @ApiProperty({ format: 'date-time' })
  creadoEn!: Date;

}

/** El seguimiento con las semanas ya calculadas. Es lo que consume el panel. */
export class ProgramaEmbarazoDto extends ProgramaEmbarazoBaseDto {
  @ApiProperty({ description: 'Calculada al responder sobre el dia local, no almacenada.', example: 24 })
  semanasGestacion!: number;
}

/** Alta en el programa: agrega por que se clasifico el riesgo. */
export class EmbarazoInscritoDto extends ProgramaEmbarazoDto {
  @ApiProperty({
    type: [String],
    description: 'Vacio cuando el riesgo es bajo.',
    example: ['Edad menor de 18 anios'],
  })
  motivosRiesgo!: string[];
}

export class UltimoControlPrenatalDto {
  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ example: 24 })
  semanasGestacion!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  proximoControl!: Date | null;

  @ApiProperty({ type: [String], description: 'Senales de alarma detectadas por el sistema.' })
  alertas!: string[];
}

export class ProgramaEmbarazoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ format: 'date-time' })
  fum!: Date;

  @ApiProperty({ format: 'date-time' })
  fpp!: Date;

  @ApiProperty({ enum: ['BAJO', 'ALTO'] })
  riesgo!: string;

  @ApiProperty({ type: String, nullable: true })
  motivoRiesgo!: string | null;

  @ApiProperty({ enum: ESTADOS })
  estado!: string;

  @ApiProperty({ example: 3 })
  numeroGestacion!: number;

  @ApiProperty({ example: 24 })
  semanasGestacion!: number;

  @ApiProperty({ type: UltimoControlPrenatalDto, nullable: true })
  ultimoControl!: UltimoControlPrenatalDto | null;
}

export class ControlPrenatalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  programaId!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ description: 'Calculadas a partir de la FUM y la fecha del control.', example: 24 })
  semanasGestacion!: number;

  // Decimal de Prisma: viaja como texto en JSON para no perder precision.
  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '58.30' })
  pesoKg!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  sistolica!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  diastolica!: number | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true, description: 'Altura uterina en centimetros.', example: '24.0' })
  alturaUterinaCm!: string | null;

  @ApiProperty({ type: Number, nullable: true, description: 'Frecuencia cardiaca fetal, latidos por minuto.', example: 140 })
  fcf!: number | null;

  @ApiProperty({ type: Boolean, nullable: true })
  edema!: boolean | null;

  @ApiProperty({ type: [String], description: 'Senales de alarma detectadas por el sistema en este control.' })
  alertas!: string[];

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  proximoControl!: Date | null;

  @ApiProperty({ format: 'uuid' })
  registradoPor!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Descifradas.' })
  observaciones!: string | null;
}
