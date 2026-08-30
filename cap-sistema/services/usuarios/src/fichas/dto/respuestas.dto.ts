import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TIPOS = ['ADULTO', 'NEONATO', 'NINEZ', 'PRENATAL'];

// ═══════════════════════════════════════════════════════════════════════════
//  El catalogo, tal como lo necesita la pantalla para dibujarse
// ═══════════════════════════════════════════════════════════════════════════

export class OpcionCatalogoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Orden en que aparece en el formulario impreso.' })
  orden!: number;

  @ApiProperty({ description: 'Texto tal cual esta impreso en el papel.' })
  texto!: string;
}

export class DiagnosticoCatalogoDto extends OpcionCatalogoDto {
  @ApiProperty({ description: 'true en las opciones "Otro: ____", que piden escribir cual.' })
  pideTexto!: boolean;
}

export class ProblemaCatalogoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: 'Tos o dificultad para respirar' })
  nombre!: string;

  // El `type: String` no es redundante: sin el, Swagger publica el campo sin
  // tipo y el cliente generado lo recibe como `Record<string, never>`, que no
  // se puede leer como texto. Pasa en todo campo anulable sin tipo explicito.
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'La raya que el papel imprime al lado de las casillas, cuando la hay. null en los problemas que no la traen.',
    example: 'Cuánto tiempo hace',
  })
  etiquetaAnotacion!: string | null;

  @ApiProperty({ type: [OpcionCatalogoDto], description: 'Lo que en el papel se subraya en EVALUAR.' })
  signos!: OpcionCatalogoDto[];

  @ApiProperty({ type: [DiagnosticoCatalogoDto], description: 'Lo que se subraya en CLASIFICAR.' })
  diagnosticos!: DiagnosticoCatalogoDto[];
}

export class SignoPeligroCatalogoDto extends OpcionCatalogoDto {
  @ApiProperty({ description: 'true en "Otros (describir)".' })
  pideTexto!: boolean;
}

export class AntecedenteCatalogoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Identificador estable, citable desde los reportes.', example: 'MED_DIABETES' })
  codigo!: string;

  @ApiProperty({ enum: ['MEDICO', 'FAMILIAR', 'HABITO'] })
  grupo!: string;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: 'Hipertensión arterial' })
  texto!: string;

  @ApiProperty({ description: 'Pide escribir "cual".' })
  pideDetalle!: boolean;

  @ApiProperty({ description: 'Pide la fecha de la ultima vez.' })
  pideFecha!: boolean;

  @ApiProperty({ description: 'Pide una cantidad: dosis, cigarrillos al dia.' })
  pideNumero!: boolean;

  @ApiProperty({ description: 'El papel ofrece "No aplica" ademas de SI y NO.' })
  permiteNoAplica!: boolean;
}

/**
 * Todo lo que la pantalla necesita para dibujar una ficha, en una sola
 * respuesta.
 *
 * Va junto y no en cuatro llamadas porque el formulario no se puede dibujar a
 * medias: sin los diagnosticos no hay tercera columna, y sin los antecedentes
 * falta media hoja. Cuatro peticiones solo servirian para que la pantalla
 * apareciera por partes.
 */
/** Un tema de consejeria brindado, con su fecha de reconsulta. */
export class ConsejeriaFichaDto {
  @ApiProperty({ format: 'uuid' })
  temaId!: string;

  @ApiProperty()
  texto!: string;

  @ApiProperty()
  brindada!: boolean;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  fechaReconsulta!: string | null;
}

/**
 * Lo que solo trae la ficha de menor de 28 dias.
 *
 * El peso va en LIBRAS Y ONZAS, como el formulario. Uno de los signos de
 * peligro impresos es "pesa menos de 5 libras 8 onzas": convertir a kilos
 * obligaria a deshacer la conversion para poder compararlo con el papel.
 */
export class FichaNeonatoDto {
  @ApiProperty({ type: String, nullable: true })
  nombreMadre!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  pesoLibras!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  pesoOnzas!: number | null;

  @ApiProperty({ type: String, nullable: true, description: 'Decimal en texto.' })
  perimetroBraquialCm!: string | null;

  @ApiProperty({ type: String, nullable: true, description: 'Circunferencia cefalica. Decimal en texto.' })
  circunferenciaCefalicaCm!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  pesoNacerLibras!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  pesoNacerOnzas!: number | null;

