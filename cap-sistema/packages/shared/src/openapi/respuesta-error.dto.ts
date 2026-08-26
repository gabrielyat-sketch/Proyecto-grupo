import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CodigoError, type RespuestaError } from '../errores/respuesta-error';

/**
 * Version documentable del formato unico de error (§8.1).
 *
 * `RespuestaError` es una interfaz: en tiempo de ejecucion no existe, y Swagger
 * no puede documentar lo que no existe. Esta clase es la misma forma, pero con
 * decoradores, para que el contrato la publique y el frontend la reciba tipada.
 *
 * `implements RespuestaError` no es adorno: si alguien cambia la interfaz y
 * olvida esta clase, el compilador lo detiene.
 */
export class RespuestaErrorDto implements RespuestaError {
  @ApiProperty({
    description: 'Codigo estable. El cliente decide que hacer segun este valor, no segun el mensaje.',
    enum: Object.values(CodigoError),
    example: CodigoError.VALIDACION,
  })
  codigo!: string;

  @ApiProperty({
    description: 'Mensaje en espanol, apto para mostrarse tal cual al usuario.',
    example: 'La informacion enviada no es valida.',
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: 'Detalle por campo. Presente sobre todo en errores de validacion.',
    type: [String],
    example: ['dpi debe tener 13 digitos'],
  })
  detalles?: string[];

  @ApiProperty({
    description: 'Identificador de correlacion. Es lo que se busca en los logs para esta peticion.',
    example: '7f3a1c2e-9b4d-4e21-8a55-0c1d2e3f4a5b',
  })
  trazaId!: string;

  @ApiProperty({ example: '/v1/pacientes' })
  ruta!: string;

  @ApiProperty({ format: 'date-time', example: '2026-08-26T15:04:05.000Z' })
  fecha!: string;
}
