import { Writable } from 'node:stream';
import { crearLogger } from './logger';

/** Ejecuta fn con un logger real de la libreria y devuelve lo que escribio. */
function capturar(fn: (logger: ReturnType<typeof crearLogger>) => void): string {
  let salida = '';
  const destino = new Writable({
    write(trozo, _codificacion, cb) {
      salida += trozo.toString();
      cb();
    },
  });
  fn(crearLogger('prueba', 'info', destino));
  return salida;
}

describe('crearLogger', () => {
  it('oculta la contrasena', () => {
    const salida = capturar((l) => l.info({ contrasena: 'SuperSecreta123' }, 'intento de login'));
    expect(salida).not.toContain('SuperSecreta123');
    expect(salida).toContain('[OCULTO]');
  });

  it('oculta el DPI del paciente', () => {
    const salida = capturar((l) => l.info({ dpi: '1234567890101' }, 'consulta de expediente'));
    expect(salida).not.toContain('1234567890101');
  });

  it('oculta el token de acceso', () => {
    const salida = capturar((l) => l.info({ token: 'eyJhbGciOiJIUzI1NiJ9.abc' }, 'refresh'));
    expect(salida).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('oculta las llaves de cifrado', () => {
    const salida = capturar((l) => l.info({ LLAVE_DATOS: 'a'.repeat(64) }, 'arranque'));
    expect(salida).not.toContain('a'.repeat(64));
  });

  it('oculta notas clinicas y diagnosticos', () => {
    const salida = capturar((l) =>
      l.info({ diagnostico: 'hipertension arterial', notasClinicas: 'refiere cefalea' }, 'atencion'),
    );
    expect(salida).not.toContain('hipertension arterial');
    expect(salida).not.toContain('refiere cefalea');
  });

  it('oculta campos sensibles tambien cuando van anidados', () => {
    const salida = capturar((l) => l.info({ cuerpo: { contrasena: 'Anidada123' } }, 'registro'));
    expect(salida).not.toContain('Anidada123');
  });

  it('deja pasar la informacion que si debe registrarse', () => {
    const salida = capturar((l) => l.info({ trazaId: 'abc-123' }, 'peticion atendida'));
    expect(salida).toContain('abc-123');
    expect(salida).toContain('peticion atendida');
  });

  it('incluye el nombre del servicio', () => {
    expect(capturar((l) => l.info('arranque'))).toContain('prueba');
  });
});
