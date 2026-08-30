import {
  calcularHash,
  contenidoCanonico,
  ContenidoRegistro,
  firmaRaizValida,
  firmarRaiz,
  HASH_GENESIS,
  RegistroVerificable,
  verificarCadena,
} from './cadena';

const LLAVE = 'a'.repeat(64);

const contenido = (parcial: Partial<ContenidoRegistro> = {}): ContenidoRegistro => ({
  servicio: 'usuarios',
  accion: 'MODIFICACION',
  entidad: 'expediente',
  entidadId: 'exp-001',
  usuarioId: 'usr-007',
  usuarioRol: 'MEDICO',
  motivo: 'Correccion de diagnostico',
  valorAnterior: 'cifrado:aaa',
  valorNuevo: 'cifrado:bbb',
  trazaId: 'traza-1',
  ip: '10.0.0.5',
  ocurridoEn: new Date('2026-08-26T15:00:00.000Z'),
  registradoEn: new Date('2026-08-26T15:00:00.250Z'),
  ...parcial,
});

/** Encadena una lista de contenidos como lo haria el servicio. */
function encadenar(contenidos: ContenidoRegistro[]): RegistroVerificable[] {
  let previo = HASH_GENESIS;
  return contenidos.map((c, i) => {
    const hash = calcularHash(previo, c);
    const registro: RegistroVerificable = { ...c, numero: BigInt(i + 1), hashPrevio: previo, hash };
    previo = hash;
    return registro;
  });
}

describe('contenidoCanonico', () => {
  it('no depende del orden en que se construyo el objeto', () => {
    // Es toda la razon de ser del arreglo posicional: con JSON.stringify sobre
    // un objeto, reordenar los campos del modelo cambiaria todos los hashes
    // guardados y la cadena entera pareceria rota sin que nadie tocara un dato.
    const a = contenido();
    const b: ContenidoRegistro = {
      registradoEn: a.registradoEn,
      ocurridoEn: a.ocurridoEn,
      ip: a.ip,
      trazaId: a.trazaId,
      valorNuevo: a.valorNuevo,
      valorAnterior: a.valorAnterior,
      motivo: a.motivo,
      usuarioRol: a.usuarioRol,
      usuarioId: a.usuarioId,
      entidadId: a.entidadId,
      entidad: a.entidad,
      accion: a.accion,
      servicio: a.servicio,
    };
    expect(contenidoCanonico(b)).toBe(contenidoCanonico(a));
  });

  it('distingue un campo vacio de uno ausente', () => {
    expect(contenidoCanonico(contenido({ motivo: null }))).not.toBe(
      contenidoCanonico(contenido({ motivo: '' })),
    );
  });
});

describe('calcularHash', () => {
  it('el mismo contenido y el mismo previo dan siempre el mismo hash', () => {
    expect(calcularHash(HASH_GENESIS, contenido())).toBe(calcularHash(HASH_GENESIS, contenido()));
  });

  it('cambiar un solo caracter del contenido cambia el hash', () => {
    const original = calcularHash(HASH_GENESIS, contenido());
    const alterado = calcularHash(HASH_GENESIS, contenido({ entidadId: 'exp-002' }));
    expect(alterado).not.toBe(original);
  });

  it('el mismo contenido despues de otro registro da un hash distinto', () => {
    // Sin esto, dos acciones identicas producirian entradas identicas y una
    // podria sustituir a la otra sin que se notara.
    const previo = calcularHash(HASH_GENESIS, contenido());
    expect(calcularHash(previo, contenido())).not.toBe(calcularHash(HASH_GENESIS, contenido()));
  });

  it('devuelve 64 caracteres hexadecimales', () => {
    expect(calcularHash(HASH_GENESIS, contenido())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('verificarCadena', () => {
  it('una cadena intacta se verifica entera', () => {
    const cadena = encadenar([contenido(), contenido({ accion: 'CONSULTA' }), contenido({ accion: 'IMPRESION' })]);
    expect(verificarCadena(cadena)).toEqual({ intacta: true, revisados: 3 });
  });

  it('una bitacora vacia esta intacta', () => {
    expect(verificarCadena([])).toEqual({ intacta: true, revisados: 0 });
  });

  it('detecta un contenido alterado y señala el registro exacto', () => {
    // El caso del criterio de terminado (§15.2): alguien edita un valor
    // directamente en la base y la cadena tiene que delatarlo.
    const cadena = encadenar([contenido(), contenido(), contenido()]);
    cadena[1].motivo = 'Motivo inventado despues';

    const r = verificarCadena(cadena);
    expect(r.intacta).toBe(false);
    expect(r.rotoEn).toBe(2n);
    expect(r.motivo).toContain('no corresponde a su hash');
  });

  it('detecta un registro desaparecido', () => {
    const cadena = encadenar([contenido(), contenido(), contenido()]);
    const sinElDelMedio = [cadena[0], cadena[2]];

    const r = verificarCadena(sinElDelMedio);
    expect(r.intacta).toBe(false);
    expect(r.rotoEn).toBe(3n);
    expect(r.motivo).toContain('Falta un registro');
  });

  it('detecta una cadena que no arranca en el genesis', () => {
    const cadena = encadenar([contenido(), contenido()]);
    const r = verificarCadena([cadena[1]]);
    expect(r.intacta).toBe(false);
    expect(r.rotoEn).toBe(2n);
  });

  it('se detiene en el primer fallo, no en el ultimo', () => {
    // Alterar el registro 2 deja "rotos" tambien el 3 y el 4. Reportar los
    // tres esconde el unico que dice donde ocurrio la alteracion.
    const cadena = encadenar([contenido(), contenido(), contenido(), contenido()]);
    cadena[1].ip = '1.2.3.4';
    expect(verificarCadena(cadena).rotoEn).toBe(2n);
  });

  it('alterar el ultimo registro tambien se detecta', () => {
    const cadena = encadenar([contenido(), contenido()]);
    cadena[1].usuarioId = 'otro';
    expect(verificarCadena(cadena).rotoEn).toBe(2n);
  });
});

describe('firmarRaiz', () => {
  const raiz = { dia: '2026-08-26', numeroDesde: 1n, numeroHasta: 40n, cantidad: 40, hashFinal: 'f'.repeat(64) };

  it('la misma raiz con la misma llave da siempre la misma firma', () => {
    expect(firmarRaiz(LLAVE, raiz)).toBe(firmarRaiz(LLAVE, raiz));
  });

  it('cambiar el hash final invalida la firma', () => {
    const firma = firmarRaiz(LLAVE, raiz);
    expect(firmaRaizValida(LLAVE, { ...raiz, hashFinal: 'e'.repeat(64) }, firma)).toBe(false);
  });

  it('cambiar el rango de registros invalida la firma', () => {
    const firma = firmarRaiz(LLAVE, raiz);
    expect(firmaRaizValida(LLAVE, { ...raiz, numeroHasta: 39n, cantidad: 39 }, firma)).toBe(false);
  });

  it('otra llave no puede producir la firma correcta', () => {
    // Es lo que sostiene §9.5: quien reescriba la base entera y recalcule
    // todos los hashes sigue sin poder volver a firmar la raiz.
    expect(firmaRaizValida('b'.repeat(64), raiz, firmarRaiz(LLAVE, raiz))).toBe(false);
  });

  it('una firma de largo distinto se rechaza sin reventar', () => {
    expect(firmaRaizValida(LLAVE, raiz, 'abc')).toBe(false);
  });

  it('la firma valida se acepta', () => {
    expect(firmaRaizValida(LLAVE, raiz, firmarRaiz(LLAVE, raiz))).toBe(true);
  });
});
