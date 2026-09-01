import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

/**
 * Ajuste de un lote por conteo fisico.
 *
 * Se manda **lo contado**, no la diferencia. Quien recorre el estante cuenta
 * unidades: "hay 95". Pedirle la diferencia lo obliga a restar de cabeza y a
 * acertar el signo, y equivocarse ahi deja el inventario peor de como estaba.
 * La diferencia la calcula el servidor y la guarda en el libro mayor.
 */
export class AjustarLoteDto {
  @ApiProperty({
    description: 'Las unidades que hay fisicamente en el estante.',
    example: 95,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad contada tiene que ser un numero entero.' })
  @Min(0)
  @Max(1000000)
  cantidadContada!: number;

  /**
   * La existencia que el sistema mostraba cuando se hizo el conteo.
   *
   * Es un control optimista, y aqui hace falta de verdad. El ajuste fija un
   * valor ABSOLUTO, asi que no sirve el descuento condicional que protege a las
   * entregas: si alguien entrega 10 mientras otra persona cuenta, guardar el
   * conteo pisaria esa entrega y la existencia quedaria mal sin que nadie lo
   * note. Con este campo, el servidor detecta que la existencia se movio y pide
   * volver a contar en vez de aceptar un numero que ya es viejo.
   */
  @ApiProperty({
    description: 'La existencia que mostraba el sistema al empezar a contar.',
    example: 100,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  cantidadEnSistema!: number;

  @ApiProperty({
    description: 'Por que no coincide. Un descuadre sin explicacion no sirve de nada.',
    example: 'Conteo fisico del 28/08/2026: aparecieron 5 cajas mal ubicadas.',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 200, { message: 'Explique el motivo del ajuste en 3 a 200 caracteres.' })
  motivo!: string;
}
