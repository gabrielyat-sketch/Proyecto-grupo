import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Los tramos de edad de las dos tablas de micronutrientes.
 *
 * Enum de verdad, no un objeto suelto: `@IsEnum` compara contra los VALORES,
 * y con un objeto literal todos valdrian lo mismo y la validacion aceptaria
 * cualquier cosa. Ya paso una vez en este servicio.
 */
export enum TramoEdadDto {
  /** 6 meses a menos de 1 año. */
  M6_A_A1 = 'M6_A_A1',
  /** 1 a menos de 2 años. */
  A1_A_A2 = 'A1_A_A2',
  A2_A_A3 = 'A2_A_A3',
  A3_A_A4 = 'A3_A_A4',
  A4_A_A5 = 'A4_A_A5',
}

export enum EscolaridadMadreDto {
  NINGUNO = 'NINGUNO',
  PRIMARIA_1_3 = 'PRIMARIA_1_3',
  PRIMARIA_4_6 = 'PRIMARIA_4_6',
  MEDIA = 'MEDIA',
  SUPERIOR = 'SUPERIOR',
}

export enum AbastecimientoAguaDto {
  CHORRO_INTRADOMICILIAR = 'CHORRO_INTRADOMICILIAR',
  CHORRO_PUBLICO = 'CHORRO_PUBLICO',
  POZO = 'POZO',
  RIO = 'RIO',
  OTRO = 'OTRO',
}

export enum DisposicionExcretasDto {
  INODORO = 'INODORO',
  LETRINA = 'LETRINA',
  AIRE_LIBRE = 'AIRE_LIBRE',
}

// ═════════════════════════ el catalogo ═════════════════════════

export class DosisRecomendadaDto {
  @ApiProperty({ description: 'Cuál de las cinco columnas del papel.', example: 1 })
  orden!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'La edad que el formulario imprime para esa dosis. null en Neumococo, Hb y Otras, que el papel deja llenables pero sin esquema.',
    example: '2 meses',
  })
  edadRecomendada!: string | null;
}

export class VacunaCatalogoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: 'Pentavalente' })
  nombre!: string;

  @ApiProperty({
    type: [DosisRecomendadaDto],
    description:
      'SOLO las dosis que aplican. Las casillas sombreadas del papel no vienen: ofrecerlas dejaría anotar una tercera dosis de BCG, que no existe.',
  })
  dosis!: DosisRecomendadaDto[];
}

export class EntregaEsperadaDto {
  @ApiProperty({ enum: TramoEdadDto })
  tramo!: TramoEdadDto;

  @ApiProperty({ example: 1 })
  orden!: number;
}

export class MicronutrienteCatalogoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: 'Sulfato Ferroso' })
  nombre!: string;

  @ApiProperty({
    type: [EntregaEsperadaDto],
    description:
      'Cuántas entregas van en cada tramo. No es uniforme: el desparasitante no empieza hasta los dos años.',
  })
  esperadas!: EntregaEsperadaDto[];
}

export class CatalogoCarnetDto {
  @ApiProperty({ type: [VacunaCatalogoDto] })
  vacunas!: VacunaCatalogoDto[];

  @ApiProperty({ type: [MicronutrienteCatalogoDto] })
  micronutrientes!: MicronutrienteCatalogoDto[];
}

// ═════════════════════════ lo del niño ═════════════════════════

export class VacunaAplicadaDto {
  @ApiProperty({ format: 'uuid' })
  vacunaId!: string;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: '2024-05-12', description: 'Como aaaa-mm-dd.' })
  fecha!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Edad en meses cumplidos el día de la dosis. NO se guarda: se calcula contra la fecha de nacimiento. Es null si el paciente no la tiene registrada.',
    example: 4,
  })
  edadEnMeses!: number | null;
}

export class MicronutrienteEntregadoDto {
  @ApiProperty({ format: 'uuid' })
  micronutrienteId!: string;

  @ApiProperty({ enum: TramoEdadDto })
  tramo!: TramoEdadDto;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: '2024-05-12' })
  fecha!: string;
}

export class DatosNinezDto {
  @ApiProperty({ type: String, nullable: true })
  lugarNacimiento!: string | null;

  @ApiProperty({ type: String, nullable: true })
  acompananteNombre!: string | null;

  @ApiProperty({ type: String, nullable: true })
  madreNombre!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  madreEdad!: number | null;

  @ApiProperty({ type: String, nullable: true })
  madreOcupacion!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  madreSabeLeer!: boolean | null;

  @ApiProperty({ enum: EscolaridadMadreDto, nullable: true })
  madreEscolaridad!: EscolaridadMadreDto | null;

  @ApiProperty({ type: String, nullable: true })
  padreNombre!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  padreEdad!: number | null;

  @ApiProperty({ type: String, nullable: true })
  padreOcupacion!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  padreSabeLeer!: boolean | null;

  @ApiProperty({ type: Number, nullable: true })
  hijosTotal!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  hijosVivos!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  hijosMuertos!: number | null;
}

export class HogarDto {
  @ApiProperty({ enum: AbastecimientoAguaDto, nullable: true })
  agua!: AbastecimientoAguaDto | null;

  @ApiProperty({ type: String, nullable: true })
  aguaOtro!: string | null;

  @ApiProperty({ enum: DisposicionExcretasDto, nullable: true })
  excretas!: DisposicionExcretasDto | null;
}

