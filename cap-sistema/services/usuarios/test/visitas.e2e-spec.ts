import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Sala de espera: quien esta AHORA en el CAP.
 *
 * Es la pieza que faltaba para separar dos trabajos que se estaban
 * confundiendo: la gente sentada esperando consulta, y las carpetas viejas del
 * archivo. Lo primero es de hoy y no puede esperar; lo segundo puede esperar
 * meses.
 */
describe('Sala de espera (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const creados: string[] = [];
  let comunidadId: string;
  let pacienteId: string;
  let expedienteId: string;
  let otroPacienteId: string;

  const http = () => app.getHttpServer();

  const como = (rol: Rol, id = 'e2e-visitas') => ({
    Authorization:
      'Bearer ' +
      jwt.sign({
        sub: id,
        usuario: 'e2e_visitas',
        rol,
        sesionId: 's-visitas',
        mfaVerificado: true,
      }),
  });

  const crearPaciente = async (nombres: string) => {
    const r = await request(http())
      .post('/v1/pacientes')
      .set(como(Rol.RECEPCION))
      .send({
        nombres,
        apellidos: 'Zzespera Prueba',
        fechaNacimiento: '1988-02-20',
        sexo: 'F',
        comunidadId,
      })
      .expect(201);
    creados.push(r.body.id);
    return r.body;
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    const comunidad = await prisma.comunidad.create({
      data: { nombre: 'ZZE2E Espera ' + Date.now(), activa: true },
      select: { id: true },
    });
    comunidadId = comunidad.id;

    const uno = await crearPaciente('Zzespera');
    pacienteId = uno.id;
    expedienteId = uno.expedienteId;
    otroPacienteId = (await crearPaciente('Zzotra')).id;
  });

  afterAll(async () => {
    for (const id of creados) {
      await prisma.visita.deleteMany({ where: { pacienteId: id } });
      await prisma.atencion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.registroDigitalizacion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.expediente.deleteMany({ where: { pacienteId: id } });
      await prisma.paciente.deleteMany({ where: { id } });
    }
    await prisma.comunidad.deleteMany({ where: { id: comunidadId } });
    await app.close();
  });

  /** Solo los pacientes de esta prueba: la sala puede tener a otros. */
  const mios = (cuerpo: Record<string, never>[]) =>
    cuerpo.filter((v) => creados.includes(v.pacienteId as unknown as string));

  describe('marcar la llegada', () => {
    it('recepcion marca que alguien llego', async () => {
      const r = await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId, motivo: 'Control de embarazo' })
        .expect(201);

      expect(r.body.estado).toBe('ESPERANDO');
      expect(r.body.motivo).toBe('Control de embarazo');
      expect(r.body.cerradaEn).toBeNull();
    });

    it('el motivo NO es legible con un SELECT directo', async () => {
      // "Control de embarazo" o "dolor de pecho" son datos de salud, y esta
      // lista se ve con la sala llena de gente.
      const fila = await prisma.visita.findFirst({
        where: { pacienteId, estado: 'ESPERANDO' },
      });
      const enBruto = Buffer.from(fila!.motivoCifrado ?? []).toString('utf8');
      expect(enBruto).not.toContain('embarazo');
    });

    it('marcar dos veces al mismo paciente NO lo pone dos veces en la lista', async () => {
      // Pasa: se pulsa dos veces, o lo hacen dos personas a la vez en una
      // recepcion con fila. La enfermera lo llamaria dos veces.
      const r = await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId })
        .expect(409);

      expect(r.body.mensaje).toContain('ya esta en la sala de espera');
      // Trae el identificador de la visita que estorba, para poder abrirla.
      expect(r.body.detalles[0]).toMatch(/^visitaId:/);
    });

    it('un paciente que no existe lo dice, no crea una visita fantasma', async () => {
      await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('enfermeria NO marca llegadas: quien esta en la ventanilla es recepcion', async () => {
      await request(http())
        .post('/v1/visitas')
        .set(como(Rol.ENFERMERIA))
        .send({ pacienteId: otroPacienteId })
        .expect(403);
    });
  });

  describe('quienes esperan', () => {
    it('aparece con su expediente, su comunidad y cuanto lleva esperando', async () => {
      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);

      const mia = mios(r.body).find(
        (v) => (v.pacienteId as unknown as string) === pacienteId,
      ) as unknown as Record<string, string | number>;
      expect(mia).toBeDefined();
      expect(mia.numeroExpediente).toMatch(/^EXP-\d{4}-\d{6}$/);
      expect(mia.motivo).toBe('Control de embarazo');
      expect(typeof mia.esperandoMinutos).toBe('number');
      expect(mia.esperandoMinutos).toBeGreaterThanOrEqual(0);
    });

    it('viene en orden de llegada: es el orden que la gente entiende', async () => {
      await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId: otroPacienteId })
        .expect(201);

      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);

      const llegadas = r.body.map((v: { llegadaEn: string }) => v.llegadaEn);
      expect(llegadas).toEqual([...llegadas].sort());
    });

    it('NO expone el DPI', async () => {
      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);

      for (const v of r.body) {
        expect(v).not.toHaveProperty('dpi');
        expect(v).not.toHaveProperty('telefono');
      }
    });

    it('una llegada de AYER no aparece hoy', async () => {
      // Sin esto la lista acumularia gente de otros dias y dejaria de mirarse.
      const ayer = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const vieja = await prisma.visita.create({
        data: { pacienteId, registradaPor: 'e2e', orden: 0, llegadaEn: ayer, estado: 'ATENDIDA' },
      });

      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);

      expect(r.body.some((v: { id: string }) => v.id === vieja.id)).toBe(false);
      await prisma.visita.delete({ where: { id: vieja.id } });
    });

    /**
     * ───────────────────────────────────────────────────────────────────
     *  LA VISITA QUE NADIE CERRO AL TERMINAR EL DIA
     *
     *  El CAP cierra a las cinco y la gente se va; nadie recorre la lista
     *  sacando uno por uno a los que no llegaron a pasar. Esas visitas se
     *  quedaban ESPERANDO para siempre, y como `enEspera` solo lista las de
     *  hoy, eran INVISIBLES: no se podian retirar desde ninguna pantalla y el
     *  paciente no volvia a poder entrar a la sala de espera nunca mas.
     *
     *  La prueba de "una llegada de AYER no aparece hoy" no lo detectaba
     *  porque creaba la visita vieja ya cerrada, con estado ATENDIDA.
     * ───────────────────────────────────────────────────────────────────
     */
    it('una visita ESPERANDO de ayer no deja bloqueado al paciente', async () => {
      // El paciente de las pruebas lo comparten varios casos, y el indice unico
      // parcial solo admite UNA visita ESPERANDO por paciente. Sin esto, el
      // resultado dependeria del orden en que corran.
      await prisma.visita.deleteMany({ where: { pacienteId, estado: 'ESPERANDO' } });
      // 30 horas y no 20: con 20, corrida despues de las 8 de la noche la
      // visita caia en la madrugada de HOY y la prueba fallaba por la hora.
      const anoche = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const vieja = await prisma.visita.create({
        data: {
          pacienteId,
          registradaPor: 'e2e',
          orden: 0,
          llegadaEn: anoche,
          estado: 'ESPERANDO',
        },
      });

      // Antes esto respondia 409 con el id de una visita que nadie podia ver.
      const r = await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId })
        .expect(201);

      expect(r.body.id).not.toBe(vieja.id);

      const cerrada = await prisma.visita.findUnique({ where: { id: vieja.id } });
      expect(cerrada!.estado).toBe('RETIRADA');
      expect(cerrada!.motivoRetiro).toMatch(/al terminar el dia/i);

      await prisma.visita.delete({ where: { id: r.body.id as string } });
      await prisma.visita.delete({ where: { id: vieja.id } });
    });

    it('consultar la sala cierra las que quedaron abiertas de otros dias', async () => {
      // El paciente de las pruebas lo comparten varios casos, y el indice unico
      // parcial solo admite UNA visita ESPERANDO por paciente. Sin esto, el
      // resultado dependeria del orden en que corran.
      await prisma.visita.deleteMany({ where: { pacienteId, estado: 'ESPERANDO' } });
      const anteayer = new Date(Date.now() - 44 * 60 * 60 * 1000);
      const vieja = await prisma.visita.create({
        data: {
          pacienteId,
          registradaPor: 'e2e',
          orden: 0,
          llegadaEn: anteayer,
          estado: 'ESPERANDO',
        },
      });

      await request(http()).get('/v1/visitas/espera').set(como(Rol.ENFERMERIA)).expect(200);

      const cerrada = await prisma.visita.findUnique({ where: { id: vieja.id } });
      expect(cerrada!.estado).toBe('RETIRADA');
      expect(cerrada!.cerradaEn).not.toBeNull();

      await prisma.visita.delete({ where: { id: vieja.id } });
    });

    /**
     * El barrido no puede llevarse por delante a quien esta esperando ahora
     * mismo: seria peor que el problema que resuelve.
     */
    it('el barrido NO toca a quien llego hoy', async () => {
      // El paciente de las pruebas lo comparten varios casos, y el indice unico
      // parcial solo admite UNA visita ESPERANDO por paciente. Sin esto, el
      // resultado dependeria del orden en que corran.
      await prisma.visita.deleteMany({ where: { pacienteId, estado: 'ESPERANDO' } });
      const r = await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId })
        .expect(201);

      await request(http()).get('/v1/visitas/espera').set(como(Rol.ENFERMERIA)).expect(200);

      const sigue = await prisma.visita.findUnique({ where: { id: r.body.id as string } });
      expect(sigue!.estado).toBe('ESPERANDO');

      await prisma.visita.delete({ where: { id: r.body.id as string } });
    });

    /**
     * Una visita cerrada de ayer ya estaba bien: el barrido no debe reescribir
     * su motivo ni su fecha de cierre, que explican lo que de verdad paso.
     */
    it('el barrido no reescribe las que ya estaban cerradas', async () => {
      const ayer = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const atendida = await prisma.visita.create({
        data: {
          pacienteId,
          registradaPor: 'e2e',
          orden: 0,
          llegadaEn: ayer,
          estado: 'ATENDIDA',
          cerradaEn: ayer,
        },
      });

      await request(http()).get('/v1/visitas/espera').set(como(Rol.ENFERMERIA)).expect(200);

      const sigue = await prisma.visita.findUnique({ where: { id: atendida.id } });
      expect(sigue!.estado).toBe('ATENDIDA');
      expect(sigue!.motivoRetiro).toBeNull();

      await prisma.visita.delete({ where: { id: atendida.id } });
    });

    it('Farmacia no ve la sala: dice quien vino al medico y a que', async () => {
      await request(http()).get('/v1/visitas/espera').set(como(Rol.FARMACIA)).expect(403);
    });
  });

  /**
   * El turno se puede cambiar. Llega una emergencia y hay que pasarla
   * adelante; sin esto la unica forma seria mentir sobre la hora de llegada.
   */
  describe('cambiar el turno', () => {
    const idDe = async (pid: string) =>
      (await prisma.visita.findFirst({ where: { pacienteId: pid, estado: 'ESPERANDO' } }))!.id;

    // Hacen falta al menos dos en la sala para que mover signifique algo. Se
    // asegura aqui en vez de heredar lo que dejaran las pruebas anteriores.
    beforeAll(async () => {
      for (const pid of [pacienteId, otroPacienteId]) {
        await prisma.visita.deleteMany({ where: { pacienteId: pid, estado: 'ESPERANDO' } });
        await request(http()).post('/v1/visitas').set(como(Rol.RECEPCION)).send({ pacienteId: pid }).expect(201);
      }
    });

    it('pasar a alguien al frente lo pone de primero, con su motivo a la vista', async () => {
      const r = await request(http())
        .patch('/v1/visitas/' + (await idDe(otroPacienteId)) + '/orden')
        .set(como(Rol.ENFERMERIA))
        .send({ posicion: 1, motivo: 'Dolor de pecho' })
        .expect(200);

      // Devuelve la sala como queda, ya renumerada 1..n.
      expect(r.body[0].pacienteId).toBe(otroPacienteId);
      expect(r.body[0].orden).toBe(1);
      expect(r.body[0].motivoPrioridad).toBe('Dolor de pecho');
      expect(r.body.map((v: { orden: number }) => v.orden)).toEqual(
        r.body.map((_: unknown, i: number) => i + 1),
      );
    });

    it('el motivo de la prioridad NO es legible con un SELECT directo', async () => {
      const fila = await prisma.visita.findFirst({
        where: { pacienteId: otroPacienteId, estado: 'ESPERANDO' },
      });
      const enBruto = Buffer.from(fila!.motivoPrioridadCifrado ?? []).toString('utf8');
      expect(enBruto).not.toContain('pecho');
    });

    it('la sala sale por turno, no por hora de llegada', async () => {
      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);
      expect(r.body[0].pacienteId).toBe(otroPacienteId);
    });

    it('mandarlo al final sin motivo le quita la prioridad', async () => {
      const sala = await request(http()).get('/v1/visitas/espera').set(como(Rol.ENFERMERIA));
      const r = await request(http())
        .patch('/v1/visitas/' + (await idDe(otroPacienteId)) + '/orden')
        .set(como(Rol.RECEPCION))
        .send({ posicion: sala.body.length })
        .expect(200);

      const ultimo = r.body[r.body.length - 1];
      expect(ultimo.pacienteId).toBe(otroPacienteId);
      expect(ultimo.motivoPrioridad).toBeNull();
    });

    it('una posicion que no existe se rechaza diciendo cuantos hay', async () => {
      const r = await request(http())
        .patch('/v1/visitas/' + (await idDe(otroPacienteId)) + '/orden')
        .set(como(Rol.ENFERMERIA))
        .send({ posicion: 999 })
        .expect(400);
      expect(r.body.mensaje).toMatch(/Solo hay \d+ en la sala/);
    });

    it('el director mira la sala pero no mueve a nadie', async () => {
      await request(http())
        .patch('/v1/visitas/' + (await idDe(otroPacienteId)) + '/orden')
        .set(como(Rol.DIRECTOR))
        .send({ posicion: 1 })
        .expect(403);
    });

    it('una visita ya cerrada no se puede mover', async () => {
      const ayer = new Date(Date.now() - 30 * 60 * 60 * 1000);
      const cerrada = await prisma.visita.create({
        data: {
          pacienteId,
          registradaPor: 'e2e',
          orden: 0,
          llegadaEn: ayer,
          estado: 'ATENDIDA',
          cerradaEn: ayer,
        },
      });
      await request(http())
        .patch('/v1/visitas/' + cerrada.id + '/orden')
        .set(como(Rol.ENFERMERIA))
        .send({ posicion: 1 })
        .expect(409);
      await prisma.visita.delete({ where: { id: cerrada.id } });
    });
  });

  describe('cerrar la visita', () => {
    it('guardar la ficha la cierra sola, sin un paso mas', async () => {
      // Se asegura su propia visita en vez de heredar la que dejaba una prueba
      // anterior. Depender del orden hacia que cualquier caso nuevo que
      // limpiara la sala rompiera esta, por un motivo que no tiene nada que
      // ver con lo que comprueba.
      await prisma.visita.deleteMany({ where: { pacienteId, estado: 'ESPERANDO' } });
      await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId })
        .expect(201);

      // Pedirle a la enfermera un paso extra justo cuando ya termino y va por
      // el siguiente es pedirle que se le olvide.
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Control de embarazo' })
        .expect(201);

      const cerrada = await prisma.visita.findFirst({
        where: { pacienteId },
        orderBy: { llegadaEn: 'desc' },
      });
      expect(cerrada!.estado).toBe('ATENDIDA');
      expect(cerrada!.atencionId).not.toBeNull();
      expect(cerrada!.cerradaEn).not.toBeNull();

      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);
      expect(r.body.some((v: { pacienteId: string }) => v.pacienteId === pacienteId)).toBe(false);
    });

    it('una ficha transcrita del papel NO cierra ninguna visita', async () => {
      // La mayoria de las fichas no vienen de una visita de hoy.
      const antes = await prisma.visita.count({ where: { estado: 'ESPERANDO' } });

      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Consulta de 2019', digitalizada: true })
        .expect(201);

      expect(await prisma.visita.count({ where: { estado: 'ESPERANDO' } })).toBe(antes);
    });

    it('se puede sacar a quien se fue, diciendo por que', async () => {
      const enEspera = await prisma.visita.findFirst({
        where: { pacienteId: otroPacienteId, estado: 'ESPERANDO' },
      });

      const r = await request(http())
        .patch('/v1/visitas/' + enEspera!.id + '/retiro')
        .set(como(Rol.RECEPCION))
        .send({ motivo: 'Se canso de esperar y se fue' })
        .expect(200);

      expect(r.body.estado).toBe('RETIRADA');
      expect(r.body.motivoRetiro).toBe('Se canso de esperar y se fue');
    });

    it('retirar sin motivo no se acepta', async () => {
      const nueva = await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId: otroPacienteId })
        .expect(201);

      await request(http())
        .patch('/v1/visitas/' + nueva.body.id + '/retiro')
        .set(como(Rol.RECEPCION))
        .send({})
        .expect(400);

      await request(http())
        .patch('/v1/visitas/' + nueva.body.id + '/retiro')
        .set(como(Rol.ENFERMERIA))
        .send({ motivo: 'Se fue sin avisar' })
        .expect(200);
    });

    it('cerrar dos veces la misma visita no se acepta', async () => {
      const cerrada = await prisma.visita.findFirst({
        where: { pacienteId: otroPacienteId, estado: 'RETIRADA' },
      });

      await request(http())
        .patch('/v1/visitas/' + cerrada!.id + '/retiro')
        .set(como(Rol.RECEPCION))
        .send({ motivo: 'Otra vez' })
        .expect(409);
    });

    it('tras cerrarla, el paciente puede volver a llegar otro dia', async () => {
      // El indice unico es PARCIAL a proposito: un paciente vuelve al CAP
      // muchas veces en su vida.
      await request(http())
        .post('/v1/visitas')
        .set(como(Rol.RECEPCION))
        .send({ pacienteId })
        .expect(201);
    });
  });
});
