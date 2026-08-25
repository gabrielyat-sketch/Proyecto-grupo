import { ArgumentsHost, ConflictException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { FiltroExcepciones } from './filtro-excepciones';
import { CodigoError } from './respuesta-error';

function hostCon(peticion: Record<string, unknown> = {}) {
  const respuesta = {
    codigo: 0,
    cuerpo: null as unknown,
    status(c: number) {
      this.codigo = c;
      return this;
    },
    json(b: unknown) {
      this.cuerpo = b;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => respuesta,
      getRequest: () => ({ url: '/v1/prueba', trazaId: 'traza-1', ...peticion }),
    }),
  } as unknown as ArgumentsHost;
  return { host, respuesta };
}

describe('FiltroExcepciones', () => {
  const filtro = new FiltroExcepciones();

  it('traduce 404 al codigo NO_ENCONTRADO', () => {
    const { host, respuesta } = hostCon();
    filtro.catch(new NotFoundException('No existe ese paciente.'), host);
    expect(respuesta.codigo).toBe(404);
    expect(respuesta.cuerpo).toMatchObject({
      codigo: CodigoError.NO_ENCONTRADO,
      mensaje: 'No existe ese paciente.',
    });
  });

  it('respeta un cuerpo en espanol con la clave "mensaje"', () => {
    const { host, respuesta } = hostCon();
    filtro.catch(new ConflictException({ mensaje: 'Ya existe un paciente con ese DPI.' }), host);
    expect(respuesta.codigo).toBe(409);
    expect(respuesta.cuerpo).toMatchObject({
      codigo: CodigoError.CONFLICTO,
      mensaje: 'Ya existe un paciente con ese DPI.',
    });
  });

  it('acepta detalles enviados por el servicio', () => {
    const { host, respuesta } = hostCon();
    filtro.catch(new ConflictException({ mensaje: 'Duplicado.', detalles: ['pacienteId: abc'] }), host);
    expect((respuesta.cuerpo as { detalles: string[] }).detalles).toEqual(['pacienteId: abc']);
  });

  it('convierte la lista de class-validator en detalles', () => {
    const { host, respuesta } = hostCon();
    filtro.catch(
      new HttpException({ message: ['el dpi debe tener 13 digitos'] }, HttpStatus.BAD_REQUEST),
      host,
    );
    expect(respuesta.cuerpo).toMatchObject({
      codigo: CodigoError.VALIDACION,
      mensaje: 'La informacion enviada no es valida.',
      detalles: ['el dpi debe tener 13 digitos'],
    });
  });

  it('NUNCA expone el mensaje interno de un error inesperado', () => {
    const { host, respuesta } = hostCon();
    filtro.catch(new Error('relation "usuarios.paciente" does not exist at line 42'), host);
    expect(respuesta.codigo).toBe(500);
    const cuerpo = JSON.stringify(respuesta.cuerpo);
    expect(cuerpo).not.toContain('usuarios.paciente');
    expect(cuerpo).not.toContain('line 42');
    expect(respuesta.cuerpo).toMatchObject({ codigo: CodigoError.ERROR_INTERNO });
  });

  it('incluye el trazaId para poder encontrar la peticion en los logs', () => {
    const { host, respuesta } = hostCon();
    filtro.catch(new NotFoundException(), host);
    expect((respuesta.cuerpo as { trazaId: string }).trazaId).toBe('traza-1');
  });

  it('funciona aunque la peticion no traiga trazaId', () => {
    const { host, respuesta } = hostCon({ trazaId: undefined, headers: {} });
    filtro.catch(new NotFoundException(), host);
    expect((respuesta.cuerpo as { trazaId: string }).trazaId).toBe('sin-traza');
  });
});
