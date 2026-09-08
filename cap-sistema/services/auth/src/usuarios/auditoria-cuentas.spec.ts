import { FalloDeAuditoria, type EntradaAuditoria } from '@cap/shared';
import { UsuariosService } from './usuarios.service';

// `UsuariosService` arrastra a `MfaService`, y ese importa `otplib`, que se
// publica como ESM y jest no transforma. Aqui no se genera ni se verifica
// ningun codigo TOTP: el reinicio del segundo factor se prueba contra un doble
// de `MfaService`, asi que basta con que el modulo exista.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verifySync: jest.fn(),
}));

/**
 * Que las acciones administrativas dejen rastro, y que no se completen si no
 * pueden dejarlo.
 *
 * Son las cuatro cosas que un administrador puede hacerle a la cuenta de otra
 * persona —crearla, cambiarle el rol, borrarle el segundo factor y
 * restablecerle la contrasena—. Sin bitacora ninguna de las cuatro tiene
 * autor: el sistema sabe que la cuenta cambio, no quien la cambio.
 */

const CUENTA = {
  id: 'u-1',
  usuario: 'mcaal',
  nombres: 'Maria',
  apellidos: 'Caal',
  rol: 'ENFERMERIA',
  activo: true,
  debeCambiarContrasena: false,
  bloqueadoHasta: null,
  ultimoAcceso: null,
  creadoEn: new Date('2026-09-01T00:00:00Z'),
  mfa: null,
};

const CONTEXTO = { autorizacion: 'Bearer token-del-administrador', trazaId: 'traza-9' };

const NUEVA_CUENTA = {
  usuario: 'mcaal',
  nombres: 'Maria',
  apellidos: 'Caal',
  rol: 'ENFERMERIA',
} as never;

interface Registrada {
  entrada: EntradaAuditoria;
  autorizacion: string;
  trazaId?: string;
  dentro: boolean;
}

function montar(opciones: { auditoriaFalla?: boolean } = {}) {
  /** Verdadero mientras corre el callback de `$transaction`. */
  let dentroDeTransaccion = false;
  const registradas: Registrada[] = [];

  const auditoria = {
    registrar: jest.fn(async (entrada: EntradaAuditoria, autorizacion: string, trazaId?: string) => {
      registradas.push({ entrada, autorizacion, trazaId, dentro: dentroDeTransaccion });
      if (opciones.auditoriaFalla) throw new FalloDeAuditoria(entrada.accion);
    }),
  };

  const prisma = {
    usuario: {
      // Por `usuario` se busca para comprobar que el nombre esta libre: la
      // cuenta nueva no existe. Por `id` se busca la cuenta que se va a tocar.
      findUnique: jest.fn(async (args: { where?: { usuario?: string } }) =>
        args?.where?.usuario ? null : CUENTA,
      ),
      create: jest.fn(async () => CUENTA),
      update: jest.fn(async () => CUENTA),
    },
    async $transaction(cb: (tx: unknown) => Promise<unknown>) {
      dentroDeTransaccion = true;
      try {
        return await cb(prisma);
      } finally {
        dentroDeTransaccion = false;
      }
    },
  };

  const tokens = { revocarTodasDelUsuario: jest.fn(async () => 1) };
  const mfa = { reiniciar: jest.fn(async () => true) };

  const servicio = new UsuariosService(
    prisma as never,
    tokens as never,
    mfa as never,
    auditoria as never,
  );

  return { servicio, prisma, tokens, mfa, auditoria, registradas };
}

