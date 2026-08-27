import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Seccion VII de las fichas: antecedentes del paciente.
 *
 * Corre contra PostgreSQL real, con el catalogo sembrado por
 * `npm run catalogo -w @cap/usuarios`.
 */
describe('Antecedentes del paciente (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const creados: string[] = [];
  let pacienteId: string;

  /** Antecedentes del catalogo que se usan en las pruebas. */
  let diabetes: { id: string };
  let medicamentos: { id: string };
  let vacunaTd: { id: string };
  let sr: { id: string };

  const http = () => app.getHttpServer();

  const como = (rol: Rol) => ({
    Authorization:
      'Bearer ' +
      jwt.sign({
        sub: 'e2e-antecedentes',
        usuario: 'e2e_antecedentes',
        rol,
        sesionId: 's-antecedentes',
        mfaVerificado: true,
      }),
  });

  const ruta = () => '/v1/pacientes/' + pacienteId + '/antecedentes';

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

    const comunidad = await prisma.comunidad.findFirst({ select: { id: true } });
    if (!comunidad) throw new Error('No hay comunidades: corra las migraciones y el seed.');

    const paciente = await request(http())
      .post('/v1/pacientes')
      .set(como(Rol.RECEPCION))
      .send({
        nombres: 'Zzantecedentes',
        apellidos: 'Zzprueba Historia',
        fechaNacimiento: '1985-04-12',
        sexo: 'F',
        comunidadId: comunidad.id,
      })
      .expect(201);
    creados.push(paciente.body.id);
    pacienteId = paciente.body.id;

    const buscar = async (codigo: string) => {
      const fila = await prisma.catalogoAntecedente.findUnique({ where: { codigo } });
      if (!fila) throw new Error('Falta el catalogo: corra npm run catalogo -w @cap/usuarios');
      return fila;
    };
    diabetes = await buscar('MED_DIABETES');
    medicamentos = await buscar('MED_MEDICAMENTOS');
    vacunaTd = await buscar('MED_VACUNA_TD');
    sr = await buscar('MED_SR');
  });

  afterAll(async () => {
    // El expediente NO cae en cascada al borrar el paciente, y es correcto: un
    // expediente clinico no debe desaparecer porque alguien borre una fila de
    // paciente. Hay que quitarlo antes, en orden.
    for (const id of creados) {
      await prisma.atencion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.registroDigitalizacion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.expediente.deleteMany({ where: { pacienteId: id } });
      await prisma.paciente.deleteMany({ where: { id } });
    }
    await app.close();
  });

  it('un paciente nuevo no tiene ningun antecedente respondido', async () => {
    const r = await request(http()).get(ruta()).set(como(Rol.MEDICO)).expect(200);
    expect(r.body.marcados).toEqual([]);
    expect(r.body.obstetricos).toBeNull();
  });

  it('guarda una respuesta y la devuelve con su texto del catalogo', async () => {
    const r = await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ marcados: [{ antecedenteId: diabetes.id, respuesta: 'SI' }] })
      .expect(200);

    const guardado = r.body.marcados.find(
      (m: { codigo: string }) => m.codigo === 'MED_DIABETES',
    );
    expect(guardado.respuesta).toBe('SI');
    expect(guardado.texto).toBe('Diabetes');
    expect(guardado.grupo).toBe('MEDICO');
  });

  it('guardar de nuevo CORRIGE la respuesta, no crea una segunda', async () => {
    // Sin la unicidad por (paciente, antecedente) el paciente quedaria con
    // "diabetes: si" y "diabetes: no" a la vez, y ningun reporte podria decidir.
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ marcados: [{ antecedenteId: diabetes.id, respuesta: 'NO' }] })
      .expect(200);

    const r = await request(http()).get(ruta()).set(como(Rol.MEDICO)).expect(200);
    const dela = r.body.marcados.filter((m: { codigo: string }) => m.codigo === 'MED_DIABETES');
    expect(dela).toHaveLength(1);
    expect(dela[0].respuesta).toBe('NO');
  });

  it('guardar media hoja NO borra lo que ya estaba respondido', async () => {
    // Es la razon de que sea PATCH y no PUT: dos turnos distintos llenan
    // secciones distintas de la misma ficha.
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ marcados: [{ antecedenteId: vacunaTd.id, respuesta: 'SI', numero: 2 }] })
      .expect(200);

    const r = await request(http()).get(ruta()).set(como(Rol.MEDICO)).expect(200);
    const codigos = r.body.marcados.map((m: { codigo: string }) => m.codigo);
    expect(codigos).toContain('MED_DIABETES');
    expect(codigos).toContain('MED_VACUNA_TD');
  });

  it('guarda el "cual" y lo devuelve descifrado', async () => {
    const r = await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({
        marcados: [
          { antecedenteId: medicamentos.id, respuesta: 'SI', detalle: 'Enalapril 10 mg' },
        ],
      })
      .expect(200);

    const guardado = r.body.marcados.find(
      (m: { codigo: string }) => m.codigo === 'MED_MEDICAMENTOS',
    );
    expect(guardado.detalle).toBe('Enalapril 10 mg');
  });

  it('el "cual" NO es legible con un SELECT directo', async () => {
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({
        marcados: [
          { antecedenteId: medicamentos.id, respuesta: 'SI', detalle: 'DetalleConfidencial777' },
        ],
      })
      .expect(200);

    const fila = await prisma.antecedentePaciente.findFirst({
      where: { pacienteId, antecedenteId: medicamentos.id },
    });
    const enBruto = Buffer.from(fila!.detalleCifrado ?? []).toString('utf8');
    expect(enBruto).not.toContain('Confidencial777');
  });

  it('acepta "No aplica" solo donde el papel lo ofrece', async () => {
    // En la ficha de adultos, unicamente en SR. Aceptarlo en todos convertiria
    // un dato ausente en uno afirmado.
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ marcados: [{ antecedenteId: sr.id, respuesta: 'NO_APLICA' }] })
      .expect(200);

    const r = await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ marcados: [{ antecedenteId: diabetes.id, respuesta: 'NO_APLICA' }] })
      .expect(400);

    expect(r.body.mensaje).toContain('No aplica');
  });

  it('rechaza un antecedente que no existe en el catalogo', async () => {
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({
        marcados: [
          { antecedenteId: '00000000-0000-0000-0000-000000000000', respuesta: 'SI' },
        ],
      })
      .expect(400);
  });

  it('guarda los antecedentes gineco-obstetricos', async () => {
    const r = await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({
        obstetricos: {
          gestas: 3,
          partos: 2,
          abortos: 1,
          cesareas: 1,
          hijosVivos: 2,
          tipoSangre: 'O',
          rhPositivo: true,
        },
      })
      .expect(200);

    expect(r.body.obstetricos.gestas).toBe(3);
    expect(r.body.obstetricos.tipoSangre).toBe('O');
    expect(r.body.obstetricos.rhPositivo).toBe(true);
  });

  it('corregir un dato obstetrico no borra los demas', async () => {
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ obstetricos: { partos: 3 } })
      .expect(200);

    const r = await request(http()).get(ruta()).set(como(Rol.MEDICO)).expect(200);
    expect(r.body.obstetricos.partos).toBe(3);
    expect(r.body.obstetricos.gestas).toBe(3);
  });

  it('la respuesta no expone datos de control', async () => {
    const r = await request(http()).get(ruta()).set(como(Rol.MEDICO)).expect(200);
    expect(Object.keys(r.body.obstetricos)).not.toContain('registradoPor');
    expect(Object.keys(r.body.obstetricos)).not.toContain('pacienteId');
  });

  it('rechaza una FUR en el futuro', async () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString();
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ obstetricos: { fur: manana } })
      .expect(400);
  });

  it('rechaza un numero de gestas imposible', async () => {
    await request(http())
      .patch(ruta())
      .set(como(Rol.MEDICO))
      .send({ obstetricos: { gestas: 99 } })
      .expect(400);
  });

  it('Recepcion no puede leer los antecedentes', async () => {
    // Aqui hay VIH, violencia intrafamiliar y conductas suicidas.
    await request(http()).get(ruta()).set(como(Rol.RECEPCION)).expect(403);
  });

  it('Farmacia tampoco puede escribirlos', async () => {
    await request(http())
      .patch(ruta())
      .set(como(Rol.FARMACIA))
      .send({ marcados: [{ antecedenteId: diabetes.id, respuesta: 'SI' }] })
      .expect(403);
  });

  it('un paciente que no existe lo dice, no devuelve vacio', async () => {
    await request(http())
      .get('/v1/pacientes/00000000-0000-0000-0000-000000000000/antecedentes')
      .set(como(Rol.MEDICO))
      .expect(404);
  });
});
