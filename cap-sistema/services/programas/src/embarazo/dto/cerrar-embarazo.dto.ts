import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * Como termino el embarazo.
 *
 * El cuerpo estaba escrito en linea —`@Body() dto: { resultado: string }`— y
 * eso deja dos agujeros a la vez: el contrato sale sin decir que acepta, asi
 * que el cliente generado no tiene tipos; y como no habia validacion, el
 * servicio hacia `resultado as never` para poder guardarlo. Cualquier cadena
 * entraba y se escribia en una columna que es un enum: el primer valor mal
 * escrito habria reventado en la base, no en la puerta.
 *
 * Los valores son los del enum `ResultadoEmbarazo` del esquema. `OTRO` existe
 * porque un embarazo puede terminar de formas que el catalogo no previo, y
 * cerrar el seguimiento no puede quedar bloqueado por eso.
 */
export class CerrarEmbarazoDto {
  @ApiProperty({
    enum: ['PARTO_NORMAL', 'CESAREA', 'ABORTO', 'OBITO', 'TRASLADO', 'OTRO'],
    example: 'PARTO_NORMAL',
  })
  @IsEnum(['PARTO_NORMAL', 'CESAREA', 'ABORTO', 'OBITO', 'TRASLADO', 'OTRO'])
  resultado!: string;
}
