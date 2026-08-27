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
