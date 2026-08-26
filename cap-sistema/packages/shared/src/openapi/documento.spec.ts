import type { OpenAPIObject } from '@nestjs/swagger';
import { agregarErroresEstandar } from './documento';

const OK = { description: 'ok' };
const CUERPO = { content: {} };
const PARAM_ID = [{ name: 'id', in: 'path' as const, required: true }];

function documentoCon(paths: OpenAPIObject['paths']): OpenAPIObject {
  return { openapi: '3.1.0', info: { title: 't', version: '1' }, paths } as OpenAPIObject;
}

function respuestasDe(d: OpenAPIObject, ruta: string, metodo: string): Record<string, unknown> {
  const operaciones = d.paths[ruta] as Record<string, { responses: Record<string, unknown> }>;
  return operaciones[metodo].responses;
}

const codigosDe = (d: OpenAPIObject, ruta: string, metodo: string) =>
  Object.keys(respuestasDe(d, ruta, metodo)).sort();

describe('agregarErroresEstandar', () => {
  it('todo endpoint puede fallar con 500, aunque no reciba ni parametros ni cuerpo', () => {
    const d = agregarErroresEstandar(documentoCon({ '/v1/salud': { get: { responses: { 200: OK } } } }));
    expect(codigosDe(d, '/v1/salud', 'get')).toEqual(['200', '500']);
  });

  it('un endpoint con cuerpo declara 400: el ValidationPipe lo rechaza si no cumple el DTO', () => {
    const d = agregarErroresEstandar(
      documentoCon({ '/v1/auth/login': { post: { requestBody: CUERPO, responses: { 200: OK } } } }),
    );
    expect(codigosDe(d, '/v1/auth/login', 'post')).toContain('400');
  });

  it('un endpoint protegido declara 401 y 403; uno publico no', () => {
    const d = agregarErroresEstandar(
      documentoCon({
        '/v1/protegido': { get: { security: [{ bearer: [] }], responses: { 200: OK } } },
        '/v1/publico': { get: { responses: { 200: OK } } },
      }),
    );
    expect(codigosDe(d, '/v1/protegido', 'get')).toEqual(expect.arrayContaining(['401', '403']));
    expect(codigosDe(d, '/v1/publico', 'get')).not.toContain('401');
  });

  it('una ruta con parametro declara 404: el identificador puede no existir', () => {
    const d = agregarErroresEstandar(
      documentoCon({ '/v1/pacientes/{id}': { get: { parameters: PARAM_ID, responses: { 200: OK } } } }),
    );
    expect(codigosDe(d, '/v1/pacientes/{id}', 'get')).toContain('404');
  });

  it('NO pisa una respuesta declarada a mano: el decorador manda sobre el relleno', () => {
    const propia = { description: 'Ese DPI ya esta registrado' };
    const d = agregarErroresEstandar(
      documentoCon({ '/v1/pacientes/{id}': { get: { parameters: PARAM_ID, responses: { 404: propia } } } }),
    );
    expect(respuestasDe(d, '/v1/pacientes/{id}', 'get')['404']).toBe(propia);
  });

  it('el error apunta al esquema compartido, no a uno inventado por servicio', () => {
    const d = agregarErroresEstandar(documentoCon({ '/v1/salud': { get: { responses: {} } } }));
    expect(JSON.stringify(respuestasDe(d, '/v1/salud', 'get')['500'])).toContain('RespuestaErrorDto');
  });
});
