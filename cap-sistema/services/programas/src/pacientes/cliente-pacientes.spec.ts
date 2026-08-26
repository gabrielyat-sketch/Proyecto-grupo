import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { ClientePacientes } from './cliente-pacientes';
import { Entorno } from '../config/entorno';

const env = { URL_USUARIOS: 'http://usuarios:3002', TIMEOUT_USUARIOS_MS: 50 } as Entorno;

describe('ClientePacientes', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });

  const respuesta = (status: number, cuerpo: unknown = {}) =>
    ({ status, ok: status >= 200 && status < 300, json: async () => cuerpo }) as Response;

  it('devuelve el paciente cuando el servicio responde bien', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, { id: 'p-1', edad: 40 }));
    const c = new ClientePacientes(env);
    await expect(c.obtener('p-1', 'Bearer x')).resolves.toMatchObject({ id: 'p-1' });
  });

  it('propaga el token del usuario, para que usuarios aplique SUS permisos', async () => {
    const espia = jest.fn().mockResolvedValue(respuesta(200, {}));
    global.fetch = espia;
    await new ClientePacientes(env).obtener('p-1', 'Bearer token-del-usuario');
    expect(espia.mock.calls[0][1].headers.Authorization).toBe('Bearer token-del-usuario');
  });

  it('propaga el trazaId para poder seguir la peticion entre servicios', async () => {
    const espia = jest.fn().mockResolvedValue(respuesta(200, {}));
    global.fetch = espia;
    await new ClientePacientes(env).obtener('p-1', 'Bearer x', 'traza-abc');
    expect(espia.mock.calls[0][1].headers['x-traza-id']).toBe('traza-abc');
  });

  it('codifica el identificador en la URL', async () => {
    const espia = jest.fn().mockResolvedValue(respuesta(200, {}));
    global.fetch = espia;
    await new ClientePacientes(env).obtener('p/1?x=2', 'Bearer x');
    expect(espia.mock.calls[0][0]).toContain('p%2F1%3Fx%3D2');
  });

  it('un 404 se traduce a "el paciente no existe", no a error interno', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(404));
    await expect(new ClientePacientes(env).obtener('p-1', 'Bearer x')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('un 403 se traduce a falta de permiso', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(403));
    await expect(new ClientePacientes(env).obtener('p-1', 'Bearer x')).rejects.toThrow(
      /permiso/i,
    );
  });

  it('un 500 del otro servicio no se propaga como 500 propio', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuesta(500));
    await expect(new ClientePacientes(env).obtener('p-1', 'Bearer x')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('si el servicio no responde a tiempo, falla rapido con un mensaje util', async () => {
    global.fetch = jest.fn(
      () =>
        new Promise((_r, rechazar) =>
          setTimeout(() => {
            const e = new Error('abortado');
            e.name = 'AbortError';
            rechazar(e);
          }, 10),
        ) as never,
    );
    await expect(new ClientePacientes(env).obtener('p-1', 'Bearer x')).rejects.toThrow(
      /no respondio a tiempo/i,
    );
  });

  it('si la red falla, no expone el detalle tecnico al cliente', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5:3002'));
    await expect(new ClientePacientes(env).obtener('p-1', 'Bearer x')).rejects.toThrow(
      /No se pudo consultar el servicio de pacientes/,
    );
  });
});
