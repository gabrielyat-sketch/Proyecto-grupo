import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { BusEventos, desdeCampos, FiltroExcepciones, Rol, STREAM_EVENTOS } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Ficha clinica prenatal y evaluacion del posparto.
 *
 * Corre contra PostgreSQL real, con el catalogo ya sembrado por
 * `npm run catalogo:prenatal -w @cap/usuarios`. Si el catalogo no esta, las
 * pruebas lo dicen en vez de fallar por otra razon.
 *
 * El DPI se genera en un rango propio de este archivo. Cada suite tiene el
 * suyo: el control de DPI duplicado corre en todas las altas, y dos suites con
 * el mismo numero se pisarian al correr seguidas.
 */
describe('Ficha prenatal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const creados: string[] = [];
  let comunidadId: string;
  let pacienteId: string;
  let expedienteId: string;

  let catalogoPrenatal: {
    signosPeligro: { id: string; texto: string }[];
    antecedentes: { id: string; codigo: string }[];
    problemas: unknown[];
    temasConsejeria: { id: string; texto: string }[];
  };
  let catalogoPosparto: typeof catalogoPrenatal;

  /** La ultima regla de la paciente de prueba. Fija, para poder contar sobre ella. */
  const FUR = '2026-01-01';

  const http = () => app.getHttpServer();

  let siguienteDpi = 2606000000000;
  const dpi = () => String(siguienteDpi++);

  function token(rol: Rol) {
    return jwt.sign({
      sub: 'e2e-prenatal-' + rol,
      usuario: 'e2e_prenatal',
      rol,
      sesionId: 's-prenatal',
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
        nombres: 'Zzprenatal',
        apellidos: 'Zzprueba Embarazo',
        fechaNacimiento: '2002-03-18',
        sexo: 'F',
        comunidadId,
        dpi: dpi(),
      })
      .expect(201);
    creados.push(paciente.body.id);
    pacienteId = paciente.body.id;
    expedienteId = paciente.body.expedienteId;

    // La FUR vive en los antecedentes del paciente, no en la ficha: una mujer
    // con cuatro controles tiene cuatro fichas y una sola ultima regla.
    await request(http())
      .patch('/v1/pacientes/' + pacienteId + '/antecedentes')
      .set(como(Rol.MEDICO))
      .send({ obstetricos: { fur: FUR } })
      .expect(200);

    const prenatal = await request(http())
      .get('/v1/fichas/catalogo/PRENATAL')
      .set(como(Rol.MEDICO))
      .expect(200);
    catalogoPrenatal = prenatal.body;

    const posparto = await request(http())
      .get('/v1/fichas/catalogo/POSPARTO')
      .set(como(Rol.MEDICO))
      .expect(200);
    catalogoPosparto = posparto.body;
  });

  afterAll(async () => {
    for (const id of creados) {
      // Los eventos de esta paciente de prueba, publicados o no: que no se
      // queden en el outbox de la base de desarrollo.
      await prisma.outbox.deleteMany({ where: { datos: { path: ['pacienteId'], equals: id } } });
      await prisma.atencion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.registroDigitalizacion.deleteMany({ where: { expediente: { pacienteId: id } } });
      await prisma.antecedentesObstetricos.deleteMany({ where: { pacienteId: id } });
      await prisma.antecedentePaciente.deleteMany({ where: { pacienteId: id } });
      await prisma.expediente.deleteMany({ where: { pacienteId: id } });
      await prisma.paciente.deleteMany({ where: { id } });
    }
    await app.close();
  });

  describe('catalogo', () => {
    it('trae los ocho signos de peligro del embarazo, en el orden del papel', () => {
      expect(catalogoPrenatal.signosPeligro).toHaveLength(8);
      expect(catalogoPrenatal.signosPeligro[0].texto).toBe('Hemorragia vaginal');
      expect(catalogoPrenatal.signosPeligro[7].texto).toBe('Presentaciones fetales anormales');
    });

    it('los del posparto son OTROS ocho, y por eso es otra ficha', () => {
      expect(catalogoPosparto.signosPeligro).toHaveLength(8);
      // El que cambia: cuando ya nacio, la presentacion fetal no significa nada.
      expect(catalogoPosparto.signosPeligro[7].texto).toBe('Coágulos con mal olor (Loquios)');
      expect(catalogoPosparto.signosPeligro.map((s) => s.texto)).not.toContain(
        'Presentaciones fetales anormales',
      );
    });

    it('la consejeria son nueve temas en el embarazo y cinco en el posparto', () => {
      expect(catalogoPrenatal.temasConsejeria).toHaveLength(9);
      expect(catalogoPrenatal.temasConsejeria[0].texto).toBe('Alimentación durante el embarazo');
      expect(catalogoPosparto.temasConsejeria).toHaveLength(5);
      expect(catalogoPosparto.temasConsejeria[0].texto).toBe('Lactancia materna exclusiva/MELA');
    });

    it('esta ficha no trae matriz de problemas, y el catalogo se sirve igual', () => {
      // El papel los resuelve con una raya para escribir. Antes, un catalogo sin
      // problemas se respondia con 404.
      expect(catalogoPrenatal.problemas).toHaveLength(0);
      expect(catalogoPosparto.problemas).toHaveLength(0);
    });

    it('los antecedentes de la hoja prenatal reutilizan los codigos que ya existian', () => {
      const codigos = catalogoPrenatal.antecedentes.map((a) => a.codigo);
      // Un antecedente es del paciente, no de la hoja: el asma registrada en una
      // consulta de adultos tiene que aparecer aqui.
      expect(codigos).toContain('MED_ASMA');
      expect(codigos).toContain('MED_HIPERTENSION');
      // Y los dos que esta ficha estrena.
      expect(codigos).toContain('MED_QUIRURGICOS');
      expect(codigos).toContain('MED_OTROS');
    });
  });

  describe('registrar y leer', () => {
    let fichaId: string;

    it('guarda un control prenatal completo', async () => {
      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'PRENATAL',
          // 12 de junio de 2026: 23 semanas cumplidas desde el 1 de enero.
          fecha: '2026-06-12T15:00:00.000Z',
          motivo: 'Control prenatal',
          presionSistolica: 110,
          presionDiastolica: 70,
          temperaturaC: 36.8,
          respiraciones: 18,
          pulso: 82,
          // 132.5 libras, que es como el papel lo pide y como lo teclea la
          // pantalla. Viaja en kilos, igual que en la ficha de adultos.
          pesoKg: 60.1,
          signosPeligro: [{ signoId: catalogoPrenatal.signosPeligro[0].id, presente: false }],
          consejeriaTemas: [{ temaId: catalogoPrenatal.temasConsejeria[0].id, brindada: true }],
          prenatal: {
            examenGeneralNormal: true,
            examenBucodental: 'Caries en molar inferior derecho',
            alturaUterinaCm: 23.5,
            movimientosFetales: true,
            fcf: 142,
            presentacionLeopold: 'Cefálica',
            trazasSangre: false,
            lesionesVulvares: false,
            flujoVaginal: true,
            hemoglobinaHematocrito: '11.2 / 34',
            vih: 'No reactivo',
            semanasPorFurAu: 23,
            problemasDetectados: 'Anemia leve',
            sulfatoFerrosoTabletas: 30,
            acidoFolicoTabletas: 30,
            tdDosis: 2,
          },
        })
        .expect(201);

      fichaId = r.body.id;
      expect(fichaId).toBeDefined();
    });

    /**
     * Decision 3 del diseno: la ficha manda, Programas escucha. Lo que viaja
     * es lo que Programas sabe evaluar, mas las semanas que anoto quien
     * atendio. Lo cifrado —laboratorios, problemas detectados, examen
     * bucodental— NO viaja: el bus no es un canal cifrado por campo.
     */
    it('deja en el outbox el evento para Programas, sin datos cifrados', async () => {
      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'ficha.prenatal.registrada', datos: { path: ['atencionId'], equals: fichaId } },
      });
      expect(evento).not.toBeNull();
      expect(evento!.datos).toEqual({
        atencionId: fichaId,
        pacienteId,
        comunidadId,
        fecha: '2026-06-12T15:00:00.000Z',
        digitalizada: false,
        pesoKg: 60.1,
        presionSistolica: 110,
        presionDiastolica: 70,
        alturaUterinaCm: 23.5,
        fcf: 142,
        semanasPorFurAu: 23,
        conSignosDePeligro: false,
        registradaPor: 'e2e-prenatal-MEDICO',
      });
      const claves = Object.keys(evento!.datos as object);
      for (const cifrado of ['hemoglobinaHematocrito', 'vih', 'problemasDetectados', 'examenBucodental']) {
        expect(claves).not.toContain(cifrado);
      }
    });

    /**
     * La otra mitad del patron: el publicador que arranca con la aplicacion
     * lo lleva al stream de Redis y marca la fila. Sin esto el outbox seria
     * una tabla que crece y nadie lee, que es lo que fue hasta hoy.
     */
    it('y el publicador lo lleva al bus en cuestion de segundos', async () => {
      if (!process.env.REDIS_URL) {
        throw new Error('Esta prueba necesita REDIS_URL en el .env del servicio.');
      }
      const redis = new BusEventos(process.env.REDIS_URL).conectar();
      try {
        let fila = null;
        for (let i = 0; i < 40 && !fila?.publicadoEn; i++) {
          await new Promise((r) => setTimeout(r, 250));
          fila = await prisma.outbox.findFirst({
            where: { tipo: 'ficha.prenatal.registrada', datos: { path: ['atencionId'], equals: fichaId } },
          });
        }
        expect(fila?.publicadoEn).toBeInstanceOf(Date);

        // Esta en el stream, con el sobre completo y el id de la fila.
        const ultimos = (await redis.xrevrange(STREAM_EVENTOS, '+', '-', 'COUNT', 50)) as [
          string,
          string[],
        ][];
        const enElBus = ultimos.map(([, campos]) => desdeCampos(campos)).find(
          (e) => !(e instanceof Error) && e.id === fila!.id,
        );
        expect(enElBus).toMatchObject({
          tipo: 'ficha.prenatal.registrada',
          origen: 'usuarios',
          version: 1,
          datos: { atencionId: fichaId, pacienteId },
        });
      } finally {
        await redis.quit();
      }
    });

    it('la devuelve descifrada, y el peso queda donde lo leen los indicadores', async () => {
      const r = await request(http())
        .get('/v1/fichas/' + fichaId)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(r.body.tipoFicha).toBe('PRENATAL');
      expect(r.body.prenatal).not.toBeNull();
      // El peso NO vive en la hoja prenatal: esta en la atencion, que es la
      // unica columna de peso que alimenta indicadores e historial.
      expect(r.body.pesoKg).toBe('60.1');
      expect(r.body.prenatal.pesoLibras).toBeUndefined();
      expect(r.body.prenatal.alturaUterinaCm).toBe('23.5');
      expect(r.body.prenatal.presentacionLeopold).toBe('Cefálica');
      expect(r.body.prenatal.examenBucodental).toBe('Caries en molar inferior derecho');
      expect(r.body.prenatal.hemoglobinaHematocrito).toBe('11.2 / 34');
      expect(r.body.prenatal.vih).toBe('No reactivo');
      expect(r.body.prenatal.problemasDetectados).toBe('Anemia leve');
      expect(r.body.prenatal.sulfatoFerrosoTabletas).toBe(30);
    });

    it('el laboratorio viaja cifrado en la base, no en claro', async () => {
      const fila = await prisma.fichaPrenatal.findUnique({
        where: { atencionId: fichaId },
        select: { vihCifrado: true, examenBucodentalCifrado: true },
      });
      expect(fila?.vihCifrado).toBeTruthy();
      // Un VIH legible en la base seria el peor dato del sistema en claro.
      expect(Buffer.from(fila!.vihCifrado!).toString('utf8')).not.toContain('reactivo');
      expect(Buffer.from(fila!.examenBucodentalCifrado!).toString('utf8')).not.toContain('Caries');
    });

    it('calcula las semanas y la fecha probable de parto a partir de la FUR', async () => {
      const r = await request(http())
        .get('/v1/fichas/' + fichaId)
        .set(como(Rol.MEDICO))
        .expect(200);

      // Del 1 de enero al 12 de junio de 2026 hay 162 dias: 23 semanas cumplidas.
      expect(r.body.prenatal.semanasGestacion).toBe(23);
      // FUR + 280 dias.
      expect(r.body.prenatal.fechaProbableParto).toBe('2026-10-08');
      // Y lo que anoto quien atendio se conserva aparte, porque el papel admite
      // estimarlas por altura uterina.
      expect(r.body.prenatal.semanasPorFurAu).toBe(23);
    });

    it('sin FUR registrada no inventa las semanas', async () => {
      const otra = await request(http())
        .post('/v1/pacientes')
        .set(como(Rol.RECEPCION))
        .send({
          nombres: 'Zzprenatal',
          apellidos: 'Zzsin Fur',
          fechaNacimiento: '1999-07-07',
          sexo: 'F',
          comunidadId,
          dpi: dpi(),
        })
        .expect(201);
      creados.push(otra.body.id);

      const ficha = await request(http())
        .post('/v1/expedientes/' + otra.body.expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'PRENATAL',
          motivo: 'Primer control',
          prenatal: { alturaUterinaCm: 20 },
        })
        .expect(201);

      const r = await request(http())
        .get('/v1/fichas/' + ficha.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(r.body.prenatal.semanasGestacion).toBeNull();
      expect(r.body.prenatal.fechaProbableParto).toBeNull();
    });
  });

  describe('lo que no deja pasar', () => {
    it('rechaza un tema de consejeria del posparto dentro de una ficha prenatal', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'PRENATAL',
          motivo: 'Control prenatal',
          consejeriaTemas: [{ temaId: catalogoPosparto.temasConsejeria[0].id, brindada: true }],
        })
        .expect(400);
    });

    it('rechaza un signo de peligro del posparto dentro de una ficha prenatal', async () => {
      await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'PRENATAL',
          motivo: 'Control prenatal',
          signosPeligro: [{ signoId: catalogoPosparto.signosPeligro[7].id, presente: true }],
        })
        .expect(400);
    });

    it('no guarda la hoja prenatal dentro de una ficha que no es prenatal', async () => {
      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'ADULTO',
          motivo: 'Consulta general',
          prenatal: { alturaUterinaCm: 30 },
        })
        .expect(201);

      // Se ignora: una fila huerfana en `ficha_prenatal` colgada de una ficha de
      // adultos no la leeria nunca ninguna pantalla.
      const fila = await prisma.fichaPrenatal.findUnique({ where: { atencionId: r.body.id } });
      expect(fila).toBeNull();

      // Y a Programas no se le cuenta nada: no es un control prenatal.
      const evento = await prisma.outbox.findFirst({
        where: { tipo: 'ficha.prenatal.registrada', datos: { path: ['atencionId'], equals: r.body.id } },
      });
      expect(evento).toBeNull();
    });

    it('Recepcion no puede abrir una ficha prenatal', async () => {
      await request(http())
        .get('/v1/fichas/catalogo/PRENATAL')
        .set(como(Rol.RECEPCION))
        .expect(403);
    });
  });

  describe('la evaluacion del posparto', () => {
    let primerControlId: string;

    it('guarda el primer control, con las cinco preguntas de su hoja', async () => {
      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'POSPARTO',
          motivo: 'Primer control posparto',
          presionSistolica: 118,
          presionDiastolica: 76,
          temperaturaC: 36.9,
          pulso: 88,
          diagnostico: 'Puerperio normal',
          tratamiento: 'Sulfato ferroso por 30 días',
          signosPeligro: [{ signoId: catalogoPosparto.signosPeligro[0].id, presente: false }],
          consejeriaTemas: [{ temaId: catalogoPosparto.temasConsejeria[0].id, brindada: true }],
          posparto: {
            esPrimerControl: true,
            diasDespuesDelParto: 8,
            dondeAtendioParto: 'CAP Purulhá',
            quienAtendioParto: 'CT',
            involucionUterina: 'Útero a nivel de cicatriz umbilical',
            examenMamas: 'Sin grietas ni ingurgitación',
            heridaOperatoria: 'No aplica, parto vaginal',
            examenGinecologico: 'Loquios serosos, episiorrafía limpia',
            lactanciaMaternaExclusiva: false,
            motivoSinLactancia: 'Refiere poca producción de leche',
            problemasDetectados: 'Lactancia no exclusiva',
            sulfatoFerroso: true,
            acidoFolico: true,
            td: false,
          },
        })
        .expect(201);

      primerControlId = r.body.id;
    });

    it('la devuelve descifrada, y dice que es el primer control', async () => {
      const r = await request(http())
        .get('/v1/fichas/' + primerControlId)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(r.body.tipoFicha).toBe('POSPARTO');
      expect(r.body.posparto.esPrimerControl).toBe(true);
      expect(r.body.posparto.diasDespuesDelParto).toBe(8);
      expect(r.body.posparto.quienAtendioParto).toBe('CT');
      expect(r.body.posparto.examenGinecologico).toBe('Loquios serosos, episiorrafía limpia');
      // El "¿por que no?" del papel, que es lo que decide la consejeria.
      expect(r.body.posparto.lactanciaMaternaExclusiva).toBe(false);
      expect(r.body.posparto.motivoSinLactancia).toBe('Refiere poca producción de leche');
      // La hoja prenatal no se toca al guardar una del posparto.
      expect(r.body.prenatal).toBeNull();
    });

    it('los controles siguientes anotan tabletas, no casillas', async () => {
      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'POSPARTO',
          motivo: 'Control posparto',
          posparto: {
            involucionUterina: 'Útero involucionado',
            sulfatoFerrosoTabletas: 30,
            acidoFolicoTabletas: 30,
            tdDosis: 1,
          },
        })
        .expect(201);

      const ficha = await request(http())
        .get('/v1/fichas/' + r.body.id)
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(ficha.body.posparto.esPrimerControl).toBe(false);
      expect(ficha.body.posparto.sulfatoFerrosoTabletas).toBe(30);
      expect(ficha.body.posparto.tdDosis).toBe(1);
      // Lo que el papel no pregunta en esta tabla se queda sin responder, y no
      // se rellena con un "si" deducido del numero.
      expect(ficha.body.posparto.sulfatoFerroso).toBeNull();
      expect(ficha.body.posparto.diasDespuesDelParto).toBeNull();
    });

    it('el examen ginecologico viaja cifrado en la base', async () => {
      const fila = await prisma.fichaPosparto.findUnique({
        where: { atencionId: primerControlId },
        select: { examenGinecologicoCifrado: true },
      });
      expect(fila?.examenGinecologicoCifrado).toBeTruthy();
      expect(Buffer.from(fila!.examenGinecologicoCifrado!).toString('utf8')).not.toContain(
        'Loquios',
      );
    });

    it('no guarda la hoja del posparto dentro de una ficha prenatal', async () => {
      const r = await request(http())
        .post('/v1/expedientes/' + expedienteId + '/fichas')
        .set(como(Rol.MEDICO))
        .send({
          tipoFicha: 'PRENATAL',
          motivo: 'Control prenatal',
          posparto: { diasDespuesDelParto: 10 },
        })
        .expect(201);

      const fila = await prisma.fichaPosparto.findUnique({ where: { atencionId: r.body.id } });
      expect(fila).toBeNull();
    });
  });
});
