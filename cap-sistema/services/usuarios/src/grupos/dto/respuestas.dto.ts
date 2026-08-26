import { ApiProperty } from '@nestjs/swagger';
import { ComunidadResumenDto } from '../../comunidades/dto/respuestas.dto';

export class GrupoFamiliarResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'GF-2026-000045' })
  codigo!: string;

  @ApiProperty({ type: String, nullable: true })
  direccion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;

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

  @ApiProperty({ example: 'GF-2026-000045' })
  codigo!: string;

  @ApiProperty({ type: String, nullable: true })
  direccion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty({ type: ComunidadResumenDto })
  comunidad!: ComunidadResumenDto;

  @ApiProperty({ type: [IntegranteDto], description: 'Ordenados del mayor al menor.' })
  integrantes!: IntegranteDto[];
}

export class GrupoFamiliarCreadoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'GF-2026-000045' })
  codigo!: string;

  @ApiProperty({ type: String, nullable: true })
  direccion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telefono!: string | null;

  @ApiProperty({ format: 'uuid' })
  comunidadId!: string;
}
