import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { fechaDelDia, FiltroExcepciones, Rol, sumarDias } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  CLIENTE_PACIENTES,
  IClientePacientes,
  PacienteResumen,
} from '../src/pacientes/cliente-pacientes';

/**
 * Prueba de extremo a extremo contra PostgreSQL real.
 *
 * El cliente del servicio de usuarios se sustituye por un doble; su contrato
 * se prueba aparte en cliente-pacientes.spec.ts.
 */
const PACIENTE: PacienteResumen = {
  id: 'paciente-1',
  nombres: 'Juana',
  apellidos: 'Caal',
  edad: 40,
  sexo: 'F',
  comunidad: { id: 'com-1', nombre: 'Chilasco' },
};

class ClienteDoble implements IClientePacientes {
  async obtener(pacienteId: string): Promise<PacienteResumen> {
    if (pacienteId !== PACIENTE.id) {
      const { BadRequestException } = await import('@nestjs/common');
      throw new BadRequestException('El paciente indicado no existe.');
    }
    return PACIENTE;
  }
}

describe('Servicio medicamentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const http = () => app.getHttpServer() as never;
  const auth = (rol: Rol) =>
    'Bearer ' +
    jwt.sign({ sub: 'u-prueba', usuario: 'prueba', rol, sesionId: 's', mfaVerificado: true });

  /**
   * Fecha a N dias del dia de HOY EN PURULHA.
   *
   * El `fechaDelDia` no es opcional. Despues de las 18:00 locales ya es el dia
   * siguiente en UTC, y `sumarDias(new Date(), -1)` devolveria el dia de hoy
   * en vez de ayer — que es justo el desfase que este servicio evita.
   */
  const diaLocal = (d: number) => sumarDias(fechaDelDia(new Date()), d);
  const enDias = (d: number) => diaLocal(d).toISOString().slice(0, 10);

  let contador = 0;
  const codigoUnico = () => 'E2E-' + String(++contador).padStart(4, '0');

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
    await prisma.movimientoInventario.deleteMany({});
    await prisma.detalleEntrega.deleteMany({});
    await prisma.entrega.deleteMany({});
    await prisma.lote.deleteMany({});
    await prisma.medicamento.deleteMany({});
    await prisma.outbox.deleteMany({});
  }

  afterAll(async () => {
    if (prisma) await limpiar();
    await app?.close();
  });

  /** Crea un medicamento y devuelve su id. */
  async function crearMedicamento(extra: Record<string, unknown> = {}): Promise<string> {
    const r = await request(http())
      .post('/v1/medicamentos')
      .set('Authorization', auth(Rol.FARMACIA))
      .send({
        codigo: codigoUnico(),
        nombreGenerico: 'Amoxicilina',
        unidad: 'TABLETA',
        ...extra,
      })
      .expect(201);
    return r.body.id as string;
  }

  /** Ingresa un lote y devuelve su id. */
  async function ingresarLote(
    medicamentoId: string,
    numeroLote: string,
    venceEnDias: number,
    cantidad: number,
  ): Promise<string> {
    const r = await request(http())
      .post('/v1/medicamentos/' + medicamentoId + '/lotes')
      .set('Authorization', auth(Rol.FARMACIA))
      .send({ numeroLote, fechaVencimiento: enDias(venceEnDias), cantidad })
      .expect(201);
    return r.body.id as string;
  }

  // ═══════════════════════ catalogo ═══════════════════════
  describe('catalogo', () => {
    it('crea un medicamento y lo devuelve con existencia cero', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Ibuprofeno', stockMinimo: 50 });
      const r = await request(http())
        .get('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(r.body.existencia).toBe(0);
      expect(r.body.lotes).toEqual([]);
    });

    it('normaliza el codigo a mayusculas', async () => {
      const r = await request(http())
        .post('/v1/medicamentos')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ codigo: 'e2e-minus', nombreGenerico: 'Paracetamol', unidad: 'TABLETA' })
        .expect(201);
      expect(r.body.codigo).toBe('E2E-MINUS');
    });

    it('rechaza un codigo duplicado', async () => {
      await request(http())
        .post('/v1/medicamentos')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ codigo: 'e2e-minus', nombreGenerico: 'Otro', unidad: 'TABLETA' })
        .expect(409);
    });

    it('rechaza una unidad que no existe', async () => {
      await request(http())
        .post('/v1/medicamentos')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ codigo: codigoUnico(), nombreGenerico: 'X', unidad: 'CUCHARADAS' })
        .expect(400);
    });

    it('el medico PUEDE consultar existencias: receta lo que hay', async () => {
      await request(http())
        .get('/v1/medicamentos')
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);
    });

    it('el medico NO puede crear medicamentos', async () => {
      await request(http())
        .post('/v1/medicamentos')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ codigo: codigoUnico(), nombreGenerico: 'X', unidad: 'TABLETA' })
        .expect(403);
    });

    it('Recepcion no tiene acceso al inventario', async () => {
      await request(http())
        .get('/v1/medicamentos')
        .set('Authorization', auth(Rol.RECEPCION))
        .expect(403);
    });

    it('el listado esta paginado', async () => {
      const r = await request(http())
        .get('/v1/medicamentos?tamano=1')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(r.body.tamano).toBe(1);
      expect(r.body).toHaveProperty('totalPaginas');
    });

    it('suma la existencia de todos los lotes del medicamento', async () => {
      const id = await crearMedicamento();
      await ingresarLote(id, 'L-A', 200, 100);
      await ingresarLote(id, 'L-B', 400, 50);

      const r = await request(http())
        .get('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(r.body.existencia).toBe(150);
    });
  });

  /**
   * ─────────────────────────────────────────────────────────────────────
   *  EDICION DEL MEDICAMENTO
   *
   *  Este endpoint no tenia ninguna prueba, y por eso nadie habia visto que
   *  su cuerpo estaba escrito como un tipo suelto de TypeScript en vez de una
   *  clase. Sin clase, el ValidationPipe no valida —no tiene metatype que
   *  inspeccionar— y el objeto llegaba entero hasta `prisma.update`. Estas
   *  pruebas fijan las dos mitades: que lo permitido se guarda y que lo demas
   *  se rechaza en vez de escribirse.
   * ─────────────────────────────────────────────────────────────────────
   */
  describe('edicion del medicamento', () => {
    it('cambia la existencia minima', async () => {
      const id = await crearMedicamento({ stockMinimo: 10 });

      const r = await request(http())
        .patch('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ stockMinimo: 80 })
        .expect(200);

      expect(r.body.stockMinimo).toBe(80);
    });

    it('desactivar deja el medicamento fuera del catalogo pero conserva su historial', async () => {
      const id = await crearMedicamento();
      await ingresarLote(id, 'L-DESACT', 300, 40);

      await request(http())
        .patch('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ activo: false })
        .expect(200);

      const visible = await request(http())
        .get('/v1/medicamentos')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(visible.body.datos.some((m: { id: string }) => m.id === id)).toBe(false);

      // El lote sigue ahi: desactivar no es borrar.
      const detalle = await request(http())
        .get('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(detalle.body.existencia).toBe(40);
    });

    it('NO deja reescribir el codigo ni el nombre: identifican al medicamento', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Amoxicilina' });

      await request(http())
        .patch('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ codigo: 'SECUESTRADO', nombreGenerico: 'Otra cosa' })
        .expect(400);

      const sigue = await request(http())
        .get('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(sigue.body.nombreGenerico).toBe('Amoxicilina');
      expect(sigue.body.codigo).not.toBe('SECUESTRADO');
    });

    it('NO deja cambiar la unidad: los lotes ya se contaron en ella', async () => {
      const id = await crearMedicamento({ unidad: 'TABLETA' });
      await ingresarLote(id, 'L-UNIDAD', 300, 500);

      await request(http())
        .patch('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ unidad: 'FRASCO' })
        .expect(400);

      const sigue = await request(http())
        .get('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(sigue.body.unidad).toBe('TABLETA');
    });

    it('rechaza una existencia minima negativa', async () => {
      const id = await crearMedicamento();
      await request(http())
        .patch('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ stockMinimo: -5 })
        .expect(400);
    });

    it('el medico consulta pero no edita el catalogo', async () => {
      const id = await crearMedicamento();
      await request(http())
        .patch('/v1/medicamentos/' + id)
        .set('Authorization', auth(Rol.MEDICO))
        .send({ stockMinimo: 5 })
        .expect(403);
    });

    it('devuelve 404 con un medicamento que no existe', async () => {
      await request(http())
        .patch('/v1/medicamentos/00000000-0000-4000-8000-000000000000')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ stockMinimo: 5 })
        .expect(404);
    });
  });

  // ═══════════════════════ lotes ═══════════════════════
  describe('lotes', () => {
    it('rechaza ingresar un lote ya vencido', async () => {
      const id = await crearMedicamento();
      const r = await request(http())
        .post('/v1/medicamentos/' + id + '/lotes')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ numeroLote: 'VIEJO', fechaVencimiento: enDias(-10), cantidad: 100 })
        .expect(400);
      expect(JSON.stringify(r.body)).toMatch(/vencio/i);
    });

    it('rechaza cantidad cero o negativa', async () => {
      const id = await crearMedicamento();
      await request(http())
        .post('/v1/medicamentos/' + id + '/lotes')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ numeroLote: 'L-0', fechaVencimiento: enDias(300), cantidad: 0 })
        .expect(400);
    });

    it('rechaza el mismo numero de lote dos veces en el mismo medicamento', async () => {
      const id = await crearMedicamento();
      await ingresarLote(id, 'L-REPE', 300, 100);
      const r = await request(http())
        .post('/v1/medicamentos/' + id + '/lotes')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ numeroLote: 'L-REPE', fechaVencimiento: enDias(300), cantidad: 50 })
        .expect(409);
      expect(r.body.detalles[0]).toContain('loteId:');
    });

    it('el mismo numero SI puede repetirse en medicamentos distintos', async () => {
      const a = await crearMedicamento();
      const b = await crearMedicamento();
      await ingresarLote(a, 'L-COMPARTIDO', 300, 10);
      await ingresarLote(b, 'L-COMPARTIDO', 300, 10);
    });

    it('el ingreso queda registrado en el libro mayor', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-MOV', 300, 250);

      const r = await request(http())
        .get('/v1/inventario/movimientos?loteId=' + loteId)
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(r.body.total).toBe(1);
      expect(r.body.datos[0]).toMatchObject({
        tipo: 'INGRESO',
        cantidad: 250,
        cantidadResultante: 250,
      });
    });

    it('lista los lotes que vencen dentro de la ventana', async () => {
      const id = await crearMedicamento();
      await ingresarLote(id, 'L-PRONTO', 30, 100);
      await ingresarLote(id, 'L-LEJOS', 300, 100);

      const r = await request(http())
        .get('/v1/lotes/por-vencer?dias=60')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);

      const numeros = r.body.datos.map((l: { numeroLote: string }) => l.numeroLote);
      expect(numeros).toContain('L-PRONTO');
      expect(numeros).not.toContain('L-LEJOS');
    });

    it('cada lote por vencer trae los dias que le faltan', async () => {
      const r = await request(http())
        .get('/v1/lotes/por-vencer?dias=60')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(typeof r.body.datos[0].diasParaVencer).toBe('number');
    });

    it('da de baja un lote y descuenta toda su existencia', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-BAJA', 300, 80);

      await request(http())
        .patch('/v1/lotes/' + loteId + '/baja')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ motivo: 'Frasco roto en bodega' })
        .expect(200);

      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.cantidadDisponible).toBe(0);
      expect(lote!.estado).toBe('DADO_DE_BAJA');

      const mov = await prisma.movimientoInventario.findFirst({
        where: { loteId, tipo: 'BAJA' },
      });
      expect(mov!.cantidad).toBe(-80);
    });

    it('exige un motivo para dar de baja', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-SINMOTIVO', 300, 10);
      await request(http())
        .patch('/v1/lotes/' + loteId + '/baja')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ motivo: '  ' })
        .expect(400);
    });

    it('rechaza un motivo mas largo que la columna, en vez de recortarlo', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-MOTIVOLARGO', 300, 10);
      await request(http())
        .patch('/v1/lotes/' + loteId + '/baja')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ motivo: 'x'.repeat(201) })
        .expect(400);

      // Y el lote sigue disponible: un motivo invalido no da de baja nada.
      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.estado).toBe('DISPONIBLE');
    });

    it('guarda el motivo completo de la baja', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-MOTIVOENTERO', 300, 10);
      const motivo =
        'Vencido el mes pasado, retirado del estante y destruido con acta 14-2026 firmada por el director del CAP.';

      await request(http())
        .patch('/v1/lotes/' + loteId + '/baja')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ motivo })
        .expect(200);

      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.motivoBaja).toBe(motivo);
    });

    it('no permite dar de baja dos veces', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-DOBLEBAJA', 300, 10);
      await request(http())
        .patch('/v1/lotes/' + loteId + '/baja')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ motivo: 'Vencido' })
        .expect(200);
      await request(http())
        .patch('/v1/lotes/' + loteId + '/baja')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ motivo: 'Otra vez' })
        .expect(400);
    });
  });

  // ═══════════════════════ entregas: FEFO ═══════════════════════
  describe('entregas', () => {
    it('entrega del lote que vence ANTES, no del que entro antes', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Losartan' });
      const lejano = await ingresarLote(id, 'L-LEJANO', 700, 100);
      const cercano = await ingresarLote(id, 'L-CERCANO', 60, 100);

      const r = await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: PACIENTE.id, lineas: [{ medicamentoId: id, cantidad: 30 }] })
        .expect(201);

      expect(r.body.medicamentos).toHaveLength(1);
      expect(r.body.medicamentos[0].numeroLote).toBe('L-CERCANO');

      const [c, l] = await Promise.all([
        prisma.lote.findUnique({ where: { id: cercano } }),
        prisma.lote.findUnique({ where: { id: lejano } }),
      ]);
      expect(c!.cantidadDisponible).toBe(70);
      expect(l!.cantidadDisponible).toBe(100); // intacto
    });

    it('reparte entre lotes cuando uno solo no alcanza', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Metformina' });
      await ingresarLote(id, 'L-1', 60, 20);
      await ingresarLote(id, 'L-2', 300, 100);

      const r = await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: PACIENTE.id, lineas: [{ medicamentoId: id, cantidad: 50 }] })
        .expect(201);

      expect(r.body.medicamentos).toHaveLength(2);
      expect(r.body.medicamentos.map((m: { cantidad: number }) => m.cantidad)).toEqual([20, 30]);
    });

    it('marca el lote como AGOTADO al vaciarlo', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-VACIAR', 300, 25);

      await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: PACIENTE.id, lineas: [{ medicamentoId: id, cantidad: 25 }] })
        .expect(201);

      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.cantidadDisponible).toBe(0);
      expect(lote!.estado).toBe('AGOTADO');
    });

    it('NUNCA entrega de un lote vencido, aunque tenga existencia', async () => {
      const id = await crearMedicamento();
      // Se ingresa vigente y luego se retrocede la fecha en la base, que es
      // como ocurre en la realidad: el lote vence con el tiempo.
      const loteId = await ingresarLote(id, 'L-CADUCA', 10, 500);
      await prisma.lote.update({
        where: { id: loteId },
        data: { fechaVencimiento: diaLocal(-1) },
      });

      const r = await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: PACIENTE.id, lineas: [{ medicamentoId: id, cantidad: 10 }] })
        .expect(409);
      expect(r.body.mensaje).toMatch(/existencia suficiente/i);

      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.cantidadDisponible).toBe(500); // no se toco
    });

    it('si un medicamento no alcanza, NO se entrega ninguno', async () => {
      const conStock = await crearMedicamento({ nombreGenerico: 'Con existencia' });
      const sinStock = await crearMedicamento({ nombreGenerico: 'Sin existencia' });
      const loteId = await ingresarLote(conStock, 'L-OK', 300, 100);
      await ingresarLote(sinStock, 'L-POCO', 300, 2);

      const r = await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({
          pacienteId: PACIENTE.id,
          lineas: [
            { medicamentoId: conStock, cantidad: 10 },
            { medicamentoId: sinStock, cantidad: 50 },
          ],
        })
        .expect(409);

      expect(r.body.detalles[0]).toMatch(/faltan 48 de 50/);

      // El que si alcanzaba tampoco se descuento.
      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.cantidadDisponible).toBe(100);
    });

    it('rechaza el mismo medicamento repetido en dos lineas', async () => {
      const id = await crearMedicamento();
      await ingresarLote(id, 'L-REP', 300, 100);
      const r = await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({
          pacienteId: PACIENTE.id,
          lineas: [
            { medicamentoId: id, cantidad: 5 },
            { medicamentoId: id, cantidad: 5 },
          ],
        })
        .expect(400);
      expect(r.body.mensaje).toMatch(/dos veces/i);
    });

    it('rechaza una entrega sin lineas', async () => {
      await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: PACIENTE.id, lineas: [] })
        .expect(400);
    });

    it('rechaza un paciente que no existe', async () => {
      const id = await crearMedicamento();
      await ingresarLote(id, 'L-NOPAC', 300, 10);
      await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: 'inventado', lineas: [{ medicamentoId: id, cantidad: 1 }] })
        .expect(400);
    });

    it('registra el movimiento de salida con la existencia resultante', async () => {
      const id = await crearMedicamento();
      const loteId = await ingresarLote(id, 'L-SALIDA', 300, 40);

      await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({ pacienteId: PACIENTE.id, lineas: [{ medicamentoId: id, cantidad: 15 }] })
        .expect(201);

      const mov = await prisma.movimientoInventario.findFirst({
        where: { loteId, tipo: 'ENTREGA' },
      });
      expect(mov!.cantidad).toBe(-15);
      expect(mov!.cantidadResultante).toBe(25);
      expect(mov!.entregaId).not.toBeNull();
    });

    it('una receta de varios medicamentos es UNA entrega, no varias', async () => {
      const a = await crearMedicamento({ nombreGenerico: 'Primero' });
      const b = await crearMedicamento({ nombreGenerico: 'Segundo' });
      await ingresarLote(a, 'L-A1', 300, 100);
      await ingresarLote(b, 'L-B1', 300, 100);

      const antes = await prisma.entrega.count();
      const r = await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.FARMACIA))
        .send({
          pacienteId: PACIENTE.id,
          lineas: [
            { medicamentoId: a, cantidad: 5 },
            { medicamentoId: b, cantidad: 7 },
          ],
        })
        .expect(201);

      expect(await prisma.entrega.count()).toBe(antes + 1);
      expect(r.body.medicamentos).toHaveLength(2);
    });

    it('el evento no lleva el nombre del paciente', async () => {
      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'medicamento.entregado' },
        orderBy: { ocurridoEn: 'desc' },
      });
      const cuerpo = JSON.stringify(evento!.datos);
      expect(cuerpo).not.toContain('Juana');
      expect(cuerpo).not.toContain('Caal');
      expect(cuerpo).toContain('comunidadId');
    });

    it('el medico puede ver el historial pero no entregar', async () => {
      await request(http())
        .get('/v1/entregas')
        .set('Authorization', auth(Rol.MEDICO))
        .expect(200);

      const id = await crearMedicamento();
      await ingresarLote(id, 'L-MED', 300, 10);
      await request(http())
        .post('/v1/entregas')
        .set('Authorization', auth(Rol.MEDICO))
        .send({ pacienteId: PACIENTE.id, lineas: [{ medicamentoId: id, cantidad: 1 }] })
        .expect(403);
    });

    it('sin token no se alcanza nada', async () => {
      await request(http()).get('/v1/entregas').expect(401);
    });
  });

  // ═══════════════════════ concurrencia ═══════════════════════
  describe('concurrencia', () => {
    it('dos entregas simultaneas NO dejan la existencia en negativo', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Escaso' });
      const loteId = await ingresarLote(id, 'L-ESCASO', 300, 10);

      // Las dos piden 8 de las 10 que hay. Solo una puede completarse.
      const cuerpo = {
        pacienteId: PACIENTE.id,
        lineas: [{ medicamentoId: id, cantidad: 8 }],
      };
      const resultados = await Promise.allSettled([
        request(http()).post('/v1/entregas').set('Authorization', auth(Rol.FARMACIA)).send(cuerpo),
        request(http()).post('/v1/entregas').set('Authorization', auth(Rol.FARMACIA)).send(cuerpo),
      ]);

      const codigos = resultados.map((r) =>
        r.status === 'fulfilled' ? (r.value as { status: number }).status : 0,
      );
      expect(codigos.filter((c) => c === 201)).toHaveLength(1);
      expect(codigos.filter((c) => c === 409)).toHaveLength(1);

      const lote = await prisma.lote.findUnique({ where: { id: loteId } });
      expect(lote!.cantidadDisponible).toBe(2);
      expect(lote!.cantidadDisponible).toBeGreaterThanOrEqual(0);
    });
  });

  // ═══════════════════════ alertas ═══════════════════════
  describe('alerta de existencia minima', () => {
    it('aparece cuando la existencia baja del minimo', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Bajo minimo', stockMinimo: 100 });
      await ingresarLote(id, 'L-MIN', 300, 30);

      const r = await request(http())
        .get('/v1/medicamentos/bajo-minimo')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);

      const encontrado = r.body.find((m: { id: string }) => m.id === id);
      expect(encontrado).toBeDefined();
      expect(encontrado.existencia).toBe(30);
    });

    it('un medicamento con minimo en cero NO aparece', async () => {
      const id = await crearMedicamento({ nombreGenerico: 'Sin minimo', stockMinimo: 0 });
      const r = await request(http())
        .get('/v1/medicamentos/bajo-minimo')
        .set('Authorization', auth(Rol.FARMACIA))
        .expect(200);
      expect(r.body.find((m: { id: string }) => m.id === id)).toBeUndefined();
    });
  });
});
