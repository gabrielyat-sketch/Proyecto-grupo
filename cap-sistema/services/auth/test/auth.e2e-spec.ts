import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { generateSync } from 'otplib';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { MfaService } from '../src/mfa/mfa.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Prueba de extremo a extremo contra PostgreSQL real.
 * Requiere `npm run infra:up` desde cap-sistema.
 */
describe('Servicio auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => never;

  // Cuentas creadas durante la prueba, para limpiarlas al final.
  const creados: string[] = [];

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
    http = () => app.getHttpServer() as never;

    await prisma.intentoFallido.deleteMany({});
    await prisma.usuario.deleteMany({ where: { usuario: { startsWith: 'e2e_' } } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.usuario.deleteMany({ where: { usuario: { startsWith: 'e2e_' } } });
      await prisma.intentoFallido.deleteMany({});
    }
    await app?.close();
  });

  /** Crea una cuenta directamente en la base y devuelve su contrasena. */
  async function crearCuenta(nombre: string, rol: Rol) {
    const { hashContrasena } = await import('@cap/shared');
    const contrasena = 'Clave-Inicial-2026';
    const usuario = await prisma.usuario.create({
      data: {
        usuario: nombre,
        nombres: 'Prueba',
        apellidos: 'Automatizada',
        rol: rol as never,
        contrasenaHash: await hashContrasena(contrasena),
        debeCambiarContrasena: false,
      },
    });
    creados.push(usuario.id);
    return { usuario, contrasena };
  }

  describe('salud', () => {
    it('GET /v1/salud/listo confirma la conexion', async () => {
      const r = await request(http()).get('/v1/salud/listo').expect(200);
      expect(r.body.baseDatos).toBe('ok');
    });
  });

  describe('login', () => {
    it('un rol sin MFA obligatorio recibe los tokens de una vez', async () => {
      const { contrasena } = await crearCuenta('e2e_recepcion', Rol.RECEPCION);
      const r = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_recepcion', contrasena })
        .expect(200);

      expect(r.body.mfaRequerido).toBe(false);
      expect(r.body.tokenAcceso).toBeDefined();
      expect(r.body.tokenRefresco).toBeDefined();
      expect(r.body.usuario.rol).toBe(Rol.RECEPCION);
    });

    it('nunca devuelve el hash de la contrasena', async () => {
      const { contrasena } = await crearCuenta('e2e_sinhash', Rol.MEDICO);
      const r = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_sinhash', contrasena })
        .expect(200);
      expect(JSON.stringify(r.body)).not.toContain('argon2');
      expect(r.body.usuario.contrasenaHash).toBeUndefined();
    });

    it('acepta el usuario sin importar mayusculas', async () => {
      const { contrasena } = await crearCuenta('e2e_mayus', Rol.FARMACIA);
      await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'E2E_MAYUS', contrasena })
        .expect(200);
    });

    it('da el mismo mensaje si la cuenta no existe que si la contrasena es incorrecta', async () => {
      const { } = await crearCuenta('e2e_mensaje', Rol.MEDICO);

      const inexistente = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_no_existe_nunca', contrasena: 'loquesea123' })
        .expect(401);

      const incorrecta = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_mensaje', contrasena: 'contrasena-equivocada' })
        .expect(401);

      expect(inexistente.body.mensaje).toBe(incorrecta.body.mensaje);
    });

    it('rechaza una cuenta desactivada', async () => {
      const { usuario, contrasena } = await crearCuenta('e2e_inactivo', Rol.ENFERMERIA);
      await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
      await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_inactivo', contrasena })
        .expect(403);
    });

    it('bloquea la cuenta tras 5 intentos fallidos y responde 423', async () => {
      const { contrasena } = await crearCuenta('e2e_bloqueo', Rol.MEDICO);

      for (let i = 0; i < 5; i++) {
        await request(http())
          .post('/v1/auth/login')
          .send({ usuario: 'e2e_bloqueo', contrasena: 'equivocada-' + i })
          .expect(401);
      }

      // Ahora ni siquiera la contrasena correcta pasa.
      const r = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_bloqueo', contrasena })
        .expect(423);
      expect(r.body.mensaje).toMatch(/bloqueada temporalmente/i);
    });
  });

  describe('MFA obligatorio para roles administrativos', () => {
    it('un Director no recibe tokens: recibe un token parcial', async () => {
      const { contrasena } = await crearCuenta('e2e_director', Rol.DIRECTOR);
      const r = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_director', contrasena })
        .expect(200);

      expect(r.body.mfaRequerido).toBe(true);
      expect(r.body.configuracionPendiente).toBe(true);
      expect(r.body.tokenParcial).toBeDefined();
      expect(r.body.tokenAcceso).toBeUndefined();
    });

    it('el token parcial NO sirve como token de acceso', async () => {
      const { contrasena } = await crearCuenta('e2e_parcial', Rol.ADMINISTRADOR);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_parcial', contrasena })
        .expect(200);

      // Firmado con otro secreto: ningun servicio del sistema lo acepta.
      await request(http())
        .get('/v1/auth/yo')
        .set('Authorization', 'Bearer ' + login.body.tokenParcial)
        .expect(401);
    });

    it('flujo completo: configura MFA, activa y entra con codigo TOTP', async () => {
      const { contrasena } = await crearCuenta('e2e_totp', Rol.ADMINISTRADOR);

      // 1. login -> token parcial
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_totp', contrasena })
        .expect(200);

      // 2. con un codigo de respaldo se completa el login la primera vez
      //    (aun no hay MFA configurado, asi que se configura autenticado)
      //    Para la prueba se configura directamente sobre el servicio.
      const mfa = app.get<{ iniciarConfiguracion: Function; activar: Function }>(
        (await import('../src/mfa/mfa.service')).MfaService,
      );
      const usuarioBd = await prisma.usuario.findUnique({ where: { usuario: 'e2e_totp' } });
      const config = await mfa.iniciarConfiguracion(usuarioBd!.id, 'e2e_totp');

      expect(config.uri).toContain('otpauth://totp/');
      expect(config.codigosRespaldo).toHaveLength(8);

      // 3. activar con un codigo real
      const codigo = generateSync({ strategy: 'totp', secret: config.secreto });
      await mfa.activar(usuarioBd!.id, codigo);

      // 4. verificar el segundo factor y recibir los tokens
      const verificado = await request(http())
        .post('/v1/auth/mfa/verificar')
        .send({ tokenParcial: login.body.tokenParcial, codigo })
        .expect(200);

      expect(verificado.body.tokenAcceso).toBeDefined();

      // 5. ese token si abre un endpoint autenticado
      const yo = await request(http())
        .get('/v1/auth/yo')
        .set('Authorization', 'Bearer ' + verificado.body.tokenAcceso)
        .expect(200);
      expect(yo.body.usuario).toBe('e2e_totp');
      expect(yo.body.mfaActivo).toBe(true);
    });

    it('el secreto TOTP se guarda cifrado, no en claro', async () => {
      const usuarioBd = await prisma.usuario.findUnique({ where: { usuario: 'e2e_totp' } });
      const config = await prisma.configuracionMfa.findUnique({
        where: { usuarioId: usuarioBd!.id },
      });
      const enBruto = Buffer.from(config!.secretoCifrado).toString('utf8');
      expect(enBruto).not.toMatch(/^[A-Z2-7]{32}$/); // no es base32 legible
    });

    it('rechaza un codigo TOTP incorrecto', async () => {
      const { contrasena } = await crearCuenta('e2e_totpmal', Rol.DIRECTOR);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_totpmal', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/auth/mfa/verificar')
        .send({ tokenParcial: login.body.tokenParcial, codigo: '000000' })
        .expect(401);
    });
  });

  /**
   * Estas pruebas recorren el camino COMPLETO por HTTP, sin llamar a ningun
   * servicio por dentro.
   *
   * Importa la distincion: la prueba de arriba configuraba el MFA invocando
   * MfaService directamente, y por eso paso mucho tiempo sin que nadie notara
   * que ese paso no tenia endpoint. Una cuenta administrativa recien creada
   * quedaba encerrada: el rol le exigia segundo factor y no habia forma de
   * configurarlo. Probar el servicio no es lo mismo que probar que el usuario
   * puede llegar a el.
   */
  describe('primera configuracion del segundo factor (solo por HTTP)', () => {
    it('una cuenta administrativa nueva puede configurar su MFA y entrar', async () => {
      const { contrasena } = await crearCuenta('e2e_primera_vez', Rol.ADMINISTRADOR);

      // 1. Login: la contrasena es correcta, pero falta el segundo factor y
      //    todavia no esta configurado.
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_primera_vez', contrasena })
        .expect(200);

      expect(login.body.mfaRequerido).toBe(true);
      expect(login.body.configuracionPendiente).toBe(true);
      const tokenParcial = login.body.tokenParcial as string;

      // 2. Con el token parcial —y solo con el— se obtiene el QR.
      const config = await request(http())
        .post('/v1/auth/mfa/configurar-inicial')
        .send({ tokenParcial })
        .expect(200);

      expect(config.body.uri).toContain('otpauth://totp/');
      expect(config.body.secreto).toBeDefined();
      expect(config.body.codigosRespaldo).toHaveLength(8);

      // 3. Se confirma con un codigo real y la sesion queda abierta.
      const sesion = await request(http())
        .post('/v1/auth/mfa/activar-inicial')
        .send({
          tokenParcial,
          codigo: generateSync({ strategy: 'totp', secret: config.body.secreto }),
        })
        .expect(200);

      expect(sesion.body.mfaRequerido).toBe(false);
      expect(sesion.body.tokenAcceso).toBeDefined();

      // 4. Ese token abre de verdad un endpoint autenticado, con el MFA activo.
      const yo = await request(http())
        .get('/v1/auth/yo')
        .set('Authorization', 'Bearer ' + sesion.body.tokenAcceso)
        .expect(200);

      expect(yo.body.usuario).toBe('e2e_primera_vez');
      expect(yo.body.mfaActivo).toBe(true);
    });

    it('el siguiente login ya pide el codigo, sin configuracion pendiente', async () => {
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_primera_vez', contrasena: 'Clave-Inicial-2026' })
        .expect(200);

      expect(login.body.mfaRequerido).toBe(true);
      expect(login.body.configuracionPendiente).toBe(false);
    });

    it('con el MFA ya activo, configurar-inicial responde 409', async () => {
      // Si no, cualquiera que supiera la contrasena podria regenerarle el
      // segundo factor a otra persona y quedarse con el.
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_primera_vez', contrasena: 'Clave-Inicial-2026' })
        .expect(200);

      const r = await request(http())
        .post('/v1/auth/mfa/configurar-inicial')
        .send({ tokenParcial: login.body.tokenParcial })
        .expect(409);

      expect(r.body.mensaje).toContain('ya tiene el segundo factor');
    });

    it('un codigo incorrecto NO activa el segundo factor', async () => {
      const { contrasena } = await crearCuenta('e2e_codigo_malo', Rol.DIRECTOR);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_codigo_malo', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/auth/mfa/configurar-inicial')
        .send({ tokenParcial: login.body.tokenParcial })
        .expect(200);

      await request(http())
        .post('/v1/auth/mfa/activar-inicial')
        .send({ tokenParcial: login.body.tokenParcial, codigo: '000000' })
        .expect(400);

      // Sigue pendiente: un intento fallido no puede dejar el MFA a medias.
      const otro = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_codigo_malo', contrasena })
        .expect(200);
      expect(otro.body.configuracionPendiente).toBe(true);
    });

    it('un token parcial inventado no sirve para configurar nada', async () => {
      await request(http())
        .post('/v1/auth/mfa/configurar-inicial')
        .send({ tokenParcial: 'token.completamente.falso' })
        .expect(401);
    });
  });

  describe('refresco y rotacion', () => {
    it('rota el token: el nuevo funciona y el viejo deja de servir', async () => {
      const { contrasena } = await crearCuenta('e2e_rotacion', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_rotacion', contrasena })
        .expect(200);

      const primero = login.body.tokenRefresco;

      const r1 = await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: primero })
        .expect(200);

      expect(r1.body.tokenRefresco).not.toBe(primero);

      // El nuevo sirve
      await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: r1.body.tokenRefresco })
        .expect(200);
    });

    it('reusar un token ya rotado revoca TODA la familia de sesiones', async () => {
      const { contrasena } = await crearCuenta('e2e_reuso', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_reuso', contrasena })
        .expect(200);

      const viejo = login.body.tokenRefresco;
      const r1 = await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: viejo })
        .expect(200);

      // Alguien copio el token viejo y lo usa
      const reuso = await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: viejo })
        .expect(401);
      expect(reuso.body.mensaje).toMatch(/uso indebido/i);

      // El token legitimo tambien queda invalidado: es lo correcto, porque no
      // se sabe cual de los dos es el del atacante.
      await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: r1.body.tokenRefresco })
        .expect(401);
    });

    it('cerrar sesion invalida el token de refresco', async () => {
      const { contrasena } = await crearCuenta('e2e_logout', Rol.FARMACIA);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_logout', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/auth/cerrar-sesion')
        .send({ tokenRefresco: login.body.tokenRefresco })
        .expect(204);

      await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: login.body.tokenRefresco })
        .expect(401);
    });
  });

  describe('gestion de cuentas', () => {
    async function tokenAdministrador(): Promise<string> {
      const { hashContrasena } = await import('@cap/shared');
      const usuario = await prisma.usuario.upsert({
        where: { usuario: 'e2e_admin' },
        update: {},
        create: {
          usuario: 'e2e_admin',
          nombres: 'Admin',
          apellidos: 'Prueba',
          rol: Rol.ADMINISTRADOR as never,
          contrasenaHash: await hashContrasena('Clave-Admin-2026'),
          debeCambiarContrasena: false,
        },
      });
      const jwt = app.get<{ sign: Function }>(
        (await import('@nestjs/jwt')).JwtService,
      );
      return jwt.sign({
        sub: usuario.id,
        usuario: usuario.usuario,
        rol: Rol.ADMINISTRADOR,
        sesionId: 'prueba',
        mfaVerificado: true,
      });
    }

    it('el Administrador crea una cuenta y recibe la contrasena temporal', async () => {
      const token = await tokenAdministrador();
      const r = await request(http())
        .post('/v1/usuarios')
        .set('Authorization', 'Bearer ' + token)
        .send({ usuario: 'e2e_nueva', nombres: 'Maria', apellidos: 'Cac', rol: Rol.ENFERMERIA })
        .expect(201);

      expect(r.body.contrasenaTemporal).toHaveLength(14);
      expect(r.body.debeCambiarContrasena).toBe(true);
      expect(r.body.contrasenaHash).toBeUndefined();
    });

    it('rechaza un usuario duplicado', async () => {
      const token = await tokenAdministrador();
      await request(http())
        .post('/v1/usuarios')
        .set('Authorization', 'Bearer ' + token)
        .send({ usuario: 'e2e_nueva', nombres: 'Otra', apellidos: 'Persona', rol: Rol.MEDICO })
        .expect(409);
    });

    it('rechaza un rol que no existe en el CAP', async () => {
      const token = await tokenAdministrador();
      await request(http())
        .post('/v1/usuarios')
        .set('Authorization', 'Bearer ' + token)
        .send({ usuario: 'e2e_rolmalo', nombres: 'X', apellidos: 'Y', rol: 'SUPERUSUARIO' })
        .expect(400);
    });

    it('un rol que no es Administrador no puede gestionar cuentas', async () => {
      const { contrasena } = await crearCuenta('e2e_nopuede', Rol.RECEPCION);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_nopuede', contrasena })
        .expect(200);

      await request(http())
        .get('/v1/usuarios')
        .set('Authorization', 'Bearer ' + login.body.tokenAcceso)
        .expect(403);
    });

    it('el Administrador no puede desactivar su propia cuenta', async () => {
      const token = await tokenAdministrador();
      const admin = await prisma.usuario.findUnique({ where: { usuario: 'e2e_admin' } });
      const r = await request(http())
        .patch('/v1/usuarios/' + admin!.id)
        .set('Authorization', 'Bearer ' + token)
        .send({ activo: false })
        .expect(400);
      expect(r.body.mensaje).toMatch(/su propia cuenta/i);
    });

    it('desactivar a un usuario cierra sus sesiones abiertas', async () => {
      const { usuario, contrasena } = await crearCuenta('e2e_cierre', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_cierre', contrasena })
        .expect(200);

      const token = await tokenAdministrador();
      await request(http())
        .patch('/v1/usuarios/' + usuario.id)
        .set('Authorization', 'Bearer ' + token)
        .send({ activo: false })
        .expect(200);

      await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: login.body.tokenRefresco })
        .expect(401);
    });

    /**
     * ───────────────────────────────────────────────────────────────────
     *  REINICIO DEL SEGUNDO FACTOR
     *
     *  Sin esto, quien perdiera el telefono con la aplicacion de
     *  autenticacion quedaba fuera del sistema de forma permanente en cuanto
     *  se le acabaran los codigos de respaldo — y afecta justo a los dos roles
     *  que lo tienen obligatorio.
     * ───────────────────────────────────────────────────────────────────
     */
    it('reiniciar el segundo factor lo borra y obliga a configurarlo de nuevo', async () => {
      const token = await tokenAdministrador();
      const { usuario } = await crearCuenta('e2e_mfa_reinicio', Rol.DIRECTOR);

      // Se le configura y activa el segundo factor a mano.
      const mfa = app.get(MfaService);
      await mfa.iniciarConfiguracion(usuario.id, usuario.usuario);
      await prisma.configuracionMfa.update({
        where: { usuarioId: usuario.id },
        data: { activo: true, activadoEn: new Date() },
      });
      expect(await mfa.estaActivo(usuario.id)).toBe(true);

      const r = await request(http())
        .post('/v1/usuarios/' + usuario.id + '/reiniciar-mfa')
        .set('Authorization', 'Bearer ' + token)
        .expect(201);

      expect(r.body.usuario).toBe('e2e_mfa_reinicio');
      // Su rol lo exige, asi que el sistema se lo va a volver a pedir.
      expect(r.body.exigeSegundoFactor).toBe(true);
      expect(await mfa.estaActivo(usuario.id)).toBe(false);
    });

    /**
     * Dejarlos vivos permitiria entrar con los papeles viejos despues de un
     * reinicio pedido justamente porque esos papeles se perdieron.
     */
    it('el reinicio borra tambien los codigos de respaldo', async () => {
      const token = await tokenAdministrador();
      const { usuario } = await crearCuenta('e2e_mfa_codigos', Rol.ADMINISTRADOR);

      const mfa = app.get(MfaService);
      await mfa.iniciarConfiguracion(usuario.id, usuario.usuario);
      expect(await prisma.codigoRespaldo.count({ where: { usuarioId: usuario.id } })).toBeGreaterThan(0);

      await request(http())
        .post('/v1/usuarios/' + usuario.id + '/reiniciar-mfa')
        .set('Authorization', 'Bearer ' + token)
        .expect(201);

      expect(await prisma.codigoRespaldo.count({ where: { usuarioId: usuario.id } })).toBe(0);
    });

    it('el reinicio cierra las sesiones abiertas', async () => {
      const token = await tokenAdministrador();
      const { usuario, contrasena } = await crearCuenta('e2e_mfa_sesion', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_mfa_sesion', contrasena })
        .expect(200);

      const mfa = app.get(MfaService);
      await mfa.iniciarConfiguracion(usuario.id, usuario.usuario);

      await request(http())
        .post('/v1/usuarios/' + usuario.id + '/reiniciar-mfa')
        .set('Authorization', 'Bearer ' + token)
        .expect(201);

      await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: login.body.tokenRefresco })
        .expect(401);
    });

    it('no se reinicia lo que no existe: una cuenta sin segundo factor da 400', async () => {
      const token = await tokenAdministrador();
      const { usuario } = await crearCuenta('e2e_mfa_sinnada', Rol.RECEPCION);

      await request(http())
        .post('/v1/usuarios/' + usuario.id + '/reiniciar-mfa')
        .set('Authorization', 'Bearer ' + token)
        .expect(400);
    });

    it('un rol que no es Administrador no reinicia el segundo factor de nadie', async () => {
      const { usuario } = await crearCuenta('e2e_mfa_victima', Rol.MEDICO);
      const { contrasena } = await crearCuenta('e2e_mfa_intruso', Rol.ENFERMERIA);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_mfa_intruso', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/usuarios/' + usuario.id + '/reiniciar-mfa')
        .set('Authorization', 'Bearer ' + login.body.tokenAcceso)
        .expect(403);
    });

    /**
     * ───────────────────────────────────────────────────────────────────
     *  LO QUE LA LISTA TIENE QUE DEJAR VER
     *
     *  Sin estos campos, el Administrador no podia saber quien estaba
     *  bloqueado ni quien tenia segundo factor: la lista se veia igual en
     *  todos los casos.
     * ───────────────────────────────────────────────────────────────────
     */
    it('la cuenta dice si tiene el segundo factor activo, sin exponer el secreto', async () => {
      const token = await tokenAdministrador();
      const { usuario } = await crearCuenta('e2e_ve_mfa', Rol.MEDICO);

      const antes = await request(http())
        .get('/v1/usuarios/' + usuario.id)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
      expect(antes.body.mfaActivo).toBe(false);

      const mfa = app.get(MfaService);
      await mfa.iniciarConfiguracion(usuario.id, usuario.usuario);
      await prisma.configuracionMfa.update({
        where: { usuarioId: usuario.id },
        data: { activo: true, activadoEn: new Date() },
      });

      const despues = await request(http())
        .get('/v1/usuarios/' + usuario.id)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
      expect(despues.body.mfaActivo).toBe(true);
      expect(despues.body.secretoCifrado).toBeUndefined();
      expect(despues.body.mfa).toBeUndefined();
    });

    /**
     * `bloqueadoHasta` se queda con una fecha pasada cuando el bloqueo expira,
     * asi que compararla con el reloj es lo unico que distingue "bloqueado"
     * de "estuvo bloqueado la semana pasada".
     */
    it('la cuenta dice si esta bloqueada AHORA, no si lo estuvo alguna vez', async () => {
      const token = await tokenAdministrador();
      const { usuario } = await crearCuenta('e2e_bloqueada', Rol.RECEPCION);

      const bloqueada = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { bloqueadoHasta: new Date(Date.now() + 600_000) },
      });
      expect(bloqueada.bloqueadoHasta).not.toBeNull();

      const r = await request(http())
        .get('/v1/usuarios/' + usuario.id)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
      expect(r.body.bloqueada).toBe(true);

      // Un bloqueo ya vencido no cuenta.
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { bloqueadoHasta: new Date(Date.now() - 600_000) },
      });
      const despues = await request(http())
        .get('/v1/usuarios/' + usuario.id)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
      expect(despues.body.bloqueada).toBe(false);
    });

    it('restablecer la contrasena desbloquea la cuenta', async () => {
      const token = await tokenAdministrador();
      const { usuario } = await crearCuenta('e2e_desbloqueo', Rol.RECEPCION);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { bloqueadoHasta: new Date(Date.now() + 600_000) },
      });

      await request(http())
        .post('/v1/usuarios/' + usuario.id + '/restablecer-contrasena')
        .set('Authorization', 'Bearer ' + token)
        .expect(201);

      const r = await request(http())
        .get('/v1/usuarios/' + usuario.id)
        .set('Authorization', 'Bearer ' + token)
        .expect(200);
      expect(r.body.bloqueada).toBe(false);
      expect(r.body.bloqueadoHasta).toBeNull();
    });

    it('el listado esta paginado y no expone hashes', async () => {
      const token = await tokenAdministrador();
      const r = await request(http())
        .get('/v1/usuarios?tamano=5')
        .set('Authorization', 'Bearer ' + token)
        .expect(200);

      expect(r.body.tamano).toBe(5);
      expect(JSON.stringify(r.body)).not.toContain('argon2');
    });
  });

  describe('cambio de contrasena', () => {
    it('cambia la contrasena y cierra las demas sesiones', async () => {
      const { contrasena } = await crearCuenta('e2e_cambio', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_cambio', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/auth/contrasena')
        .set('Authorization', 'Bearer ' + login.body.tokenAcceso)
        .send({ contrasenaActual: contrasena, contrasenaNueva: 'NuevaClave2026x' })
        .expect(204);

      // La sesion anterior queda cerrada
      await request(http())
        .post('/v1/auth/refrescar')
        .send({ tokenRefresco: login.body.tokenRefresco })
        .expect(401);

      // Y la contrasena nueva funciona
      await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_cambio', contrasena: 'NuevaClave2026x' })
        .expect(200);
    });

    it('rechaza una contrasena nueva demasiado corta', async () => {
      const { contrasena } = await crearCuenta('e2e_corta', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_corta', contrasena })
        .expect(200);

      const r = await request(http())
        .post('/v1/auth/contrasena')
        .set('Authorization', 'Bearer ' + login.body.tokenAcceso)
        .send({ contrasenaActual: contrasena, contrasenaNueva: 'corta1' })
        .expect(400);
      expect(r.body.codigo).toBe('VALIDACION');
    });

    it('rechaza una contrasena sin numeros', async () => {
      const { contrasena } = await crearCuenta('e2e_sinnumero', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_sinnumero', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/auth/contrasena')
        .set('Authorization', 'Bearer ' + login.body.tokenAcceso)
        .send({ contrasenaActual: contrasena, contrasenaNueva: 'solamenteletras' })
        .expect(400);
    });

    it('rechaza si la contrasena actual es incorrecta', async () => {
      const { contrasena } = await crearCuenta('e2e_actualmala', Rol.MEDICO);
      const login = await request(http())
        .post('/v1/auth/login')
        .send({ usuario: 'e2e_actualmala', contrasena })
        .expect(200);

      await request(http())
        .post('/v1/auth/contrasena')
        .set('Authorization', 'Bearer ' + login.body.tokenAcceso)
        .send({ contrasenaActual: 'no-es-la-mia', contrasenaNueva: 'OtraClave2026x' })
        .expect(401);
    });
  });
});
