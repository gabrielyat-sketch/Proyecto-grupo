import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';

/**
 * Prueba de extremo a extremo contra PostgreSQL real.
 *
 * Requiere `npm run infra:up` y las variables de entorno del servicio.
 * No se sustituye la base de datos por un doble: la mitad del valor de esta
 * prueba es comprobar que los permisos del usuario de base de datos son los
 * correctos, y eso un mock no lo demuestra.
 */
describe('Servicio plantilla (e2e)', () => {
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
      return request(app.getHttpServer()).get('/v1/ejemplo').expect(401);
    });

    it('rechaza un token con firma invalida', () => {
      return request(app.getHttpServer())
        .get('/v1/ejemplo')
        .set('Authorization', 'Bearer token.falso.aqui')
        .expect(401);
    });

    it('devuelve el formato unico de error', async () => {
      const r = await request(app.getHttpServer()).get('/v1/ejemplo').expect(401);
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
    it('permite listar a Recepcion', () => {
      return request(app.getHttpServer())
        .get('/v1/ejemplo')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
    });

    it('prohibe a Recepcion crear registros', () => {
      return request(app.getHttpServer())
        .post('/v1/ejemplo')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({ nombre: 'Intento no autorizado' })
        .expect(403);
    });

    it('permite al Administrador crear', async () => {
      const r = await request(app.getHttpServer())
        .post('/v1/ejemplo')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR))
        .send({ nombre: 'Comunidad El Rancho' })
        .expect(201);
      expect(r.body.id).toBeDefined();
      expect(r.body.nombre).toBe('Comunidad El Rancho');
    });
  });

  describe('validacion de entrada', () => {
    it('rechaza un nombre vacio', () => {
      return request(app.getHttpServer())
        .post('/v1/ejemplo')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR))
        .send({ nombre: '' })
        .expect(400);
    });

    it('rechaza campos que el DTO no declara', async () => {
      const r = await request(app.getHttpServer())
        .post('/v1/ejemplo')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR))
        .send({ nombre: 'Valido', esAdministrador: true })
        .expect(400);
      expect(r.body.codigo).toBe('VALIDACION');
    });

    it('rechaza un tamano de pagina mayor al permitido', () => {
      return request(app.getHttpServer())
        .get('/v1/ejemplo?tamano=5000')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(400);
    });
  });

  describe('paginacion', () => {
    it('devuelve la envoltura con total y totalPaginas', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/ejemplo')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(r.body).toHaveProperty('datos');
      expect(r.body).toHaveProperty('total');
      expect(r.body).toHaveProperty('totalPaginas');
      expect(Array.isArray(r.body.datos)).toBe(true);
    });
  });
});