  @ApiProperty({ type: Boolean, nullable: true })
  lloroAlNacer!: boolean | null;

  @ApiProperty({ type: Boolean, nullable: true })
  nacioCianotico!: boolean | null;

  @ApiProperty({ type: Number, nullable: true })
  horasTrabajoParto!: number | null;

  @ApiProperty({ type: String, nullable: true, enum: ['MD', 'EP', 'AE', 'CT', 'OTRO'] })
  quienAtendioParto!: string | null;

  @ApiProperty({ type: String, nullable: true })
  quienAtendioPartoOtro!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  rupturaPrematuraMembranas!: boolean | null;

  @ApiProperty({ type: Boolean, nullable: true })
  trabajoPartoPrematuro!: boolean | null;

  @ApiProperty({ type: Boolean, nullable: true })
  partoProlongado!: boolean | null;

  @ApiProperty({ type: String, nullable: true, enum: ['NORMAL', 'CESAREA', 'FORCEPS', 'PODALICA'] })
  tipoParto!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  bcg!: boolean | null;

  @ApiProperty({ type: Boolean, nullable: true })
  tdMadre!: boolean | null;

  @ApiProperty({ type: Number, nullable: true })
  tdMadreDosis!: number | null;

  @ApiProperty({ type: Boolean, nullable: true })
  lactanciaMaternaExclusiva!: boolean | null;
}

/** Un tema de la tabla de consejeria del pie de la ficha. */
export class TemaConsejeriaCatalogoDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  orden!: number;

  @ApiProperty({ example: 'Técnica de amamantamiento' })
  texto!: string;
}

export class CatalogoFichaDto {
  @ApiProperty({ enum: TIPOS })
  tipoFicha!: string;

  @ApiProperty({ type: [SignoPeligroCatalogoDto] })
  signosPeligro!: SignoPeligroCatalogoDto[];

  @ApiProperty({ type: [AntecedenteCatalogoDto] })
  antecedentes!: AntecedenteCatalogoDto[];

  @ApiProperty({ type: [ProblemaCatalogoDto] })
  problemas!: ProblemaCatalogoDto[];

  @ApiProperty({
    type: [TemaConsejeriaCatalogoDto],
    description:
      'Vacio en las fichas donde la consejeria es un texto libre, como la de adultos.',
  })
  temasConsejeria!: TemaConsejeriaCatalogoDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
//  Una ficha ya registrada
// ═══════════════════════════════════════════════════════════════════════════

export class SignoPeligroFichaDto {
  @ApiProperty({ format: 'uuid' })
  signoId!: string;

  @ApiProperty()
  texto!: string;

  @ApiProperty()
  presente!: boolean;

  @ApiProperty({ type: String, nullable: true })
  detalle!: string | null;
}

export class ProblemaFichaRegistradoDto {
  @ApiProperty({ format: 'uuid' })
  problemaId!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  presente!: boolean;

  @ApiProperty({ type: [String], description: 'Texto de los signos marcados.' })
  signos!: string[];

  @ApiProperty({ type: [String], description: 'Texto de los diagnosticos marcados.' })
  diagnosticos!: string[];

  @ApiProperty({ type: String, nullable: true })
  otroDiagnostico!: string | null;

  @ApiProperty({ type: String, nullable: true })
  conducta!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Lo escrito en la raya impresa del problema, si la lleva.',
  })
  anotacion!: string | null;
}

export class MedicamentoFichaDto {
  @ApiProperty()
  nombre!: string;

  @ApiProperty({ type: String, nullable: true })
  dosis!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  dias!: number | null;
}

