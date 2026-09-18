import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';

/**
 * Por que sale alguien del programa de hipertension.
 *
 * Como en el cierre de embarazo, el cuerpo estaba escrito en linea y el
 * contrato salia sin decir que acepta.
 *
 * El motivo es OBLIGATORIO y no un texto suelto que se pueda dejar vacio.
 * «Abandono» y «trasladado» son dos formas muy distintas de dejar de venir, y
 * la diferencia solo vive aqui: el estado dice cual de las dos, y el motivo
 * dice lo que el estado no alcanza a contar —a donde se traslado, desde cuando
 * no aparece—. Sin eso, un ano despues nadie puede reconstruir por que se dejo
 * de seguir a un hipertenso.
 */
export class EgresarHipertensionDto {
  @ApiProperty({
    enum: ['EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO'],
    example: 'TRASLADADO',
  })
  @IsEnum(['EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO'])
  estado!: 'EGRESADO' | 'ABANDONO' | 'FALLECIDO' | 'TRASLADADO';

  @ApiProperty({ example: 'Se traslado a Salama con su hija' })
  @IsString()
  @Length(3, 300)
  motivo!: string;
}
