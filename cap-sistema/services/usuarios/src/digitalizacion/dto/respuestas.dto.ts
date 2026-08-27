import { ApiProperty } from '@nestjs/swagger';

export class ConteoPorEstadoDto {
  @ApiProperty({ example: 1240 })
  PENDIENTE!: number;

  @ApiProperty({ example: 85 })
  EN_PROCESO!: number;

  @ApiProperty({ example: 613 })
  COMPLETO!: number;

  @ApiProperty({ description: 'Expedientes que el personal no encontro en el archivo fisico.', example: 12 })
  NO_LOCALIZADO!: number;
}

/**
 * Avance de la digitalizacion (RF-08). Es el panel que responde "cuanto nos
 * falta", y el que sostiene la mitigacion del riesgo R-6.
 */
export class ResumenDigitalizacionDto {
  @ApiProperty({ example: 1950 })
  total!: number;

  @ApiProperty({ type: ConteoPorEstadoDto })
  porEstado!: ConteoPorEstadoDto;

  @ApiProperty({ description: 'Con un decimal. 0 cuando todavia no hay expedientes.', example: 31.4 })
  porcentajeCompleto!: number;
}

export class RegistroDigitalizacionDto {
  @ApiProperty({ format: 'uuid' })
  expedienteId!: string;

  @ApiProperty({ enum: ['PENDIENTE', 'EN_PROCESO', 'COMPLETO', 'NO_LOCALIZADO'] })
  estado!: string;

  @ApiProperty({ type: String, nullable: true })
  digitalizadoPor!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  iniciadoEn!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completadoEn!: Date | null;

  @ApiProperty({ example: 7 })
  atencionesTranscritas!: number;

  @ApiProperty({ type: String, nullable: true, maxLength: 500 })
  observaciones!: string | null;
}

/**
 * Una fila de la cola de trabajo: un expediente de papel por transcribir.
 *
 * NO lleva DPI ni telefono, igual que el listado de recepcion. Esta pantalla
 * se usa con carpetas abiertas sobre la mesa y otras personas alrededor; el
 * nombre y el numero bastan para encontrar la carpeta.
 */
export class ExpedienteEnColaDto {
  @ApiProperty({ format: 'uuid' })
  expedienteId!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ example: 'EXP-2026-000123' })
  numero!: string;

  @ApiProperty()
  nombres!: string;

  @ApiProperty()
  apellidos!: string;

  @ApiProperty({ example: 41 })
  edad!: number;

  @ApiProperty({ example: 'F' })
  sexo!: string;

  @ApiProperty()
  comunidad!: string;

  @ApiProperty({ enum: ['PENDIENTE', 'EN_PROCESO', 'COMPLETO', 'NO_LOCALIZADO'] })
  estado!: string;

  @ApiProperty({ description: 'Cuantas atenciones del papel se llevan transcritas.', example: 3 })
  atencionesTranscritas!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  iniciadoEn!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  observaciones!: string | null;
}

/** Avance de una comunidad. Es la unidad en que se recorre el archivo. */
export class AvanceComunidadDto {
  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ example: 'Matanzas' })
  nombre!: string;

  @ApiProperty({ description: 'Comunidad lejana al CAP.' })
  distante!: boolean;

  @ApiProperty({ example: 240 })
  total!: number;

  @ApiProperty({ example: 96 })
  completos!: number;

  @ApiProperty({ example: 138, description: 'Pendientes y en proceso: lo que falta por hacer.' })
  faltantes!: number;

  @ApiProperty({ example: 6, description: 'Buscados en el archivo y no encontrados.' })
  noLocalizados!: number;

  @ApiProperty({ description: 'Con un decimal.', example: 40 })
  porcentajeCompleto!: number;
}
