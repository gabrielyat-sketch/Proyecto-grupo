import { FalloDeAuditoria, type EntradaAuditoria } from '@cap/shared';
import { AtencionesService } from './atenciones/atenciones.service';
import { AntecedentesService } from './antecedentes/antecedentes.service';
import { FichasService } from './fichas/fichas.service';
import { CarnetService } from './carnet/carnet.service';

/**
 * Que ningun dato clinico se escriba sin quedar registrado.
 *
 * Es la otra mitad del RF-09: `auth` cubre quien toca las cuentas, y esto
 * cubre quien toca el expediente. La regla es la misma en los dos sitios —el
 * registro va dentro de la transaccion, y si no se puede registrar, el cambio
 * no ocurre— y esta razonada en `docs/decisiones/ADR-002`.
 */

const PACIENTE = { id: 'p-1', comunidadId: 'c-1', fechaNacimiento: new Date('2020-01-01') };
const CONTEXTO = { autorizacion: 'Bearer token-de-la-enfermera', trazaId: 'traza-7' };

interface Registrada {
  entrada: EntradaAuditoria;
  autorizacion: string;
  trazaId?: string;
  dentro: boolean;
}

/**
 * Doble de Prisma que responde a cualquier modelo y operacion.
 *
 * Los cuatro servicios que escriben datos clinicos tocan quince modelos
 * distintos entre todos. Escribir un doble por servicio serian cuatro objetos
 * que hay que ampliar cada vez que alguien anade una tabla; este responde a lo
 * que le pidan y solo se le dictan las respuestas que la prueba necesita.
 */
function montar(opciones: { auditoriaFalla?: boolean; datos?: Record<string, unknown> } = {}) {
  const datos = opciones.datos ?? {};
  let dentroDeTransaccion = false;
  const registradas: Registrada[] = [];
  const cache = new Map<string, unknown>();

  const prisma: Record<string, never> = new Proxy({} as Record<string, never>, {
    get(_destino, modelo: string) {
      if (modelo === '$transaction') {
        return async (arg: unknown) => {
          // Forma interactiva: recibe un callback. Forma de array: una lista de
          // promesas ya lanzadas. Los servicios usan las dos.
          if (typeof arg !== 'function') return Promise.all(arg as Promise<unknown>[]);
          dentroDeTransaccion = true;
          try {
            return await (arg as (tx: unknown) => Promise<unknown>)(prisma);
          } finally {
            dentroDeTransaccion = false;
          }
        };
      }

      if (!cache.has(modelo)) {
        cache.set(
          modelo,
          new Proxy(
            {},
            {
              get(_d2, operacion: string) {
                const clave = modelo + '.' + operacion;
                if (!cache.has(clave)) {
                  cache.set(
                    clave,
                    jest.fn(async () => (clave in datos ? datos[clave] : operacion === 'findMany' ? [] : {})),
                  );
                }
                return cache.get(clave);
              },
            },
          ),
        );
      }
      return cache.get(modelo);
    },
  });

  const auditoria = {
    registrar: jest.fn(async (entrada: EntradaAuditoria, autorizacion: string, trazaId?: string) => {
      registradas.push({ entrada, autorizacion, trazaId, dentro: dentroDeTransaccion });
      if (opciones.auditoriaFalla) throw new FalloDeAuditoria(entrada.accion);
    }),
  };

  // El cifrado real no aporta nada aqui y obliga a cargar llaves.
  const cifrado = {
    cifrar: (texto: string) => Buffer.from(texto, 'utf8'),
    descifrar: (dato: Uint8Array) => Buffer.from(dato).toString('utf8'),
  };

  const outbox = { registrar: jest.fn(async () => ({})) };

  return { prisma, auditoria, cifrado, outbox, registradas };
}

