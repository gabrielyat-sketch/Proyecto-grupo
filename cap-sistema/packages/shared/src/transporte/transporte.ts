import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ECDH } from 'node:crypto';
import { cifrar, derivarLlaveServidor, descifrar, llaveCompartida, llavePublicaServidor } from './llave-transporte';

/**
 * Cifrado de transporte: cifra el contenido de cada peticion y respuesta del
 * panel POR ENCIMA de HTTPS.
 *
 * HTTPS ya protege el camino entre el navegador y el servidor. Lo que no
 * cubre es un proxy instalado en el propio equipo (Burp Suite, por ejemplo),
 * que ve el trafico ya descifrado: usuario, contrasena, tokens y cada ficha.
 * Con esto, ese proxy solo ve `{"c":"…"}`, y cualquier edicion que haga se
 * rechaza porque rompe la etiqueta de AES-GCM.
 *
 * Lo que sigue viendose: la ruta (sin la consulta), el metodo, los tamanos y
 * las horas. Lo que no resuelve: quien controla el navegador puede, con
 * bastante trabajo, interceptar los datos antes de que se cifren.
 *
 * Como viaja una peticion del panel:
 *
 *   x-sicap-clave  llave publica efimera del navegador (base64url)
 *   x-sicap-sobre  cifrado: { v, t, n, m, p, q, a } = version, hora, numero
 *                  unico, metodo, ruta, consulta y cabecera Authorization
 *   cuerpo         { "c": cifrado del cuerpo original }
 *
 * El sobre se compara con la ruta y el metodo reales, y el numero unico no se
 * acepta dos veces: un sobre copiado no sirve ni para otra ruta ni para
 * repetir la misma peticion.
 *
 * Cuando es obligatorio: en produccion, para lo que llega por el gateway (que
 * marca cada peticion con `x-sicap-externo`). Las llamadas entre servicios
 * por la red interna no pasan por el gateway y siguen en claro, igual que en
 * desarrollo y en las pruebas.
 */

export const RUTA_LLAVE_TRANSPORTE = '/v1/transporte/llave';

const CABECERA_CLAVE = 'x-sicap-clave';
const CABECERA_SOBRE = 'x-sicap-sobre';
const CABECERA_EXTERNO = 'x-sicap-externo';

/** Margen de reloj. El panel corrige su hora con la del servidor al pedir la llave. */
const VENTANA_MS = 2 * 60_000;

/** El gateway corta en 1 MB; el cuerpo cifrado ocupa un tercio mas que el original. */
const LIMITE_CUERPO = 1_500_000;

/** Las fichas son JSON de pocos KB: el mismo limite que Nest pone a lo que llega en claro. */
const LIMITE_CUERPO_DESCIFRADO = 100_000;

export interface OpcionesTransporte {
  jwtSecret: string;
  /** Rechazar lo que llegue en claro por el gateway. En produccion, si. */
  obligatorio: boolean;
}

interface Sobre {
  v: 1;
  t: number;
  n: string;
  m: string;
  p: string;
  q: string;
  a: string | null;
}

function esSobre(x: unknown): x is Sobre {
  const s = x as Sobre;
  return (
    typeof s === 'object' &&
    s !== null &&
    s.v === 1 &&
    typeof s.t === 'number' &&
    typeof s.n === 'string' &&
    /^[A-Za-z0-9_-]{16,64}$/.test(s.n) &&
    typeof s.m === 'string' &&
    typeof s.p === 'string' &&
    typeof s.q === 'string' &&
    (s.a === null || typeof s.a === 'string')
  );
}

/**
 * Numeros unicos ya usados. Basta con recordarlos lo que dura la ventana: uno
 * mas viejo ya se rechaza por la hora.
 */
export class RegistroNumeros {
  private readonly vistos = new Map<string, number>();
  private ultimaLimpieza = 0;

  constructor(private readonly maximo = 100_000) {}

  /** true si es la primera vez que se ve; false si es una repeticion. */
  registrar(numero: string, ahora: number): boolean {
    if (ahora - this.ultimaLimpieza > 60_000 || this.vistos.size >= this.maximo) {
      this.limpiar(ahora);
    }
    if (this.vistos.has(numero)) return false;
    this.vistos.set(numero, ahora + 2 * VENTANA_MS);
    return true;
  }

