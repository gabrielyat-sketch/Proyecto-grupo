import { MENU, ROLES, menuPara, puedeEntrar } from './menu';

describe('menu por rol', () => {
  it('cada opcion declara al menos un rol: ninguna queda invisible por descuido', () => {
    const sinRoles = MENU.filter((e) => e.roles.length === 0).map((e) => e.ruta);
    expect(sinRoles).toEqual([]);
  });

  it('todos los roles declarados existen', () => {
    for (const e of MENU) {
      for (const rol of e.roles) expect(ROLES).toContain(rol);
    }
  });

  it('el Administrador ve todo el menu', () => {
    expect(menuPara('ADMINISTRADOR')).toHaveLength(MENU.length);
  });

  it('solo el Administrador entra a Administracion', () => {
    for (const rol of ROLES) {
      expect(puedeEntrar(rol, '/administracion')).toBe(rol === 'ADMINISTRADOR');
    }
  });

  it('Recepcion y Farmacia NO ven Programas: el historial clinico no es suyo', () => {
    // Pueden encontrar al paciente y ver sus datos basicos, pero no leer sus
    // diagnosticos. Es la misma restriccion que aplica el backend.
    expect(puedeEntrar('RECEPCION', '/programas')).toBe(false);
    expect(puedeEntrar('FARMACIA', '/programas')).toBe(false);
    expect(puedeEntrar('MEDICO', '/programas')).toBe(true);
    expect(puedeEntrar('ENFERMERIA', '/programas')).toBe(true);
  });

  it('el Medico SI ve Farmacia: sin saber que hay, receta lo que no hay', () => {
    expect(puedeEntrar('MEDICO', '/farmacia')).toBe(true);
  });

  it('Recepcion y Enfermeria ven Digitalizacion; Farmacia no', () => {
    // En el CAP, recepcion captura los datos personales del paciente y le pasa
    // la carpeta a enfermeria, que llena las fichas clinicas. Las dos necesitan
    // la cola: si enfermeria no supiera que carpeta le toca, dependeria de que
    // alguien se lo dijera de palabra cada vez.
    expect(puedeEntrar('RECEPCION', '/digitalizacion')).toBe(true);
    expect(puedeEntrar('ENFERMERIA', '/digitalizacion')).toBe(true);
    expect(puedeEntrar('MEDICO', '/digitalizacion')).toBe(true);
    expect(puedeEntrar('FARMACIA', '/digitalizacion')).toBe(false);
  });

  it('los seis roles pueden buscar pacientes y expedientes', () => {
    const porRol = (ruta: string) =>
      Object.fromEntries(ROLES.map((r) => [r, puedeEntrar(r, ruta)]));
    const todos = Object.fromEntries(ROLES.map((r) => [r, true]));

    expect(porRol('/recepcion')).toEqual(todos);
    expect(porRol('/expedientes')).toEqual(todos);
  });

  it('Reportes y Auditoria son de Administrador y Direccion', () => {
    const esperado = Object.fromEntries(
      ROLES.map((r) => [r, r === 'ADMINISTRADOR' || r === 'DIRECTOR']),
    );
    const porRol = (ruta: string) =>
      Object.fromEntries(ROLES.map((r) => [r, puedeEntrar(r, ruta)]));

    expect(porRol('/reportes')).toEqual(esperado);
    expect(porRol('/auditoria')).toEqual(esperado);
  });

  it('un rol desconocido o ausente no ve nada', () => {
    expect(menuPara(undefined)).toHaveLength(0);
    expect(menuPara('INTRUSO')).toHaveLength(0);
  });

  it('no hay rutas repetidas', () => {
    const rutas = MENU.map((e) => e.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
  });
});
