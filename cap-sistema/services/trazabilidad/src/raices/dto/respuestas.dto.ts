import { ApiProperty } from '@nestjs/swagger';

/**
 * El cierre de un dia: el sello de todo lo que se registro en el.
 *
 * Guardar el hash final de cada jornada acota lo que hay que recorrer para
 * comprobar que nadie toco la bitacora: si el sello de ayer sigue cuadrando,
 * lo de antes de ayer no hace falta volver a mirarlo. Sin eso, verificar
 * costaria mas cada dia que pasa.
 */
export class RaizDiariaDto {
  @ApiProperty({ format: 'date', example: '2026-09-17' })
  dia!: string;

  /** Como en `RegistroDto`: es un BigInt y viaja como texto. */
  @ApiProperty({ example: '901' })
  numeroDesde!: string;

  @ApiProperty({ example: '1042' })
  numeroHasta!: string;

  @ApiProperty({ example: 142, description: 'Cuantas entradas entraron ese dia.' })
  cantidad!: number;

  @ApiProperty({
    example: '9b7c...',
    description: 'El hash de la ultima entrada del dia: el sello de la jornada.',
  })
  hashFinal!: string;
}
