import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Rol, Roles, Usuario } from '@cap/shared';
import { DigitalizacionService } from './digitalizacion.service';
import { EstadoDigitalizacion } from '../../prisma/generado';
import { RegistroDigitalizacionDto, ResumenDigitalizacionDto } from './dto/respuestas.dto';

class ActualizarDigitalizacionDto {
  @ApiProperty({ enum: ['PENDIENTE', 'EN_PROCESO', 'COMPLETO', 'NO_LOCALIZADO'] })
  @IsEnum({ PENDIENTE: 1, EN_PROCESO: 1, COMPLETO: 1, NO_LOCALIZADO: 1 } as never)
  estado!: EstadoDigitalizacion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  observaciones?: string;
}

@ApiTags('digitalizacion')
@ApiBearerAuth()
@Controller('digitalizacion')
export class DigitalizacionController {
  constructor(private readonly servicio: DigitalizacionService) {}

  @Get('resumen')
  @Roles(Rol.ADMINISTRADOR, Rol.DIRECTOR, Rol.RECEPCION)
  @ApiOperation({ summary: 'Avance de la digitalizacion de expedientes' })
  @ApiOkResponse({ type: ResumenDigitalizacionDto })
  resumen(): Promise<ResumenDigitalizacionDto> {
    return this.servicio.resumen();
  }

  @Patch(':expedienteId')
  @Roles(Rol.ADMINISTRADOR, Rol.RECEPCION)
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
