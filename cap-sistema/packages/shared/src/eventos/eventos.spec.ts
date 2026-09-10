import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConsumidorEventos } from './consumidor';
import { desdeCampos, EventoBus, STREAM_EVENTOS, STREAM_FALLIDOS } from './evento';
import { FilaOutbox, FuenteOutbox, PublicadorOutbox } from './publicador';

/**
 * El bus de verdad, contra un Redis de verdad.
 *
 * Un Redis falso tendria que imitar los grupos de consumo, los pendientes por
 * inactividad y el conteo de entregas, que es justo lo que estas pruebas
 * quieren comprobar; imitarlo mal daria pruebas verdes sobre un bus que no
 * funciona. Se usa la base 15 del Redis local, que no usa nadie mas, y se
 * vacia al empezar. Si Redis no esta levantado, la prueba lo dice.
 */
const URL = process.env.REDIS_URL_PRUEBAS ?? 'redis://localhost:6379/15';

// Con la suite entera corriendo en paralelo, esta maquina tarda mas de treinta
// segundos en arrancar cada archivo; los cinco segundos por omision no llegan.
jest.setTimeout(30_000);

/** Un outbox en memoria con la misma forma que la tabla. */
class OutboxEnMemoria implements FuenteOutbox {
  filas: (FilaOutbox & { publicadaEn: Date | null; intentos: number })[] = [];
  fallarAlMarcar = false;

  anadir(tipo: string, datos: Record<string, unknown>): string {
    const id = 'ev-' + (this.filas.length + 1);
    this.filas.push({
      id,
      tipo,
      version: 1,
      datos,
      trazaId: 'traza-' + id,
      ocurridoEn: new Date(2026, 8, 9, 10, this.filas.length),
      publicadaEn: null,
      intentos: 0,
    });
    return id;
  }

  async pendientes(limite: number): Promise<FilaOutbox[]> {
    return this.filas
      .filter((f) => f.publicadaEn === null)
      .sort((a, b) => a.ocurridoEn.getTime() - b.ocurridoEn.getTime())
      .slice(0, limite);
  }

  async marcarPublicada(id: string): Promise<void> {
    if (this.fallarAlMarcar) throw new Error('La base no responde.');
    this.filas.find((f) => f.id === id)!.publicadaEn = new Date();
  }

  async marcarFallo(id: string): Promise<void> {
    this.filas.find((f) => f.id === id)!.intentos++;
  }
}

const silencio = new Logger('pruebas');
silencio.error = () => undefined;
silencio.warn = () => undefined;