describe('Registrar una atencion queda auditado', () => {
  const datos = {
    'expediente.findUnique': { id: 'e-1', paciente: PACIENTE },
    'atencion.create': {
      id: 'a-1',
      fecha: new Date('2026-09-07T10:00:00Z'),
      registradaPor: 'u-1',
      digitalizada: false,
      motivoCifrado: Buffer.from('tos', 'utf8'),
      diagnosticoCifrado: null,
      tratamientoCifrado: null,
      notasCifrado: null,
      pesoKg: null,
      tallaCm: null,
      presionSistolica: null,
      presionDiastolica: null,
      temperaturaC: null,
    },
  };

  function servicioCon(opciones: Parameters<typeof montar>[0] = {}) {
    const m = montar({ ...opciones, datos });
    const servicio = new AtencionesService(
      m.prisma as never,
      m.outbox as never,
      m.cifrado as never,
      m.auditoria as never,
    );
    return { servicio, ...m };
  }

  it('registra CREACION con el id de la atencion', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.registrar('e-1', { motivo: 'tos' } as never, 'u-1', CONTEXTO);

    expect(registradas[0].entrada).toMatchObject({
      servicio: 'usuarios',
      accion: 'CREACION',
      entidad: 'atencion',
      entidadId: 'a-1',
    });
  });

  it('el registro ocurre dentro de la transaccion', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.registrar('e-1', { motivo: 'tos' } as never, 'u-1', CONTEXTO);
    expect(registradas[0].dentro).toBe(true);
  });

  it('no copia el motivo ni el diagnostico a la bitacora', async () => {
    // Ya viven cifrados en la atencion, y la bitacora es append-only: una copia
    // ahi no se puede corregir nunca.
    const { servicio, registradas } = servicioCon();
    await servicio.registrar(
      'e-1',
      { motivo: 'dolor abdominal', diagnostico: 'apendicitis' } as never,
      'u-1',
      CONTEXTO,
    );

    const escrito = JSON.stringify(registradas[0].entrada);
    expect(escrito).not.toContain('dolor abdominal');
    expect(escrito).not.toContain('apendicitis');
  });

  it('si la bitacora no responde, la atencion no se guarda', async () => {
    const { servicio } = servicioCon({ auditoriaFalla: true });
    await expect(
      servicio.registrar('e-1', { motivo: 'tos' } as never, 'u-1', CONTEXTO),
    ).rejects.toBeInstanceOf(FalloDeAuditoria);
  });

  it('propaga el token de quien atiende y el trazaId de la peticion', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.registrar('e-1', { motivo: 'tos' } as never, 'u-1', CONTEXTO);
    expect(registradas[0].autorizacion).toBe('Bearer token-de-la-enfermera');
    expect(registradas[0].trazaId).toBe('traza-7');
  });
});

describe('Capturar antecedentes queda auditado', () => {
  const datos = {
    'paciente.findUnique': { id: 'p-1' },
    'catalogoAntecedente.findMany': [{ id: 'ant-1', texto: 'Diabetes', permiteNoAplica: false }],
    'antecedentePaciente.findMany': [],
    'antecedentesObstetricos.findUnique': null,
  };

  function servicioCon(opciones: Parameters<typeof montar>[0] = {}) {
    const m = montar({ ...opciones, datos });
    const servicio = new AntecedentesService(
      m.prisma as never,
      m.cifrado as never,
      m.auditoria as never,
    );
    return { servicio, ...m };
  }

  it('registra MODIFICACION sobre el paciente', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.guardar(
      'p-1',
      { marcados: [{ antecedenteId: 'ant-1', respuesta: 'SI' }] } as never,
      'u-1',
      CONTEXTO,
    );

    expect(registradas[0].entrada).toMatchObject({
      servicio: 'usuarios',
      accion: 'MODIFICACION',
      entidad: 'antecedentes',
      entidadId: 'p-1',
    });
  });

  it('anota cuales se tocaron, no lo que se respondio', async () => {
    // El detalle de un antecedente es texto clinico y vive cifrado aparte.
    const { servicio, registradas } = servicioCon();
    await servicio.guardar(
      'p-1',
      {
        marcados: [{ antecedenteId: 'ant-1', respuesta: 'SI', detalle: 'desde los 40 anos' }],
      } as never,
      'u-1',
      CONTEXTO,
    );

    const valor = JSON.parse(String(registradas[0].entrada.valorNuevo));
    expect(valor.antecedentes).toEqual(['ant-1']);
    expect(JSON.stringify(registradas[0].entrada)).not.toContain('desde los 40 anos');
  });

  it('el registro ocurre dentro de la transaccion', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.guardar('p-1', { marcados: [] } as never, 'u-1', CONTEXTO);
    expect(registradas[0].dentro).toBe(true);
  });

  it('si la bitacora no responde, los antecedentes no se guardan', async () => {
    const { servicio } = servicioCon({ auditoriaFalla: true });
    await expect(
      servicio.guardar('p-1', { marcados: [] } as never, 'u-1', CONTEXTO),
    ).rejects.toBeInstanceOf(FalloDeAuditoria);
  });
});

