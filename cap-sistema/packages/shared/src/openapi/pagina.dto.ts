import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { TAMANO_PAGINA_MAXIMO, TAMANO_PAGINA_POR_DEFECTO } from '../paginacion/paginacion';

/**
 * Metadatos de un listado paginado. La lista en si (`datos`) la agrega el
 * decorador de abajo, porque su tipo cambia en cada endpoint.
 */
export class PaginaDto {
  @ApiProperty({ description: 'Pagina devuelta, empezando en 1.', example: 1 })
  pagina!: number;

  @ApiProperty({
    description: 'Registros por pagina. El servidor recorta cualquier valor mayor al maximo.',
    maximum: TAMANO_PAGINA_MAXIMO,
    example: 25,
  })
  tamano!: number;

  @ApiProperty({ description: 'Total de registros que cumplen el filtro.', example: 137 })
  total!: number;

  @ApiProperty({ description: 'Total de paginas. Nunca es menor que 1.', example: 6 })
  totalPaginas!: number;
}

/**
 * Documenta un listado paginado de `modelo`.
 *
 * `Pagina<T>` es un generico de TypeScript, y OpenAPI no tiene genericos: hay que
 * componer el esquema a mano. Sin este decorador cada endpoint paginado tendria
 * que repetir el mismo `allOf` de seis lineas, y basta con que uno quede desfasado
 * para que el cliente generado mienta.
 *
 * Uso:  @ApiPaginaDe(PacienteDto)
 */
export function ApiPaginaDe(modelo: Type<unknown>, descripcion?: string) {
  return applyDecorators(
    ApiExtraModels(PaginaDto, modelo),
    ApiOkResponse({
      description: descripcion ?? 'Listado paginado.',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginaDto) },
          {
            type: 'object',
            required: ['datos'],
            properties: {
              datos: { type: 'array', items: { $ref: getSchemaPath(modelo) } },
            },
          },
        ],
      },
    }),
  );
}

/**
 * Declara `pagina` y `tamano` como OPCIONALES.
 *
 * Sin esto Nest los publica como obligatorios: un parametro `@Query('pagina')
 * pagina?: string` es opcional en TypeScript, pero el `?` se pierde al compilar
 * y Swagger no puede verlo. El contrato entonces obliga al frontend a enviar
 * pagina y tamano en TODAS las consultas, y el cliente generado no compila sin
 * ellos.
 */
export function ApiParametrosPagina() {
  return applyDecorators(
    ApiQuery({
      name: 'pagina',
      required: false,
      type: Number,
      description: 'Empieza en 1. Por defecto 1.',
      example: 1,
    }),
    ApiQuery({
      name: 'tamano',
      required: false,
      type: Number,
      description:
        'Por defecto ' + TAMANO_PAGINA_POR_DEFECTO + '. El servidor recorta cualquier valor mayor a ' +
        TAMANO_PAGINA_MAXIMO + '.',
      example: TAMANO_PAGINA_POR_DEFECTO,
    }),
  );
}
