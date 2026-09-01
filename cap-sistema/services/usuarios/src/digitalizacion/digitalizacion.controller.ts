import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiPaginaDe, ApiParametrosPagina, type Pagina, Rol, Roles, Usuario } from '@cap/shared';
import { DigitalizacionService } from './digitalizacion.service';
import { EstadoDigitalizacion } from '../../generado';
import { ConsultarColaDto, EstadoDigitalizacionDto } from './dto/consultar-cola.dto';
import {
  AvanceComunidadDto,
  ExpedienteEnColaDto,
  RegistroDigitalizacionDto,
  ResumenDigitalizacionDto,
} from './dto/respuestas.dto';

class ActualizarDigitalizacionDto {
  /**
   * El enum se declara en el DTO y no como objeto suelto.
   *
   * Antes estaba escrito `@IsEnum({ PENDIENTE: 1, ... } as never)`, y
   * class-validator compara contra los VALORES del enum, que ahi eran cuatro
   * unos. Ningun estado escrito con letras pasaba: este endpoint respondia 400
   * a todo, y como el `as never` callaba a TypeScript y ninguna prueba lo
   * ejercitaba, nadie lo noto.
   */
  @ApiProperty({ enum: EstadoDigitalizacionDto })
  @IsEnum(EstadoDigitalizacionDto)
  estado!: EstadoDigitalizacion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  observaciones?: string;
}

/**
 * Quien participa en la digitalizacion, segun como trabaja el CAP.
 *
 * Recepcion captura los datos personales del paciente y abre el expediente;
 * despues le pasa la carpeta a ENFERMERIA, que llena las fichas clinicas. Por
 * eso enfermeria tiene que ver la cola: si no supiera que carpeta le toca,
 * dependeria de que alguien se lo dijera de palabra cada vez.
 *
 * Direccion mira el avance pero no transcribe.
 */
const VEN_EL_AVANCE = [
  Rol.ADMINISTRADOR,
  Rol.DIRECTOR,
  Rol.RECEPCION,
  Rol.ENFERMERIA,
  Rol.MEDICO,
] as const;

/**
 * Quien puede mover el estado de una carpeta.
 *
 * Incluye a enfermeria porque es quien la termina: obligarla a avisarle a
 * recepcion para que marque el expediente como completo es el tipo de paso
 * extra que hace que el tablero deje de reflejar la realidad a los dos dias.
 */
const MARCAN_LA_CARPETA = [Rol.ADMINISTRADOR, Rol.RECEPCION, Rol.ENFERMERIA] as const;

@ApiTags('digitalizacion')
@ApiBearerAuth()
@Controller('digitalizacion')
export class DigitalizacionController {
  constructor(private readonly servicio: DigitalizacionService) {}

  @Get('resumen')
  @Roles(...VEN_EL_AVANCE)
  @ApiOperation({ summary: 'Avance de la digitalizacion de expedientes' })
  @ApiOkResponse({ type: ResumenDigitalizacionDto })
  resumen(): Promise<ResumenDigitalizacionDto> {
    return this.servicio.resumen();
  }

  @Get('comunidades')
  @Roles(...VEN_EL_AVANCE)
  @ApiOperation({
    summary: 'Avance de la digitalizacion comunidad por comunidad',
    description:
      'El archivo de papel se recorre por comunidad, y poder cerrar una entera es lo que evita ' +
      'que una digitalizacion de meses se abandone a la mitad.',
  })
  @ApiOkResponse({ type: [AvanceComunidadDto] })
  comunidades(): Promise<AvanceComunidadDto[]> {
    return this.servicio.porComunidad();
  }

  @Get('cola')
  @Roles(...VEN_EL_AVANCE)
  @ApiOperation({
    summary: 'Expedientes por transcribir',
    description:
      'Sin filtro de estado devuelve lo que falta: pendientes y en proceso. El orden es por ' +
      'apellido, que es como estan las carpetas en el archivo.',
  })
  @ApiParametrosPagina()
  @ApiQuery({ name: 'comunidadId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'estado', required: false, enum: EstadoDigitalizacionDto })
  @ApiPaginaDe(ExpedienteEnColaDto, 'La cola. NO incluye DPI ni telefono.')
  cola(@Query() consulta: ConsultarColaDto): Promise<Pagina<ExpedienteEnColaDto>> {
    return this.servicio.cola(consulta);
  }

  @Patch(':expedienteId')
  @Roles(...MARCAN_LA_CARPETA)
  @ApiOperation({ summary: 'Cambia el estado de digitalizacion de un expediente' })
  @ApiOkResponse({ type: RegistroDigitalizacionDto })
  actualizar(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ActualizarDigitalizacionDto,
    @Usuario('id') usuarioId: string,
  ): Promise<RegistroDigitalizacionDto> {
    return this.servicio.actualizar(expedienteId, dto.estado, usuarioId, dto.observaciones);
  }
}
