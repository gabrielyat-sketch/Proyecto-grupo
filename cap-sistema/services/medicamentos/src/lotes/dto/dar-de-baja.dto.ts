import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/**
 * El motivo de una baja de inventario.
 *
 * Es obligatorio y tiene tope de 200 caracteres, que es lo que cabe en la
 * columna. Antes el cuerpo era un tipo suelto sin clase, asi que no se validaba
 * nada y el servicio recortaba con `slice(0, 200)` para no reventar la base:
 * la baja quedaba registrada con el motivo cortado a media frase, y el motivo
 * es justamente lo que justifica haber destruido medicamento. Ahora se rechaza
 * con un 400 que dice el limite, en vez de truncar en silencio.
 */
export class DarDeBajaLoteDto {
  @ApiProperty({
    example: 'Vencido el 2026-07-31, retirado del estante y destruido segun acta 14-2026.',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 200, {
    message: 'Explique el motivo de la baja en 3 a 200 caracteres.',
  })
  motivo!: string;
}
