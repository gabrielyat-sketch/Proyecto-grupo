import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxDate,
  Min,
  ValidateNested,
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

/** Los datos que hacen falta para abrir una carpeta al registrar un paciente. */
export class CarpetaNuevaDto {
  @ApiProperty({ example: 'Lopez Ac', description: 'El apellido con que se rotula el folder.' })
  @IsString()
  @Length(1, 120)
  apellidos!: string;

  @ApiPropertyOptional({
    description: 'El numero de la pestana. Si se omite, se usa el siguiente libre de la serie.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero?: number;
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

  /**
   * Abre una carpeta nueva y mete al paciente en ella, en un solo paso.
   *
   * Alternativa a `grupoFamiliarId`, no complemento: o la carpeta ya existe y
   * se dice cual, o no existe y se dice como llamarla.
   *
   * Va aqui y no en dos llamadas seguidas desde la pantalla porque las dos
   * cosas tienen que ocurrir juntas o ninguna: si el alta falla despues de
   * crear la carpeta, queda un folder vacio ocupando un numero, y el siguiente
   * que registre a esa familia vera el numero tomado sin nadie dentro.
   *
   * La comunidad y el lugar son los del paciente: la carpeta se guarda donde
   * vive la familia, asi que pedirlos otra vez seria pedir dos veces el mismo
   * dato y arriesgar que no coincidan.
   */
  @ApiPropertyOptional({ type: () => CarpetaNuevaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarpetaNuevaDto)
  carpetaNueva?: CarpetaNuevaDto;

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

  /**
   * Barrio, caserio o aldea dentro de la comunidad.
   *
   * Opcional: hay comunidades cuyos lugares el CAP todavia no ha declarado, y
   * exigirlo impediria registrar a un paciente por un catalogo incompleto.
   */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  lugarId?: string;

  /** Para quien no es de Purulha. La ficha oficial lo pregunta. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  migrante?: boolean;

  @ApiPropertyOptional({ maxLength: 160, description: 'De donde viene, si es migrante.' })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  lugarOrigen?: string;

  /**
   * Si es alergico a algun medicamento.
   *
   * TRES estados, no dos: sin enviarlo queda en "no se ha preguntado", que NO
   * es lo mismo que "no tiene". A quien no se le pregunto hay que preguntarle
   * antes de recetar; a quien dijo que no, no.
   */
  @ApiPropertyOptional({ description: 'Omitirlo significa que no se ha preguntado.' })
  @IsOptional()
  @IsBoolean()
  tieneAlergias?: boolean;

  @ApiPropertyOptional({ maxLength: 500, description: 'A que medicamentos es alergico.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  alergias?: string;
}
