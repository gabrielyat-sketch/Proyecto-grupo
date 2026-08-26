import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CLIENTE_PACIENTES, IClientePacientes, PacienteResumen } from '../src/pacientes/cliente-pacientes';
import { fechaDelDia, sumarDias } from '../src/dominio/clinico';

/**
 * Prueba de extremo a extremo contra PostgreSQL real.
 *
 * El cliente del servicio de usuarios se sustituye por un doble. Su contrato
 * (timeouts, traduccion de codigos, propagacion del token) se prueba aparte en
 * cliente-pacientes.spec.ts; aqui se prueba la logica de los programas, que es
 * lo propio de este servicio.
 */
const PACIENTES: Record<string, PacienteResumen> = {
  'mujer-25': {
    id: 'mujer-25', nombres: 'Juana', apellidos: 'Caal', fechaNacimiento: '2001-01-01',
    edad: 25, sexo: 'F', comunidad: { id: 'com-1', nombre: 'Chilasco' },
  },
  'mujer-40': {
    id: 'mujer-40', nombres: 'Maria', apellidos: 'Pop', fechaNacimiento: '1986-01-01',
    edad: 40, sexo: 'F', comunidad: { id: 'com-1', nombre: 'Chilasco' },
  },
  'mujer-14': {
    id: 'mujer-14', nombres: 'Ana', apellidos: 'Xol', fechaNacimiento: '2012-01-01',
    edad: 14, sexo: 'F', comunidad: { id: 'com-2', nombre: 'El Zapote' },
  },
  'hombre-50': {
    id: 'hombre-50', nombres: 'Pedro', apellidos: 'Tiul', fechaNacimiento: '1976-01-01',
    edad: 50, sexo: 'M', comunidad: { id: 'com-1', nombre: 'Chilasco' },
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

describe('Servicio programas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const http = () => app.getHttpServer() as never;
  const token = (rol: Rol) =>
    jwt.sign({ sub: 'u-prueba', usuario: 'prueba', rol, sesionId: 's', mfaVerificado: true });
  const auth = (rol: Rol) => 'Bearer ' + token(rol);

  /**
   * Fecha a N dias atras contados desde el dia de HOY EN PURULHA.
   *
   * Restar milisegundos sobre `Date.now()` cuenta dias UTC. Despues de las
   * 18:00 locales eso da un dia de mas, y las semanas de gestacion salen
   * corridas.
   */
  const diasAtras = (d: number) =>
    sumarDias(fechaDelDia(new Date()), -d).toISOString().slice(0, 10);

  beforeAll(async () => {
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
    await limpiar();
  });

  async function limpiar() {
    await prisma.controlHipertension.deleteMany({});
    await prisma.controlPrenatal.deleteMany({});
    await prisma.programaHipertension.deleteMany({});
    await prisma.programaEmbarazo.deleteMany({});
    await prisma.outbox.deleteMany({});
  }

  afterAll(async () => {
    if (prisma) await limpiar();
    await app?.close();
  });

  // ═══════════════ hipertension ═══════════════
  describe('hipertension', () => {
    let programaId: string;

    it('inscribe a un paciente y copia su comunidad', async () => {
      const r = await request(http())
        .post('/v1/programas/hipertension')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'hombre-50' })
        .expect(201);
      expect(r.body.comunidadId).toBe('com-1');
      expect(r.body.estado).toBe('ACTIVO');
      programaId = r.body.id;
    });

    it('rechaza inscribir dos veces al mismo paciente activo', async () => {
      const r = await request(http())
        .post('/v1/programas/hipertension')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'hombre-50' })
        .expect(409);
      expect(r.body.mensaje).toMatch(/ya esta inscrito/i);
      expect(r.body.detalles[0]).toContain('programaId:');
    });

    it('rechaza un paciente que no existe en el servicio de usuarios', async () => {
      await request(http())
        .post('/v1/programas/hipertension')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'no-existe' })
        .expect(400);
    });

    it('el sistema CALCULA la clasificacion, no la recibe', async () => {
      const r = await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.ENFERMERIA))
        .send({ sistolica: 148, diastolica: 94 })
        .expect(201);
      expect(r.body.clasificacion).toBe('ESTADIO_2');
      expect(r.body.enMeta).toBe(false);
      expect(r.body.proximoControl).toBeDefined();
    });

    it('clasifica por la cifra mas alta: 118/95 es estadio 2', async () => {
      const r = await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.ENFERMERIA))
        .send({ sistolica: 118, diastolica: 95 })
        .expect(201);
      expect(r.body.clasificacion).toBe('ESTADIO_2');
    });

    it('una crisis cita al dia siguiente, no en un mes', async () => {
      const r = await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 190, diastolica: 125 })
        .expect(201);
      expect(r.body.clasificacion).toBe('CRISIS');
      const dias = Math.round(
        (new Date(r.body.proximoControl).getTime() - new Date(r.body.fecha).getTime()) / 86400000,
      );
      expect(dias).toBeLessThanOrEqual(1);
    });

    it('rechaza una sistolica menor que la diastolica: son cifras invertidas', async () => {
      const r = await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 80, diastolica: 120 })
        .expect(400);
      expect(r.body.mensaje).toMatch(/mayor que la diastolica/i);
    });

    it('rechaza cifras fuera de rango fisiologico', async () => {
      await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 900, diastolica: 90 })
        .expect(400);
    });

    it('las observaciones NO son legibles con un SELECT directo', async () => {
      await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 135, diastolica: 85, observaciones: 'ObservacionConfidencialABC' })
        .expect(201);

      const fila = await prisma.controlHipertension.findFirst({
        where: { programaId },
        orderBy: { fecha: 'desc' },
      });
      const bruto = Buffer.from(fila!.observacionesCifrado!).toString('utf8');
      expect(bruto).not.toContain('ObservacionConfidencialABC');
    });

    it('el evento lleva las cifras pero NO las observaciones', async () => {
      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'control.hipertension.registrado' },
        orderBy: { ocurridoEn: 'desc' },
      });
      const cuerpo = JSON.stringify(evento!.datos);
      expect(cuerpo).not.toContain('ObservacionConfidencialABC');
      expect(cuerpo).toContain('clasificacion');
    });

    it('el listado trae el ultimo control sin consulta adicional por fila', async () => {
      const r = await request(http())
        .get('/v1/programas/hipertension')
        .set('Authorization', auth(Rol.DIRECTOR))
        .expect(200);
      expect(r.body.datos[0].ultimoControl).not.toBeNull();
      expect(r.body.datos[0].ultimoControl.clasificacion).toBeDefined();
    });

    it('detecta a los pacientes con control vencido', async () => {
      const r = await request(http())
        .get('/v1/programas/hipertension/atrasados')
        .set('Authorization', auth(Rol.DIRECTOR))
        .expect(200);
      expect(r.body).toHaveProperty('total');
      expect(Array.isArray(r.body.datos)).toBe(true);
    });

    it('egresa del programa y ya no acepta controles', async () => {
      await request(http())
        .patch('/v1/programas/hipertension/' + programaId + '/egreso')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ motivo: 'Traslado a otro servicio', estado: 'TRASLADADO' })
        .expect(200);

      await request(http())
        .post('/v1/programas/hipertension/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 130, diastolica: 80 })
        .expect(400);
    });

    it('Recepcion no tiene acceso al programa', async () => {
      await request(http())
        .get('/v1/programas/hipertension')
        .set('Authorization', auth(Rol.RECEPCION))
        .expect(403);
    });

    it('Farmacia tampoco', async () => {
      await request(http())
        .get('/v1/programas/hipertension')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(403);
    });
  });

  // ═══════════════ embarazo ═══════════════
  describe('embarazo', () => {
    let programaId: string;

    it('calcula la fecha probable de parto a partir de la FUM', async () => {
      const fum = diasAtras(70);
      const r = await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.ENFERMERIA))
        .send({ pacienteId: 'mujer-25', fum })
        .expect(201);

      const dias = Math.round(
        (new Date(r.body.fpp).getTime() - new Date(fum + 'T00:00:00Z').getTime()) / 86400000,
      );
      expect(dias).toBe(280);
      expect(r.body.semanasGestacion).toBe(10);
      programaId = r.body.id;
    });

    it('una paciente de 25 anios sin factores queda en riesgo BAJO', async () => {
      const r = await request(http())
        .get('/v1/programas/embarazo/' + programaId)
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);
      expect(r.body.riesgo).toBe('BAJO');
    });

    it('marca ALTO riesgo por edad y explica el motivo', async () => {
      const r = await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'mujer-14', fum: diasAtras(60) })
        .expect(201);
      expect(r.body.riesgo).toBe('ALTO');
      expect(r.body.motivoRiesgo).toMatch(/menor de 15/i);
    });

    it('marca ALTO riesgo por gran multipara', async () => {
      const r = await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'mujer-40', fum: diasAtras(50), numeroGestacion: 6, partosPrevios: 5 })
        .expect(201);
      expect(r.body.riesgo).toBe('ALTO');
      // Acumula edad y multiparidad
      expect(r.body.motivoRiesgo).toMatch(/mayor de 35/i);
    });

    it('rechaza inscribir a un paciente de sexo masculino', async () => {
      const r = await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'hombre-50', fum: diasAtras(30) })
        .expect(400);
      expect(r.body.mensaje).toMatch(/femenino/i);
    });

    it('rechaza una FUM en el futuro', async () => {
      const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'mujer-25', fum: manana })
        .expect(400);
    });

    it('rechaza una FUM de hace mas de 45 semanas: es error de captura', async () => {
      const r = await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'mujer-25', fum: diasAtras(400) })
        .expect(400);
      expect(r.body.mensaje).toMatch(/45 semanas/i);
    });

    it('rechaza dos embarazos activos de la misma paciente', async () => {
      await request(http())
        .post('/v1/programas/embarazo')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: 'mujer-25', fum: diasAtras(20) })
        .expect(409);
    });

    it('calcula las semanas de gestacion del control', async () => {
      const r = await request(http())
        .post('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.ENFERMERIA))
        .send({ pesoKg: 58, sistolica: 110, diastolica: 70, fcf: 145 })
        .expect(201);
      expect(r.body.semanasGestacion).toBe(10);
      expect(r.body.alertas).toEqual([]);
    });

    it('cita cada 4 semanas antes de la semana 28', async () => {
      const controles = await request(http())
        .get('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);
      const c = controles.body.datos[0];
      // Se compara FECHA contra FECHA. proximoControl es una fecha sin hora y
      // c.fecha es un instante: restarlos y redondear da 27 o 28 segun la hora
      // del dia, y esa comparacion no prueba nada.
      const esperada = sumarDias(fechaDelDia(new Date(c.fecha)), 28);
      expect(new Date(c.proximoControl).toISOString().slice(0, 10)).toBe(
        esperada.toISOString().slice(0, 10),
      );
    });

    it('las semanas coinciden entre inscripcion, consulta y control', async () => {
      // Cuando cada endpoint calculaba el dia por su cuenta, el mismo
      // embarazo reportaba 10 semanas al inscribirlo y 9 en el control de esa
      // misma noche.
      const consultado = await request(http())
        .get('/v1/programas/embarazo/' + programaId)
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);

      const listado = await request(http())
        .get('/v1/programas/embarazo?estado=ACTIVO')
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);
      const enLista = listado.body.datos.find((e: { id: string }) => e.id === programaId);

      const controles = await request(http())
        .get('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);

      expect(enLista.semanasGestacion).toBe(consultado.body.semanasGestacion);
      expect(controles.body.datos[0].semanasGestacion).toBe(consultado.body.semanasGestacion);
    });

    it('detecta presion elevada y ELEVA el riesgo del embarazo', async () => {
      const r = await request(http())
        .post('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 150, diastolica: 95 })
        .expect(201);
      expect(r.body.alertas.some((a: string) => /preeclampsia/i.test(a))).toBe(true);

      const programa = await request(http())
        .get('/v1/programas/embarazo/' + programaId)
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);
      expect(programa.body.riesgo).toBe('ALTO');
    });

    it('el riesgo NO vuelve a bajar solo tras un control normal', async () => {
      await request(http())
        .post('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 110, diastolica: 70 })
        .expect(201);

      const programa = await request(http())
        .get('/v1/programas/embarazo/' + programaId)
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);
      expect(programa.body.riesgo).toBe('ALTO');
    });

    it('lista los embarazos de alto riesgo', async () => {
      const r = await request(http())
        .get('/v1/programas/embarazo/alto-riesgo')
        .set('Authorization', auth(Rol.DIRECTOR))
        .expect(200);
      expect(r.body.total).toBeGreaterThan(0);
      expect(r.body.datos.every((e: { riesgo: string }) => e.riesgo === 'ALTO')).toBe(true);
    });

    it('el evento no lleva observaciones clinicas', async () => {
      await request(http())
        .post('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 115, diastolica: 75, observaciones: 'NotaPrenatalSecreta' })
        .expect(201);

      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'control.prenatal.registrado' },
        orderBy: { ocurridoEn: 'desc' },
      });
      expect(JSON.stringify(evento!.datos)).not.toContain('NotaPrenatalSecreta');
    });

    it('cierra el seguimiento y ya no acepta controles', async () => {
      await request(http())
        .patch('/v1/programas/embarazo/' + programaId + '/cierre')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ resultado: 'PARTO_NORMAL' })
        .expect(200);

      await request(http())
        .post('/v1/programas/embarazo/' + programaId + '/controles')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ sistolica: 110, diastolica: 70 })
        .expect(400);
    });

    it('el listado esta paginado', async () => {
      const r = await request(http())
        .get('/v1/programas/embarazo?tamano=1')
        .set('Authorization', auth(Rol.DIRECTOR))
        .expect(200);
      expect(r.body.tamano).toBe(1);
    });

    it('sin token no se alcanza nada', async () => {
      await request(http()).get('/v1/programas/embarazo').expect(401);
    });
  });
});
