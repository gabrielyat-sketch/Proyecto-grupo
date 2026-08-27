import { ApiProperty } from '@nestjs/swagger';

const ESTADOS = ['ACTIVO', 'EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO'];
const CLASIFICACIONES = ['NORMAL', 'ELEVADA', 'ESTADIO_1', 'ESTADIO_2', 'CRISIS'];

/**
 * Inscripcion en el programa de hipertension.
 *
 * `comunidadId` se copia al inscribir y NO se actualiza despues: para el
 * indicador interesa la comunidad del momento de la inscripcion, no la actual.
 */
export class ProgramaHipertensionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', description: 'Paciente del servicio usuarios. No es llave foranea.' })
  pacienteId!: string;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ format: 'date-time' })
  fechaIngreso!: Date;

  @ApiProperty({ enum: ESTADOS })
  estado!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fechaEgreso!: Date | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 200 })
  motivoEgreso!: string | null;

  @ApiProperty({ description: 'Meta acordada con el paciente, no un valor fijo del sistema.', example: 140 })
  metaSistolica!: number;

  @ApiProperty({ example: 90 })
  metaDiastolica!: number;

  @ApiProperty({ format: 'uuid' })
  inscritoPor!: string;

  @ApiProperty({ format: 'date-time' })
  creadoEn!: Date;
}

/** Ultimo control, incrustado en el listado para evitar el N+1 de esa pantalla. */
export class UltimoControlHipertensionDto {
  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ example: 148 })
  sistolica!: number;

  @ApiProperty({ example: 94 })
  diastolica!: number;

  @ApiProperty({ enum: CLASIFICACIONES, description: 'Calculada a partir de las cifras, nunca tecleada.' })
  clasificacion!: string;

  @ApiProperty({ description: 'true si la lectura alcanza la meta acordada.' })
  enMeta!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  proximoControl!: Date | null;
}

export class ProgramaHipertensionResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ format: 'date-time' })
  fechaIngreso!: Date;

  @ApiProperty({ enum: ESTADOS })
  estado!: string;

  @ApiProperty({ example: 140 })
  metaSistolica!: number;

  @ApiProperty({ example: 90 })
  metaDiastolica!: number;

  @ApiProperty({ type: UltimoControlHipertensionDto, nullable: true })
  ultimoControl!: UltimoControlHipertensionDto | null;
}

export class ControlHipertensionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  programaId!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ example: 148 })
  sistolica!: number;

  @ApiProperty({ example: 94 })
  diastolica!: number;

  @ApiProperty({ enum: CLASIFICACIONES })
  clasificacion!: string;

  @ApiProperty()
  enMeta!: boolean;

  // Decimal de Prisma: viaja como texto en JSON para no perder precision.
  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '72.50' })
  pesoKg!: string | null;

  @ApiProperty({ type: Boolean, nullable: true, description: 'Si el paciente refiere tomar el tratamiento.' })
  adherencia!: boolean | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Calculado segun la clasificacion.' })
  proximoControl!: Date | null;

  @ApiProperty({ format: 'uuid' })
  registradoPor!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Descifradas. En la base son ilegibles.' })
  observaciones!: string | null;
}

/** Fila de la alerta de pacientes sin control en el plazo esperado. */
export class HipertensoAtrasadoDto {
  @ApiProperty({ format: 'uuid' })
  programaId!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ format: 'date-time' })
  proximoControl!: Date;

  @ApiProperty({ description: 'Dias transcurridos desde la fecha en que debio venir.', example: 23 })
  diasDeAtraso!: number;
}
