// @vitest-environment node
/**
 * El cifrado del panel (web/src/api/cifrado.ts) contra el del servidor
 * (packages/shared/src/transporte), de verdad: un Express con el middleware
 * real y el fetch cifrado real hablando por HTTP.
 *
 * Esta fuera de src/ a proposito. La imagen del gateway copia solo web/ y
 * compila src/ con tsc; si esta prueba viviera ahi, el import de
 * packages/shared romperia esa compilacion.
 */
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { crearFetchCifrado } from '../src/api/cifrado';
import { crearMiddlewareTransporte } from '../../packages/shared/src/transporte/transporte';

const SECRETO = 'secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres';

let servidor: Server;
let base: string;
/** Lo que salio del navegador, tal como lo veria un proxy. */
let enviadas: { url: string; cabeceras: Record<string, string>; cuerpo: string }[];

async function registrar(peticion: Request): Promise<Response> {
  const cuerpo = peticion.method === 'GET' ? '' : await peticion.clone().text();
  enviadas.push({ url: peticion.url, cabeceras: Object.fromEntries(peticion.headers), cuerpo });
  return fetch(peticion);
}

/** Reenvia tal cual algo capturado, como haria el Repeater de Burp. */
function repetir(capturada: (typeof enviadas)[number], cambios: Partial<(typeof enviadas)[number]> = {}) {
  const p = { ...capturada, ...cambios };
  return fetch(p.url, {
    method: p.cuerpo ? 'POST' : 'GET',
    headers: { ...p.cabeceras, 'x-sicap-externo': '1' },
    body: p.cuerpo || undefined,
  });
}

beforeAll(async () => {
  const app = express();
  app.use(crearMiddlewareTransporte({ jwtSecret: SECRETO, obligatorio: true }));
  app.use(express.json());
  app.post('/v1/eco', (req, res) => {
    res.json({ cuerpo: req.body, consulta: req.query, autorizacion: req.headers.authorization ?? null });
  });
  app.get('/v1/eco', (req, res) => {
    res.json({ consulta: req.query, autorizacion: req.headers.authorization ?? null });
  });
  app.get('/v1/otra', (_req, res) => {
    res.json({ otra: true });
  });
  app.get('/v1/falta', (_req, res) => {
    res.status(404).json({ codigo: 'NO_ENCONTRADO', mensaje: 'No existe.' });
  });
  app.delete('/v1/eco', (_req, res) => {
    res.status(204).send();
  });
  await new Promise<void>((listo) => {
    servidor = app.listen(0, '127.0.0.1', () => listo());
  });
  base = 'http://127.0.0.1:' + (servidor.address() as AddressInfo).port;
});

afterAll(() => {
  servidor.close();
});

beforeEach(() => {
  enviadas = [];
});

const nuevoFetch = () => crearFetchCifrado(base + '/v1/transporte/llave', registrar);

describe('cifrado de transporte, de punta a punta', () => {
  it('el servidor recibe los datos reales y el panel la respuesta real', async () => {
    const enviar = nuevoFetch();
    const respuesta = await enviar(
      new Request(base + '/v1/eco?pagina=2&nombre=Zulma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-secreto' },
        body: JSON.stringify({ usuario: 'denis.medic', contrasena: 'a123456789' }),
      }),
    );

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      cuerpo: { usuario: 'denis.medic', contrasena: 'a123456789' },
      consulta: { pagina: '2', nombre: 'Zulma' },
      autorizacion: 'Bearer token-secreto',
    });
  });

  it('por el camino no viaja nada legible', async () => {
    const enviar = nuevoFetch();
    await enviar(
      new Request(base + '/v1/eco?nombre=Zulma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-secreto' },
        body: JSON.stringify({ usuario: 'denis.medic', contrasena: 'a123456789' }),
      }),
    );

    const peticion = enviadas.find((e) => e.url.includes('/v1/eco'))!;
    const todo = peticion.url + JSON.stringify(peticion.cabeceras) + peticion.cuerpo;
    for (const dato of ['denis.medic', 'a123456789', 'token-secreto', 'Zulma', 'nombre=']) {
      expect(todo).not.toContain(dato);
    }
    expect(peticion.cabeceras.authorization).toBeUndefined();
    expect(Object.keys(JSON.parse(peticion.cuerpo))).toEqual(['c']);
  });

  it('un cuerpo editado se rechaza', async () => {
    const enviar = nuevoFetch();
    await enviar(new Request(base + '/v1/eco', { method: 'POST', body: JSON.stringify({ cantidad: 5 }) }));
    const original = enviadas.find((e) => e.url.endsWith('/v1/eco'))!;
    const { c } = JSON.parse(original.cuerpo) as { c: string };
    const editado = c.slice(0, 20) + (c[20] === 'A' ? 'B' : 'A') + c.slice(21);

    const respuesta = await repetir(original, { cuerpo: JSON.stringify({ c: editado }) });

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).codigo).toBe('CIFRADO_INVALIDO');
  });

  it('una peticion repetida se rechaza', async () => {
    const enviar = nuevoFetch();
    await enviar(new Request(base + '/v1/eco', { method: 'POST', body: JSON.stringify({ cantidad: 5 }) }));
    const original = enviadas.find((e) => e.url.endsWith('/v1/eco'))!;

    const respuesta = await repetir(original);

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).codigo).toBe('CIFRADO_INVALIDO');
  });

  it('un sobre llevado a otra ruta se rechaza', async () => {
    const enviar = nuevoFetch();
    await enviar(new Request(base + '/v1/eco'));
    const original = enviadas.find((e) => e.url.endsWith('/v1/eco'))!;

    const respuesta = await repetir(original, { url: base + '/v1/otra' });

    expect(respuesta.status).toBe(400);
  });

  it('lo que llega en claro por el gateway se rechaza', async () => {
    const respuesta = await fetch(base + '/v1/eco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sicap-Externo': '1' },
      body: JSON.stringify({ cantidad: -500 }),
    });

    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).codigo).toBe('CIFRADO_REQUERIDO');
  });

  it('entre servicios (sin pasar por el gateway) sigue en claro', async () => {
    const respuesta = await fetch(base + '/v1/eco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: 1 }),
    });

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).cuerpo).toEqual({ cantidad: 1 });
  });

  it('los errores tambien llegan cifrados y se leen igual', async () => {
    const enviar = nuevoFetch();
    const respuesta = await enviar(new Request(base + '/v1/falta'));

    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toEqual({ codigo: 'NO_ENCONTRADO', mensaje: 'No existe.' });
  });

  it('una respuesta sin contenido (204) pasa', async () => {
    const enviar = nuevoFetch();
    const respuesta = await enviar(new Request(base + '/v1/eco', { method: 'DELETE' }));

    expect(respuesta.status).toBe(204);
  });

  it('si el servidor no tiene cifrado, el panel sigue funcionando en claro', async () => {
    const enviar = crearFetchCifrado(base + '/v1/no-existe', registrar);
    const respuesta = await enviar(
      new Request(base + '/v1/eco', { method: 'POST', body: JSON.stringify({ cantidad: 1 }) }),
    );

    // Sin X-Sicap-Externo, como en desarrollo: pasa en claro.
    expect(respuesta.status).toBe(200);
  });
});
