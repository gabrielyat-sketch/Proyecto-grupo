import { ServicioCifrado, normalizarParaIndice } from './cifrado.service';

const LLAVE_A = 'a'.repeat(64);
const LLAVE_B = 'b'.repeat(64);

describe('ServicioCifrado', () => {
  const servicio = new ServicioCifrado(LLAVE_A, LLAVE_B);

  describe('validacion de llaves', () => {
    it('rechaza una llave que no mide 32 bytes', () => {
      expect(() => new ServicioCifrado('abcd', LLAVE_B)).toThrow(/32 bytes/);
    });

    it('rechaza una llave que no es hexadecimal', () => {
      expect(() => new ServicioCifrado('z'.repeat(64), LLAVE_B)).toThrow(/hexadecimal/);
    });

    it('rechaza que LLAVE_DATOS y LLAVE_INDICE sean iguales', () => {
      expect(() => new ServicioCifrado(LLAVE_A, LLAVE_A)).toThrow(/no pueden ser iguales/);
    });

    it('rechaza una llave vacia', () => {
      expect(() => new ServicioCifrado('', LLAVE_B)).toThrow(/no esta definida/);
    });
  });

  describe('cifrar y descifrar', () => {
    it('devuelve el valor original', () => {
      const dpi = '1234567890101';
      expect(servicio.descifrar(servicio.cifrar(dpi))).toBe(dpi);
    });

    it('conserva acentos y caracteres especiales', () => {
      const nota = 'Paciente refiere cefalea. Diagnostico: hipertension arterial anos 2.';
      expect(servicio.descifrar(servicio.cifrar(nota))).toBe(nota);
    });

    it('produce un resultado distinto cada vez para el mismo valor', () => {
      const a = servicio.cifrar('1234567890101');
      const b = servicio.cifrar('1234567890101');
      expect(a.equals(b)).toBe(false);
    });

    it('detecta que el dato fue alterado en la base de datos', () => {
      const paquete = servicio.cifrar('1234567890101');
      paquete[paquete.length - 1] ^= 0xff; // un solo bit cambiado
      expect(() => servicio.descifrar(paquete)).toThrow();
    });

    it('rechaza un paquete truncado', () => {
      expect(() => servicio.descifrar(Buffer.alloc(5))).toThrow(/incompleto o corrupto/);
    });

    it('no puede descifrarse con otra llave', () => {
      const otro = new ServicioCifrado(LLAVE_B, LLAVE_A);
      expect(() => otro.descifrar(servicio.cifrar('1234567890101'))).toThrow();
    });
  });

  describe('indice ciego', () => {
    it('es determinista: el mismo valor da siempre el mismo indice', () => {
      const a = servicio.indiceCiego('1234567890101');
      const b = servicio.indiceCiego('1234567890101');
      expect(a.equals(b)).toBe(true);
    });

    it('ignora espacios y guiones, que es como el personal escribe el DPI', () => {
      const base = servicio.indiceCiego('1234567890101');
      expect(servicio.indiceCiego('1234 56789 0101').equals(base)).toBe(true);
      expect(servicio.indiceCiego('1234-56789-0101').equals(base)).toBe(true);
      expect(servicio.indiceCiego('  1234567890101  ').equals(base)).toBe(true);
    });

    it('distingue valores realmente distintos', () => {
      const a = servicio.indiceCiego('1234567890101');
      const b = servicio.indiceCiego('1234567890102');
      expect(a.equals(b)).toBe(false);
    });

    it('mide 32 bytes (SHA-256)', () => {
      expect(servicio.indiceCiego('1234567890101')).toHaveLength(32);
    });

    it('cambia por completo si cambia la llave de indice', () => {
      const otro = new ServicioCifrado(LLAVE_A, 'c'.repeat(64));
      expect(otro.indiceCiego('1234567890101').equals(servicio.indiceCiego('1234567890101')))
        .toBe(false);
    });
  });

  describe('normalizarParaIndice', () => {
    it('quita espacios, guiones y puntos, y pasa a mayusculas', () => {
      expect(normalizarParaIndice(' exp-2024.001 ')).toBe('EXP2024001');
    });
  });
});
