import { createECDH } from 'node:crypto';
import { cifrar, derivarLlaveServidor, descifrar, llaveCompartida, llavePublicaServidor } from './llave-transporte';
import { RegistroNumeros } from './transporte';

/*
 * La prueba de punta a punta, con el panel real hablando con este middleware
 * por HTTP, esta en web/pruebas/transporte-cruzado.spec.ts.
 */

const SECRETO = 'secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres';

describe('llave de transporte', () => {
  it('los cinco servicios derivan la misma llave del mismo JWT_SECRET', () => {
    expect(llavePublicaServidor(derivarLlaveServidor(SECRETO))).toBe(
      llavePublicaServidor(derivarLlaveServidor(SECRETO)),
    );
  });

  it('otro JWT_SECRET da otra llave', () => {
    expect(llavePublicaServidor(derivarLlaveServidor(SECRETO))).not.toBe(
      llavePublicaServidor(derivarLlaveServidor(SECRETO + 'x')),
    );
  });

  it('navegador y servidor llegan a la misma llave compartida', () => {
    const servidor = derivarLlaveServidor(SECRETO);
    const navegador = createECDH('prime256v1');
    navegador.generateKeys();

    const delServidor = llaveCompartida(servidor, navegador.getPublicKey());
    const delNavegador = llaveCompartida(navegador, servidor.getPublicKey());

    expect(delServidor.equals(delNavegador)).toBe(true);
  });

  it('una llave publica que no esta en la curva se rechaza', () => {
    const invalida = Buffer.alloc(65, 7);
    invalida[0] = 4;
    expect(() => llaveCompartida(derivarLlaveServidor(SECRETO), invalida)).toThrow();
  });
});

describe('cifrar y descifrar', () => {
  const llave = Buffer.alloc(32, 1);

  it('ida y vuelta', () => {
    expect(descifrar(llave, cifrar(llave, 'hola', 'ctx'), 'ctx')).toBe('hola');
  });

  it('el mismo texto cifrado dos veces no se parece', () => {
    expect(cifrar(llave, 'hola', 'ctx')).not.toBe(cifrar(llave, 'hola', 'ctx'));
  });

  it('un caracter cambiado se detecta', () => {
    const mensaje = cifrar(llave, '{"cantidad":5}', 'ctx');
    const editado = mensaje.slice(0, 15) + (mensaje[15] === 'A' ? 'B' : 'A') + mensaje.slice(16);
    expect(() => descifrar(llave, editado, 'ctx')).toThrow();
  });

  it('un mensaje de otro contexto (otra peticion) no se acepta', () => {
    expect(() => descifrar(llave, cifrar(llave, 'hola', 'ctx-1'), 'ctx-2')).toThrow();
  });
});

describe('RegistroNumeros', () => {
  it('acepta un numero la primera vez y lo rechaza la segunda', () => {
    const registro = new RegistroNumeros();
    expect(registro.registrar('abc', 1_000)).toBe(true);
    expect(registro.registrar('abc', 2_000)).toBe(false);
  });

  it('olvida los vencidos', () => {
    const registro = new RegistroNumeros();
    registro.registrar('abc', 0);
    // Pasada la ventana la hora ya lo rechaza; el registro puede soltarlo.
    expect(registro.registrar('abc', 10 * 60_000)).toBe(true);
  });

  it('no crece sin limite', () => {
    const registro = new RegistroNumeros(3);
    for (const n of ['a', 'b', 'c', 'd', 'e']) registro.registrar(n, 1_000);
    // Los mas viejos se soltaron para hacer lugar; los recientes siguen.
    expect(registro.registrar('e', 1_000)).toBe(false);
  });
});