describe('Las cuatro acciones administrativas quedan registradas', () => {
  it('crear una cuenta registra CREACION con el id de la cuenta creada', async () => {
    const { servicio, registradas } = montar();
    await servicio.crear(NUEVA_CUENTA, CONTEXTO);

    expect(registradas).toHaveLength(1);
    expect(registradas[0].entrada).toMatchObject({
      servicio: 'auth',
      accion: 'CREACION',
      entidad: 'cuenta',
      entidadId: 'u-1',
    });
  });

  it('la contrasena temporal no entra en la bitacora', async () => {
    // Es el unico momento en que existe en claro. Guardarla ahi la volveria
    // legible para cualquiera que pueda leer la auditoria.
    const { servicio, registradas } = montar();
    const creada = await servicio.crear(NUEVA_CUENTA, CONTEXTO);

    expect(JSON.stringify(registradas[0].entrada)).not.toContain(creada.contrasenaTemporal);
  });

  it('restablecer la contrasena registra el hecho, nunca la contrasena', async () => {
    const { servicio, registradas } = montar();
    const r = await servicio.restablecerContrasena('u-1', CONTEXTO);

    expect(registradas[0].entrada).toMatchObject({
      accion: 'MODIFICACION',
      entidad: 'contrasena',
      entidadId: 'u-1',
    });
    expect(JSON.stringify(registradas[0].entrada)).not.toContain(r.contrasenaTemporal);
  });

  it('reiniciar el segundo factor registra ELIMINACION', async () => {
    const { servicio, registradas } = montar();
    await servicio.reiniciarMfa('u-1', CONTEXTO);

    expect(registradas[0].entrada).toMatchObject({
      accion: 'ELIMINACION',
      entidad: 'segundo_factor',
      entidadId: 'u-1',
    });
  });

  it('el reinicio del segundo factor y su registro van en la misma transaccion', async () => {
    const { servicio, mfa } = montar();
    await servicio.reiniciarMfa('u-1', CONTEXTO);

    // Recibe el cliente de la transaccion abierta, no el de siempre.
    expect(mfa.reiniciar).toHaveBeenCalledWith('u-1', expect.anything());
  });

  it('actualizar registra SOLO los campos que cambian', async () => {
    // Volcar la cuenta entera obliga a quien audita a comparar dos bloques
    // largos para encontrar el unico dato distinto, que suele ser el rol.
    const { servicio, prisma, registradas } = montar();
    prisma.usuario.update = jest.fn(async () => ({ ...CUENTA, rol: 'MEDICO' })) as never;

    await servicio.actualizar('u-1', { rol: 'MEDICO' } as never, 'admin-1', CONTEXTO);

    const anterior = JSON.parse(String(registradas[0].entrada.valorAnterior));
    const nuevo = JSON.parse(String(registradas[0].entrada.valorNuevo));
    expect(anterior).toEqual({ rol: 'ENFERMERIA' });
    expect(nuevo).toEqual({ rol: 'MEDICO' });
  });
});

describe('El registro va dentro de la transaccion, no despues', () => {
  // Es lo que hace que el cambio se deshaga cuando la bitacora no responde.
  // Registrar despues de cerrar la transaccion dejaria el cambio guardado y
  // sin autor, que es justo el estado que el RF-09 prohibe.
  it('al crear una cuenta', async () => {
    const { servicio, registradas } = montar();
    await servicio.crear(NUEVA_CUENTA, CONTEXTO);
    expect(registradas[0].dentro).toBe(true);
  });

  it('al restablecer la contrasena', async () => {
    const { servicio, registradas } = montar();
    await servicio.restablecerContrasena('u-1', CONTEXTO);
    expect(registradas[0].dentro).toBe(true);
  });

  it('al reiniciar el segundo factor', async () => {
    const { servicio, registradas } = montar();
    await servicio.reiniciarMfa('u-1', CONTEXTO);
    expect(registradas[0].dentro).toBe(true);
  });

  it('al actualizar una cuenta', async () => {
    const { servicio, registradas } = montar();
    await servicio.actualizar('u-1', { rol: 'MEDICO' } as never, 'admin-1', CONTEXTO);
    expect(registradas[0].dentro).toBe(true);
  });
});

describe('Si no se puede registrar, la operacion no se completa', () => {
  it('crear propaga el fallo de auditoria', async () => {
    const { servicio } = montar({ auditoriaFalla: true });
    await expect(servicio.crear(NUEVA_CUENTA, CONTEXTO)).rejects.toBeInstanceOf(FalloDeAuditoria);
  });

  it('restablecer la contrasena no cierra las sesiones si no pudo auditarse', async () => {
    // Cerrarlas dejaria a la persona fuera del sistema por un cambio de
    // contrasena que no llego a ocurrir.
    const { servicio, tokens } = montar({ auditoriaFalla: true });
    await expect(servicio.restablecerContrasena('u-1', CONTEXTO)).rejects.toBeInstanceOf(
      FalloDeAuditoria,
    );
    expect(tokens.revocarTodasDelUsuario).not.toHaveBeenCalled();
  });

  it('reiniciar el segundo factor propaga el fallo y no cierra sesiones', async () => {
    const { servicio, tokens } = montar({ auditoriaFalla: true });
    await expect(servicio.reiniciarMfa('u-1', CONTEXTO)).rejects.toBeInstanceOf(FalloDeAuditoria);
    expect(tokens.revocarTodasDelUsuario).not.toHaveBeenCalled();
  });
});

describe('La bitacora registra a nombre de quien pidio la accion', () => {
  it('propaga el token del administrador tal como llego', async () => {
    // Si el servicio firmara uno propio, la bitacora probaria lo que el
    // servicio dice, no lo que la persona hizo.
    const { servicio, registradas } = montar();
    await servicio.reiniciarMfa('u-1', CONTEXTO);
    expect(registradas[0].autorizacion).toBe('Bearer token-del-administrador');
  });

  it('propaga el trazaId de la peticion', async () => {
    const { servicio, registradas } = montar();
    await servicio.reiniciarMfa('u-1', CONTEXTO);
    expect(registradas[0].trazaId).toBe('traza-9');
  });
});
