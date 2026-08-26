import { ApiProperty } from '@nestjs/swagger';
import { ComunidadResumenDto } from '../../comunidades/dto/respuestas.dto';

export class ExpedienteResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Descifrado al vuelo. En la base vive cifrado.', example: 'EXP-2026-000123' })
  numero!: string;
}

export class ExpedienteDePacienteDto extends ExpedienteResumenDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Apertura del expediente EN PAPEL, que puede ser muy anterior a la digitalizacion. '+
      'null cuando no se conoce: los expedientes viejos no siempre la traen.',
  })
  aperturaEn!: Date | null;
}

export class GrupoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'GF-2026-000045' })
  codigo!: string;
}

/**
 * Fila del listado de busqueda.
 *
 * NO trae DPI ni telefono. El listado se muestra en pantalla frente a la fila
 * de espera; el dato identificador solo aparece al abrir la ficha.
 */
export class PacienteResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombres!: string;

  @ApiProperty()
  apellidos!: string;

  @ApiProperty({ format: 'date-time' })
  fechaNacimiento!: Date;

  @ApiProperty({ description: 'Calculada al momento de responder.', example: 34 })
  edad!: number;

  @ApiProperty({ example: 'F' })
  sexo!: string;

  @ApiProperty({ description: 'Idioma de atencion. En Purulha buena parte del padron habla q eqchi.', example: 'ES' })
  idioma!: string;

  @ApiProperty()
  fallecido!: boolean;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;

  @ApiProperty({ type: ExpedienteResumenDto, nullable: true })
  expediente!: ExpedienteResumenDto | null;
}

/** Ficha completa. Es la unica respuesta que incluye el DPI descifrado. */
export class PacienteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true, description: 'null cuando el paciente no tiene DPI registrado.' })
  dpi!: string | null;

  @ApiProperty()
  nombres!: string;

  @ApiProperty()
  apellidos!: string;

  @ApiProperty({ format: 'date-time' })
  fechaNacimiento!: Date;

  @ApiProperty({ example: 34 })
  edad!: number;

  @ApiProperty({ example: 'F' })
  sexo!: string;

  @ApiProperty({ example: 'ES' })
  idioma!: string;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty()
  fallecido!: boolean;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;

  @ApiProperty({ type: GrupoResumenDto, nullable: true })
  grupoFamiliar!: GrupoResumenDto | null;

  @ApiProperty({ type: ExpedienteDePacienteDto, nullable: true })
  expediente!: ExpedienteDePacienteDto | null;
}

/**
 * Alta de paciente. Devuelve el numero de expediente porque es lo que recepcion
 * escribe en la carpeta de papel en ese mismo momento.
 */
export class PacienteCreadoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'EXP-2026-000123' })
  numeroExpediente!: string;

  @ApiProperty({ format: 'uuid' })
  expedienteId!: string;
}
