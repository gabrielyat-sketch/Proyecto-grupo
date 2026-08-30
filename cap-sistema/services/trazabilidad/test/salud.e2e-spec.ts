import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';

/**
 * Prueba de extremo a extremo contra PostgreSQL real.
 *
 * Requiere `npm run infra:up` y el `.env` del servicio. No se sustituye la
 * base de datos por un doble: buena parte del valor de estas pruebas es
 * comprobar que los permisos del usuario de base de datos son los correctos,
 * y eso un mock no lo demuestra.
 */
describe('Servicio trazabilidad — salud y acceso (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const token = (rol: Rol) =>
    jwt.sign({ sub: 'u-prueba', usuario: 'prueba', rol, sesionId: 's-1', mfaVerificado: true });

  describe('salud', () => {
    it('GET /v1/salud responde sin autenticacion', async () => {
      const r = await request(app.getHttpServer()).get('/v1/salud').expect(200);
      expect(r.body.estado).toBe('vivo');
    });

    it('GET /v1/salud/listo confirma la conexion a PostgreSQL', async () => {
      const r = await request(app.getHttpServer()).get('/v1/salud/listo').expect(200);
      expect(r.body.baseDatos).toBe('ok');
    });
  });

  describe('autenticacion', () => {
    it('rechaza el acceso sin token', () => {
      return request(app.getHttpServer()).get('/v1/registros').expect(401);
    });

    it('rechaza un token con firma invalida', () => {
      return request(app.getHttpServer())
        .get('/v1/registros')
        .set('Authorization', 'Bearer token.falso.aqui')
        .expect(401);
    });

    it('devuelve el formato unico de error', async () => {
      const r = await request(app.getHttpServer()).get('/v1/registros').expect(401);
      expect(r.body).toMatchObject({ codigo: 'NO_AUTENTICADO' });
      expect(typeof r.body.trazaId).toBe('string');
      expect(r.body.fecha).toBeDefined();
    });

    it('devuelve la cabecera de correlacion x-traza-id', async () => {
      const r = await request(app.getHttpServer()).get('/v1/salud');
      expect(r.headers['x-traza-id']).toBeDefined();
    });

    it('respeta el x-traza-id que envia el cliente', async () => {
      const r = await request(app.getHttpServer()).get('/v1/salud').set('x-traza-id', 'mi-traza-123');
      expect(r.headers['x-traza-id']).toBe('mi-traza-123');
    });
  });

  describe('autorizacion por rol', () => {
    it('cualquier rol puede DEJAR su rastro', async () => {
      // Un medico que corrige un diagnostico tiene que poder auditarse a si
      // mismo. Si registrar exigiera un rol privilegiado, la accion mas comun
      // del sistema quedaria sin auditar.
      await request(app.getHttpServer())
        .post('/v1/registros')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ servicio: 'usuarios', accion: 'CONSULTA', entidad: 'expediente', entidadId: 'e-1' })
        .expect(201);
    });

    it('Recepcion NO puede leer la bitacora', () => {
      // Dice quien atendio a quien y cuando. Es un privilegio, no un listado.
      return request(app.getHttpServer())
        .get('/v1/registros')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(403);
    });

    it('el Director si puede leerla', () => {
      return request(app.getHttpServer())
        .get('/v1/registros')
        .set('Authorization', 'Bearer ' + token(Rol.DIRECTOR))
        .expect(200);
    });

    it('Farmacia no puede cerrar el dia', () => {
      return request(app.getHttpServer())
        .post('/v1/raices/cierre')
        .set('Authorization', 'Bearer ' + token(Rol.FARMACIA))
        .send({})
        .expect(403);
    });
  });

  describe('validacion de entrada', () => {
    it('rechaza una accion que no existe', () => {
      return request(app.getHttpServer())
        .post('/v1/registros')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ servicio: 'usuarios', accion: 'BORRAR_TODO', entidad: 'e', entidadId: '1' })
        .expect(400);
    });

    it('rechaza un servicio que no es del sistema', () => {
      return request(app.getHttpServer())
        .post('/v1/registros')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ servicio: 'inventado', accion: 'CONSULTA', entidad: 'e', entidadId: '1' })
        .expect(400);
    });

    it('rechaza campos que el DTO no declara', () => {
      // Aqui importa mas que en otros servicios: si `usuarioId` colara desde
      // el cuerpo, el llamador podria firmar la bitacora a nombre de otro.
      return request(app.getHttpServer())
        .post('/v1/registros')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({
          servicio: 'usuarios',
          accion: 'CONSULTA',
          entidad: 'e',
          entidadId: '1',
          usuarioId: 'el-jefe',
        })
        .expect(400);
    });

    it('el listado esta paginado y con tope', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/registros?tamano=5000')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR))
        .expect(400);
      expect(r.body.codigo).toBeDefined();
    });
  });
});