  private limpiar(ahora: number): void {
    this.ultimaLimpieza = ahora;
    for (const [numero, vence] of this.vistos) {
      if (vence <= ahora) this.vistos.delete(numero);
    }
    // Con el volumen de un CAP esto no deberia pasar nunca. Si pasa, se
    // olvidan los mas viejos (el Map conserva el orden de llegada), que son
    // los que antes caen por la hora.
    for (const numero of this.vistos.keys()) {
      if (this.vistos.size < this.maximo) break;
      this.vistos.delete(numero);
    }
  }
}

class Rechazo extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

const invalida = (detalle: string) =>
  new Rechazo(400, 'CIFRADO_INVALIDO', 'La peticion cifrada no es valida (' + detalle + '). Recargue la pagina.');

function leerCuerpo(peticion: any): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    const partes: Buffer[] = [];
    let total = 0;
    let excedido = false;
    peticion.on('data', (parte: Buffer) => {
      total += parte.length;
      if (total > LIMITE_CUERPO) excedido = true;
      if (!excedido) partes.push(parte);
    });
    // Se lee hasta el final aunque sobre: cortar la conexion a medias deja al
    // gateway con un 502 en vez de la respuesta clara de abajo.
    peticion.on('end', () =>
      excedido ? rechazar(new Rechazo(413, 'VALIDACION', 'La peticion es demasiado grande.')) : resolver(Buffer.concat(partes)),
    );
    peticion.on('error', rechazar);
  });
}

function responderRechazo(peticion: any, respuesta: any, rechazo: Rechazo): void {
  // Va en claro: si el problema es justamente el cifrado, no hay llave con
  // que cifrar la respuesta. No lleva ningun dato, solo el motivo.
  const trazaId = randomUUID();
  respuesta.statusCode = rechazo.estado;
  respuesta.setHeader('content-type', 'application/json; charset=utf-8');
  respuesta.setHeader('x-traza-id', trazaId);
  respuesta.end(
    JSON.stringify({
      codigo: rechazo.codigo,
      mensaje: rechazo.message,
      trazaId,
      ruta: peticion.path,
      fecha: new Date().toISOString(),
    }),
  );
}

