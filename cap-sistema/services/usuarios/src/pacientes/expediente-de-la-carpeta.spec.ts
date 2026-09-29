import { PacientesService } from './pacientes.service';

/**
 * El número de expediente es de la FAMILIA, no del paciente.
 *
 * En el CAP la carpeta de cartón lleva un número escrito en la pestaña y dentro
 * van las fichas de todos los que viven en esa casa: el marido, la esposa y los
 * hijos comparten expediente. Antes el número era único en todo el sistema, y
 * eso hacía imposible justo lo que el CAP hace todos los días —meter a un
 * segundo paciente en la carpeta que ya tenía su número—.
 *
 * Estas pruebas fijan de dónde sale el número, porque es la clase de regla que
 * un cambio bienintencionado vuelve a romper: cualquiera que vea un número
 * repetido en la base pensará que falta una restricción.
 */

/** Cifrado de juguete: el número tiene que poder leerse en las aserciones. */
const cifrado = {
  cifrar: (t: string) => Buffer.from(t, 'utf8'),
  descifrar: (b: Buffer) => b.toString('utf8'),
  indiceCiego: (t: string) => Buffer.from('idx:' + t, 'utf8'),
};

interface Carpeta {
  id: string;
  numero: number;
  apellidos: string;
  serieId: string;
}

/**
 * Un prisma mínimo con un archivero dentro: las carpetas que ya existen y los
 * expedientes que se van creando.
 */
function montar(carpetas: Carpeta[] = []) {
  const expedientes: { pacienteId: string; numero: string }[] = [];
  let siguienteId = 1;

  const tx = {
    grupoFamiliar: {
      aggregate: async ({ where }: { where: { serieId: string } }) => ({
        _max: {
          numero: carpetas
            .filter((c) => c.serieId === where.serieId)
            .reduce<number | null>((mayor, c) => (mayor === null || c.numero > mayor ? c.numero : mayor), null),
        },
      }),
      findUnique: async ({ where }: { where: { id?: string; serieId_numero?: { serieId: string; numero: number } } }) => {
        if (where.id) return carpetas.find((c) => c.id === where.id) ?? null;
        const { serieId, numero } = where.serieId_numero!;
        return carpetas.find((c) => c.serieId === serieId && c.numero === numero) ?? null;
      },
      create: async ({ data }: { data: Carpeta }) => {
        const nueva = { ...data, id: 'carpeta-' + siguienteId++ };
        carpetas.push(nueva);
        return { id: nueva.id };
      },
    },
    paciente: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'paciente-' + siguienteId++,
        comunidadId: data.comunidadId,
        sexo: data.sexo,
        fechaNacimiento: new Date('1990-01-01'),
      }),
    },
    expediente: {
      create: async ({ data }: { data: { pacienteId: string; numeroCifrado: Uint8Array } }) => {
        expedientes.push({
          pacienteId: data.pacienteId,
          numero: Buffer.from(data.numeroCifrado).toString('utf8'),
        });
        return { id: 'expediente-' + siguienteId++ };
      },
    },
    registroDigitalizacion: { create: async () => ({}) },
  };

  const prisma = {
    ...tx,
    // El alta comprueba antes que la comunidad y el lugar existan y que el
    // lugar sea de esa comunidad. Aqui siempre lo son: lo que se prueba es de
    // donde sale el numero, no esas validaciones.
    comunidad: { findUnique: async () => ({ id: 'purulha-centro' }) },
    lugarPoblado: { findUnique: async () => ({ comunidadId: 'purulha-centro' }) },
    paciente: { ...tx.paciente, findUnique: async () => null },
    $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
  };

  const servicio = new PacientesService(
    prisma as never,
    { registrar: async () => undefined } as never,
    cifrado as never,
    { registrar: async () => undefined } as never,
  );

  return { servicio, expedientes, carpetas };
}

const BASE = {
  dpi: '1234567890101',
  nombres: 'Juan',
  apellidos: 'Lopez Tzul',
  fechaNacimiento: new Date('1990-01-01'),
  sexo: 'M',
  comunidadId: 'purulha-centro',
  lugarId: 'el-calvario',
  esposo: 'Juan',
} as never;

const alta = (extra: Record<string, unknown>) => ({ ...(BASE as object), ...extra }) as never;

describe('el numero de expediente sale de la carpeta', () => {
  it('al abrir una carpeta, el expediente lleva el numero del folder', async () => {
    const { servicio, expedientes } = montar();

    const creado = await servicio.crear(
      alta({ carpetaNueva: { apellidos: 'Lopez Ac', numero: 7 } }),
      'u-1',
      'traza',
    );

    expect(creado.numeroExpediente).toBe('7');
    expect(expedientes[0].numero).toBe('7');
  });

  /**
   * Es el caso que estaba roto: el segundo integrante no podía llevar el número
   * de su propia familia porque el primero ya lo tenía.
   */
  it('el segundo paciente de la carpeta lleva el MISMO numero', async () => {
    const { servicio, expedientes } = montar([
      { id: 'c-1', numero: 2, apellidos: 'Xona Isem', serieId: 'el-calvario' },
    ]);

    await servicio.crear(alta({ grupoFamiliarId: 'c-1' }), 'u-1', 'traza');
    await servicio.crear(
      alta({ grupoFamiliarId: 'c-1', dpi: '1234567890102', nombres: 'Maria' }),
      'u-1',
      'traza',
    );

    expect(expedientes.map((e) => e.numero)).toEqual(['2', '2']);
  });

  /** Lo que el cliente mande no manda: la carpeta es la única fuente. */
  it('un numero enviado por el cliente no gana a la carpeta', async () => {
    const { servicio, expedientes } = montar([
      { id: 'c-1', numero: 2, apellidos: 'Xona Isem', serieId: 'el-calvario' },
    ]);

    const creado = await servicio.crear(
      alta({ grupoFamiliarId: 'c-1', numeroExpediente: '999' }),
      'u-1',
      'traza',
    );

    expect(creado.numeroExpediente).toBe('2');
    expect(expedientes[0].numero).toBe('2');
  });

  /**
   * El mismo número en dos lugares distintos, que es lo que pasa en el
   * archivero: hay un expediente No.1 en El Calvario y otro en El Carpintero.
   */
  it('el mismo numero vale en otro lugar', async () => {
    const { servicio, expedientes } = montar([
      { id: 'c-1', numero: 1, apellidos: 'Xona Isem', serieId: 'el-calvario' },
    ]);

    await servicio.crear(alta({ grupoFamiliarId: 'c-1' }), 'u-1', 'traza');
    await servicio.crear(
      alta({
        dpi: '1234567890103',
        lugarId: 'el-carpintero',
        carpetaNueva: { apellidos: 'Caal Pop', numero: 1 },
      }),
      'u-1',
      'traza',
    );

    expect(expedientes.map((e) => e.numero)).toEqual(['1', '1']);
  });

  it('sin carpeta se respeta el numero escrito', async () => {
    const { servicio, expedientes } = montar();

    const creado = await servicio.crear(alta({ numeroExpediente: '  55  ' }), 'u-1', 'traza');

    expect(creado.numeroExpediente).toBe('55');
    expect(expedientes[0].numero).toBe('55');
  });

  it('una carpeta que no existe no deja registrar a nadie', async () => {
    const { servicio } = montar();

    await expect(
      servicio.crear(alta({ grupoFamiliarId: 'no-existe' }), 'u-1', 'traza'),
    ).rejects.toThrow(/carpeta familiar/i);
  });
});
