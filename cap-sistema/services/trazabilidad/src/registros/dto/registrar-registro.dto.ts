import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Accion } from '../../../generado';

/** Servicios que pueden originar una entrada. Lista cerrada a proposito. */
export const SERVICIOS = ['auth', 'usuarios', 'programas', 'medicamentos', 'reportes', 'cms'] as const;

export class RegistrarRegistroDto {
  @ApiProperty({ enum: SERVICIOS, description: 'Servicio que origino la accion.' })
  @IsIn(SERVICIOS as unknown as string[])
  servicio!: string;

  @ApiProperty({ enum: Accion })
  @IsEnum(Accion)
  accion!: Accion;

  @ApiProperty({ example: 'expediente', description: 'Tipo de dato tocado.' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  entidad!: string;

  @ApiProperty({ example: 'exp-000123', description: 'Id del dato en el servicio de origen.' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  entidadId!: string;

  @ApiPropertyOptional({
    description:
      'Por que se hizo. §10.4 lo exige junto con usuario, fecha y accion. ' +
      'Obligatorio para consultas de expediente e impresiones.',
    example: 'Correccion tras revision medica',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;

  @ApiPropertyOptional({
    description:
      'Valor antes del cambio, EN CLARO. El servicio lo cifra antes de guardarlo; ' +
      'nunca queda legible en la base.',
    example: 'Hipertension arterial leve',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  valorAnterior?: string;

  @ApiPropertyOptional({
    description: 'Valor despues del cambio, en claro.',
    example: 'Hipertension arterial moderada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  valorNuevo?: string;

  @ApiPropertyOptional({
    description:
      'Cuando ocurrio en el servicio de origen. Si no se envia, se toma el momento ' +
      'de la recepcion.',
    example: '2026-08-26T18:23:27.531Z',
  })
  @IsOptional()
  @IsISO8601()
  ocurridoEn?: string;

  @ApiPropertyOptional({ description: 'IP del cliente que origino la accion.', example: '10.0.0.5' })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  ip?: string;
}
