import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Modo de digitalizacion (RF-08).
 *
 * Es la mitigacion del riesgo R-6: una transcripcion de miles de expedientes
 * que nadie ve avanzar se abandona. Lo que se prueba aqui es que el avance sea
 * real —contado en la base— y que la cola diga que carpeta toca.
 */
describe('Modo de digitalizacion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const creados: string[] = [];
  let comunidadId: string;
  let expedienteId: string;
  let pacienteId: string;

  const http = () => app.getHttpServer();

  const como = (rol: Rol) => ({
    Authorization:
      'Bearer ' +
      jwt.sign({
        sub: 'e2e-digitalizacion',
        usuario: 'e2e_digitalizacion',
        rol,
        sesionId: 's-digitalizacion',
        mfaVerificado: true,
      }),
  });

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

    // Comunidad propia de la prueba.
    //
    // Las del seed tienen miles de expedientes, y la cola viene ordenada por
    // apellido y paginada: un paciente "Zz" cae en la pagina 337 y buscarlo
    // seria recorrer el archivo entero. Con una comunidad vacia, lo que se
    // comprueba es el comportamiento y no la suerte del orden alfabetico.
    const comunidad = await prisma.comunidad.create({
      data: { nombre: 'ZZE2E Digitalizacion ' + Date.now(), activa: true },
      select: { id: true },
    });
    comunidadId = comunidad.id;

    const paciente = await request(http())
      .post('/v1/pacientes')
      .set(como(Rol.RECEPCION))
      .send({
        nombres: 'Zzdigital',
        apellidos: 'Zzarchivo Prueba',
        fechaNacimiento: '1979-06-30',
        sexo: 'M',
        comunidadId,
        // Viene de una carpeta de papel: es lo que lo pone en la cola. Un
        // paciente registrado hoy en el CAP nace COMPLETO, porque no hay nada
        // que transcribir.
        digitalizado: true,
      })
      .expect(201);

    creados.push(paciente.body.id);
    pacienteId = paciente.body.id;
    expedienteId = paciente.body.expedienteId;
  });

  afterAll(async () => {
    for (const id of creados) {
      await prisma.atencion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.registroDigitalizacion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.expediente.deleteMany({ where: { pacienteId: id } });
      await prisma.paciente.deleteMany({ where: { id } });
    }
    await prisma.comunidad.deleteMany({ where: { id: comunidadId } });
    await app.close();
  });

  describe('avance por comunidad', () => {
    it('cada comunidad cuadra: completos mas faltantes mas no localizados es el total', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/comunidades')
        .set(como(Rol.RECEPCION))
        .expect(200);

      expect(r.body.length).toBeGreaterThan(0);
      for (const c of r.body) {
        expect(c.completos + c.faltantes + c.noLocalizados).toBe(c.total);
        expect(c.porcentajeCompleto).toBeLessThanOrEqual(100);
      }
    });

    it('viene ordenado por nombre: el archivo se recorre en un orden estable', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/comunidades')
        .set(como(Rol.RECEPCION))
        .expect(200);

      const nombres = r.body.map((c: { nombre: string }) => c.nombre);
      expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
    });

    it('Farmacia no ve el avance del archivo', async () => {
      await request(http())
        .get('/v1/digitalizacion/comunidades')
        .set(como(Rol.FARMACIA))
        .expect(403);
    });
  });

  describe('cola de trabajo', () => {
    it('sin filtro devuelve lo que FALTA, no lo ya hecho', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/cola?tamano=50')
        .set(como(Rol.RECEPCION))
        .expect(200);

      expect(r.body.datos.length).toBeGreaterThan(0);
      for (const e of r.body.datos) {
        expect(['PENDIENTE', 'EN_PROCESO']).toContain(e.estado);
      }
    });

    it('el expediente recien creado aparece en la cola de su comunidad', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/cola?comunidadId=' + comunidadId)
        .set(como(Rol.RECEPCION))
        .expect(200);

      const mio = r.body.datos.find(
        (e: { expedienteId: string }) => e.expedienteId === expedienteId,
      );
      expect(mio).toBeDefined();
      expect(mio.apellidos).toBe('Zzarchivo Prueba');
      expect(mio.numero).toMatch(/^EXP-\d{4}-\d{6}$/);
      expect(mio.atencionesTranscritas).toBe(0);
    });

    it('NO expone el DPI: esta pantalla se usa con gente alrededor', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/cola?tamano=5')
        .set(como(Rol.RECEPCION))
        .expect(200);

      for (const e of r.body.datos) {
        expect(e).not.toHaveProperty('dpi');
        expect(e).not.toHaveProperty('telefono');
      }
    });

    it('filtrar por un estado concreto devuelve solo ese', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/cola?estado=COMPLETO&tamano=20')
        .set(como(Rol.RECEPCION))
        .expect(200);

      for (const e of r.body.datos) expect(e.estado).toBe('COMPLETO');
    });

    it('rechaza un estado que no existe', async () => {
      await request(http())
        .get('/v1/digitalizacion/cola?estado=INVENTADO')
        .set(como(Rol.RECEPCION))
        .expect(400);
    });

    it('viene paginada: nunca devuelve el archivo entero de una vez', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/cola')
        .set(como(Rol.RECEPCION))
        .expect(200);

      expect(r.body.tamano).toBeLessThanOrEqual(100);
      expect(r.body.datos.length).toBeLessThanOrEqual(r.body.tamano);
      expect(r.body).toHaveProperty('totalPaginas');
    });

    it('responde en menos de 2 segundos con el archivo completo', async () => {
      const inicio = Date.now();
      await request(http())
        .get('/v1/digitalizacion/cola?comunidadId=' + comunidadId)
        .set(como(Rol.RECEPCION))
        .expect(200);
      expect(Date.now() - inicio).toBeLessThan(2000);
    });
  });

  describe('el avance que ve el personal', () => {
    it('transcribir una ficha suma al contador del expediente', async () => {
      // Es lo que hace visible el trabajo del dia. Sin esto, una jornada de
      // transcripcion deja el contador en cero y el personal deja de creer en
      // el panel, que es como se abandona una digitalizacion.
      const antes = await request(http())
        .get('/v1/digitalizacion/cola?comunidadId=' + comunidadId)
        .set(como(Rol.RECEPCION))
        .expect(200);
      const previo = antes.body.datos.find(
        (e: { expedienteId: string }) => e.expedienteId === expedienteId,
      ).atencionesTranscritas;

      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Transcrita del expediente de papel',
          digitalizada: true,
        })
        .expect(201);

      const despues = await request(http())
        .get('/v1/digitalizacion/cola?comunidadId=' + comunidadId)
        .set(como(Rol.RECEPCION))
        .expect(200);
      const actual = despues.body.datos.find(
        (e: { expedienteId: string }) => e.expedienteId === expedienteId,
      ).atencionesTranscritas;

      expect(actual).toBe(previo + 1);
    });

    it('una ficha de consulta del dia NO cuenta como digitalizacion', async () => {
      const antes = await prisma.registroDigitalizacion.findUnique({ where: { expedienteId } });

      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Consulta de hoy', digitalizada: false })
        .expect(201);

      const despues = await prisma.registroDigitalizacion.findUnique({ where: { expedienteId } });
      expect(despues!.atencionesTranscritas).toBe(antes!.atencionesTranscritas);
    });

    it('registrar una ficha deja el evento para los indicadores', async () => {
      // Sin este evento, el panel de reportes (Etapa 10) nunca veria las
      // consultas capturadas con la ficha nueva, y nadie lo notaria hasta que
      // los indicadores salieran cortos.
      const eventos = await prisma.outbox.findMany({
        where: { tipo: 'atencion.registrada' },
        orderBy: { ocurridoEn: 'desc' },
        take: 5,
      });

      const mio = eventos.find(
        (e) => (e.datos as { pacienteId?: string }).pacienteId === pacienteId,
      );
      expect(mio).toBeDefined();
      const datos = mio!.datos as Record<string, unknown>;
      expect(datos.comunidadId).toBe(comunidadId);
      // Nunca sale el diagnostico ni las notas clinicas.
      expect(datos).not.toHaveProperty('motivo');
      expect(datos).not.toHaveProperty('diagnostico');
    });
  });

  describe('estado del expediente en el archivo', () => {
    it('marcarlo en proceso sella cuando se empezo', async () => {
      const r = await request(http())
        .patch('/v1/digitalizacion/' + expedienteId)
        .set(como(Rol.RECEPCION))
        .send({ estado: 'EN_PROCESO' })
        .expect(200);

      expect(r.body.estado).toBe('EN_PROCESO');
      expect(r.body.iniciadoEn).not.toBeNull();
    });

    it('marcarlo no localizado admite decir por que', async () => {
      const r = await request(http())
        .patch('/v1/digitalizacion/' + expedienteId)
        .set(como(Rol.RECEPCION))
        .send({ estado: 'NO_LOCALIZADO', observaciones: 'No esta en el cajon de su comunidad' })
        .expect(200);

      expect(r.body.estado).toBe('NO_LOCALIZADO');
      expect(r.body.observaciones).toBe('No esta en el cajon de su comunidad');
    });

    it('un expediente no localizado sale de la cola de lo que falta', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/cola?comunidadId=' + comunidadId)
        .set(como(Rol.RECEPCION))
        .expect(200);

      const mio = r.body.datos.find(
        (e: { expedienteId: string }) => e.expedienteId === expedienteId,
      );
      expect(mio).toBeUndefined();
    });

    it('Enfermeria SI cierra la carpeta: es quien la transcribe', async () => {
      // En el CAP, recepcion captura los datos del paciente y le pasa la
      // carpeta a enfermeria, que llena las fichas. Obligarla a avisarle a
      // recepcion para marcar el expediente como completo es el paso extra que
      // hace que el tablero deje de reflejar la realidad a los dos dias.
      const r = await request(http())
        .patch('/v1/digitalizacion/' + expedienteId)
        .set(como(Rol.ENFERMERIA))
        .send({ estado: 'COMPLETO' })
        .expect(200);
      expect(r.body.estado).toBe('COMPLETO');
      expect(r.body.completadoEn).not.toBeNull();
    });

    it('Farmacia no toca el archivo', async () => {
      await request(http())
        .patch('/v1/digitalizacion/' + expedienteId)
        .set(como(Rol.FARMACIA))
        .send({ estado: 'COMPLETO' })
        .expect(403);
    });

    it('Enfermeria ve la cola: sin eso no sabria que carpeta le toca', async () => {
      await request(http())
        .get('/v1/digitalizacion/cola')
        .set(como(Rol.ENFERMERIA))
        .expect(200);
    });

    it('un expediente que no existe lo dice, no falla en silencio', async () => {
      await request(http())
        .patch('/v1/digitalizacion/00000000-0000-0000-0000-000000000000')
        .set(como(Rol.RECEPCION))
        .send({ estado: 'COMPLETO' })
        .expect(404);
    });
  });
});
