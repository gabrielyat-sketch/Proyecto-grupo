import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

/**
 * El codigo de seis digitos que muestra la aplicacion de autenticacion.
 *
 * Antes este cuerpo estaba escrito como un tipo suelto de TypeScript en el
 * controlador. Sin clase, el ValidationPipe no tiene metatype que inspeccionar
 * y no valida nada, y ademas el contrato OpenAPI publica la operacion SIN
 * cuerpo: el panel, que consume ese contrato tipado, no tenia forma de llamar
 * al endpoint. Es el mismo defecto que tenian los dos PATCH de medicamentos y
 * el POST de entregas.
 *
 * Se aceptan espacios porque algunas aplicaciones muestran el codigo como
 * "123 456" y quien lo transcribe lo copia tal cual.
 */
export class ActivarMfaDto {
  @ApiProperty({ example: '123456', description: 'Los seis digitos de la aplicacion.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s/g, '') : value))
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El codigo son seis digitos.' })
  codigo!: string;
}
