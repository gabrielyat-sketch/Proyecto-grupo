import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxDate,
} from 'class-validator';

export enum SexoDto {
  M = 'M',
  F = 'F',
}

export enum IdiomaDto {
  ESPANOL = 'ESPANOL',
  POQOMCHI = 'POQOMCHI',
  QEQCHI = 'QEQCHI',
  OTRO = 'OTRO',
}

export class CrearPacienteDto {
  @ApiPropertyOptional({
    example: '1234567890101',
    description:
      'DPI de 13 digitos. OPCIONAL: los ninos y parte de la poblacion rural no lo tienen.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{13}$/, { message: 'El DPI debe tener exactamente 13 digitos.' })
  dpi?: string;

  @ApiProperty({ example: 'Juana Isabel' })
  @IsString()
  @Length(1, 120)
  nombres!: string;

  @ApiProperty({ example: 'Perez Caal' })
  @IsString()
  @Length(1, 120)
  apellidos!: string;

  @ApiProperty({ example: '1985-04-12' })
  @Type(() => Date)
  @IsDate({ message: 'La fecha de nacimiento no es valida.' })
  @MaxDate(() => new Date(), { message: 'La fecha de nacimiento no puede estar en el futuro.' })
  fechaNacimiento!: Date;

  @ApiProperty({ enum: SexoDto })
  @IsEnum(SexoDto)
  sexo!: SexoDto;

  @ApiPropertyOptional({ enum: IdiomaDto, default: IdiomaDto.ESPANOL })
  @IsOptional()
  @IsEnum(IdiomaDto)
  idioma?: IdiomaDto;

  @ApiProperty({ description: 'Identificador de la comunidad' })
  @IsString()
  comunidadId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grupoFamiliarId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 20)
  telefono?: string;

  @ApiPropertyOptional({
    description:
      'Numero del expediente de papel. Se usa al digitalizar; si se omite, el sistema genera uno.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  numeroExpediente?: string;

  @ApiPropertyOptional({ description: 'Marca el expediente como proveniente de papel (RF-08).' })
  @IsOptional()
  @IsBoolean()
  digitalizado?: boolean;
}
