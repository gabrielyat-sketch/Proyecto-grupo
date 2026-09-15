import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import {
  BusEventos,
  FilaOutbox,
  FiltroExcepciones,
  FuenteOutbox,
  PublicadorOutbox,
  Rol,
} from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  CLIENTE_PACIENTES,
  IClientePacientes,
  PacienteResumen,
} from '../src/pacientes/cliente-pacientes';
import { fechaDelDia, sumarDias } from '../src/dominio/clinico';

/**
 * La ficha manda, Programas escucha (decision 3 de docs/diseno-ficha-prenatal.md).
 *
 * Corre contra PostgreSQL y Redis reales: el consumidor de la aplicacion lee
 * el MISMO stream que en produccion, y aqui se publica en el como lo haria
 * `usuarios` —con el mismo publicador de `@cap/shared`, sobre un outbox en
 * memoria—. Un doble del bus no probaria lo que importa: que el evento que
 * sale de un servicio llega al otro y produce un control.
 *
 * El cliente de usuarios se sustituye por un doble, como en el resto de las
 * e2e de este servicio: inscribir necesita saber el sexo de la paciente, y
 * eso no es lo que se prueba aqui.
 */
const PACIENTES: Record<string, PacienteResumen> = {
  'zz-embarazada': {
    id: 'zz-embarazada',
    nombres: 'Zzjuana',
    apellidos: 'Zzprueba Bus',
    fechaNacimiento: '2001-01-01',
    edad: 25,
    sexo: 'F',
    comunidad: { id: 'com-1', nombre: 'Chilasco' },
  },
};

class ClienteDoble implements IClientePacientes {
  async obtener(pacienteId: string): Promise<PacienteResumen> {
    const p = PACIENTES[pacienteId];
    if (!p) {
      const { BadRequestException } = await import('@nestjs/common');
      throw new BadRequestException('El paciente indicado no existe.');
    }
    return p;
  }
}

/** Lo que `usuarios` dejaria en su outbox, con ids propios de esta prueba. */
class OutboxDeUsuarios implements FuenteOutbox {
  filas: (FilaOutbox & { publicada: boolean })[] = [];

  anadir(id: string, tipo: string, datos: Record<string, unknown>): void {
    this.filas.push({
      id,
      tipo,
      version: 1,
      datos,
      trazaId: 'traza-' + id,
      ocurridoEn: new Date(),
      publicada: false,
    });
  }

  async pendientes(limite: number): Promise<FilaOutbox[]> {
    return this.filas.filter((f) => !f.publicada).slice(0, limite);
  }

  async marcarPublicada(id: string): Promise<void> {
    this.filas.find((f) => f.id === id)!.publicada = true;
  }

  async marcarFallo(): Promise<void> {}
}