export class CarnetDto {
  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Edad del paciente en meses cumplidos hoy. Decide qué tramos de micronutrientes tocan.',
  })
  edadEnMeses!: number | null;

  @ApiProperty({ type: [VacunaAplicadaDto] })
  vacunas!: VacunaAplicadaDto[];

  @ApiProperty({ type: [MicronutrienteEntregadoDto] })
  micronutrientes!: MicronutrienteEntregadoDto[];

  @ApiProperty({
    type: DatosNinezDto,
    nullable: true,
    description: 'null cuando nadie ha llenado todavía la página 1 de este niño.',
  })
  datos!: DatosNinezDto | null;

  @ApiProperty({
    type: HogarDto,
    nullable: true,
    description:
      'El agua y las excretas de la casa. Vienen del grupo familiar, no del niño: los hermanos comparten uno solo.',
  })
  hogar!: HogarDto | null;
}

// ═════════════════════════ lo que se guarda ═════════════════════════

/**
 * Una casilla de la tabla de vacunas.
 *
 * `fecha` en null BORRA la dosis. Es lo que permite corregir una casilla mal
 * anotada, que en el papel se hace tachando y aqui no tendria otra forma.
 */
export class GuardarVacunaDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vacunaId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  orden!: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Como aaaa-mm-dd. null borra la dosis anotada.',
    example: '2024-05-12',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  fecha?: string | null;
}

export class GuardarMicronutrienteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  micronutrienteId!: string;

  @ApiProperty({ enum: TramoEdadDto })
  @IsEnum(TramoEdadDto)
  tramo!: TramoEdadDto;

  @ApiProperty({ minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  orden!: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2024-05-12' })
  @IsOptional()
  @IsDateString({ strict: true })
  fecha?: string | null;
}

export class GuardarDatosNinezDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  lugarNacimiento?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  acompananteNombre?: string;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  madreNombre?: string;

  @ApiPropertyOptional({ minimum: 10, maximum: 70 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(70)
  madreEdad?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  madreOcupacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  madreSabeLeer?: boolean;

  @ApiPropertyOptional({ enum: EscolaridadMadreDto })
  @IsOptional()
  @IsEnum(EscolaridadMadreDto)
  madreEscolaridad?: EscolaridadMadreDto;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  padreNombre?: string;

  @ApiPropertyOptional({ minimum: 10, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(99)
  padreEdad?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  padreOcupacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  padreSabeLeer?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  hijosTotal?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  hijosVivos?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  hijosMuertos?: number;
}

export class GuardarHogarDto {
  @ApiPropertyOptional({ enum: AbastecimientoAguaDto })
  @IsOptional()
  @IsEnum(AbastecimientoAguaDto)
  agua?: AbastecimientoAguaDto;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  aguaOtro?: string;

  @ApiPropertyOptional({ enum: DisposicionExcretasDto })
  @IsOptional()
  @IsEnum(DisposicionExcretasDto)
  excretas?: DisposicionExcretasDto;
}

/**
 * Lo que la pantalla del carnet manda al guardar.
 *
 * Todo es opcional: la pagina 1 se llena a lo largo de anos y casi nunca se
 * toca entera. Lo que no viene, no se toca; mandar el carnet completo en cada
 * guardado obligaria a la pantalla a reenviar dosis puestas hace tres anos.
 */
export class GuardarCarnetDto {
  @ApiPropertyOptional({ type: GuardarDatosNinezDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuardarDatosNinezDto)
  datos?: GuardarDatosNinezDto;

  @ApiPropertyOptional({ type: GuardarHogarDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuardarHogarDto)
  hogar?: GuardarHogarDto;

  @ApiPropertyOptional({ type: [GuardarVacunaDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => GuardarVacunaDto)
  vacunas?: GuardarVacunaDto[];

  @ApiPropertyOptional({ type: [GuardarMicronutrienteDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => GuardarMicronutrienteDto)
  micronutrientes?: GuardarMicronutrienteDto[];
}

// ═════════════════════════ la grafica de peso ═════════════════════════

/**
 * Como se movio el peso desde el control anterior.
 *
 * Son las tres bandas que la leyenda del papel imprime junto a la grafica, y
 * NO dependen de donde cae el punto sino de si subio o bajo respecto de la vez
 * pasada. Por eso el primer control nunca tiene tendencia: no hay contra que
 * compararlo, y decir "crece bien" sin base seria inventar.
 */
export enum TendenciaPesoDto {
  /** Gano peso desde el control anterior. */
  CRECE_BIEN = 'CRECE_BIEN',
  /** Ni gano ni perdio. */
  NO_GANO = 'NO_GANO',
  PERDIO = 'PERDIO',
  /** Primer control: no hay con que comparar. */
  SIN_ANTERIOR = 'SIN_ANTERIOR',
}

export class PuntoCrecimientoDto {
  @ApiProperty({ example: '2025-04-12', description: 'Como aaaa-mm-dd.' })
  fecha!: string;

  @ApiProperty({
    type: Number,
    description: 'En LIBRAS, que es como el papel dibuja la grafica.',
    example: 24.3,
  })
  pesoLibras!: number;

  @ApiProperty({ type: Number, nullable: true, description: 'Meses cumplidos ese dia.' })
  edadEnMeses!: number | null;

  @ApiProperty({ enum: TendenciaPesoDto })
  tendencia!: TendenciaPesoDto;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Libras ganadas o perdidas desde el control anterior.',
    example: 1.1,
  })
  diferenciaLibras!: number | null;
}

export class CrecimientoDto {
  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({
    type: [PuntoCrecimientoDto],
    description: 'Los pesos ya registrados, del mas antiguo al mas reciente.',
  })
  puntos!: PuntoCrecimientoDto[];
}
