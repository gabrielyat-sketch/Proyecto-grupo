import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

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

/**
 * Cambiar el turno de alguien en la sala.
 *
 * Llega una emergencia y hay que pasarla adelante. El motivo es opcional en
 * la API —mover un puesto arriba o abajo no necesita explicacion— pero la
 * pantalla lo exige al pasar a alguien al frente: quien lleva una hora sentado
 * merece saber por que le pasaron adelante.
 */
export class CambiarOrdenDto {
  @ApiProperty({ example: 1, description: 'La posicion que va a ocupar, empezando en 1.' })
  @IsInt()
  @Min(1)
  posicion!: number;

  @ApiPropertyOptional({
    description: 'Por que se le adelanta. Se guarda cifrado y sale en la sala como aviso.',
    example: 'Dolor de pecho',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  motivo?: string;
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

  /**
   * La fecha, ademas de la edad en anios.
   *
   * La edad en anios no basta para saber que hoja del MSPAS toca: un recien
   * nacido y un bebe de ocho meses son los dos «0», y les corresponden fichas
   * distintas —la de menor de 28 dias y la de lactancia y ninez—. Sin la
   * fecha, el boton de atender de la sala de espera no puede elegir, y abria
   * siempre la de adultos.
   */
  @ApiProperty({ format: 'date-time' })
  fechaNacimiento!: Date;

  @ApiProperty({ example: 'F' })
  sexo!: string;

  @ApiProperty()
  comunidad!: string;

  @ApiProperty({ type: String, nullable: true, example: 'EXP-2026-000123' })
  numeroExpediente!: string | null;

  /**
   * El numero del folder de carton donde vive el expediente de papel.
   *
   * Nulo cuando el paciente todavia no esta en ninguna carpeta: registrar a
   * alguien sin ella esta permitido, y la pantalla tiene que distinguir «no
   * tiene» de «no lo sabemos».
   */
  @ApiProperty({ type: Number, nullable: true, example: 47 })
  familiaNumero!: number | null;

  @ApiProperty({ format: 'date-time' })
  llegadaEn!: Date;

  @ApiProperty({ description: 'Minutos que lleva esperando, al momento de responder.', example: 23 })
  esperandoMinutos!: number;

  @ApiProperty({ type: String, nullable: true, description: 'Descifrado al vuelo.' })
  motivo!: string | null;

  @ApiProperty({ example: 1, description: 'El turno: la posicion en la sala de hoy.' })
  orden!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Por que se le paso adelante. Nulo si nadie lo adelanto.',
    example: 'Dolor de pecho',
  })
  motivoPrioridad!: string | null;
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
