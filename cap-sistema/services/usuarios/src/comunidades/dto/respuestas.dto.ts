import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Comunidad reducida a lo que necesita mostrarse dentro de otro registro. */
export class ComunidadResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Purulha Centro' })
  nombre!: string;
}

export class ComunidadDto extends ComunidadResumenDto {
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Codigo interno del CAP, si lo tiene.' })
  codigo?: string | null;

  @ApiProperty({
    description:
      'Comunidad lejana al CAP. Cambia la prioridad de seguimiento: a quien vive lejos no se le cita por gusto.',
  })
  distante!: boolean;

  @ApiProperty({ description: 'Una comunidad inactiva ya no aparece al registrar pacientes.' })
  activa!: boolean;
}

/**
 * Un barrio, caserio o aldea dentro de una comunidad.
 *
 * La comunidad sola no basta para encontrar a nadie: "Purulha Centro" son
 * varios barrios, y quien va a buscar a un paciente a su casa necesita saber
 * cual.
 */
export class LugarResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Barrio El Centro' })
  nombre!: string;

  @ApiProperty({ enum: ['BARRIO', 'CASERIO', 'ALDEA', 'OTRO'] })
  tipo!: string;
}
