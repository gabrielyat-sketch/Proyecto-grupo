import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Lo que se puede cambiar de un medicamento ya dado de alta.
 *
 * Es deliberadamente corto. El codigo, el nombre generico, la presentacion y
 * la unidad NO se editan: identifican al medicamento, y los lotes que ya
 * ingresaron se contaron en esa unidad. Cambiar "TABLETA" por "FRASCO" con
 * lotes dentro convertiria 500 tabletas en 500 frascos sin que nadie lo note.
 * Si un medicamento se registro mal, se desactiva y se da de alta el correcto.
 *
 * Antes este cuerpo estaba escrito como un tipo suelto de TypeScript en el
 * controlador. Eso lo dejaba sin clase, y sin clase el ValidationPipe no tiene
 * nada que validar: `whitelist` y `forbidNonWhitelisted` no se aplicaban y el
 * objeto llegaba entero hasta `prisma.update({ data })`. Cualquiera con rol de
 * Farmacia podia reescribir el codigo o la fecha de creacion. Ademas el
 * contrato OpenAPI salia sin cuerpo, asi que el panel —que consume ese
 * contrato tipado— no tenia forma de llamar a este endpoint.
 */
export class ActualizarMedicamentoDto {
  @ApiPropertyOptional({
    description: 'Debajo de esta existencia total aparece en la alerta. Cero desactiva la alerta.',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  stockMinimo?: number;

  @ApiPropertyOptional({
    description:
      'Un medicamento desactivado no admite lotes nuevos y desaparece del catalogo, pero conserva su historial.',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereReceta?: boolean;
}
