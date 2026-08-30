import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Ficha clinica de adolescente, adulto y adulto mayor.
 *
 * Corre contra PostgreSQL real, con el catalogo ya sembrado por
 * `npm run catalogo -w @cap/usuarios`. Si el catalogo no esta, las pruebas lo
 * dicen en vez de fallar por otra razon.
 */
describe('Fichas clinicas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const creados: string[] = [];
  let comunidadId: string;
  let expedienteId: string;
  let catalogo: {
    signosPeligro: { id: string; texto: string; pideTexto: boolean }[];
    antecedentes: { id: string; codigo: string }[];
    problemas: {
      id: string;
      nombre: string;
      signos: { id: string; texto: string }[];
      diagnosticos: { id: string; texto: string }[];
    }[];
  };

  const http = () => app.getHttpServer();

  function token(rol: Rol) {
    return jwt.sign({
      sub: 'e2e-fichas-' + rol,
      usuario: 'e2e_fichas',
      rol,
      sesionId: 's-fichas',
      mfaVerificado: true,
    });
  }

  const como = (rol: Rol) => ({ Authorization: 'Bearer ' + token(rol) });

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
    comunidadId = comunidad.id;

    const paciente = await request(http())
      .post('/v1/pacientes')
      .set(como(Rol.RECEPCION))
      .send({
        nombres: 'Zzficha',
        apellidos: 'Zzprueba Adulto',
        fechaNacimiento: '1985-04-12',
        sexo: 'F',
        comunidadId,
      })
      .expect(201);
    creados.push(paciente.body.id);
    expedienteId = paciente.body.expedienteId;

    const r = await request(http())
      .get('/v1/fichas/catalogo/ADULTO')
      .set(como(Rol.MEDICO))
      .expect(200);
    catalogo = r.body;
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

  describe('catalogo', () => {
    it('trae los 14 problemas de la ficha de adultos, en el orden del papel', () => {
      expect(catalogo.problemas).toHaveLength(14);
      expect(catalogo.problemas[0].nombre).toBe('Tos o dificultad para respirar');
      expect(catalogo.problemas[13].nombre).toBe('Otros');
    });

    it('cada problema trae sus signos y sus diagnosticos', () => {
      const tos = catalogo.problemas[0];
      expect(tos.signos.map((s) => s.texto)).toContain('Sibilancia');
      expect(tos.diagnosticos.map((d) => d.texto)).toContain('Neumonía grave');
    });

    it('trae los 7 signos de peligro, y solo el ultimo pide texto', () => {
      expect(catalogo.signosPeligro).toHaveLength(7);
      const piden = catalogo.signosPeligro.filter((s) => s.pideTexto);
      expect(piden).toHaveLength(1);
      expect(piden[0].texto).toContain('Otros');
    });

    it('trae los antecedentes con su codigo estable', () => {
      const codigos = catalogo.antecedentes.map((a) => a.codigo);
      expect(codigos).toContain('MED_DIABETES');
      expect(codigos).toContain('FAM_CANCER');
      expect(codigos).toContain('HAB_FUMA');
    });

    it('conserva las tildes del formulario impreso', () => {
      // Si la pantalla dijera "Oido" el personal tendria que traducir cada vez.
      expect(catalogo.problemas.map((p) => p.nombre)).toContain('Oído y garganta');
    });

    it('una ficha sin catalogo cargado lo dice, no devuelve vacio', async () => {
      // Antes usaba NEONATO. Dejo de servir en cuanto esa ficha tuvo catalogo:
      // hay que probarlo con una que siga sin sembrarse, y cambiarlo otra vez
      // cuando le toque el turno a ninez.
      await request(http()).get('/v1/fichas/catalogo/NINEZ').set(como(Rol.MEDICO)).expect(404);
    });

    it('el catalogo de menor de 28 dias trae sus 27 signos de peligro', async () => {
      // Son tres bloques distintos del papel —20 de enfermedad grave, 3 de
      // infeccion y 4 de malformaciones— y los tres se capturan igual.
      const r = await request(http())
        .get('/v1/fichas/catalogo/NEONATO')
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(r.body.signosPeligro).toHaveLength(27);
      expect(r.body.signosPeligro[0].texto).toBe('No respira');
      expect(r.body.problemas).toHaveLength(10);
    });

    /**
     * En la ficha de adultos la consejeria es un texto libre; en esta son seis
     * temas impresos con su fecha de reconsulta.
     */
    it('el catalogo de neonato trae sus temas de consejeria y el de adultos no', async () => {
      const neonato = await request(http())
        .get('/v1/fichas/catalogo/NEONATO')
        .set(como(Rol.MEDICO))
        .expect(200);
      expect(neonato.body.temasConsejeria).toHaveLength(6);

      const adulto = await request(http())
        .get('/v1/fichas/catalogo/ADULTO')
        .set(como(Rol.MEDICO))
        .expect(200);
      expect(adulto.body.temasConsejeria).toHaveLength(0);
    });

    it('Recepcion no entra al catalogo clinico', async () => {
      await request(http()).get('/v1/fichas/catalogo/ADULTO').set(como(Rol.RECEPCION)).expect(403);
    });
  });

  describe('registrar una ficha', () => {
    it('guarda la ficha completa y la devuelve entera al leerla', async () => {
      const tos = catalogo.problemas[0];

      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Tos de cinco dias',
          historiaEnfermedad: 'Inicio hace cinco dias, sin fiebre',
          signosPeligro: [
            { signoId: catalogo.signosPeligro[0].id, presente: false },
            { signoId: catalogo.signosPeligro[6].id, presente: true, detalle: 'Refiere mareo' },
          ],
          pesoKg: 72.5,
          tallaCm: 158,
          presionSistolica: 128,
          presionDiastolica: 82,
          pulso: 78,
          respiraciones: 18,
          problemas: [
            {
              problemaId: tos.id,
              presente: true,
              signoIds: [tos.signos[0].id],
              diagnosticoIds: [tos.diagnosticos[1].id],
              conducta: 'Amoxicilina por siete dias',
            },
          ],
          medicamentos: [{ nombre: 'Amoxicilina 500 mg', dosis: 'cada 8 horas', dias: 7 }],
          consejeria: 'Signos de alarma explicados',
        })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(ficha.body.motivo).toBe('Tos de cinco dias');
      expect(ficha.body.tipoFicha).toBe('ADULTO');
      expect(ficha.body.problemas).toHaveLength(1);
      expect(ficha.body.problemas[0].signos).toEqual(['Sibilancia']);
      expect(ficha.body.problemas[0].diagnosticos).toEqual(['Neumonía']);
      expect(ficha.body.medicamentos[0].nombre).toBe('Amoxicilina 500 mg');
      expect(ficha.body.signosPeligro.find((s: { presente: boolean }) => s.presente).detalle).toBe(
        'Refiere mareo',
      );
    });

    it('el IMC viene calculado, no se pide ni se guarda', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Control', pesoKg: 72.5, tallaCm: 158 })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(ficha.body.imc).toBe(29.04);

      // No existe como columna: si alguien lo agregara, esta prueba avisa.
      const fila = await prisma.atencion.findUnique({ where: { id: creada.body.id } });
      expect(Object.keys(fila!)).not.toContain('imc');
    });

    it('sin peso o sin talla, el IMC es null y no un numero inventado', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Control sin peso' })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);
      expect(ficha.body.imc).toBeNull();
    });

    it('el texto clinico NO es legible con un SELECT directo', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'MotivoConfidencial999',
          consejeria: 'ConsejeriaConfidencial999',
        })
        .expect(201);

      const fila = await prisma.atencion.findUnique({ where: { id: creada.body.id } });
      const enBruto =
        Buffer.from(fila!.motivoCifrado).toString('utf8') +
        Buffer.from(fila!.consejeriaCifrado ?? []).toString('utf8');
      expect(enBruto).not.toContain('Confidencial999');
    });

    it('rechaza un problema que no pertenece a esta ficha', async () => {
      // Sin esta validacion la base lo aceptaria: las llaves foraneas existen,
      // y el error solo aparecería al leer la ficha, ya escrita.
      const otro = await prisma.problemaFicha.create({
        data: { tipoFicha: 'NEONATO', orden: 901, nombre: 'Zzprueba de otra ficha' },
      });

      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Prueba',
          problemas: [{ problemaId: otro.id, presente: true }],
        })
        .expect(400);

      expect(r.body.mensaje).toContain('no pertenece');
      await prisma.problemaFicha.delete({ where: { id: otro.id } });
    });

    it('rechaza un signo que no pertenece a su problema', async () => {
      const tos = catalogo.problemas[0];
      const oido = catalogo.problemas[1];

      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Prueba',
          problemas: [{ problemaId: tos.id, presente: true, signoIds: [oido.signos[0].id] }],
        })
        .expect(400);
    });

    it('una ficha rechazada no deja nada a medias', async () => {
      const antes = await prisma.atencion.count({ where: { expedienteId } });
      const tos = catalogo.problemas[0];

      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Prueba que debe fallar',
          problemas: [
            { problemaId: tos.id, presente: true, diagnosticoIds: [catalogo.problemas[2].diagnosticos[0].id] },
          ],
        })
        .expect(400);

      expect(await prisma.atencion.count({ where: { expedienteId } })).toBe(antes);
    });

    it('el mismo signo mandado dos veces no tumba la ficha', async () => {
      // La pantalla puede repetirlo; la llave compuesta lo rechazaria.
      const tos = catalogo.problemas[0];
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Repetidos',
          problemas: [
            {
              problemaId: tos.id,
              presente: true,
              signoIds: [tos.signos[0].id, tos.signos[0].id],
            },
          ],
        })
        .expect(201);
    });

    it('Recepcion no puede registrar una ficha clinica', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.RECEPCION))
        .send({ tipoFicha: 'ADULTO', motivo: 'Prueba' })
        .expect(403);
    });

    it('rechaza una fecha en el futuro', async () => {
      const manana = new Date(Date.now() + 86_400_000).toISOString();
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Prueba', fecha: manana })
        .expect(400);
    });

    it('rechaza un peso imposible', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Prueba', pesoKg: 900 })
        .expect(400);
    });

    it('no existe el expediente: lo dice en vez de crear la ficha suelta', async () => {
      await request(http())
        .post('/v1/expedientes/00000000-0000-0000-0000-000000000000/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'Prueba' })
        .expect(404);
    });
  });

  /**
   * ─────────────────────────────────────────────────────────────────────
   *  LA FICHA DE MENOR DE 28 DIAS
   *
   *  Comparte casi todo con la de adultos —signos de peligro, problemas,
   *  medicamentos— y se separa en tres cosas: el peso va en libras y onzas,
   *  trae antecedentes del PARTO con valor propio, y su consejeria son seis
   *  temas con fecha de reconsulta en vez de un texto libre.
   * ─────────────────────────────────────────────────────────────────────
   */
  describe('ficha de menor de 28 dias', () => {
    let catalogoNeonato: {
      signosPeligro: { id: string; texto: string }[];
      problemas: { id: string; nombre: string; signos: { id: string }[]; diagnosticos: { id: string }[] }[];
      temasConsejeria: { id: string; texto: string }[];
    };

    beforeAll(async () => {
      const r = await request(http())
        .get('/v1/fichas/catalogo/NEONATO')
        .set(como(Rol.MEDICO))
        .expect(200);
      catalogoNeonato = r.body;
    });

    it('guarda el peso en libras y onzas, tal como lo pide el formulario', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control del recien nacido',
          neonato: {
            nombreMadre: 'Juana Caal Xol',
            pesoLibras: 6,
            pesoOnzas: 4,
            perimetroBraquialCm: 11.5,
            circunferenciaCefalicaCm: 34.5,
          },
        })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(ficha.body.neonato.pesoLibras).toBe(6);
      expect(ficha.body.neonato.pesoOnzas).toBe(4);
      // Decimal de Prisma viaja como TEXTO en JSON, no como numero.
      expect(ficha.body.neonato.perimetroBraquialCm).toBe('11.5');
      expect(ficha.body.neonato.circunferenciaCefalicaCm).toBe('34.5');
    });

    /**
     * Dieciseis onzas son una libra. Aceptarlas dejaria dos formas de escribir
     * el mismo peso, y el signo de peligro "pesa menos de 5 libras 8 onzas"
     * dejaria de poder evaluarse comparando.
     */
    it('rechaza dieciseis onzas: eso ya es una libra', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          neonato: { pesoLibras: 6, pesoOnzas: 16 },
        })
        .expect(400);
    });

    it('el nombre de la madre NO es legible con un SELECT directo', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          neonato: { nombreMadre: 'Petrona Xoná Isem' },
        })
        .expect(201);

      const fila = await prisma.fichaNeonato.findUnique({
        where: { atencionId: creada.body.id as string },
      });
      const crudo = Buffer.from(fila!.nombreMadreCifrado!).toString('utf8');
      expect(crudo).not.toContain('Petrona');
    });

    it('guarda los antecedentes del parto con su valor, no como casillas', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Primera consulta',
          neonato: {
            pesoNacerLibras: 5,
            pesoNacerOnzas: 8,
            lloroAlNacer: true,
            nacioCianotico: false,
            horasTrabajoParto: 9,
            quienAtendioParto: 'CT',
            tipoParto: 'NORMAL',
            rupturaPrematuraMembranas: true,
            bcg: true,
            tdMadre: true,
            tdMadreDosis: 2,
            lactanciaMaternaExclusiva: true,
          },
        })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      const n = ficha.body.neonato;
      expect(n.horasTrabajoParto).toBe(9);
      expect(n.quienAtendioParto).toBe('CT');
      expect(n.tipoParto).toBe('NORMAL');
      expect(n.rupturaPrematuraMembranas).toBe(true);
      expect(n.tdMadreDosis).toBe(2);
    });

    it('rechaza a quien atendio el parto si no es una de las siglas del papel', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          neonato: { quienAtendioParto: 'PARTERA' },
        })
        .expect(400);
    });

    it('guarda la consejeria por temas, con su fecha de reconsulta', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          consejeriaTemas: [
            { temaId: catalogoNeonato.temasConsejeria[0].id, fechaReconsulta: '2026-09-15' },
            { temaId: catalogoNeonato.temasConsejeria[1].id, brindada: false },
          ],
        })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(ficha.body.consejeriaTemas).toHaveLength(2);
      const primero = ficha.body.consejeriaTemas[0];
      expect(primero.texto).toBe('Técnica de amamantamiento');
      expect(primero.brindada).toBe(true);
      // La fecha vuelve tal cual: sin convertir a Date no se corre un dia.
      expect(primero.fechaReconsulta).toBe('2026-09-15');
      expect(ficha.body.consejeriaTemas[1].brindada).toBe(false);
    });

    it('rechaza una fecha de reconsulta que no venga como aaaa-mm-dd', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          consejeriaTemas: [
            { temaId: catalogoNeonato.temasConsejeria[0].id, fechaReconsulta: '15/09/2026' },
          ],
        })
        .expect(400);
    });

    /**
     * Escribirla dejaria una fila huerfana que ninguna pantalla va a leer: la
     * ficha de adultos no tiene donde mostrar el peso al nacer.
     */
    it('los datos de neonato NO se guardan en una ficha de adultos', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Dolor de cabeza',
          neonato: { pesoLibras: 6, pesoOnzas: 4 },
        })
        .expect(201);

      const fila = await prisma.fichaNeonato.findUnique({
        where: { atencionId: creada.body.id as string },
      });
      expect(fila).toBeNull();

      const ficha = await request(http())
        .get('/v1/fichas/' + creada.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);
      expect(ficha.body.neonato).toBeNull();
    });

    /**
     * El catalogo esta segmentado por ficha y las llaves foraneas existen, asi
     * que la base aceptaria la mezcla: el error solo aparecería al leerla, con
     * los datos ya escritos.
     */
    it('no acepta un problema de la ficha de adultos en una de neonato', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          problemas: [{ problemaId: catalogo.problemas[0].id, presente: true }],
        })
        .expect(400);
    });

    /**
     * Las llaves foraneas existen, asi que la base aceptaria un tema de otra
     * ficha y el error solo aparecería al leerla, con los datos ya escritos.
     */
    it('no acepta un tema de consejeria que no sea de esta ficha', async () => {
      // El catalogo de adultos no tiene temas, asi que se usa uno inexistente:
      // el efecto que se comprueba es el mismo, que no llegue a la base.
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          consejeriaTemas: [{ temaId: '00000000-0000-4000-8000-000000000000' }],
        })
        .expect(400);
    });

    /**
     * consejeria_en_atencion tiene clave compuesta por atencion y tema: el
     * duplicado reventaria contra la restriccion y saldria como un 500.
     */
    it('un tema de consejeria repetido da 400, no un error del servidor', async () => {
      const tema = catalogoNeonato.temasConsejeria[0].id;
      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          consejeriaTemas: [{ temaId: tema }, { temaId: tema, brindada: false }],
        })
        .expect(400);
      expect(r.body.mensaje).toMatch(/repetido/i);
    });

    it('un problema repetido tambien da 400', async () => {
      const problema = catalogoNeonato.problemas[0].id;
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'NEONATO',
          motivo: 'Control',
          problemas: [
            { problemaId: problema, presente: true },
            { problemaId: problema, presente: false },
          ],
        })
        .expect(400);
    });

    it('la ficha de neonato aparece en el historial como tal', async () => {
      const creada = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'NEONATO', motivo: 'Control de los ocho dias' })
        .expect(201);

      const historial = await request(http())
        .get('/v1/expedientes/' + expedienteId + '/atenciones')
        .set(como(Rol.MEDICO))
        .expect(200);

      const fila = historial.body.datos.find((a: { id: string }) => a.id === creada.body.id);
      expect(fila.tipoFicha).toBe('NEONATO');
    });
  });

  describe('el historial distingue una ficha de una atencion breve', () => {
    it('la ficha llega con su tipo, y la atencion breve con tipoFicha en null', async () => {
      // Sin este campo el historial no podria saber cuales tienen detras una
      // ficha completa —con sus problemas, signos y medicamentos— y ofrecer
      // abrirla: todas se verian igual y media consulta quedaria escondida.
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({ tipoFicha: 'ADULTO', motivo: 'ZZHistorial ficha completa' })
        .expect(201);

      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/atenciones')
        .set(como(Rol.MEDICO))
        .send({ motivo: 'ZZHistorial atencion breve' })
        .expect(201);

      const r = await request(http())
        .get('/v1/expedientes/' + expedienteId + '/atenciones?tamano=50')
        .set(como(Rol.MEDICO))
        .expect(200);

      const ficha = r.body.datos.find(
        (a: { motivo: string }) => a.motivo === 'ZZHistorial ficha completa',
      );
      const breve = r.body.datos.find(
        (a: { motivo: string }) => a.motivo === 'ZZHistorial atencion breve',
      );

      expect(ficha.tipoFicha).toBe('ADULTO');
      expect(breve.tipoFicha).toBeNull();
    });
  });
});
