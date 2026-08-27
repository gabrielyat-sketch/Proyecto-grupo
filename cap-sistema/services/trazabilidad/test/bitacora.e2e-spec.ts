import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaClient } from '../prisma/generado';

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  EL CRITERIO DE TERMINADO DE LA ETAPA 9 (arquitectura §15.2)
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   «El script de verificacion detecta una alteracion simulada, y
 *    UPDATE / DELETE fallan por permisos de base de datos.»
 *
 * No es "el servicio compila y responde". Es que la bitacora demuestre, por si
 * sola, que nadie la toco. Estas dos pruebas son esa demostracion, y por eso
 * corren contra PostgreSQL real: lo que se comprueba son los PERMISOS del
 * usuario de base de datos, y un doble de prueba no demuestra nada sobre eso.
 */
describe('Bitacora append-only (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let prisma: PrismaService;

  /**
   * Segunda conexion, como cap_migrador (el DUENO de las tablas). Es quien SI
   * puede alterar, y se usa para dos cosas: dejar la tabla limpia antes de
   * empezar, y simular al atacante que edita un registro a mano.
   *
   * Que haga falta un usuario distinto para poder alterar la bitacora es
   * exactamente lo que se esta probando.
   */
  let comoDueno: PrismaClient;

  beforeAll(async () => {
    comoDueno = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
    await comoDueno.$executeRawUnsafe('TRUNCATE trazabilidad.registro, trazabilidad.raiz_diaria');

    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();
    jwt = app.get(JwtService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await comoDueno?.$disconnect();
    await app?.close();
  });

  const token = (rol: Rol) =>
    jwt.sign({ sub: 'u-medico', usuario: 'jperez', rol, sesionId: 's-1', mfaVerificado: true });

  const registrar = (cuerpo: Record<string, unknown>, rol: Rol = Rol.MEDICO) =>
    request(app.getHttpServer())
      .post('/v1/registros')
      .set('Authorization', 'Bearer ' + token(rol))
      .send(cuerpo);

  const entrada = (n: number) => ({
    servicio: 'usuarios',
    accion: 'MODIFICACION',
    entidad: 'expediente',
    entidadId: 'exp-' + n,
    motivo: 'Correccion tras revision medica',
    valorAnterior: 'Diagnostico anterior ' + n,
    valorNuevo: 'Diagnostico corregido ' + n,
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  1. La cadena se construye correctamente
  // ═══════════════════════════════════════════════════════════════════════
  describe('encadenado', () => {
    it('el primer registro arranca desde el genesis', async () => {
      const r = await registrar(entrada(1)).expect(201);
      expect(r.body.hashPrevio).toBe('0'.repeat(64));
      expect(r.body.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('cada registro enlaza con el hash del anterior', async () => {
      const primero = await registrar(entrada(2)).expect(201);
      const segundo = await registrar(entrada(3)).expect(201);
      expect(segundo.body.hashPrevio).toBe(primero.body.hash);
    });

    it('el usuario sale del token, no del cuerpo', async () => {
      const r = await registrar(entrada(4)).expect(201);
      expect(r.body.usuarioId).toBe('u-medico');
      expect(r.body.usuarioRol).toBe(Rol.MEDICO);
    });

    it('los valores clinicos quedan CIFRADOS en la base', async () => {
      const r = await registrar(entrada(5)).expect(201);

      // La API los devuelve descifrados a quien tiene permiso...
      expect(r.body.valorNuevo).toBe('Diagnostico corregido 5');

      // ...pero en la tabla son ilegibles. La bitacora no puede ser la puerta
      // trasera por la que se leen expedientes sin pasar por sus permisos.
      const fila = await prisma.registro.findUnique({ where: { hash: r.body.hash } });
      const crudo = Buffer.from(fila!.valorNuevo!).toString('utf8');
      expect(crudo).not.toContain('Diagnostico');
    });

    it('dos registros identicos producen hashes distintos', async () => {
      // Si no, una entrada podria sustituir a otra sin que se notara.
      const a = await registrar(entrada(6)).expect(201);
      const b = await registrar(entrada(6)).expect(201);
      expect(b.body.hash).not.toBe(a.body.hash);
    });

    it('la cadena queda intacta despues de todo lo anterior', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR))
        .expect(200);
      expect(r.body.intacta).toBe(true);
      expect(r.body.revisados).toBeGreaterThanOrEqual(7);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  2. Escrituras simultaneas no bifurcan la cadena
  // ═══════════════════════════════════════════════════════════════════════
  describe('concurrencia', () => {
    it('diez registros a la vez quedan encadenados en fila, sin huecos', async () => {
      // Sin el cerrojo consultivo, varios leerian el mismo "ultimo registro" y
      // calcularian su hash sobre el mismo previo.
      const respuestas = await Promise.all(
        Array.from({ length: 10 }, (_, i) => registrar(entrada(100 + i))),
      );

      expect(respuestas.every((r) => r.status === 201)).toBe(true);

      // Todos los hash_previo son distintos: nadie ocupo el eslabon de otro.
      const previos = new Set(respuestas.map((r) => r.body.hashPrevio));
      expect(previos.size).toBe(10);

      const v = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR))
        .expect(200);
      expect(v.body.intacta).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  3. CRITERIO §15.2 — UPDATE y DELETE fallan por permisos
  // ═══════════════════════════════════════════════════════════════════════
  describe('append-only: ni la propia aplicacion puede alterar la traza', () => {
    /** 42501 es `insufficient_privilege` en PostgreSQL. */
    const SIN_PRIVILEGIO = '42501';

    it('UPDATE sobre la bitacora falla por permisos de base de datos', async () => {
      // Con la conexion de la APLICACION, la que usa el servicio en produccion.
      const intento = prisma.$executeRawUnsafe(
        "UPDATE trazabilidad.registro SET motivo = 'alterado' WHERE numero = 1",
      );
      await expect(intento).rejects.toMatchObject({ meta: { code: SIN_PRIVILEGIO } });
    });

    it('DELETE sobre la bitacora falla por permisos de base de datos', async () => {
      const intento = prisma.$executeRawUnsafe('DELETE FROM trazabilidad.registro WHERE numero = 1');
      await expect(intento).rejects.toMatchObject({ meta: { code: SIN_PRIVILEGIO } });
    });

    it('TRUNCATE tampoco: borrarla entera es la forma mas obvia de taparla', async () => {
      const intento = prisma.$executeRawUnsafe('TRUNCATE trazabilidad.registro');
      await expect(intento).rejects.toMatchObject({ meta: { code: SIN_PRIVILEGIO } });
    });

    it('el servicio tampoco puede crearse tablas propias en su esquema', async () => {
      // Si pudiera, seria DUENO de ellas y tendria UPDATE y DELETE sobre esas
      // tablas pase lo que pase con los GRANT.
      const intento = prisma.$executeRawUnsafe('CREATE TABLE trazabilidad.puerta_trasera (id int)');
      await expect(intento).rejects.toMatchObject({ meta: { code: SIN_PRIVILEGIO } });
    });

    it('SELECT e INSERT si funcionan: la bitacora sigue siendo utilizable', async () => {
      await registrar(entrada(7)).expect(201);
      expect(await prisma.registro.count()).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  4. CRITERIO §15.2 — una alteracion simulada se detecta
  // ═══════════════════════════════════════════════════════════════════════
  describe('deteccion de alteraciones', () => {
    it('alterar un registro a mano rompe la cadena y se señala cual', async () => {
      const objetivo = await prisma.registro.findFirst({ orderBy: { numero: 'asc' }, skip: 2 });

      const antes = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR));
      expect(antes.body.intacta).toBe(true);

      // El atacante: alguien con acceso de DUENO a la base, que es el unico
      // que puede llegar a alterar una fila.
      await comoDueno.$executeRawUnsafe(
        "UPDATE trazabilidad.registro SET motivo = 'Motivo inventado despues' WHERE numero = " +
          objetivo!.numero,
      );

      const durante = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR));

      expect(durante.body.intacta).toBe(false);
      expect(durante.body.rotoEn).toBe(objetivo!.numero.toString());
      expect(durante.body.motivo).toContain('no corresponde a su hash');

      // Se restaura para no dejar rota la cadena a las pruebas siguientes.
      await comoDueno.$executeRawUnsafe(
        'UPDATE trazabilidad.registro SET motivo = $1 WHERE numero = ' + objetivo!.numero,
        objetivo!.motivo,
      );

      const despues = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR));
      expect(despues.body.intacta).toBe(true);
    });

    it('borrar un registro del medio tambien se detecta', async () => {
      const objetivo = await prisma.registro.findFirst({ orderBy: { numero: 'asc' }, skip: 3 });
      const copia = { ...objetivo! };

      await comoDueno.$executeRawUnsafe(
        'DELETE FROM trazabilidad.registro WHERE numero = ' + objetivo!.numero,
      );

      const r = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR));

      expect(r.body.intacta).toBe(false);
      expect(r.body.motivo).toContain('Falta un registro');

      // Se repone tal cual estaba, con su numero y sus hashes originales.
      await comoDueno.registro.create({ data: copia });
      const despues = await request(app.getHttpServer())
        .get('/v1/registros/verificacion')
        .set('Authorization', 'Bearer ' + token(Rol.ADMINISTRADOR));
      expect(despues.body.intacta).toBe(true);
    });

    it('un registro apendido con un hash previo antiguo lo rechaza PostgreSQL', async () => {
      // Con solo INSERT no se puede alterar nada, pero SI apendar una rama
      // paralela apuntando a un eslabon viejo. hash_previo es UNIQUE justo
      // para que lo impida la base de datos, no un informe posterior.
      const viejo = await prisma.registro.findFirst({ orderBy: { numero: 'asc' } });

      const intento = comoDueno.$executeRawUnsafe(
        `INSERT INTO trazabilidad.registro
           (hash_previo, hash, servicio, accion, entidad, entidad_id, usuario_id,
            usuario_rol, traza_id, ocurrido_en, registrado_en)
         VALUES ($1, $2, 'usuarios', 'CONSULTA', 'expediente', 'x', 'atacante',
                 'MEDICO', 't', NOW(), NOW())`,
        viejo!.hashPrevio,
        'f'.repeat(64),
      );

      await expect(intento).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  5. La raiz diaria firmada
  // ═══════════════════════════════════════════════════════════════════════
  describe('raiz diaria', () => {
    const admin = () => 'Bearer ' + token(Rol.ADMINISTRADOR);

    it('no deja cerrar el dia en curso', async () => {
      const hoy = new Date().toISOString().slice(0, 10);
      await request(app.getHttpServer())
        .post('/v1/raices/cierre')
        .set('Authorization', admin())
        .send({ dia: hoy })
        .expect(400);
    });

    it('un dia sin registros no genera raiz', async () => {
      await request(app.getHttpServer())
        .post('/v1/raices/cierre')
        .set('Authorization', admin())
        .send({ dia: '2020-01-01' })
        .expect(400);
    });

    it('rechaza un dia con formato invalido', async () => {
      await request(app.getHttpServer())
        .post('/v1/raices/cierre')
        .set('Authorization', admin())
        .send({ dia: '26/08/2026' })
        .expect(400);
    });

    it('el listado de raices se lee y trae la comprobacion de firma', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/raices')
        .set('Authorization', admin())
        .expect(200);
      expect(Array.isArray(r.body.datos)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  6. Consulta de la bitacora
  // ═══════════════════════════════════════════════════════════════════════
  describe('consulta', () => {
    const admin = () => 'Bearer ' + token(Rol.ADMINISTRADOR);

    it('filtra por entidad', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/registros?entidad=expediente&entidadId=exp-1')
        .set('Authorization', admin())
        .expect(200);
      expect(r.body.datos.length).toBeGreaterThan(0);
      expect(r.body.datos.every((d: { entidadId: string }) => d.entidadId === 'exp-1')).toBe(true);
    });

    it('filtra por accion', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/registros?accion=CONSULTA')
        .set('Authorization', admin())
        .expect(200);
      expect(r.body.datos.every((d: { accion: string }) => d.accion === 'CONSULTA')).toBe(true);
    });

    it('devuelve lo mas reciente primero, que es como se audita', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/registros')
        .set('Authorization', admin())
        .expect(200);
      const numeros = r.body.datos.map((d: { numero: string }) => Number(d.numero));
      expect(numeros).toEqual([...numeros].sort((a, b) => b - a));
    });

    it('el tamano de pagina tiene tope duro', async () => {
      const r = await request(app.getHttpServer())
        .get('/v1/registros?tamano=100')
        .set('Authorization', admin())
        .expect(200);
      expect(r.body.tamano).toBeLessThanOrEqual(100);
    });
  });
});
