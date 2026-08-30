import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class CerrarDiaDto {
  @ApiPropertyOptional({
    description: 'Dia a cerrar, AAAA-MM-DD. Si se omite, se cierra el de ayer.',
    example: '2026-08-25',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'El dia se indica como AAAA-MM-DD.' })
  dia?: string;
}
