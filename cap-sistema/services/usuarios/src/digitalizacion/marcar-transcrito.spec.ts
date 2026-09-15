import { marcarCarpetaTranscrita } from './marcar-transcrito';

/**
 * La regla que saca una carpeta de la cola de digitalizacion.
 *
 * Se prueba contra un doble y no contra la base porque lo que importa aqui es
 * la REGLA, no el SQL: que guardar una hoja deje la carpeta cerrada y contada.
 * Antes se quedaba en «en proceso» y habia que volver a Digitalizacion, buscar
 * el expediente entre miles y cerrarlo a mano; con un archivo de ese tamano eso
 * es una segunda pasada completa sobre el trabajo ya hecho.
 */
describe('marcar una carpeta como transcrita', () => {
  function dobleDeTransaccion() {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    return { tx: { registroDigitalizacion: { updateMany } }, updateMany };
  }

  it('la deja COMPLETA, no en proceso', async () => {
    const { tx, updateMany } = dobleDeTransaccion();

    await marcarCarpetaTranscrita(tx as never, 'e-1', 'u-9');

    expect(updateMany).toHaveBeenCalledTimes(1);
    const [{ where, data }] = updateMany.mock.calls[0] as [
      { where: unknown; data: Record<string, unknown> },
    ];
    expect(where).toEqual({ expedienteId: 'e-1' });
    expect(data.estado).toBe('COMPLETO');
  });

  it('sella quien la transcribio y cuando', async () => {
    const { tx, updateMany } = dobleDeTransaccion();

    await marcarCarpetaTranscrita(tx as never, 'e-1', 'u-9');

    const [{ data }] = updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.digitalizadoPor).toBe('u-9');
    expect(data.completadoEn).toBeInstanceOf(Date);
  });

  /**
   * El estado dice que la carpeta se trabajo; el contador dice cuanto. Quien
   * tiene el folder en la mano puede seguir anadiendo hojas desde la propia
   * ficha, y cada una tiene que sumar: sin el contador, una jornada entera de
   * transcripcion deja el avance en cero y el personal no ve progresar lo que
   * si esta haciendo.
   */
  it('cuenta la hoja, sin pisar las anteriores', async () => {
    const { tx, updateMany } = dobleDeTransaccion();

    await marcarCarpetaTranscrita(tx as never, 'e-1', 'u-9');

    const [{ data }] = updateMany.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.atencionesTranscritas).toEqual({ increment: 1 });
  });
});
