import { ApiProperty } from '@nestjs/swagger';
import { ComunidadResumenDto, LugarResumenDto } from '../../comunidades/dto/respuestas.dto';

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

/**
 * La carpeta familiar de un paciente, tal como se rotula el folder.
 *
 * Lleva el lugar y no solo el numero porque el numero solo no identifica: el
 * CAP numera por barrio y caserio, asi que hay un «No. 3» en El Calvario y
 * otro en San Jose. «Familia Lopez Ac · El Calvario · No. 3» si es unico.
 */
export class GrupoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 3, description: 'El numero escrito en la pestana del folder.' })
  numero!: number;

  @ApiProperty({ example: 'Lopez Ac' })
  apellidos!: string;

  @ApiProperty({ type: LugarResumenDto, nullable: true })
  lugar!: LugarResumenDto | null;
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

  @ApiProperty({ type: LugarResumenDto, nullable: true })
  lugar!: LugarResumenDto | null;

  @ApiProperty({ description: 'Si viene de fuera de Purulha.' })
  migrante!: boolean;

  @ApiProperty({ type: String, nullable: true })
  lugarOrigen!: string | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description: 'null significa que NO se ha preguntado, que no es lo mismo que no tener.',
  })
  tieneAlergias!: boolean | null;

  @ApiProperty({ type: String, nullable: true, description: 'A que medicamentos.' })
  alergias!: string | null;

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
