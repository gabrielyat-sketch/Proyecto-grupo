import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Rol, TAMANO_PAGINA_MAXIMO } from '@cap/shared';

export class ConsultarUsuariosDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ default: 25, maximum: TAMANO_PAGINA_MAXIMO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TAMANO_PAGINA_MAXIMO)
  tamano?: number;

  @ApiPropertyOptional({ enum: Rol })
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @ApiPropertyOptional({ description: 'Busca en usuario, nombres y apellidos' })
  @IsOptional()
  @IsString()
  buscar?: string;
}
