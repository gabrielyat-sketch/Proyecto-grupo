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
