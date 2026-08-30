import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Los ocho servicios exponen estos dos endpoints (arquitectura §8.1).
 *
 * La distincion importa para Docker y para el gateway:
 *   /salud       — el proceso responde. Si falla, hay que reiniciar el contenedor.
 *   /salud/listo — ademas sus dependencias funcionan. Si falla, no hay que
 *                  reiniciar nada: hay que dejar de mandarle trafico hasta que
 *                  la base de datos vuelva.
 *
 * Confundirlos hace que un corte de base de datos provoque un ciclo de
 * reinicios que solo empeora la situacion.
 */
@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Publico()
  @ApiOperation({ summary: 'El proceso esta vivo' })
  vivo(): { estado: string; fecha: string } {
    return { estado: 'vivo', fecha: new Date().toISOString() };
  }

  @Get('listo')
  @Publico()
  @ApiOperation({ summary: 'El servicio y sus dependencias responden' })
  async listo(): Promise<{ estado: string; baseDatos: string }> {
    const baseDatos = (await this.prisma.estaViva()) ? 'ok' : 'sin conexion';
    if (baseDatos !== 'ok') {
      throw new ServiceUnavailableException('La base de datos no responde.');
    }
    return { estado: 'listo', baseDatos };
  }
}
