import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxDate,
  Min,
  ValidateNested,
} from 'class-validator';

export enum RespuestaAntecedenteDto {
  SI = 'SI',
  NO = 'NO',
  NO_APLICA = 'NO_APLICA',
}

/** La respuesta a un antecedente del catalogo. */
export class GuardarAntecedenteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  antecedenteId!: string;

  @ApiProperty({
    enum: RespuestaAntecedenteDto,
    description:
      'NO_APLICA solo se acepta en los antecedentes que lo permiten; el papel no ofrece esa ' +
      'casilla en todos.',
  })
  @IsEnum(RespuestaAntecedenteDto)
  respuesta!: RespuestaAntecedenteDto;

  @ApiPropertyOptional({ description: 'El "cual" del papel: que medicamento, que cancer.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  detalle?: string;

  @ApiPropertyOptional({ description: 'Fecha de la ultima dosis, de la ultima citologia.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'La fecha no puede estar en el futuro.' })
  fecha?: Date;

  @ApiPropertyOptional({ description: 'Numero de dosis, cigarrillos al dia.', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  numero?: number;
}

/**
 * Antecedentes gineco-obstetricos.
 *
 * Todos opcionales: en el papel tampoco se llenan todos, y exigir campos que el
 * personal deja en blanco a diario solo lleva a que inventen valores para poder
 * guardar.
 */
export class GuardarObstetricosDto {
  @ApiPropertyOptional({ description: 'Fecha de ultima menstruacion.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'La FUR no puede estar en el futuro.' })
  fur?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  gestas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  partos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  abortos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  abortosConsecutivos?: boolean;

  @ApiPropertyOptional({ description: 'Legrados intrauterinos.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  legradosLiu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  cesareas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  nacidosVivos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  nacidosMuertos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  hijosVivos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  hijosMuertos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  embarazosMultiples?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'La fecha del ultimo parto no puede estar en el futuro.' })
  fechaUltimoParto?: Date;

  @ApiPropertyOptional({ description: 'Ninos nacidos antes de los 8 meses.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  prematurosAntes8Meses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preeclampsia?: boolean;

  @ApiPropertyOptional({ description: 'Papanicolau o IVAA.', example: 'PAPANICOLAU' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  tamizajeCervix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'La fecha del tamizaje no puede estar en el futuro.' })
  tamizajeFecha?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tamizajeNormal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  usaPlanificacion?: boolean;

  @ApiPropertyOptional({ example: 'Inyección' })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  metodoPlanificacion?: string;

  @ApiPropertyOptional({ example: 'O' })
  @IsOptional()
  @IsString()
  @Length(1, 3)
  tipoSangre?: string;

  @ApiPropertyOptional({ description: 'true para RH (+), false para RH (-).' })
  @IsOptional()
  @IsBoolean()
  rhPositivo?: boolean;
}

/**
 * Lo que se envia para guardar antecedentes.
 *
 * Es una actualizacion PARCIAL: solo se tocan los antecedentes que vienen en la
 * peticion. Los que no vienen se conservan tal como estaban.
 *
 * Es deliberado y por eso el verbo es PATCH. Si guardar reemplazara el conjunto
 * completo, llenar media hoja borraria lo que otro turno ya habia preguntado, y
 * el expediente perderia historia sin que nadie lo notara.
 */
export class GuardarAntecedentesDto {
  @ApiPropertyOptional({ type: [GuardarAntecedenteDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardarAntecedenteDto)
  @ArrayMaxSize(120)
  marcados?: GuardarAntecedenteDto[];

  @ApiPropertyOptional({ type: GuardarObstetricosDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuardarObstetricosDto)
  obstetricos?: GuardarObstetricosDto;
}
