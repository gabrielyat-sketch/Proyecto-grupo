/**
 * Un evento tal como viaja por el bus (docs/eventos/esquema-eventos.md).
 *
 * Es el sobre, no el contenido: `datos` cambia con cada `tipo` y `version`
 * permite cambiarle la forma sin romper a quien ya lo consume.
 */
export interface EventoBus {
  /** El id de la fila del outbox. Es lo que el consumidor guarda para no procesarlo dos veces. */
  id: string;
  tipo: string;
  version: number;
  /** ISO 8601. */
  ocurridoEn: string;
  trazaId: string | null;
  /** Quien lo publico: 'usuarios', 'programas', 'medicamentos'. */
  origen: string;
  datos: Record<string, unknown>;
}

/**
 * Un solo stream para todos los eventos, con un grupo de consumo por servicio.
 *
 * Un stream por tipo obligaria a cada consumidor a saber de antemano la lista
 * completa de tipos que le interesan y a abrir una lectura por cada uno; con
 * uno solo, cada servicio lee todo y descarta lo que no es suyo, que es una
 * comparacion de cadenas. `reportes`, que quiere TODO, ni siquiera descarta.
 */
export const STREAM_EVENTOS = 'eventos';

/**
 * Donde acaban los eventos que un consumidor no pudo procesar tras varios
 * intentos. No se descartan: un evento perdido en silencio es justo lo que el
 * outbox existe para impedir, asi que se apartan donde alguien pueda mirarlos.
 */
export const STREAM_FALLIDOS = 'eventos.fallidos';

/**
 * Tope de entradas del stream, aproximado (`MAXLEN ~`).
 *
 * Redis guarda el stream en memoria y el Droplet tiene 4 GB. Los eventos son
 * pequenos —sin datos clinicos, por diseno— y a este ritmo cien mil son meses
 * de actividad del CAP, de sobra para que un consumidor caido se ponga al dia.
 * Lo que se recorta ya fue publicado: la fuente de verdad sigue en el outbox.
 */
export const TOPE_STREAM = 100_000;

/** Los campos con que se escribe en el stream. Redis solo guarda cadenas. */
export function aCampos(evento: EventoBus): string[] {
  return [
    'id',
    evento.id,
    'tipo',
    evento.tipo,
    'version',
    String(evento.version),
    'ocurridoEn',
    evento.ocurridoEn,
    'trazaId',
    evento.trazaId ?? '',
    'origen',
    evento.origen,
    'datos',
    JSON.stringify(evento.datos),
  ];
}

/**
 * De los campos del stream al sobre. Lo que no se pueda leer se devuelve como
 * error y no como excepcion: un mensaje malformado no puede tumbar el bucle
 * del consumidor, tiene que apartarse y seguir con el siguiente.
 */
export function desdeCampos(campos: string[]): EventoBus | Error {
  const c: Record<string, string> = {};
  for (let i = 0; i + 1 < campos.length; i += 2) c[campos[i]] = campos[i + 1];

  if (!c.id || !c.tipo || !c.origen) {
    return new Error('Mensaje sin id, tipo u origen: ' + JSON.stringify(c));
  }

  let datos: unknown;
  try {
    datos = JSON.parse(c.datos ?? '{}');
  } catch {
    return new Error('Los datos del evento ' + c.id + ' no son JSON.');
  }
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    return new Error('Los datos del evento ' + c.id + ' no son un objeto.');
  }

  return {
    id: c.id,
    tipo: c.tipo,
    version: Number(c.version) || 1,
    ocurridoEn: c.ocurridoEn ?? '',
    trazaId: c.trazaId || null,
    origen: c.origen,
    datos: datos as Record<string, unknown>,
  };
}
