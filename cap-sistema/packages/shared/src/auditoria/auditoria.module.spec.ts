import { ClienteAuditoria, ClienteAuditoriaNulo, CLIENTE_AUDITORIA } from './cliente-auditoria';
import { ModuloAuditoria } from './auditoria.module';

/** Ejecuta la fabrica del unico proveedor que declara el modulo. */
function clienteDe(modulo: ReturnType<typeof ModuloAuditoria.paraServicio>) {
  const proveedor = (modulo.providers ?? []).find(
    (p) => typeof p === 'object' && 'provide' in p && p.provide === CLIENTE_AUDITORIA,
  ) as { useFactory: () => unknown };
  return proveedor.useFactory();
}

describe('ModuloAuditoria', () => {
  it('con URL monta el cliente que habla con trazabilidad', () => {
    const modulo = ModuloAuditoria.paraServicio({
      url: 'http://trazabilidad:3007',
      entorno: 'production',
    });
    expect(clienteDe(modulo)).toBeInstanceOf(ClienteAuditoria);
  });

  it('sin URL en desarrollo monta el cliente nulo', () => {
    // Un servicio suelto tiene que poder arrancar sin levantar los ocho.
    const modulo = ModuloAuditoria.paraServicio({ entorno: 'development' });
    expect(clienteDe(modulo)).toBeInstanceOf(ClienteAuditoriaNulo);
  });

  it('sin URL en produccion se niega a arrancar', () => {
    // Es el fallo que no se nota: el sistema atiende con normalidad y la
    // bitacora esta vacia el dia que alguien la audite.
    const modulo = ModuloAuditoria.paraServicio({ entorno: 'production' });
    expect(() => clienteDe(modulo)).toThrow(/URL_TRAZABILIDAD es obligatoria/);
  });

  it('no lee el entorno al definirse, sino al construir el cliente', () => {
    // Definir el modulo leyendo variables romperia cualquier prueba que
    // importe AppModule sin entorno cargado.
    let leido = false;
    const modulo = ModuloAuditoria.paraServicio(() => {
      leido = true;
      return { entorno: 'test' };
    });
    expect(leido).toBe(false);
    clienteDe(modulo);
    expect(leido).toBe(true);
  });

  it('es global: quien toque un dato auditable no tiene que importarlo', () => {
    expect(ModuloAuditoria.paraServicio({ entorno: 'test' }).global).toBe(true);
  });
});
