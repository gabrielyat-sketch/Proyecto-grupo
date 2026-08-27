import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

/** Marcar que alguien llego al CAP. */
export class MarcarLlegadaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pacienteId!: string;

  @ApiPropertyOptional({
    description: 'A que viene, en una linea. Se guarda cifrado.',
    example: 'Control de embarazo',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  motivo?: string;
}

/**
 * Sacar a alguien de la sala de espera sin ficha.
 *
 * El motivo es obligatorio. "Se fue" no le sirve a nadie dentro de un mes; lo
 * que importa es si se fue porque tardaron o porque lo mandaron a otro lado.
 */
export class RetirarVisitaDto {
  @ApiProperty({ example: 'Se canso de esperar y se fue' })
  @IsString()
  @Length(3, 200)
  motivo!: string;
}

export class VisitaEnEsperaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

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

  @ApiProperty({ type: String, nullable: true, example: 'EXP-2026-000123' })
  numeroExpediente!: string | null;

  @ApiProperty({ format: 'date-time' })
  llegadaEn!: Date;

  @ApiProperty({ description: 'Minutos que lleva esperando, al momento de responder.', example: 23 })
  esperandoMinutos!: number;

  @ApiProperty({ type: String, nullable: true, description: 'Descifrado al vuelo.' })
  motivo!: string | null;
}

export class VisitaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ enum: ['ESPERANDO', 'ATENDIDA', 'RETIRADA'] })
  estado!: string;

  @ApiProperty({ format: 'date-time' })
  llegadaEn!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cerradaEn!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  motivo!: string | null;

  @ApiProperty({ type: String, nullable: true })
  motivoRetiro!: string | null;
}
