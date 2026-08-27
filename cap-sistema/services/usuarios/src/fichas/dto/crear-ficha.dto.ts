import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxDate,
  Min,
  ValidateNested,
} from 'class-validator';

export enum TipoFichaDto {
  ADULTO = 'ADULTO',
  NEONATO = 'NEONATO',
  NINEZ = 'NINEZ',
  PRENATAL = 'PRENATAL',
}

/** Un signo de peligro evaluado (seccion III). */
export class SignoPeligroEvaluadoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  signoId!: string;

  @ApiProperty()
  @IsBoolean()
  presente!: boolean;

  @ApiPropertyOptional({ description: 'Solo en el signo "Otros (describir)".' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  detalle?: string;
}

/**
 * Una fila de la matriz "Revision de problemas".
 *
 * `signoIds` y `diagnosticoIds` son lo que en el papel se subraya. Se mandan
 * como identificadores del catalogo y no como texto: es lo que permite despues
 * contar cuantos casos de cada diagnostico hubo.
 */
export class ProblemaEvaluadoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  problemaId!: string;

  @ApiProperty({ description: 'La casilla SI/NO de la primera columna.' })
  @IsBoolean()
  presente!: boolean;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(40)
  signoIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(40)
  diagnosticoIds?: string[];

  @ApiPropertyOptional({ description: 'El texto de las opciones "Otro: ____".' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  otroDiagnostico?: string;

  @ApiPropertyOptional({ description: 'Conducta indicada para este problema.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  conducta?: string;
}

/**
 * Un medicamento indicado.
 *
 * El papel deja espacio para cuatro. Aqui el tope es 20, que no es un limite
 * clinico sino una defensa: un cliente equivocado no debe poder insertar miles
 * de filas en una sola peticion.
 */
export class MedicamentoIndicadoDto {
  @ApiProperty({ example: 'Amoxicilina 500 mg' })
  @IsString()
  @Length(1, 200)
  nombre!: string;

  @ApiPropertyOptional({ example: '1 tableta cada 8 horas' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  dosis?: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  dias?: number;
}

/**
 * Ficha clinica completa.
 *
 * Corresponde a una hoja del formulario oficial del MSPAS. Todo lo que no sea
 * el motivo de consulta es opcional a proposito: en el papel tampoco se llena
 * todo, y exigir campos que el personal deja en blanco a diario solo hace que
 * inventen valores para poder guardar.
 */
export class CrearFichaDto {
  @ApiProperty({ enum: TipoFichaDto })
  @IsEnum(TipoFichaDto)
  tipoFicha!: TipoFichaDto;

  @ApiPropertyOptional({ description: 'Por defecto, ahora. Se indica al digitalizar papel.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(() => new Date(), { message: 'La fecha de la atencion no puede estar en el futuro.' })
  fecha?: Date;

  @ApiPropertyOptional({ description: 'true si proviene de transcribir un expediente de papel.' })
  @IsOptional()
  @IsBoolean()
  digitalizada?: boolean;

  // ─── Secciones V y VI ──────────────────────────────────────────────────
  @ApiProperty({ description: 'Seccion V. Motivo de la consulta.' })
  @IsString()
  @Length(1, 1000)
  motivo!: string;

  @ApiPropertyOptional({ description: 'Seccion VI. Historia de la enfermedad actual.' })
  @IsOptional()
  @IsString()
  @Length(1, 4000)
  historiaEnfermedad?: string;

  @ApiPropertyOptional({ description: 'Seccion IV. Solo si el paciente fue referido.' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  manejoEstabilizacion?: string;

  // ─── Seccion III ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: [SignoPeligroEvaluadoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignoPeligroEvaluadoDto)
  @ArrayMaxSize(30)
  signosPeligro?: SignoPeligroEvaluadoDto[];

  // ─── Seccion VIII: examen fisico ───────────────────────────────────────
  //
  // El IMC no se manda: se calcula de peso y talla al leer la ficha.
  //
  @ApiPropertyOptional({ example: 72.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(400)
  pesoKg?: number;

  @ApiPropertyOptional({ example: 158 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(250)
  tallaCm?: number;

  @ApiPropertyOptional({ example: 128 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(40)
  @Max(300)
  presionSistolica?: number;

  @ApiPropertyOptional({ example: 82 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(200)
  presionDiastolica?: number;

  @ApiPropertyOptional({ example: 36.8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(25)
  @Max(45)
  temperaturaC?: number;

  @ApiPropertyOptional({ example: 78, description: 'Pulso por minuto.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(20)
  @Max(250)
  pulso?: number;

  @ApiPropertyOptional({ example: 18, description: 'Respiraciones por minuto.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(90)
  respiraciones?: number;

  @ApiPropertyOptional({ example: 86, description: 'Circunferencia de cintura en centimetros.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(250)
  circunferenciaCinturaCm?: number;

  // ─── Seccion IX ────────────────────────────────────────────────────────
  @ApiPropertyOptional({ type: [ProblemaEvaluadoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProblemaEvaluadoDto)
  @ArrayMaxSize(30)
  problemas?: ProblemaEvaluadoDto[];

  @ApiPropertyOptional({ type: [MedicamentoIndicadoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentoIndicadoDto)
  @ArrayMaxSize(20)
  medicamentos?: MedicamentoIndicadoDto[];

  // ─── Seccion X y cierre ────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Seccion X. Consejeria brindada.' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  consejeria?: string;

  @ApiPropertyOptional({ description: 'A donde se refirio al paciente.' })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  referencia?: string;

  @ApiPropertyOptional({ description: 'Vacuna aplicada durante la consulta.' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  vacunaAdministrada?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fechaProximaVisita?: Date;

  // ─── Diagnostico y tratamiento en texto, como en la ficha breve ────────
  @ApiPropertyOptional({ description: 'Resumen del diagnostico, ademas de los del catalogo.' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  diagnostico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  tratamiento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notas?: string;
}