describe('el bus de eventos', () => {
  let redis: Redis;
  const conexiones: Redis[] = [];
  const conectar = () => {
    const r = new Redis(URL, { maxRetriesPerRequest: 2, lazyConnect: true });
    conexiones.push(r);
    return r;
  };

  beforeAll(async () => {
    redis = conectar();
    try {
      await redis.connect();
    } catch (error) {
      throw new Error(
        'Estas pruebas necesitan Redis en ' + URL + ' (docker compose up -d): ' + String(error),
      );
    }
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await Promise.all(conexiones.map((c) => c.quit().catch(() => undefined)));
  });

  /** Cuantos mensajes tiene entregados y sin confirmar el grupo `programas`. */
  const pendientes = async () =>
    ((await redis.xpending(STREAM_EVENTOS, 'programas')) as [number])[0];

  const leerTodo = async (stream = STREAM_EVENTOS) =>
    ((await redis.xrange(stream, '-', '+')) as [string, string[]][]).map(([, campos]) =>
      desdeCampos(campos),
    );

  // ══════════════════ el publicador ══════════════════

  it('publica las filas pendientes en orden y las marca', async () => {
    const outbox = new OutboxEnMemoria();
    outbox.anadir('paciente.creado', { pacienteId: 'p-1' });
    outbox.anadir('atencion.registrada', { atencionId: 'a-1', pesoKg: 62.5 });
    const publicador = new PublicadorOutbox(conectar(), outbox, { origen: 'usuarios' });

    expect(await publicador.publicarPendientes()).toBe(2);

    const eventos = (await leerTodo()) as EventoBus[];
    expect(eventos.map((e) => e.tipo)).toEqual(['paciente.creado', 'atencion.registrada']);
    expect(eventos[1]).toMatchObject({
      id: 'ev-2',
      origen: 'usuarios',
      trazaId: 'traza-ev-2',
      version: 1,
      datos: { atencionId: 'a-1', pesoKg: 62.5 },
    });
    expect(outbox.filas.every((f) => f.publicadaEn !== null)).toBe(true);

    // Una segunda pasada no vuelve a publicar nada.
    expect(await publicador.publicarPendientes()).toBe(0);
    expect(await leerTodo()).toHaveLength(2);
    await publicador.detener();
  });

  /**
   * Si el XADD entro pero no se pudo marcar la fila, la siguiente pasada la
   * vuelve a publicar. Es «al menos una vez» a proposito: la alternativa
   * —marcar primero— perderia el evento en silencio.
   */
  it('si no puede marcar la fila, la vuelve a publicar despues', async () => {
    const outbox = new OutboxEnMemoria();
    outbox.anadir('paciente.creado', { pacienteId: 'p-1' });
    const publicador = new PublicadorOutbox(conectar(), outbox, {
      origen: 'usuarios',
      logger: silencio,
    });

    outbox.fallarAlMarcar = true;
    await expect(publicador.publicarPendientes()).rejects.toThrow('La base no responde.');
    expect(await leerTodo()).toHaveLength(1);

    outbox.fallarAlMarcar = false;
    expect(await publicador.publicarPendientes()).toBe(1);
    expect(await leerTodo()).toHaveLength(2);
    expect(outbox.filas[0].publicadaEn).not.toBeNull();
    await publicador.detener();
  });

  it('si Redis no responde, anota el intento y no marca nada como publicado', async () => {
    const outbox = new OutboxEnMemoria();
    outbox.anadir('paciente.creado', { pacienteId: 'p-1' });
    const roto = new Redis('redis://localhost:1/0', {
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      enableOfflineQueue: false,
      // Sin reconexion: una conexion que reintenta para siempre deja a jest
      // colgado al terminar, esperando un socket que nunca va a abrirse.
      retryStrategy: () => null,
    });
    const publicador = new PublicadorOutbox(roto, outbox, { origen: 'usuarios', logger: silencio });

    expect(await publicador.publicarPendientes()).toBe(0);
    expect(outbox.filas[0].publicadaEn).toBeNull();
    expect(outbox.filas[0].intentos).toBe(1);
    await publicador.detener();
  });

  // ══════════════════ el consumidor ══════════════════

  async function publicar(...tipos: string[]) {
    const outbox = new OutboxEnMemoria();
    for (const t of tipos) outbox.anadir(t, { n: outbox.filas.length + 1 });
    const publicador = new PublicadorOutbox(conectar(), outbox, { origen: 'usuarios' });
    await publicador.publicarPendientes();
    await publicador.detener();
  }

  it('entrega cada evento a su grupo y lo confirma', async () => {
    const recibidos: EventoBus[] = [];
    const consumidor = new ConsumidorEventos(conectar(), {
      grupo: 'programas',
      manejar: async (e) => {
        recibidos.push(e);
      },
    });
    // El grupo se crea antes de publicar: empieza en lo que llegue desde ahora.
    await consumidor.procesarUnaVez();

    await publicar('paciente.creado', 'ficha.prenatal.registrada');
    expect(await consumidor.procesarUnaVez()).toBe(2);
    expect(recibidos.map((e) => e.tipo)).toEqual(['paciente.creado', 'ficha.prenatal.registrada']);
    expect(recibidos[1].datos).toEqual({ n: 2 });

    // Confirmados: no quedan pendientes ni se vuelven a entregar.
    expect(await pendientes()).toBe(0);
    expect(await consumidor.procesarUnaVez()).toBe(0);
    await consumidor.detener();
  });

  it('dos grupos leen el mismo evento cada uno por su lado', async () => {
    const vistos: Record<string, string[]> = { programas: [], reportes: [] };
    const consumidores = ['programas', 'reportes'].map(
      (grupo) =>
        new ConsumidorEventos(conectar(), {
          grupo,
          manejar: async (e) => {
            vistos[grupo].push(e.id);
          },
        }),
    );
    for (const c of consumidores) await c.procesarUnaVez();

    await publicar('atencion.registrada');
    for (const c of consumidores) await c.procesarUnaVez();

    expect(vistos).toEqual({ programas: ['ev-1'], reportes: ['ev-1'] });
    for (const c of consumidores) await c.detener();
  });

  /**
   * Un manejador que lanza deja el mensaje sin confirmar, y pasado el tiempo
   * de inactividad se vuelve a entregar. Asi un consumidor que murio a media
   * tarea no pierde nada: la siguiente instancia lo reclama.
   */
  it('lo que el manejador no pudo procesar se vuelve a entregar', async () => {
    let fallar = true;
    const entregas: string[] = [];
    const consumidor = new ConsumidorEventos(conectar(), {
      grupo: 'programas',
      // Medio segundo y no veinte milisegundos: la comprobacion de «todavia no
      // se reclama» necesita que un tropiezo de la maquina no la convierta en
      // un reclamo adelantado.
      minInactivoMs: 500,
      logger: silencio,
      manejar: async (e) => {
        entregas.push(e.id);
        if (fallar) throw new Error('La base de programas no responde.');
      },
    });
    await consumidor.procesarUnaVez();
    await publicar('ficha.prenatal.registrada');

    expect(await consumidor.procesarUnaVez()).toBe(1);
    expect(entregas).toEqual(['ev-1']);
    expect(await pendientes()).toBe(1);

    // Todavia no ha pasado el tiempo de inactividad: no se reclama.
    expect(await consumidor.procesarUnaVez()).toBe(0);

    await new Promise((r) => setTimeout(r, 600));
    fallar = false;
    expect(await consumidor.procesarUnaVez()).toBe(1);
    expect(entregas).toEqual(['ev-1', 'ev-1']);
    expect(await pendientes()).toBe(0);
    await consumidor.detener();
  });

  /**
   * Un mensaje que falla una y otra vez no puede quedarse bloqueando la cola
   * para siempre, pero tampoco desaparecer: se aparta con su motivo donde
   * alguien pueda mirarlo.
   */
  it('tras varios fallos seguidos aparta el evento en eventos.fallidos', async () => {
    const consumidor = new ConsumidorEventos(conectar(), {
      grupo: 'programas',
      minInactivoMs: 5,
      maxEntregas: 2,
      logger: silencio,
      manejar: async () => {
        throw new Error('Siempre falla.');
      },
    });
    await consumidor.procesarUnaVez();
    await publicar('ficha.prenatal.registrada');

    for (let i = 0; i < 4; i++) {
      await consumidor.procesarUnaVez();
      await new Promise((r) => setTimeout(r, 10));
    }

    expect(await pendientes()).toBe(0);
    const fallidos = (await redis.xrange(STREAM_FALLIDOS, '-', '+')) as [string, string[]][];
    expect(fallidos).toHaveLength(1);
    const campos = fallidos[0][1];
    expect(campos[campos.indexOf('grupo') + 1]).toBe('programas');
    expect(campos[campos.indexOf('motivo') + 1]).toMatch(/Fallo 3 veces seguidas/);
    expect(desdeCampos(campos)).toMatchObject({ id: 'ev-1', tipo: 'ficha.prenatal.registrada' });
    await consumidor.detener();
  });

  it('un mensaje malformado se aparta sin tumbar el bucle', async () => {
    const recibidos: string[] = [];
    const consumidor = new ConsumidorEventos(conectar(), {
      grupo: 'programas',
      logger: silencio,
      manejar: async (e) => {
        recibidos.push(e.id);
      },
    });
    await consumidor.procesarUnaVez();

    await redis.xadd(STREAM_EVENTOS, '*', 'id', 'x-1', 'tipo', 'raro', 'origen', 'nadie', 'datos', '{no es json');
    await publicar('paciente.creado');

    expect(await consumidor.procesarUnaVez()).toBe(2);
    expect(recibidos).toEqual(['ev-1']);
    const fallidos = await redis.xrange(STREAM_FALLIDOS, '-', '+');
    expect(fallidos).toHaveLength(1);
    expect(await pendientes()).toBe(0);
    await consumidor.detener();
  });
});
