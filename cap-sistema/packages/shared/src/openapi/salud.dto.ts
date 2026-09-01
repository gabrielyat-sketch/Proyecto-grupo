import { ApiProperty } from '@nestjs/swagger';

/**
 * Los ocho servicios exponen el mismo par de sondas (§8.1). Los DTO viven aqui
 * para que ninguno documente una forma distinta: el gateway y Docker leen las
 * ocho igual.
 */
export class SaludVivoDto {
  @ApiProperty({ enum: ['vivo'], example: 'vivo' })
  estado!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: string;
}

export class SaludListoDto {
  @ApiProperty({ enum: ['listo'], example: 'listo' })
  estado!: string;

  @ApiProperty({
    description: "'ok' cuando la base responde. Si no, el endpoint devuelve 503 en vez de este cuerpo.",
    example: 'ok',
  })
  baseDatos!: string;
}
