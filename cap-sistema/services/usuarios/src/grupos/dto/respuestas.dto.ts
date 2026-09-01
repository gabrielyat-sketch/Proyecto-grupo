import { ApiProperty } from '@nestjs/swagger';
import { ComunidadResumenDto, LugarResumenDto } from '../../comunidades/dto/respuestas.dto';

export class GrupoFamiliarResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1, description: 'El numero escrito en la pestana del folder.' })
  numero!: number;

  @ApiProperty({ example: 'Lopez Ac', description: 'El apellido con que se rotula.' })
  apellidos!: string;

  @ApiProperty({ type: String, nullable: true })
  direccion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;

  @ApiProperty({ type: LugarResumenDto, nullable: true })
  lugar!: LugarResumenDto | null;

  @ApiProperty({
    description: 'Contado en la base de datos, no trayendo a los integrantes: evita el N+1 de esta pantalla.',
    example: 5,
  })
  integrantes!: number;
}

export class IntegranteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombres!: string;

  @ApiProperty()
  apellidos!: string;

  @ApiProperty({ format: 'date-time' })
  fechaNacimiento!: Date;

  @ApiProperty({ example: 'M' })
  sexo!: string;

  @ApiProperty()
  fallecido!: boolean;

  @ApiProperty({ example: 12 })
  edad!: number;
}

export class GrupoFamiliarDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  numero!: number;

  @ApiProperty({ example: 'Lopez Ac' })
  apellidos!: string;

  @ApiProperty({ type: String, nullable: true })
  direccion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;

  @ApiProperty({ type: LugarResumenDto, nullable: true })
  lugar!: LugarResumenDto | null;

  @ApiProperty({ type: [IntegranteDto], description: 'Ordenados del mayor al menor.' })
  integrantes!: IntegranteDto[];
}

export class GrupoFamiliarCreadoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  numero!: number;

  @ApiProperty({ example: 'Lopez Ac' })
  apellidos!: string;

  @ApiProperty({ type: String, nullable: true })
  direccion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  lugarId!: string | null;
}

/**
 * El siguiente numero libre de una serie.
 *
 * Se devuelve tambien la serie para que la pantalla sepa a que corresponde el
 * numero que esta mostrando: el mismo «No. 3» significa cosas distintas en El
 * Calvario y en San Jose.
 */
export class SiguienteNumeroDto {
  @ApiProperty({
    description: 'El lugar poblado, o la comunidad cuando la familia no tiene barrio.',
    format: 'uuid',
  })
  serieId!: string;

  @ApiProperty({ example: 3, description: 'El mayor usado en esa serie, mas uno.' })
  numero!: number;
}
