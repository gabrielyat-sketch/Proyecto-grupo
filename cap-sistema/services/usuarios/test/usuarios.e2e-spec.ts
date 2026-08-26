import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol, ServicioCifrado } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Prueba de extremo a extremo contra PostgreSQL real.
 * Requiere `npm run infra:up` desde cap-sistema.
 */
describe('Servicio usuarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let cifrado: ServicioCifrado;
  let comunidadId: string;

  const http = () => app.getHttpServer() as never;
  const token = (rol: Rol) =>
    jwt.sign({ sub: 'u-prueba', usuario: 'prueba', rol, sesionId: 's', mfaVerificado: true });

  /** DPIs de prueba, fuera del rango que usa la carga sintetica. */
  let siguienteDpi = 9000000000000;
  const nuevoDpi = () => String(++siguienteDpi);

  const creados: string[] = [];
  const gruposCreados: string[] = [];

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
    cifrado = new ServicioCifrado(process.env.LLAVE_DATOS!, process.env.LLAVE_INDICE!);

    const comunidad = await prisma.comunidad.upsert({
      where: { nombre: 'Comunidad de Prueba E2E' },
      update: {},
      create: { nombre: 'Comunidad de Prueba E2E' },
    });
    comunidadId = comunidad.id;
  });

  afterAll(async () => {
    if (prisma) {
      for (const id of creados) {
        await prisma.atencion.deleteMany({ where: { expediente: { pacienteId: id } } });
        await prisma.registroDigitalizacion.deleteMany({ where: { expediente: { pacienteId: id } } });
        await prisma.expediente.deleteMany({ where: { pacienteId: id } });
        await prisma.paciente.deleteMany({ where: { id } });
      }
      await prisma.grupoFamiliar.deleteMany({ where: { id: { in: gruposCreados } } });
      await prisma.outbox.deleteMany({});
      await prisma.comunidad.deleteMany({ where: { nombre: 'Comunidad de Prueba E2E' } });
    }
    await app?.close();
  });

  async function crearPaciente(extra: Record<string, unknown> = {}) {
    const r = await request(http())
      .post('/v1/pacientes')
      .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
      .send({
        dpi: nuevoDpi(),
        nombres: 'Juana Isabel',
        apellidos: 'Zzprueba Caal',
        fechaNacimiento: '1985-04-12',
        sexo: 'F',
        comunidadId,
        ...extra,
      })
      .expect(201);
    creados.push(r.body.id);
    return r.body as { id: string; expedienteId: string; numeroExpediente: string };
  }

  describe('alta de paciente', () => {
    it('crea paciente, expediente y registro de digitalizacion en una sola operacion', async () => {
      const p = await crearPaciente();
      expect(p.id).toBeDefined();
      expect(p.expedienteId).toBeDefined();
      expect(p.numeroExpediente).toMatch(/^EXP-\d{4}-\d{6}$/);

      const dig = await prisma.registroDigitalizacion.findUnique({
        where: { expedienteId: p.expedienteId },
      });
      expect(dig).not.toBeNull();
    });

    it('escribe el evento en la bandeja de salida, en la misma transaccion', async () => {
      const antes = await prisma.outbox.count({ where: { tipo: 'paciente.creado' } });
      await crearPaciente();
      const despues = await prisma.outbox.count({ where: { tipo: 'paciente.creado' } });
      expect(despues).toBe(antes + 1);
    });

    it('el evento NO contiene datos identificables del paciente', async () => {
      await crearPaciente({ nombres: 'NombreMuySecreto' });
      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'paciente.creado' },
        orderBy: { ocurridoEn: 'desc' },
      });
      const cuerpo = JSON.stringify(evento!.datos);
      expect(cuerpo).not.toContain('NombreMuySecreto');
      expect(cuerpo).not.toContain('9000');
    });

    it('acepta un paciente SIN DPI, como los ninos del programa de desnutricion', async () => {
      const r = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          nombres: 'Bebe',
          apellidos: 'Zzprueba SinDpi',
          fechaNacimiento: new Date().toISOString().slice(0, 10),
          sexo: 'M',
          comunidadId,
        })
        .expect(201);
      creados.push(r.body.id);
      expect(r.body.numeroExpediente).toBeDefined();
    });

    it('permite VARIOS pacientes sin DPI (el unique no debe estorbar)', async () => {
      for (let i = 0; i < 3; i++) {
        const r = await request(http())
          .post('/v1/pacientes')
          .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
          .send({
            nombres: 'Nino ' + i,
            apellidos: 'Zzprueba VariosSinDpi',
            fechaNacimiento: '2024-01-15',
            sexo: 'F',
            comunidadId,
          })
          .expect(201);
        creados.push(r.body.id);
      }
    });

    it('rechaza un DPI que ya existe y devuelve el paciente encontrado', async () => {
      const dpi = nuevoDpi();
      const primero = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi,
          nombres: 'Original',
          apellidos: 'Zzprueba Duplicado',
          fechaNacimiento: '1990-01-01',
          sexo: 'M',
          comunidadId,
        })
        .expect(201);
      creados.push(primero.body.id);

      const r = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi,
          nombres: 'Repetido',
          apellidos: 'Zzprueba Duplicado',
          fechaNacimiento: '1990-01-01',
          sexo: 'M',
          comunidadId,
        })
        .expect(409);
      expect(r.body.mensaje).toMatch(/ya existe/i);
    });

    it('rechaza un DPI que no tiene 13 digitos', async () => {
      await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi: '123',
          nombres: 'X',
          apellidos: 'Y',
          fechaNacimiento: '1990-01-01',
          sexo: 'M',
          comunidadId,
        })
        .expect(400);
    });

    it('rechaza una fecha de nacimiento en el futuro', async () => {
      const futuro = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          nombres: 'X',
          apellidos: 'Y',
          fechaNacimiento: futuro,
          sexo: 'M',
          comunidadId,
        })
        .expect(400);
    });

    it('rechaza una comunidad inexistente', async () => {
      await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          nombres: 'X',
          apellidos: 'Y',
          fechaNacimiento: '1990-01-01',
          sexo: 'M',
          comunidadId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(400);
    });
  });

  describe('el cifrado es real, no decorativo', () => {
    it('el DPI no es legible con un SELECT directo a la base', async () => {
      const dpi = nuevoDpi();
      const r = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi,
          nombres: 'Cifrado',
          apellidos: 'Zzprueba Cifrado',
          fechaNacimiento: '1990-01-01',
          sexo: 'M',
          comunidadId,
        })
        .expect(201);
      creados.push(r.body.id);

      const fila = await prisma.paciente.findUnique({ where: { id: r.body.id } });
      const bruto = Buffer.from(fila!.dpiCifrado!).toString('utf8');
      expect(bruto).not.toContain(dpi);
    });

    it('el mismo DPI cifrado dos veces da resultados distintos, pero el mismo indice', async () => {
      const dpi = '9999999999999';
      const a = cifrado.cifrar(dpi);
      const b = cifrado.cifrar(dpi);
      expect(a.equals(b)).toBe(false);
      expect(cifrado.indiceCiego(dpi).equals(cifrado.indiceCiego(dpi))).toBe(true);
    });

    it('por eso la unicidad vive en el indice ciego: un unique sobre el cifrado no serviria', async () => {
      // Se demuestra al reves: dos cifrados del mismo DPI son bytes distintos,
      // asi que una restriccion unique sobre esa columna los aceptaria a ambos
      // y el paciente quedaria duplicado.
      const dpi = '8888888888888';
      const distintos = new Set([
        cifrado.cifrar(dpi).toString('hex'),
        cifrado.cifrar(dpi).toString('hex'),
        cifrado.cifrar(dpi).toString('hex'),
      ]);
      expect(distintos.size).toBe(3);

      const indices = new Set([
        cifrado.indiceCiego(dpi).toString('hex'),
        cifrado.indiceCiego(dpi).toString('hex'),
      ]);
      expect(indices.size).toBe(1);
    });
  });

  /**
   * Casos que fallaban en la version anterior de la busqueda, encontrados
   * probando el panel con datos reales.
   *
   * La consulta comparaba `apellidos` y `nombres` por separado con LIKE
   * 'texto%'. Solo encontraba lo que empezara igual que uno de los dos campos
   * completos, asi que el segundo apellido, el nombre completo de corrido y
   * cualquier tilde quedaban fuera.
   */
  describe('busqueda por nombre: tildes, orden y nombre completo', () => {
    const APELLIDOS = 'Zzbusqueda Xona';
    const NOMBRES = 'Ramiro Gabriel';
    let idBuscado: string;

    /** Cuantos de los resultados son el paciente de esta prueba. */
    async function buscar(criterio: string) {
      const r = await request(http())
        .get('/v1/pacientes?nombre=' + encodeURIComponent(criterio))
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      return (r.body.datos as { id: string }[]).filter((d) => d.id === idBuscado).length;
    }

    beforeAll(async () => {
      const r = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi: nuevoDpi(),
          // Con tilde a proposito: es el caso que fallaba.
          nombres: NOMBRES,
          apellidos: 'Zzbusqueda Xoná',
          fechaNacimiento: '1990-05-20',
          sexo: 'M',
          comunidadId,
        })
        .expect(201);
      creados.push(r.body.id);
      idBuscado = r.body.id;
    });

    it('encuentra escribiendo el apellido SIN la tilde', async () => {
      expect(await buscar('Zzbusqueda Xona')).toBe(1);
    });

    it('encuentra escribiendo el apellido CON la tilde', async () => {
      expect(await buscar('Zzbusqueda Xoná')).toBe(1);
    });

    it('encuentra por el SEGUNDO apellido', async () => {
      // 'Xona' es el segundo apellido: con LIKE sobre el campo completo no
      // empezaba nada y devolvia cero.
      expect(await buscar('Xona')).toBe(1);
    });

    it('encuentra escribiendo el nombre completo de corrido', async () => {
      expect(await buscar(APELLIDOS + ' ' + NOMBRES)).toBe(1);
    });

    it('la coma que separa apellidos de nombres no estorba', async () => {
      expect(await buscar(APELLIDOS + ', ' + NOMBRES)).toBe(1);
    });

    it('encuentra en cualquier orden: nombre primero, apellido despues', async () => {
      expect(await buscar('Ramiro Zzbusqueda')).toBe(1);
    });

    it('no distingue mayusculas de minusculas', async () => {
      expect(await buscar('zzBUSQUEDA rAmIrO')).toBe(1);
    });

    it('todas las palabras deben coincidir, no solo una', async () => {
      // Con una sola palabra correcta y otra que no existe, no debe aparecer:
      // si bastara una, buscar dos apellidos devolveria mas gente que buscar
      // uno, que es lo contrario de lo que espera quien busca.
      expect(await buscar('Zzbusqueda Inexistentexyz')).toBe(0);
    });

    it('busca por INICIO de palabra, no por texto contenido', async () => {
      // 'amiro' esta dentro de 'Ramiro' pero no empieza ninguna palabra.
      // Sin esta regla, buscar 'ana' traeria a todas las 'Juana'.
      expect(await buscar('amiro')).toBe(0);
    });

    it('corregir el apellido actualiza la busqueda', async () => {
      const r = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          nombres: 'Correccion',
          apellidos: 'Zzantiguo Apellido',
          fechaNacimiento: '1990-05-20',
          sexo: 'F',
          comunidadId,
        })
        .expect(201);
      creados.push(r.body.id);

      await request(http())
        .patch('/v1/pacientes/' + r.body.id)
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({ apellidos: 'Zznuevo Apellido' })
        .expect(200);

      const viejo = await request(http())
        .get('/v1/pacientes?nombre=Zzantiguo')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect((viejo.body.datos as { id: string }[]).some((d) => d.id === r.body.id)).toBe(false);

      const nuevoResultado = await request(http())
        .get('/v1/pacientes?nombre=Zznuevo Correccion')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect((nuevoResultado.body.datos as { id: string }[]).some((d) => d.id === r.body.id)).toBe(
        true,
      );
    });
  });

  describe('busqueda', () => {
    it('encuentra por DPI exacto', async () => {
      const dpi = nuevoDpi();
      const p = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi,
          nombres: 'Buscable',
          apellidos: 'Zzprueba Busqueda',
          fechaNacimiento: '1990-01-01',
          sexo: 'F',
          comunidadId,
        })
        .expect(201);
      creados.push(p.body.id);

      const r = await request(http())
        .get('/v1/pacientes?dpi=' + dpi)
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(r.body.total).toBe(1);
      expect(r.body.datos[0].id).toBe(p.body.id);
    });

    it('encuentra el mismo DPI escrito con espacios o guiones', async () => {
      const dpi = nuevoDpi();
      const p = await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({
          dpi,
          nombres: 'Formato',
          apellidos: 'Zzprueba Formato',
          fechaNacimiento: '1990-01-01',
          sexo: 'F',
          comunidadId,
        })
        .expect(201);
      creados.push(p.body.id);

      const conEspacio = dpi.slice(0, 4) + ' ' + dpi.slice(4, 9) + ' ' + dpi.slice(9);
      const conGuion = dpi.slice(0, 4) + '-' + dpi.slice(4);

      for (const variante of [conEspacio, conGuion]) {
        const r = await request(http())
          .get('/v1/pacientes?dpi=' + encodeURIComponent(variante))
          .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
          .expect(200);
        expect(r.body.total).toBe(1);
      }
    });

    it('exige al menos un criterio: no devuelve la base entera', async () => {
      const r = await request(http())
        .get('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(400);
      expect(r.body.mensaje).toMatch(/al menos un criterio/i);
    });

    it('exige al menos 2 letras para buscar por nombre', async () => {
      await request(http())
        .get('/v1/pacientes?nombre=a')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(400);
    });

    it('nunca devuelve mas de 100 registros por pagina', async () => {
      const r = await request(http())
        .get('/v1/pacientes?nombre=Zz&tamano=5000')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(400);
      expect(r.body.codigo).toBe('VALIDACION');
    });

    it('el listado no expone el DPI cifrado ni el indice', async () => {
      const r = await request(http())
        .get('/v1/pacientes?nombre=Zzprueba')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      const cuerpo = JSON.stringify(r.body);
      expect(cuerpo).not.toContain('dpiCifrado');
      expect(cuerpo).not.toContain('dpiIndice');
    });
  });

  describe('acceso por rol', () => {
    it('Recepcion PUEDE encontrar al paciente', async () => {
      await request(http())
        .get('/v1/pacientes?nombre=Zzprueba')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
    });

    it('Recepcion NO puede leer el historial clinico', async () => {
      const p = await crearPaciente();
      await request(http())
        .get('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(403);
    });

    it('Farmacia tampoco puede leer el historial clinico', async () => {
      const p = await crearPaciente();
      await request(http())
        .get('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.FARMACIA))
        .expect(403);
    });

    it('el Medico si puede', async () => {
      const p = await crearPaciente();
      await request(http())
        .get('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .expect(200);
    });

    it('Enfermeria no puede dar de alta pacientes', async () => {
      await request(http())
        .post('/v1/pacientes')
        .set('Authorization', 'Bearer ' + token(Rol.ENFERMERIA))
        .send({
          nombres: 'X',
          apellidos: 'Y',
          fechaNacimiento: '1990-01-01',
          sexo: 'M',
          comunidadId,
        })
        .expect(403);
    });

    it('sin token no se alcanza nada', async () => {
      await request(http()).get('/v1/pacientes?nombre=Zz').expect(401);
    });
  });

  describe('atenciones', () => {
    it('registra una atencion y devuelve los datos clinicos descifrados', async () => {
      const p = await crearPaciente();
      const r = await request(http())
        .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({
          motivo: 'Control de presion arterial',
          diagnostico: 'Hipertension arterial estadio 1',
          tratamiento: 'Enalapril 10mg cada 12 horas',
          presionSistolica: 148,
          presionDiastolica: 94,
          pesoKg: 72.5,
        })
        .expect(201);

      expect(r.body.diagnostico).toBe('Hipertension arterial estadio 1');
      expect(r.body.presionSistolica).toBe(148);
    });

    it('el diagnostico NO es legible con un SELECT directo', async () => {
      const p = await crearPaciente();
      await request(http())
        .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ motivo: 'Consulta', diagnostico: 'DiagnosticoConfidencial123' })
        .expect(201);

      const fila = await prisma.atencion.findFirst({
        where: { expedienteId: p.expedienteId },
        orderBy: { fecha: 'desc' },
      });
      const bruto = Buffer.from(fila!.diagnosticoCifrado!).toString('utf8');
      expect(bruto).not.toContain('DiagnosticoConfidencial123');
    });

    it('los signos vitales SI quedan legibles: alimentan indicadores', async () => {
      const p = await crearPaciente();
      await request(http())
        .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ motivo: 'Control', presionSistolica: 150 })
        .expect(201);

      const fila = await prisma.atencion.findFirst({ where: { expedienteId: p.expedienteId } });
      expect(fila!.presionSistolica).toBe(150);
    });

    it('rechaza un peso absurdo que distorsionaria los indicadores', async () => {
      const p = await crearPaciente();
      await request(http())
        .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ motivo: 'Control', pesoKg: 700 })
        .expect(400);
    });

    it('rechaza una atencion anterior al nacimiento del paciente', async () => {
      const p = await crearPaciente();
      await request(http())
        .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ motivo: 'Control', fecha: '1900-01-01' })
        .expect(400);
    });

    it('el historial viene paginado y ordenado por fecha descendente', async () => {
      const p = await crearPaciente();
      for (const dias of [30, 20, 10]) {
        await request(http())
          .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
          .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
          .send({
            motivo: 'Control hace ' + dias + ' dias',
            fecha: new Date(Date.now() - dias * 86400000).toISOString(),
          })
          .expect(201);
      }

      const r = await request(http())
        .get('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .expect(200);

      expect(r.body.total).toBe(3);
      expect(r.body.datos[0].motivo).toContain('10 dias');
      expect(r.body.tamano).toBeLessThanOrEqual(100);
    });

    it('registra el evento de atencion sin el diagnostico', async () => {
      const p = await crearPaciente();
      await request(http())
        .post('/v1/expedientes/' + p.expedienteId + '/atenciones')
        .set('Authorization', 'Bearer ' + token(Rol.MEDICO))
        .send({ motivo: 'Control', diagnostico: 'SecretoClinicoXYZ', presionSistolica: 130 })
        .expect(201);

      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'atencion.registrada' },
        orderBy: { ocurridoEn: 'desc' },
      });
      const cuerpo = JSON.stringify(evento!.datos);
      expect(cuerpo).not.toContain('SecretoClinicoXYZ');
      expect(cuerpo).toContain('130');
    });
  });

  describe('expedientes y digitalizacion', () => {
    it('busca un expediente por su numero', async () => {
      const p = await crearPaciente();
      const r = await request(http())
        .get('/v1/expedientes/buscar?numero=' + p.numeroExpediente)
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(r.body.numero).toBe(p.numeroExpediente);
      expect(r.body.paciente.id).toBe(p.id);
    });

    it('devuelve 404 con un numero que no existe', async () => {
      await request(http())
        .get('/v1/expedientes/buscar?numero=EXP-9999-999999')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(404);
    });

    it('el resumen de digitalizacion agrega en la base, no en memoria', async () => {
      const r = await request(http())
        .get('/v1/digitalizacion/resumen')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(r.body.total).toBeGreaterThan(0);
      expect(r.body.porEstado).toHaveProperty('PENDIENTE');
      expect(typeof r.body.porcentajeCompleto).toBe('number');
    });
  });

  describe('grupos familiares', () => {
    let grupoId: string;

    it('crea un grupo con codigo generado por el sistema', async () => {
      const r = await request(http())
        .post('/v1/grupos-familiares')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({ comunidadId, direccion: 'Caserio de prueba, casa 1' })
        .expect(201);
      expect(r.body.codigo).toMatch(/^GF-\d{4}-\d{6}$/);
      grupoId = r.body.id;
      gruposCreados.push(grupoId);
    });

    it('acepta un codigo propio del registro del CAP', async () => {
      const r = await request(http())
        .post('/v1/grupos-familiares')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({ codigo: 'E2E-FAM-001', comunidadId })
        .expect(201);
      gruposCreados.push(r.body.id);
      expect(r.body.codigo).toBe('E2E-FAM-001');
    });

    it('rechaza un codigo duplicado con mensaje claro', async () => {
      const r = await request(http())
        .post('/v1/grupos-familiares')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({ codigo: 'E2E-FAM-001', comunidadId })
        .expect(409);
      expect(r.body.mensaje).toMatch(/ya existe/i);
    });

    it('rechaza una comunidad inexistente', async () => {
      await request(http())
        .post('/v1/grupos-familiares')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .send({ comunidadId: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
    });

    it('cuenta los integrantes en la base, sin traer los pacientes', async () => {
      const p = await crearPaciente({ grupoFamiliarId: grupoId });
      void p;
      const r = await request(http())
        .get('/v1/grupos-familiares?codigo=GF-')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      const grupo = r.body.datos.find((g: { id: string }) => g.id === grupoId);
      expect(grupo.integrantes).toBeGreaterThanOrEqual(1);
    });

    it('devuelve los integrantes con su edad calculada', async () => {
      const r = await request(http())
        .get('/v1/grupos-familiares/' + grupoId)
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(Array.isArray(r.body.integrantes)).toBe(true);
      expect(r.body.integrantes[0]).toHaveProperty('edad');
    });

    it('el listado esta paginado', async () => {
      const r = await request(http())
        .get('/v1/grupos-familiares?tamano=1')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(r.body.tamano).toBe(1);
      expect(r.body).toHaveProperty('totalPaginas');
    });

    it('Farmacia no tiene acceso a los grupos familiares', async () => {
      await request(http())
        .get('/v1/grupos-familiares')
        .set('Authorization', 'Bearer ' + token(Rol.FARMACIA))
        .expect(403);
    });

    it('devuelve 404 con un grupo inexistente', async () => {
      await request(http())
        .get('/v1/grupos-familiares/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(404);
    });
  });

  describe('rendimiento con el volumen de diseno', () => {
    it('la busqueda por DPI responde en menos de 2 segundos', async () => {
      const inicio = Date.now();
      await request(http())
        .get('/v1/pacientes?dpi=1000000050000')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(Date.now() - inicio).toBeLessThan(2000);
    });

    it('la busqueda por apellido responde en menos de 2 segundos', async () => {
      const inicio = Date.now();
      await request(http())
        .get('/v1/pacientes?nombre=Caal')
        .set('Authorization', 'Bearer ' + token(Rol.RECEPCION))
        .expect(200);
      expect(Date.now() - inicio).toBeLessThan(2000);
    });
  });
});