export class FichaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  expedienteId!: string;

  @ApiProperty({ enum: TIPOS, nullable: true })
  tipoFicha!: string | null;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ format: 'uuid' })
  registradaPor!: string;

  @ApiProperty()
  digitalizada!: boolean;

  // ─── Texto clinico, ya descifrado ──────────────────────────────────────
  @ApiProperty({ type: String, nullable: true })
  motivo!: string | null;

  @ApiProperty({ type: String, nullable: true })
  historiaEnfermedad!: string | null;

  @ApiProperty({ type: String, nullable: true })
  manejoEstabilizacion!: string | null;

  @ApiProperty({ type: String, nullable: true })
  diagnostico!: string | null;

  @ApiProperty({ type: String, nullable: true })
  tratamiento!: string | null;

  @ApiProperty({ type: String, nullable: true })
  notas!: string | null;

  @ApiProperty({ type: String, nullable: true })
  consejeria!: string | null;

  @ApiProperty({ type: String, nullable: true })
  referencia!: string | null;

  @ApiProperty({ type: String, nullable: true })
  vacunaAdministrada!: string | null;

  // ─── Examen fisico. Decimal viaja como texto en JSON ───────────────────
  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '72.50' })
  pesoKg!: string | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true, example: '158.0' })
  tallaCm!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  presionSistolica!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  presionDiastolica!: number | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true })
  temperaturaC!: string | null;

  @ApiProperty({ type: Number, nullable: true })
  pulso!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  respiraciones!: number | null;

  @ApiProperty({ type: String, format: 'decimal', nullable: true })
  circunferenciaCinturaCm!: string | null;

  /**
   * Indice de masa corporal.
   *
   * Se CALCULA de peso y talla al responder, no se guarda. En el papel es el
   * campo que mas se equivoca al sacarse a mano, y guardado podria quedar
   * desfasado del peso del que dice venir.
   */
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Calculado de peso y talla. null si falta alguno de los dos.',
    example: 29.04,
  })
  imc!: number | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fechaProximaVisita!: Date | null;

  @ApiProperty({ type: [SignoPeligroFichaDto] })
  signosPeligro!: SignoPeligroFichaDto[];

  @ApiProperty({ type: [ProblemaFichaRegistradoDto] })
  problemas!: ProblemaFichaRegistradoDto[];

  @ApiProperty({ type: [MedicamentoFichaDto] })
  medicamentos!: MedicamentoFichaDto[];

  @ApiProperty({
    type: [ConsejeriaFichaDto],
    description: 'La tabla de consejeria. Vacia en las fichas con consejeria de texto libre.',
  })
  consejeriaTemas!: ConsejeriaFichaDto[];

  @ApiProperty({
    type: FichaNeonatoDto,
    nullable: true,
    description: 'Solo en las fichas de menor de 28 dias.',
  })
  neonato!: FichaNeonatoDto | null;
}

export class FichaCreadaDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  expedienteId!: string;

  @ApiProperty({ format: 'date-time' })
  fecha!: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Antecedentes del paciente
// ═══════════════════════════════════════════════════════════════════════════

export class AntecedenteRegistradoDto {
  @ApiProperty({ format: 'uuid' })
  antecedenteId!: string;

  @ApiProperty({ example: 'MED_DIABETES' })
  codigo!: string;

  @ApiProperty()
  texto!: string;

  @ApiProperty({ enum: ['MEDICO', 'FAMILIAR', 'HABITO'] })
  grupo!: string;

  @ApiProperty({ enum: ['SI', 'NO', 'NO_APLICA'] })
  respuesta!: string;

  @ApiProperty({ type: String, nullable: true })
  detalle!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  fecha!: Date | null;

  @ApiProperty({ type: Number, nullable: true })
  numero!: number | null;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn!: Date;
}

export class AntecedentesObstetricosDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  fur?: Date | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  gestas?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  partos?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  abortos?: number | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  abortosConsecutivos?: boolean | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  legradosLiu?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  cesareas?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  nacidosVivos?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  nacidosMuertos?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  hijosVivos?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  hijosMuertos?: number | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  embarazosMultiples?: boolean | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  fechaUltimoParto?: Date | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  prematurosAntes8Meses?: number | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  preeclampsia?: boolean | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: 'Papanicolau o IVAA.' })
  tamizajeCervix?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  tamizajeFecha?: Date | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  tamizajeNormal?: boolean | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  usaPlanificacion?: boolean | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  metodoPlanificacion?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'O' })
  tipoSangre?: string | null;

  @ApiPropertyOptional({ type: Boolean, nullable: true })
  rhPositivo?: boolean | null;
}

export class AntecedentesPacienteDto {
  @ApiProperty({ format: 'uuid' })
  pacienteId!: string;

  @ApiProperty({ type: [AntecedenteRegistradoDto] })
  marcados!: AntecedenteRegistradoDto[];

  @ApiProperty({ type: AntecedentesObstetricosDto, nullable: true })
  obstetricos!: AntecedentesObstetricosDto | null;
}
