import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CLIENTE_AUDITORIA,
  ContextoAuditoria,
  IClienteAuditoria,
  registrarConsulta,
  ServicioCifrado,
} from '@cap/shared';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICIO_CIFRADO } from '../comun/cifrado.module';

@Injectable()
export class ExpedientesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SERVICIO_CIFRADO) private readonly cifrado: ServicioCifrado,
    @Inject(CLIENTE_AUDITORIA) private readonly auditoria: IClienteAuditoria,
  ) {}

  /**
   * Busqueda por numero de expediente. Igual que el DPI: el numero esta
   * cifrado y se busca por su indice ciego.
   */
  async porNumero(numero: string, contexto: ContextoAuditoria) {
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

    // Se registra el hallazgo, no la busqueda: un numero tecleado que no
    // existe no es una consulta de expediente, y anotarlo llenaria la bitacora
    // de errores de tecleo. El numero tampoco viaja: esta cifrado en la base
    // por algo, y la bitacora guarda el id, que es con lo que se audita.
    registrarConsulta(
      this.auditoria,
      {
        servicio: 'usuarios',
        entidad: 'expediente',
        entidadId: exp.id,
        motivo: 'Busqueda de expediente por numero',
      },
      contexto,
    );

    return {
      id: exp.id,
      numero: this.cifrado.descifrar(Buffer.from(exp.numeroCifrado)),
      aperturaEn: exp.aperturaEn,
      paciente: exp.paciente,
      digitalizacion: exp.digitalizacion,
    };
  }
}