export function crearMiddlewareTransporte(opciones: OpcionesTransporte) {
  const ecdh: ECDH = derivarLlaveServidor(opciones.jwtSecret);
  const publica = llavePublicaServidor(ecdh);
  const numeros = new RegistroNumeros();

  // Una pestana usa la misma llave efimera en todas sus peticiones: derivar
  // una vez y no en cada una. Acotado para que nadie lo infle a proposito.
  const llaves = new Map<string, Buffer>();
  const llavePara = (clave: string): Buffer => {
    let llave = llaves.get(clave);
    if (!llave) {
      const cruda = Buffer.from(clave, 'base64url');
      if (cruda.length !== 65) throw invalida('llave del navegador');
      try {
        llave = llaveCompartida(ecdh, cruda);
      } catch {
        throw invalida('llave del navegador');
      }
      if (llaves.size >= 1000) llaves.delete(llaves.keys().next().value as string);
      llaves.set(clave, llave);
    }
    return llave;
  };

  async function abrir(peticion: any, respuesta: any, clave: string, sobreCifrado: string): Promise<void> {
    const llave = llavePara(clave);

    let sobre: unknown;
    try {
      sobre = JSON.parse(descifrar(llave, sobreCifrado, 'sicap-sobre-v1'));
    } catch {
      throw invalida('sobre');
    }
    if (!esSobre(sobre)) throw invalida('sobre');
    if (sobre.m !== peticion.method || sobre.p !== peticion.path) throw invalida('ruta');
    const ahora = Date.now();
    if (Math.abs(ahora - sobre.t) > VENTANA_MS) throw invalida('hora');
    if (!numeros.registrar(sobre.n, ahora)) throw invalida('repetida');

    const cruda = await leerCuerpo(peticion);
    if (cruda.length > 0) {
      let texto: string;
      try {
        const { c } = JSON.parse(cruda.toString('utf8')) as { c: unknown };
        if (typeof c !== 'string') throw new Error();
        texto = descifrar(llave, c, 'sicap-cuerpo-v1:' + sobre.n);
      } catch {
        throw invalida('cuerpo');
      }
      if (Buffer.byteLength(texto) > LIMITE_CUERPO_DESCIFRADO) {
        throw new Rechazo(413, 'VALIDACION', 'La peticion es demasiado grande.');
      }
      try {
        peticion.body = texto.length > 0 ? JSON.parse(texto) : undefined;
      } catch {
        throw new Rechazo(400, 'VALIDACION', 'El cuerpo de la peticion no es JSON valido.');
      }
    }
    // El cuerpo ya se consumio: que el parser de JSON de Nest no lo intente.
    delete peticion.headers['content-length'];
    delete peticion.headers['transfer-encoding'];
    peticion._body = true;

    // Lo que viene dentro del sobre manda sobre lo que se vea por fuera.
    peticion.url = sobre.p + (sobre.q ? '?' + sobre.q : '');
    delete peticion.headers.authorization;
    if (sobre.a) peticion.headers.authorization = sobre.a;

    // Toda respuesta sale cifrada, ligada a ESTA peticion por el numero unico:
    // un proxy no puede cambiarla ni pegar la respuesta de otra.
    //
    // Se engancha `send` porque es por donde sale todo en Express: `json`
    // termina llamandolo con el texto ya serializado, y el filtro de errores
    // de Nest usa `json`.
    const enviarOriginal = respuesta.send.bind(respuesta);
    const contexto = 'sicap-respuesta-v1:' + sobre.n;
    respuesta.send = (cuerpo: unknown) => {
      if (cuerpo === undefined || cuerpo === null || respuesta.statusCode === 204 || respuesta.statusCode === 304) {
        return enviarOriginal(cuerpo);
      }
      let texto: string;
      let tipo = respuesta.getHeader('content-type') as string | undefined;
      if (Buffer.isBuffer(cuerpo)) {
        texto = cuerpo.toString('utf8');
        tipo ??= 'application/octet-stream';
      } else if (typeof cuerpo === 'string') {
        texto = cuerpo;
        tipo ??= 'text/html; charset=utf-8';
      } else {
        texto = JSON.stringify(cuerpo);
        tipo = 'application/json; charset=utf-8';
      }
      respuesta.setHeader('x-sicap-cifrado', '1');
      respuesta.setHeader('x-sicap-tipo', tipo);
      respuesta.setHeader('content-type', 'application/json; charset=utf-8');
      respuesta.setHeader('cache-control', 'no-store');
      return enviarOriginal(JSON.stringify({ c: cifrar(llave, texto, contexto) }));
    };
  }

  return function middlewareTransporte(peticion: any, respuesta: any, siguiente: (error?: unknown) => void): void {
    // La llave publica del servidor, y su hora para que el panel corrija la
    // propia: las computadoras del CAP no siempre tienen el reloj bien.
    if (peticion.method === 'GET' && peticion.path === RUTA_LLAVE_TRANSPORTE) {
      respuesta.setHeader('content-type', 'application/json; charset=utf-8');
      respuesta.setHeader('cache-control', 'no-store');
      respuesta.end(JSON.stringify({ llave: publica, ahora: Date.now() }));
      return;
    }

    const clave = peticion.headers[CABECERA_CLAVE];
    const sobre = peticion.headers[CABECERA_SOBRE];

    if (typeof clave !== 'string' || typeof sobre !== 'string') {
      if (opciones.obligatorio && peticion.headers[CABECERA_EXTERNO] !== undefined) {
        responderRechazo(
          peticion,
          respuesta,
          new Rechazo(400, 'CIFRADO_REQUERIDO', 'Esta peticion debe ir cifrada. Recargue la pagina.'),
        );
        return;
      }
      siguiente();
      return;
    }

    abrir(peticion, respuesta, clave, sobre).then(
      () => siguiente(),
      (error: unknown) => {
        if (error instanceof Rechazo) responderRechazo(peticion, respuesta, error);
        else siguiente(error);
      },
    );
  };
}

/**
 * Monta el cifrado de transporte. Va en main.ts ANTES de que Nest arranque:
 * tiene que quedar por delante del parser de JSON, que Nest registra al
 * iniciar, para recibir el cuerpo cifrado sin tocar.
 */
export function instalarCifradoTransporte(app: INestApplication, opciones: OpcionesTransporte): void {
  app.use(crearMiddlewareTransporte(opciones));
}