describe('Guardar una ficha completa queda auditado', () => {
  const datos = {
    'expediente.findUnique': { id: 'e-1', paciente: PACIENTE },
    'atencion.create': { id: 'a-9', fecha: new Date('2026-09-07T10:00:00Z') },
  };

  function servicioCon(opciones: Parameters<typeof montar>[0] = {}) {
    const m = montar({ ...opciones, datos });
    const servicio = new FichasService(
      m.prisma as never,
      m.cifrado as never,
      m.outbox as never,
      m.auditoria as never,
    );
    return { servicio, ...m };
  }

  const FICHA = { tipoFicha: 'ADULTO', motivo: 'control' } as never;

  it('registra CREACION de la ficha, dentro de la transaccion', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.registrar('e-1', FICHA, 'u-1', CONTEXTO);

    expect(registradas[0].entrada).toMatchObject({
      servicio: 'usuarios',
      accion: 'CREACION',
      entidad: 'ficha',
      entidadId: 'a-9',
    });
    expect(registradas[0].dentro).toBe(true);
  });

  it('no vuelca los ~200 campos de la hoja en la bitacora', async () => {
    // La ficha completa ya vive en el expediente. Copiarla a una tabla
    // append-only multiplicaria la que mas crece del sistema.
    const { servicio, registradas } = servicioCon();
    await servicio.registrar(
      'e-1',
      { tipoFicha: 'ADULTO', motivo: 'control', diagnostico: 'hipertension' } as never,
      'u-1',
      CONTEXTO,
    );

    expect(JSON.stringify(registradas[0].entrada)).not.toContain('hipertension');
  });

  it('si la bitacora no responde, la ficha no se guarda', async () => {
    const { servicio } = servicioCon({ auditoriaFalla: true });
    await expect(servicio.registrar('e-1', FICHA, 'u-1', CONTEXTO)).rejects.toBeInstanceOf(
      FalloDeAuditoria,
    );
  });
});

describe('Anotar el carnet queda auditado', () => {
  const datos = {
    'paciente.findUnique': { id: 'p-1', comunidadId: 'c-1', grupoFamiliarId: 'g-1' },
    'vacunaAplicada.findMany': [],
    'micronutrienteEntregado.findMany': [],
    // La casilla tiene que existir en el papel: se valida contra las dosis
    // recomendadas, no contra el catalogo de vacunas.
    'dosisRecomendada.findMany': [{ vacunaId: 'v-1', orden: 1, vacuna: { nombre: 'BCG' } }],
  };

  function servicioCon(opciones: Parameters<typeof montar>[0] = {}) {
    const m = montar({ ...opciones, datos });
    const servicio = new CarnetService(m.prisma as never, m.cifrado as never, m.auditoria as never);
    return { servicio, ...m };
  }

  it('registra MODIFICACION sobre el paciente, dentro de la transaccion', async () => {
    const { servicio, registradas } = servicioCon();
    await servicio.guardar('p-1', {} as never, 'u-1', CONTEXTO);

    expect(registradas[0].entrada).toMatchObject({
      servicio: 'usuarios',
      accion: 'MODIFICACION',
      entidad: 'carnet',
      entidadId: 'p-1',
    });
    expect(registradas[0].dentro).toBe(true);
  });

  it('deja constancia de una dosis BORRADA, no solo de las anotadas', async () => {
    // Una fecha en null borra la dosis: es como se corrige una casilla mal
    // anotada, y es el unico caso del modulo en que un dato clinico
    // desaparece. Sin esta marca, la bitacora no distinguiria corregir de
    // anotar.
    const { servicio, registradas } = servicioCon();
    await servicio.guardar(
      'p-1',
      { vacunas: [{ vacunaId: 'v-1', orden: 1, fecha: null }] } as never,
      'u-1',
      CONTEXTO,
    );

    const valor = JSON.parse(String(registradas[0].entrada.valorNuevo));
    expect(valor.vacunas).toEqual([{ vacunaId: 'v-1', orden: 1, borrada: true }]);
  });

  it('si la bitacora no responde, el carnet no se guarda', async () => {
    const { servicio } = servicioCon({ auditoriaFalla: true });
    await expect(servicio.guardar('p-1', {} as never, 'u-1', CONTEXTO)).rejects.toBeInstanceOf(
      FalloDeAuditoria,
    );
  });
});