describe('Controles prenatales desde la ficha (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let publicador: PublicadorOutbox;
  const outbox = new OutboxDeUsuarios();

  /** Ids unicos por corrida: el stream y la tabla de procesados recuerdan los anteriores. */
  const corrida = Date.now().toString(36);
  const idEvento = (n: string) => 'e2e-' + corrida + '-' + n;
  const idFicha = (n: string) => 'ficha-' + corrida + '-' + n;

  let programaId: string;
  const FUM = sumarDias(fechaDelDia(new Date()), -140); // 20 semanas

  const http = () => app.getHttpServer() as never;
  const auth = (rol: Rol) =>
    'Bearer ' +
    jwt.sign({ sub: 'u-prueba', usuario: 'prueba', rol, sesionId: 's', mfaVerificado: true });

  beforeAll(async () => {
    if (!process.env.REDIS_URL) {
      throw new Error('Esta prueba necesita REDIS_URL en el .env del servicio.');
    }
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CLIENTE_PACIENTES)
      .useClass(ClienteDoble)
      .compile();

    app = modulo.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    publicador = new PublicadorOutbox(new BusEventos(process.env.REDIS_URL).conectar(), outbox, {
      origen: 'usuarios',
    });

    const r = await request(http())
      .post('/v1/programas/embarazo')
      .set('Authorization', auth(Rol.MEDICO))
      .send({ pacienteId: 'zz-embarazada', fum: FUM.toISOString().slice(0, 10) })
      .expect(201);
    programaId = r.body.id;
  });

  afterAll(async () => {
    await publicador?.detener();
    if (prisma) {
      await prisma.controlPrenatal.deleteMany({ where: { programaId } });
      await prisma.programaEmbarazo.deleteMany({ where: { pacienteId: 'zz-embarazada' } });
      await prisma.eventoProcesado.deleteMany({ where: { id: { startsWith: 'e2e-' + corrida } } });
      await prisma.outbox.deleteMany({
        where: { datos: { path: ['pacienteId'], equals: 'zz-embarazada' } },
      });
    }
    await app?.close();
  });

  /** Publica como `usuarios` y espera a que el consumidor de la aplicacion lo anote. */
  async function llega(id: string, datos: Record<string, unknown>, tipo = 'ficha.prenatal.registrada') {
    outbox.anadir(id, tipo, datos);
    await publicador.publicarPendientes();
    for (let i = 0; i < 40; i++) {
      const procesado = await prisma.eventoProcesado.findUnique({ where: { id } });
      if (procesado) return procesado;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('El consumidor no proceso el evento ' + id + ' en diez segundos.');
  }

  const hoja = (n: string, extra: Record<string, unknown> = {}) => ({
    atencionId: idFicha(n),
    pacienteId: 'zz-embarazada',
    comunidadId: 'com-1',
    fecha: new Date().toISOString(),
    digitalizada: false,
    pesoKg: 62.5,
    presionSistolica: 118,
    presionDiastolica: 76,
    alturaUterinaCm: 21.5,
    fcf: 144,
    semanasPorFurAu: 20,
    conSignosDePeligro: false,
    registradaPor: 'medico-de-usuarios',
    ...extra,
  });

  it('una hoja prenatal guardada en usuarios se vuelve un control del seguimiento', async () => {
    const procesado = await llega(idEvento('1'), hoja('1'));
    expect(procesado.resultado).toBe('APLICADO');
    expect(procesado.origen).toBe('usuarios');

    const control = await prisma.controlPrenatal.findUnique({ where: { atencionId: idFicha('1') } });
    expect(control).toMatchObject({
      programaId,
      sistolica: 118,
      diastolica: 76,
      fcf: 144,
      semanasGestacion: 20,
      // Quien la firmo en usuarios, no un usuario de Programas.
      registradoPor: 'medico-de-usuarios',
      alertas: [],
    });
    expect(Number(control!.pesoKg)).toBe(62.5);
    expect(Number(control!.alturaUterinaCm)).toBe(21.5);
    expect(procesado.detalle).toContain(control!.id);

    // Y se ve por la API como cualquier otro control.
    const r = await request(http())
      .get('/v1/programas/embarazo/' + programaId + '/controles')
      .set('Authorization', auth(Rol.ENFERMERIA))
      .expect(200);
    expect(r.body.datos).toHaveLength(1);
    expect(r.body.datos[0].id).toBe(control!.id);
  });

  it('el mismo evento entregado dos veces es UN control, no dos', async () => {
    // El publicador que no llego a marcar la fila la vuelve a mandar con el
    // mismo id. Es el caso normal del bus, no un fallo raro.
    outbox.filas.find((f) => f.id === idEvento('1'))!.publicada = false;
    await publicador.publicarPendientes();
    await new Promise((r) => setTimeout(r, 1500));

    const controles = await prisma.controlPrenatal.count({ where: { programaId } });
    expect(controles).toBe(1);
    expect(await prisma.eventoProcesado.count({ where: { id: idEvento('1') } })).toBe(1);
  });

  it('aplica las mismas reglas que la pantalla: la presion alta sube el riesgo', async () => {
    const procesado = await llega(
      idEvento('2'),
      hoja('2', { presionSistolica: 148, presionDiastolica: 96 }),
    );
    expect(procesado.resultado).toBe('APLICADO');

    const control = await prisma.controlPrenatal.findUnique({ where: { atencionId: idFicha('2') } });
    expect(control!.alertas.length).toBeGreaterThan(0);
    const programa = await prisma.programaEmbarazo.findUnique({ where: { id: programaId } });
    expect(programa!.riesgo).toBe('ALTO');

    // Y sale el mismo evento que saldria desde la pantalla, para Reportes.
    const salida = await prisma.outbox.findFirst({
      where: { tipo: 'control.prenatal.registrado', datos: { path: ['controlId'], equals: control!.id } },
    });
    expect(salida).not.toBeNull();
    expect(salida!.trazaId).toBe('traza-' + idEvento('2'));
  });

  it('una paciente sin seguimiento activo: se descarta y queda anotado', async () => {
    const procesado = await llega(idEvento('3'), hoja('3', { pacienteId: 'zz-sin-programa' }));
    expect(procesado.resultado).toBe('DESCARTADO');
    expect(procesado.detalle).toMatch(/sin.*seguimiento|no tiene un seguimiento/i);
    expect(await prisma.controlPrenatal.findUnique({ where: { atencionId: idFicha('3') } })).toBeNull();
  });

  it('una hoja anterior a la FUM es de otro embarazo: se descarta', async () => {
    const procesado = await llega(
      idEvento('4'),
      hoja('4', { fecha: sumarDias(FUM, -30).toISOString() }),
    );
    expect(procesado.resultado).toBe('DESCARTADO');
    expect(procesado.detalle).toMatch(/anterior a la FUM/);
  });

  it('un evento al que le falta la paciente se descarta con el motivo, sin tumbar nada', async () => {
    const { pacienteId: _sin, ...sinPaciente } = hoja('5');
    void _sin;
    const procesado = await llega(idEvento('5'), sinPaciente);
    expect(procesado.resultado).toBe('DESCARTADO');
    expect(procesado.detalle).toBe('El evento no trae pacienteId.');

    // El consumidor sigue vivo: el siguiente evento se procesa.
    const siguiente = await llega(idEvento('6'), hoja('6'));
    expect(siguiente.resultado).toBe('APLICADO');
  });
});
