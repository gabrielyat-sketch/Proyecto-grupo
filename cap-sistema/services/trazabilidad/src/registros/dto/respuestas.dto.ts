import { ApiProperty } from '@nestjs/swagger';

/**
 * Una entrada de la bitacora, tal como se puede leer.
 *
 * El contrato no declaraba NINGUNA respuesta: los controladores no llevaban
 * `@ApiOkResponse`, asi que el OpenAPI salia con los caminos pero sin decir que
 * devuelven. Contra eso no se puede escribir una pantalla —el cliente generado
 * no tiene tipos— y el unico modo de saberlo era leerse el servicio.
 */
export class RegistroDto {
  /**
   * El correlativo de la cadena, como TEXTO.
   *
   * Es un `BigInt` en la base y JSON no sabe serializarlo: sale como cadena a
   * proposito. Conviene no convertirlo a numero en la pantalla —con millones
   * de entradas dejaria de ser exacto— y tratarlo como lo que es, un
   * identificador.
   */
  @ApiProperty({ example: '1042' })
  numero!: string;

  @ApiProperty({
    description: 'El hash de la entrada anterior. Es lo que encadena la bitacora.',
    example: 'a3f1...',
  })
  hashPrevio!: string;

  @ApiProperty({ example: '9b7c...' })
  hash!: string;

  @ApiProperty({ example: 'usuarios', description: 'Que servicio origino la accion.' })
  servicio!: string;

  @ApiProperty({
    enum: ['CONSULTA', 'CREACION', 'MODIFICACION', 'ELIMINACION', 'IMPRESION', 'EXPORTACION'],
  })
  accion!: string;

  @ApiProperty({ example: 'expediente' })
  entidad!: string;

  @ApiProperty({ example: 'exp-000123' })
  entidadId!: string;

  @ApiProperty({ description: 'Quien la ejecuto, del token; nunca del cuerpo de la peticion.' })
  usuarioId!: string;

  @ApiProperty({ example: 'MEDICO' })
  usuarioRol!: string;

  @ApiProperty({ type: String, nullable: true })
  motivo!: string | null;

  /**
   * Los valores viajan DESCIFRADOS, y por eso esta consulta es de Direccion y
   * Administracion: leer la bitacora entera es leer que decia cada dato antes
   * y despues de cambiarlo.
   */
  @ApiProperty({ type: String, nullable: true })
  valorAnterior!: string | null;

  @ApiProperty({ type: String, nullable: true })
  valorNuevo!: string | null;

  @ApiProperty({ description: 'Une en un mismo hilo todo lo que provoco una sola peticion.' })
  trazaId!: string;

  @ApiProperty({ type: String, nullable: true })
  ip!: string | null;

  @ApiProperty({ format: 'date-time' })
  registradoEn!: Date;
}

/**
 * El resultado de recorrer la cadena.
 *
 * No necesita las llaves de descifrado: el hash cubre el texto cifrado, asi
 * que se puede comprobar que nadie toco nada sin llegar a leer ningun
 * diagnostico. Esa es la propiedad que hace util la verificacion.
 */
export class VerificacionDto {
  @ApiProperty({ description: 'Falso en cuanto una entrada no cuadra con la anterior.' })
  intacta!: boolean;

  @ApiProperty({ example: 1042, description: 'Cuantas entradas se recorrieron.' })
  revisados!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'El numero de la primera entrada que no cuadra, si la hay.',
    example: '318',
  })
  rotoEn?: string | null;
}
