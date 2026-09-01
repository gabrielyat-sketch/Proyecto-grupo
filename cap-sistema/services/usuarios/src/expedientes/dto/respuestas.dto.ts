import { ApiProperty } from '@nestjs/swagger';
import { ComunidadResumenDto } from '../../comunidades/dto/respuestas.dto';

export class PacienteDelExpedienteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombres!: string;

  @ApiProperty()
  apellidos!: string;

  @ApiProperty({ format: 'date-time' })
  fechaNacimiento!: Date;

  @ApiProperty({ example: 'F' })
  sexo!: string;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;
}

export class DigitalizacionDelExpedienteDto {
  @ApiProperty({ enum: ['PENDIENTE', 'EN_PROCESO', 'COMPLETO', 'NO_LOCALIZADO'] })
  estado!: string;

  @ApiProperty({ type: String, nullable: true })
  digitalizadoPor!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  iniciadoEn!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completadoEn!: Date | null;

  @ApiProperty({ description: 'Cuantas atenciones del papel se transcribieron.' })
  atencionesTranscritas!: number;

  @ApiProperty({ type: String, nullable: true })
  observaciones!: string | null;
}

/**
 * Resultado de buscar por numero de expediente.
 *
 * `numero` llega descifrado: en la base vive cifrado y se busca por su indice
 * ciego, igual que el DPI.
 */
export class ExpedienteEncontradoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'EXP-2026-000123' })
  numero!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Apertura del expediente en papel. null cuando no se conoce.',
  })
  aperturaEn!: Date | null;

  @ApiProperty({ type: PacienteDelExpedienteDto })
  paciente!: PacienteDelExpedienteDto;

  @ApiProperty({ type: DigitalizacionDelExpedienteDto, nullable: true })
  digitalizacion!: DigitalizacionDelExpedienteDto | null;
}
