import type { Prisma } from '../../generado';

/**
 * Marca una carpeta como transcrita al guardar una hoja de ella.
 *
 * Antes no lo hacia nadie. Quien transcribia una ficha la guardaba y la
 * carpeta seguia en la cola, en «en proceso», hasta que alguien volviera a
 * entrar a Digitalizacion, la buscara otra vez entre miles y le cambiara el
 * estado a mano. Con un archivo de miles de carpetas eso es una segunda pasada
 * completa sobre el trabajo ya hecho, y lo que pasa en la practica es que no se
 * hace: la cola se llena de carpetas ya transcritas y deja de decir que falta,
 * que es lo unico para lo que sirve.
 *
 * **Se marca COMPLETO con la primera hoja**, no cuando se acaben todas. Una
 * carpeta de papel puede tener varias atenciones y no hay forma de saber
 * cuantas quedan sin que alguien lo diga; esperar a esa confirmacion es
 * exactamente el paso manual que sobra. La cola es una LISTA DE TRABAJO, no el
 * inventario del archivo: su pregunta es «que carpeta cojo ahora», y una
 * carpeta que ya se abrio y se transcribio no es la respuesta.
 *
 * Quien tiene la carpeta en la mano puede seguir anadiendo hojas desde la
 * propia ficha —«Siguiente hoja de esta carpeta»— sin volver a la cola, y
 * `atencionesTranscritas` sigue contandolas. El estado dice que la carpeta se
 * trabajo; el contador dice cuanto.
 */
export async function marcarCarpetaTranscrita(
  tx: Prisma.TransactionClient,
  expedienteId: string,
  usuarioId: string,
): Promise<void> {
  await tx.registroDigitalizacion.updateMany({
    where: { expedienteId },
    data: {
      estado: 'COMPLETO',
      completadoEn: new Date(),
      digitalizadoPor: usuarioId,
      atencionesTranscritas: { increment: 1 },
    },
  });
}
