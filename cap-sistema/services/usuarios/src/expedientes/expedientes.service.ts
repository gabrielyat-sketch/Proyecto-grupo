import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ServicioCifrado } from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';

@Injectable()
export class ExpedientesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
  ) {}

  /**
   * Busqueda por numero de expediente. Igual que el DPI: el numero esta
   * cifrado y se busca por su indice ciego.
   */
  async porNumero(numero: string) {
    const indice = this.cifrado.indiceCiego(numero);
    const exp = await this.prisma.expediente.findUnique({
      where: { numeroIndice: new Uint8Array(indice) },
      include: {
        paciente: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            fechaNacimiento: true,
            sexo: true,
            comunidad: { select: { id: true, nombre: true } },
          },
        },
        digitalizacion: true,
      },
    });
    if (!exp) throw new NotFoundException('No existe un expediente con ese numero.');

    return {
      id: exp.id,
      numero: this.cifrado.descifrar(Buffer.from(exp.numeroCifrado)),
      aperturaEn: exp.aperturaEn,
      paciente: exp.paciente,
      digitalizacion: exp.digitalizacion,
    };
  }
}
