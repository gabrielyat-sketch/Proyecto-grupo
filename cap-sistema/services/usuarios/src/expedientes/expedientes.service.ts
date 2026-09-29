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
   * Busqueda por numero de expediente.
   *
   * Devuelve VARIOS, y eso es la regla del CAP, no una imprecision. El numero
   * es de la familia: la carpeta de carton lleva un numero y dentro van las
   * fichas de todos los que viven en esa casa. Quien tiene el folder en la
   * mano y teclea su numero pregunta «de quien es esta carpeta», y la
   * respuesta honesta son las personas que hay dentro.
   *
   * Y el numero se repite entre lugares —hay un expediente No.1 en El Calvario
   * y otro en El Carpintero—, asi que el resultado puede abarcar dos familias
   * distintas. Por eso cada fila trae su comunidad y su lugar: sin eso, quien
   * busca no podria decidir cual es la suya.
   *
   * El numero esta cifrado y se resuelve por su indice ciego, igual que el
   * DPI, asi que la busqueda es exacta.
   */
  async porNumero(numero: string, contexto: ContextoAuditoria) {
    const indice = this.cifrado.indiceCiego(numero);
    const encontrados = await this.prisma.expediente.findMany({
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
            lugar: { select: { id: true, nombre: true } },
            grupoFamiliar: { select: { id: true, numero: true, apellidos: true } },
          },
        },
        digitalizacion: true,
      },
      // Por apellido dentro de cada familia: es como se hojea el folder.
      orderBy: [{ paciente: { apellidos: 'asc' } }, { paciente: { nombres: 'asc' } }],
    });
    if (encontrados.length === 0) {
      throw new NotFoundException('No existe un expediente con ese numero.');
    }

    // Se registra el hallazgo, no la busqueda: un numero tecleado que no
    // existe no es una consulta de expediente, y anotarlo llenaria la bitacora
    // de errores de tecleo. El numero tampoco viaja: esta cifrado en la base
    // por algo, y la bitacora guarda el id, que es con lo que se audita.
    //
    // Una linea por expediente abierto. Son las fichas que la consulta pone
    // delante de alguien, y la bitacora existe para poder responder quien vio
    // que: resumirlas en una sola perderia justo eso.
    for (const exp of encontrados) {
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
    }

    return {
      numero: this.cifrado.descifrar(Buffer.from(encontrados[0].numeroCifrado)),
      expedientes: encontrados.map((exp) => ({
        id: exp.id,
        aperturaEn: exp.aperturaEn,
        paciente: exp.paciente,
        digitalizacion: exp.digitalizacion,
      })),
    };
  }
}
