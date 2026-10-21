/**
 * Cifrado de transporte del lado del panel.
 *
 * Cifra cada peticion a la API por encima de HTTPS, para que un proxy en el
 * propio equipo (Burp Suite, por ejemplo) no vea usuario, contrasena, tokens
 * ni datos de pacientes, y para que no pueda editarlos: el servidor rechaza
 * cualquier mensaje alterado. El esquema y sus razones estan en
 * `packages/shared/src/transporte/` del lado del servidor; si uno cambia, el
 * otro tambien.
 *
 * Las llaves son de WebCrypto y NO exportables: ni el propio codigo del panel
 * puede leerlas, solo usarlas. Se generan de nuevo en cada pestana.
 */

const SAL = new TextEncoder().encode('sicap-transporte-v1');
const INFO = new TextEncoder().encode('aes-256-gcm');

interface Canal {
  llave: CryptoKey;
  /** Llave publica efimera de esta pestana, base64url. */
  clave: string;
  /** Hora del servidor menos la local: el reloj de la computadora puede estar mal. */
  desfase: number;
}

function aBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arreglo = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = '';
  for (const b of arreglo) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** Abre el canal con la llave publica del servidor (y su hora). */
export async function abrirCanal(llaveServidor: string, horaServidor: number): Promise<Canal> {
  const subtle = crypto.subtle;
  const curva = { name: 'ECDH', namedCurve: 'P-256' } as const;
  const par = (await subtle.generateKey(curva, false, ['deriveBits'])) as CryptoKeyPair;
  const servidor = await subtle.importKey('raw', deBase64Url(llaveServidor), curva, false, []);
  const secreto = await subtle.deriveBits({ name: 'ECDH', public: servidor }, par.privateKey, 256);
  const base = await subtle.importKey('raw', secreto, 'HKDF', false, ['deriveKey']);
  const llave = await subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: SAL, info: INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return {
    llave,
    clave: aBase64Url(await subtle.exportKey('raw', par.publicKey)),
    desfase: horaServidor - Date.now(),
  };
}

export async function cifrar(llave: CryptoKey, texto: string, contexto: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cuerpo = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(contexto) },
    llave,
    new TextEncoder().encode(texto),
  );
  const resultado = new Uint8Array(12 + cuerpo.byteLength);
  resultado.set(iv);
  resultado.set(new Uint8Array(cuerpo), 12);
  return aBase64Url(resultado);
}

export async function descifrar(llave: CryptoKey, mensaje: string, contexto: string): Promise<string> {
  const datos = deBase64Url(mensaje);
  const texto = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: datos.subarray(0, 12), additionalData: new TextEncoder().encode(contexto) },
    llave,
    datos.subarray(12),
  );
  return new TextDecoder().decode(texto);
}

/**
 * Ruta tal como la ve el servicio: el gateway (y el proxy de Vite) le quitan
 * el `/api/<servicio>` del principio.
 */
const rutaDelServicio = (ruta: string) => ruta.replace(/^\/api\/[a-z]+/, '');

/**
 * Cifra una peticion, la envia y descifra la respuesta. Lo que devuelve es la
 * respuesta como si nunca hubiera ido cifrada, asi que el resto del panel no
 * se entera.
 */
export async function enviarCifrado(
  canal: Canal,
  peticion: Request,
  enviar: (peticion: Request) => Promise<Response>,
): Promise<Response> {
  const url = new URL(peticion.url);
  const numero = aBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const sobre = {
    v: 1,
    t: Date.now() + canal.desfase,
    n: numero,
    m: peticion.method,
    p: rutaDelServicio(url.pathname),
    q: url.search.replace(/^\?/, ''),
    a: peticion.headers.get('Authorization'),
  };

  const cabeceras = new Headers({
    Accept: 'application/json',
    'X-Sicap-Clave': canal.clave,
    'X-Sicap-Sobre': await cifrar(canal.llave, JSON.stringify(sobre), 'sicap-sobre-v1'),
  });

  let cuerpo: string | undefined;
  if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
    const original = await peticion.text();
    if (original.length > 0) {
      cabeceras.set('Content-Type', 'application/json');
      cuerpo = JSON.stringify({ c: await cifrar(canal.llave, original, 'sicap-cuerpo-v1:' + numero) });
    }
  }

  const respuesta = await enviar(
    new Request(url.origin + url.pathname, {
      method: peticion.method,
      headers: cabeceras,
      body: cuerpo,
      signal: peticion.signal,
    }),
  );

  // Lo que no viene cifrado son rechazos del gateway (429, 502…) o del propio
  // cifrado: no traen datos y se entregan tal cual.
  if (respuesta.headers.get('X-Sicap-Cifrado') !== '1') return respuesta;

  const { c } = (await respuesta.json()) as { c: string };
  const texto = await descifrar(canal.llave, c, 'sicap-respuesta-v1:' + numero);
  const cabecerasRespuesta = new Headers(respuesta.headers);
  cabecerasRespuesta.delete('Content-Length');
  cabecerasRespuesta.delete('Content-Encoding');
  cabecerasRespuesta.set('Content-Type', respuesta.headers.get('X-Sicap-Tipo') ?? 'application/json');
  return new Response(texto, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabecerasRespuesta,
  });
}

/**
 * `fetch` que cifra. El canal se abre una vez por pestana, con la primera
 * peticion.
 *
 * Si no se pudo abrir (sin red, o un servidor que todavia no tiene cifrado),
 * la peticion sale en claro: en produccion el servidor la rechaza con un
 * mensaje claro, y en desarrollo funciona igual que antes. No se recuerda el
 * fallo, asi que la siguiente peticion vuelve a intentarlo.
 */
export function crearFetchCifrado(rutaLlave: string, enviar: (peticion: Request) => Promise<Response>) {
  let canal: Promise<Canal | null> | null = null;

  const obtenerCanal = (): Promise<Canal | null> => {
    canal ??= (async () => {
      try {
        const respuesta = await enviar(new Request(rutaLlave, { cache: 'no-store' }));
        if (!respuesta.ok) return null;
        const { llave, ahora } = (await respuesta.json()) as { llave: string; ahora: number };
        return await abrirCanal(llave, ahora);
      } catch {
        return null;
      }
    })().then((abierto) => {
      if (!abierto) canal = null;
      return abierto;
    });
    return canal;
  };

  return async (peticion: Request): Promise<Response> => {
    const abierto = await obtenerCanal();
    if (!abierto) return enviar(peticion);

    const respuesta = await enviarCifrado(abierto, peticion, enviar);
    // La llave del servidor cambio (JWT_SECRET nuevo tras un despliegue) o el
    // reloj se desfaso: la proxima peticion abre un canal nuevo.
    if (respuesta.status === 400 && respuesta.headers.get('X-Sicap-Cifrado') !== '1') {
      const codigo = await respuesta
        .clone()
        .json()
        .then((e: { codigo?: string }) => e.codigo)
        .catch(() => undefined);
      if (codigo === 'CIFRADO_INVALIDO') canal = null;
    }
    return respuesta;
  };
}
