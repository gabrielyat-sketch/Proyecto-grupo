import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SiguienteNumeroConsultaDto {
  @ApiProperty()
  @IsString()
  comunidadId!: string;

  @ApiPropertyOptional({
    description: 'El barrio o caserio. Sin el, la serie es la de la comunidad.',
  })
  @IsOptional()
  @IsString()
  lugarId?: string;
}
