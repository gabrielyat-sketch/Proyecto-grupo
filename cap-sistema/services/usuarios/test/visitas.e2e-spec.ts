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
        data: { pacienteId, registradaPor: 'e2e', llegadaEn: ayer, estado: 'ATENDIDA' },
      });

      const r = await request(http())
        .get('/v1/visitas/espera')
        .set(como(Rol.ENFERMERIA))
        .expect(200);

      expect(r.body.some((v: { id: string }) => v.id === vieja.id)).toBe(false);
      await prisma.visita.delete({ where: { id: vieja.id } });
    });

    it('Farmacia no ve la sala: dice quien vino al medico y a que', async () => {
      await request(http()).get('/v1/visitas/espera').set(como(Rol.FARMACIA)).expect(403);
    });
  });

  describe('cerrar la visita', () => {
    it('guardar la ficha la cierra sola, sin un paso mas', async () => {
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
