import { ApiProperty } from '@nestjs/swagger';
import { ComunidadResumenDto } from '../../comunidades/dto/respuestas.dto';

export class LugarResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;
}

export class CarpetaDelExpedienteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'El numero escrito en la pestana del folder.' })
  numero!: number;

  @ApiProperty({ description: 'El apellido con que se rotula la carpeta.' })
  apellidos!: string;
}

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

  /**
   * El barrio o caserio. Hace falta para distinguir: el mismo numero de
   * expediente existe en El Calvario y en El Carpintero, asi que sin el lugar
   * quien busca no sabe cual de las dos familias es la suya.
   */
  @ApiProperty({ type: LugarResumenDto, nullable: true })
  lugar!: LugarResumenDto | null;

  @ApiProperty({ type: CarpetaDelExpedienteDto, nullable: true })
  grupoFamiliar!: CarpetaDelExpedienteDto | null;
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
 * Un expediente de los que llevan el numero buscado.
 *
 * `numero` no viene aqui: es el mismo para todos los de la respuesta, y
 * repetirlo en cada fila invitaria a tratarlos como numeros distintos.
 */
export class ExpedienteEncontradoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

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

/**
 * Resultado de buscar por numero de expediente: VARIOS.
 *
 * El numero es de la familia —la carpeta de carton lleva un numero y dentro van
 * las fichas de todos los que viven en esa casa—, y ademas se repite entre
 * lugares. Asi que un numero puede devolver a varias personas, y hasta a dos
 * familias de barrios distintos. Devolver solo la primera esconderia a las
 * demas, que es como se abre la ficha de quien no era.
 *
 * `numero` llega descifrado: en la base vive cifrado y se busca por su indice
 * ciego, igual que el DPI.
 */
export class BusquedaPorNumeroDto {
  @ApiProperty({ example: '2', description: 'El numero buscado, tal como quedo guardado.' })
  numero!: string;

  @ApiProperty({ type: [ExpedienteEncontradoDto] })
  expedientes!: ExpedienteEncontradoDto[];
}
