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
  Matches,
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
  /** La evaluacion del posparto, que es su propia hoja. */
  POSPARTO = 'POSPARTO',
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

  @ApiPropertyOptional({
    description:
      'Lo escrito en la raya que el problema lleva impresa, cuando la lleva. Su etiqueta viene en el catalogo: "Cuanto tiempo hace", "Cuantas veces por dia".',
    example: 'Tres dias',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  anotacion?: string;
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
/** Un tema de consejeria brindado, con la fecha en que debe volver. */
export class ConsejeriaBrindadaDto {
  @ApiProperty({ format: 'uuid' })
  @IsString()
  temaId!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  brindada?: boolean;

  /**
   * Como `aaaa-mm-dd`, sin convertir a Date.
   *
   * Guatemala es UTC-6: construir un `Date` con la cadena entera la
   * interpreta como medianoche UTC y la fecha se corre al dia anterior.
   */
  @ApiPropertyOptional({ example: '2026-09-15', format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe venir como aaaa-mm-dd.' })
  fechaReconsulta?: string;
}

export enum QuienAtendioPartoDto {
  MD = 'MD',
  EP = 'EP',
  AE = 'AE',
  CT = 'CT',
  OTRO = 'OTRO',
}

export enum TipoPartoDto {
  NORMAL = 'NORMAL',
  CESAREA = 'CESAREA',
  FORCEPS = 'FORCEPS',
  PODALICA = 'PODALICA',
}

/**
 * Lo que solo pide la ficha de menor de 28 dias.
 *
 * El peso viaja en LIBRAS Y ONZAS porque asi lo pide el formulario, y porque
 * uno de sus signos de peligro impresos es "pesa menos de 5 libras 8 onzas".
 * Las onzas se acotan a 0-15: dieciseis onzas son una libra, y aceptarlas
 * dejaria dos formas de escribir el mismo peso.
 */
export class DatosNeonatoDto {
  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional()
  @IsString()
  @Length(1, 240)
  nombreMadre?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  pesoLibras?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 15, description: 'Dieciseis onzas son una libra.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  pesoOnzas?: number;

  @ApiPropertyOptional({ example: 11.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(60)
  perimetroBraquialCm?: number;

  @ApiPropertyOptional({ example: 34.5, description: 'Circunferencia cefalica.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(60)
  circunferenciaCefalicaCm?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(40)
  pesoNacerLibras?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(15)
  pesoNacerOnzas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lloroAlNacer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  nacioCianotico?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  horasTrabajoParto?: number;

  @ApiPropertyOptional({ enum: QuienAtendioPartoDto })
  @IsOptional()
  @IsEnum(QuienAtendioPartoDto)
  quienAtendioParto?: QuienAtendioPartoDto;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  quienAtendioPartoOtro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rupturaPrematuraMembranas?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trabajoPartoPrematuro?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  partoProlongado?: boolean;

  @ApiPropertyOptional({ enum: TipoPartoDto })
  @IsOptional()
  @IsEnum(TipoPartoDto)
  tipoParto?: TipoPartoDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bcg?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tdMadre?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  tdMadreDosis?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lactanciaMaternaExclusiva?: boolean;
}

/**
 * Lo que solo pide la hoja prenatal (pagina 2 de su ficha).
 *
 * Aqui NO viajan la presion arterial, la temperatura, las respiraciones, la
 * frecuencia cardiaca materna —que es el `pulso`— ni el PESO: esos campos ya
 * son de `CrearFichaDto`, como en las otras tres fichas. Mandarlos dos veces
 * daria dos sitios donde escribir el mismo dato.
 *
 * El papel pide el peso en libras y la pantalla lo teclea en libras, pero
 * viaja como `pesoKg`, que es lo que hacen la ficha de adultos y la de ninez y
 * la unica columna de peso que alimenta los indicadores.
 */
export class DatosPrenatalDto {
  @ApiPropertyOptional({
    example: 24.5,
    description: 'Circunferencia del brazo. El papel: solo si el embarazo es menor de 12 semanas.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(80)
  circunferenciaBrazoCm?: number;

  @ApiPropertyOptional({
    description: 'Una sola casilla: estado general, palidez palmar, conjuntivas y unas.',
  })
  @IsOptional()
  @IsBoolean()
  examenGeneralNormal?: boolean;

  @ApiPropertyOptional({ description: 'Hallazgos del examen buco dental.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  examenBucodental?: string;

  @ApiPropertyOptional({ example: 28.5, description: 'Altura uterina en centimetros.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(60)
  alturaUterinaCm?: number;

  @ApiPropertyOptional({ description: 'El papel lo acota a las 20 semanas o mas.' })
  @IsOptional()
  @IsBoolean()
  movimientosFetales?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 250, description: 'Frecuencia cardiaca fetal.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(250)
  fcf?: number;

  @ApiPropertyOptional({
    maxLength: 60,
    example: 'Cefálica',
    description: 'Presentacion por maniobras de Leopold, a partir de las 36 semanas.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  presentacionLeopold?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trazasSangre?: boolean;

  @ApiPropertyOptional({ description: 'El papel dice "(describa)".' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  trazasSangreDescripcion?: string;

  @ApiPropertyOptional({ description: 'Verrugas, herpes, papilomas o ulceras.' })
  @IsOptional()
  @IsBoolean()
  lesionesVulvares?: boolean;

  @ApiPropertyOptional({ description: 'El papel dice "(describa)".' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  lesionesVulvaresDescripcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flujoVaginal?: boolean;

  // ─── Laboratorio ───────────────────────────────────────────────────────
  //
  // Texto y no numeros: el papel deja una raya y el resultado se anota como lo
  // manda el laboratorio ("11.2 / 34", "no reactivo", "pendiente").
  //
  @ApiPropertyOptional({ example: '11.2 / 34' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  hemoglobinaHematocrito?: string;

  @ApiPropertyOptional({ example: 'O RH+' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  grupoRh?: string;

  @ApiPropertyOptional({ description: 'Proteina, glucosa y cetona.' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  orina?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  glicemia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  vdrl?: string;

  @ApiPropertyOptional({ description: 'El papel: "oferte prueba con consejeria".' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  vih?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  papanicolau?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 300)
  infecciones?: string;

  // ─── Clasificacion ─────────────────────────────────────────────────────
  @ApiPropertyOptional({
    minimum: 0,
    maximum: 45,
    description: 'Semanas de embarazo por FUR y/o altura uterina, como las anota quien atiende.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(45)
  semanasPorFurAu?: number;

  @ApiPropertyOptional({ description: 'Esta ficha no trae matriz de problemas: se escriben.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  problemasDetectados?: string;

  // ─── Conducta ──────────────────────────────────────────────────────────
  //
  // El papel pide el NUMERO de tabletas entregadas, no si se entregaron.
  //
  @ApiPropertyOptional({ minimum: 0, maximum: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(400)
  sulfatoFerrosoTabletas?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(400)
  acidoFolicoTabletas?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10, description: 'Dosis de Td de este control.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  tdDosis?: number;
}

/**
 * Lo que solo pide la evaluacion del posparto (paginas 3 y 4).
 *
 * Como en la hoja prenatal, la presion arterial, la frecuencia cardiaca y la
 * temperatura NO viajan aqui: son campos de `CrearFichaDto`. El diagnostico y
 * la conducta que pide la pagina 3 tampoco: son `diagnostico` y `tratamiento`,
 * los mismos que usan las otras tres fichas.
 */
export class DatosPospartoDto {
  @ApiPropertyOptional({
    description:
      'El primer control tiene hoja propia y cinco preguntas que no se repiten. Por defecto, false.',
  })
  @IsOptional()
  @IsBoolean()
  esPrimerControl?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 400, description: 'Solo en el primer control.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(400)
  diasDespuesDelParto?: number;

  @ApiPropertyOptional({ maxLength: 120, description: 'Solo en el primer control.' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  dondeAtendioParto?: string;

  @ApiPropertyOptional({ enum: QuienAtendioPartoDto, description: 'Solo en el primer control.' })
  @IsOptional()
  @IsEnum(QuienAtendioPartoDto)
  quienAtendioParto?: QuienAtendioPartoDto;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  quienAtendioPartoOtro?: string;

  @ApiPropertyOptional({ description: 'El papel pide describirla, no marcarla.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  involucionUterina?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  examenMamas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  heridaOperatoria?: string;

  @ApiPropertyOptional({ description: 'Loquios, episiorrafia y hallazgos patologicos.' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  examenGinecologico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lactanciaMaternaExclusiva?: boolean;

  @ApiPropertyOptional({ description: 'La pregunta "¿Por que no?" del papel.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  motivoSinLactancia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  problemasDetectados?: string;

  // ─── Conducta ──────────────────────────────────────────────────────────
  //
  // El primer control marca SI/NO; los siguientes anotan cuantas tabletas. Las
  // dos formas caben, y ninguna inventa la otra.
  //
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sulfatoFerroso?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(400)
  sulfatoFerrosoTabletas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acidoFolico?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(400)
  acidoFolicoTabletas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  td?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  tdDosis?: number;

  @ApiPropertyOptional({ description: 'Cual es se registra en `medicamentos`.' })
  @IsOptional()
  @IsBoolean()
  otroMedicamento?: boolean;
}

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

  /**
   * La tabla de consejeria del pie de la ficha.
   *
   * Solo la usan las fichas cuyo catalogo trae temas. En la de adultos la
   * consejeria sigue siendo el texto libre de `consejeria`.
   */
  @ApiPropertyOptional({ type: [ConsejeriaBrindadaDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ConsejeriaBrindadaDto)
  consejeriaTemas?: ConsejeriaBrindadaDto[];

  /** Solo cuando `tipoFicha` es NEONATO. Se ignora en las demas. */
  @ApiPropertyOptional({ type: DatosNeonatoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosNeonatoDto)
  neonato?: DatosNeonatoDto;

  /** Solo cuando `tipoFicha` es PRENATAL. Se ignora en las demas. */
  @ApiPropertyOptional({ type: DatosPrenatalDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosPrenatalDto)
  prenatal?: DatosPrenatalDto;

  /** Solo cuando `tipoFicha` es POSPARTO. Se ignora en las demas. */
  @ApiPropertyOptional({ type: DatosPospartoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosPospartoDto)
  posparto?: DatosPospartoDto;
}
