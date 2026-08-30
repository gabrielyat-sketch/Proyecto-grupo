import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { FiltroExcepciones, Rol } from '@cap/shared';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '../generado';

/**
 * El carnet del lactante y la ninez (e2e).
 *
 * Corre contra PostgreSQL real, con el catalogo sembrado por
 * `npm run carnet:ninez -w @cap/usuarios`.
 *
 * Lo que aqui se comprueba no es que las tablas guarden: es que **el papel se
 * respete**. Una tercera dosis de BCG no existe en el formulario, y el sistema
 * no la puede aceptar por mucho que la base tenga sitio para ella.
 */
describe('Carnet del lactante y ninez (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwt: JwtService;

  let pacienteId = '';
  let comunidadId = '';
  const creados: string[] = [];
  const gruposCreados: string[] = [];

  const http = () => app.getHttpServer();

  const como = (rol: Rol) => ({
    Authorization:
      'Bearer ' + jwt.sign({ sub: 'u-prueba', usuario: 'prueba', rol }, { expiresIn: '10m' }),
  });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();

    jwt = app.get(JwtService);
    prisma = new PrismaClient();

    // No se crean comunidades en las pruebas: una comunidad con pacientes no
    // se puede borrar, y esta bien que no se pueda.
    const comunidad = await prisma.comunidad.findFirst({ select: { id: true } });
    comunidadId = comunidad!.id;

    // Dos anos y tres meses: de lleno en la edad de esta ficha.
    const nacimiento = new Date();
    nacimiento.setMonth(nacimiento.getMonth() - 27);

    const paciente = await prisma.paciente.create({
      data: {
        nombres: 'ZzCarnet',
        apellidos: 'ZzPrueba',
        fechaNacimiento: nacimiento,
        sexo: 'F',
        idioma: 'ESPANOL',
        comunidadId,
        nombreBusqueda: 'zzcarnet zzprueba',
      },
      select: { id: true },
    });
    pacienteId = paciente.id;
    creados.push(paciente.id);
  });

  afterAll(async () => {
    // El orden importa: lo que cuelga del paciente primero.
    await prisma.vacunaAplicada.deleteMany({ where: { pacienteId: { in: creados } } });
    await prisma.micronutrienteEntregado.deleteMany({ where: { pacienteId: { in: creados } } });
    await prisma.datosNinezPaciente.deleteMany({ where: { pacienteId: { in: creados } } });
    await prisma.paciente.deleteMany({ where: { id: { in: creados } } });
    // Los grupos que la propia ficha creo al vuelo.
    await prisma.datosDelHogar.deleteMany({ where: { grupoFamiliarId: { in: gruposCreados } } });
    await prisma.grupoFamiliar.deleteMany({ where: { id: { in: gruposCreados } } });
    await prisma.$disconnect();
    await app.close();
  });

  // ══════════════════════ el catalogo ══════════════════════

  describe('el catalogo del carnet', () => {
    it('trae las diez vacunas del papel', async () => {
      const r = await request(http())
        .get('/v1/carnet/catalogo')
        .set(como(Rol.MEDICO))
        .expect(200);

      expect(r.body.vacunas).toHaveLength(10);
      expect(r.body.vacunas[0].nombre).toBe('Hepatitis');
      expect(r.body.micronutrientes).toHaveLength(4);
    });

    /**
     * Las celdas sombreadas del papel son informacion. Si el catalogo
     * ofreciera las cinco dosis a las diez vacunas, alguien anotaria una
     * tercera de BCG que no existe.
     */
    it('solo publica las casillas que el formulario deja llenar', async () => {
      const r = await request(http())
        .get('/v1/carnet/catalogo')
        .set(como(Rol.MEDICO))
        .expect(200);

      const porNombre = (n: string) =>
        r.body.vacunas.find((v: { nombre: string }) => v.nombre === n);

      expect(porNombre('BCG').dosis).toHaveLength(1);
      expect(porNombre('BCG').dosis[0].edadRecomendada).toBe('RN');

      // DPT no tiene las tres primeras: solo los dos refuerzos.
      const dpt = porNombre('DPT').dosis.map((d: { orden: number }) => d.orden);
      expect(dpt).toEqual([4, 5]);

      expect(porNombre('Pentavalente').dosis).toHaveLength(3);
      expect(porNombre('OPV').dosis).toHaveLength(5);
    });

    it('las tres filas que el papel deja abiertas vienen sin edad', async () => {
      const r = await request(http())
        .get('/v1/carnet/catalogo')
        .set(como(Rol.MEDICO))
        .expect(200);

      for (const nombre of ['Neumococo', 'Hb', 'Otras']) {
        const v = r.body.vacunas.find((x: { nombre: string }) => x.nombre === nombre);
        expect(v.dosis).toHaveLength(5);
        for (const d of v.dosis) expect(d.edadRecomendada).toBeNull();
      }
    });

    /** El desparasitante no empieza hasta los dos anos: el papel lo sombrea. */
    it('el desparasitante no aparece en los dos primeros tramos', async () => {
      const r = await request(http())
        .get('/v1/carnet/catalogo')
        .set(como(Rol.MEDICO))
        .expect(200);

      const d = r.body.micronutrientes.find(
        (m: { nombre: string }) => m.nombre === 'Desparasitante',
      );
      const tramos = [...new Set(d.esperadas.map((e: { tramo: string }) => e.tramo))];
      expect(tramos).not.toContain('M6_A_A1');
      expect(tramos).not.toContain('A1_A_A2');
      expect(d.esperadas).toHaveLength(6);

      const vitamina = r.body.micronutrientes.find(
        (m: { nombre: string }) => m.nombre === 'Vitamina "A"',
      );
      expect(vitamina.esperadas).toHaveLength(9);
    });

    it('Recepcion no entra al carnet', async () => {
      await request(http()).get('/v1/carnet/catalogo').set(como(Rol.RECEPCION)).expect(403);
      await request(http())
        .get('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.RECEPCION))
        .expect(403);
    });
  });

  // ══════════════════════ anotar el carnet ══════════════════════

  describe('anotar dosis', () => {
    const vacuna = async (nombre: string) => {
      const r = await request(http()).get('/v1/carnet/catalogo').set(como(Rol.MEDICO));
      return r.body.vacunas.find((v: { nombre: string }) => v.nombre === nombre);
    };

    it('guarda una dosis y calcula la edad que tenia el nino', async () => {
      const opv = await vacuna('OPV');

      // El nino nacio hace 27 meses. Una dosis puesta hace 25 meses le
      // corresponde a los 2 meses de edad, que es cuando toca la primera.
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - 25);
      const comoTexto = fecha.toISOString().slice(0, 10);

      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ vacunas: [{ vacunaId: opv.id, orden: 1, fecha: comoTexto }] })
        .expect(200);

      const puesta = r.body.vacunas.find(
        (v: { vacunaId: string }) => v.vacunaId === opv.id,
      );
      expect(puesta.fecha).toBe(comoTexto);
      // La edad NO se guarda: se calcula. Por eso viene en la respuesta.
      expect(puesta.edadEnMeses).toBe(2);
    });

    /**
     * Es como se corrige una casilla mal anotada. En el papel se tacha; aqui
     * no habria otra forma, y hoy corregir una atencion no se puede.
     */
    it('una fecha null borra la dosis', async () => {
      const bcg = await vacuna('BCG');

      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ vacunas: [{ vacunaId: bcg.id, orden: 1, fecha: '2024-01-10' }] })
        .expect(200);

      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ vacunas: [{ vacunaId: bcg.id, orden: 1, fecha: null }] })
        .expect(200);

      expect(r.body.vacunas.find((v: { vacunaId: string }) => v.vacunaId === bcg.id)).toBeUndefined();
    });

    it('anotar dos veces la misma dosis la corrige, no la duplica', async () => {
      const hep = await vacuna('Hepatitis');

      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ vacunas: [{ vacunaId: hep.id, orden: 1, fecha: '2024-01-10' }] })
        .expect(200);

      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ vacunas: [{ vacunaId: hep.id, orden: 1, fecha: '2024-02-15' }] })
        .expect(200);

      const suyas = r.body.vacunas.filter((v: { vacunaId: string }) => v.vacunaId === hep.id);
      expect(suyas).toHaveLength(1);
      expect(suyas[0].fecha).toBe('2024-02-15');
    });

    /**
     * LA prueba de este modulo. La base tiene sitio para una tercera dosis de
     * BCG; el formulario no. Sin esto, un reporte de cobertura contaria dosis
     * que nadie puso nunca.
     */
    it('rechaza una dosis que el formulario no tiene', async () => {
      const bcg = await vacuna('BCG');

      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ vacunas: [{ vacunaId: bcg.id, orden: 3, fecha: '2024-01-10' }] })
        .expect(400);

      expect(r.body.mensaje).toContain('BCG');
    });

    it('rechaza un desparasitante en un tramo donde el papel lo sombrea', async () => {
      const cat = await request(http()).get('/v1/carnet/catalogo').set(como(Rol.MEDICO));
      const desp = cat.body.micronutrientes.find(
        (m: { nombre: string }) => m.nombre === 'Desparasitante',
      );

      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({
          micronutrientes: [
            { micronutrienteId: desp.id, tramo: 'M6_A_A1', orden: 1, fecha: '2024-01-10' },
          ],
        })
        .expect(400);
    });

    it('guarda una entrega de micronutriente en un tramo que si existe', async () => {
      const cat = await request(http()).get('/v1/carnet/catalogo').set(como(Rol.MEDICO));
      const hierro = cat.body.micronutrientes.find(
        (m: { nombre: string }) => m.nombre === 'Sulfato Ferroso',
      );

      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({
          micronutrientes: [
            { micronutrienteId: hierro.id, tramo: 'A2_A_A3', orden: 3, fecha: '2026-03-01' },
          ],
        })
        .expect(200);

      const guardada = r.body.micronutrientes.find(
        (m: { micronutrienteId: string }) => m.micronutrienteId === hierro.id,
      );
      expect(guardada).toMatchObject({ tramo: 'A2_A_A3', orden: 3, fecha: '2026-03-01' });
    });
  });

  // ══════════════════════ padres y casa ══════════════════════

  describe('los padres y la casa', () => {
    it('guarda los datos de los padres y los devuelve descifrados', async () => {
      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({
          datos: {
            lugarNacimiento: 'Hospital de Salama',
            madreNombre: 'Marta Caal Xol',
            madreEdad: 29,
            madreOcupacion: 'Ama de casa',
            madreSabeLeer: true,
            madreEscolaridad: 'PRIMARIA_4_6',
            hijosTotal: 3,
            hijosVivos: 3,
            hijosMuertos: 0,
          },
        })
        .expect(200);

      expect(r.body.datos).toMatchObject({
        lugarNacimiento: 'Hospital de Salama',
        madreNombre: 'Marta Caal Xol',
        madreEdad: 29,
        madreEscolaridad: 'PRIMARIA_4_6',
        hijosTotal: 3,
      });

      // Y en la base el nombre vive cifrado.
      const fila = await prisma.datosNinezPaciente.findUnique({ where: { pacienteId } });
      const crudo = Buffer.from(fila!.madreNombreCifrado ?? []).toString('utf8');
      expect(crudo.length).toBeGreaterThan(0);
      expect(crudo).not.toContain('Marta');
    });

    it('lo que no viene en el cuerpo no se toca', async () => {
      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ datos: { padreNombre: 'Juan Tzul' } })
        .expect(200);

      const r = await request(http())
        .get('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .expect(200);

      // La madre sigue ahi aunque este guardado solo hablara del padre.
      expect(r.body.datos.madreNombre).toBe('Marta Caal Xol');
      expect(r.body.datos.padreNombre).toBe('Juan Tzul');
    });

    /**
     * El agua y las excretas son de la CASA. El grupo familiar estaba a cero en
     * todo el padron, asi que sin crearlo al vuelo esta seccion habria nacido
     * muerta, esperando a un modulo que todavia no existe.
     */
    it('crea el grupo familiar del nino si no tenia, para poder guardar la casa', async () => {
      const antes = await prisma.paciente.findUnique({
        where: { id: pacienteId },
        select: { grupoFamiliarId: true },
      });
      expect(antes?.grupoFamiliarId).toBeNull();

      const r = await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ hogar: { agua: 'POZO', excretas: 'LETRINA' } })
        .expect(200);

      expect(r.body.hogar).toMatchObject({ agua: 'POZO', excretas: 'LETRINA' });

      const despues = await prisma.paciente.findUnique({
        where: { id: pacienteId },
        select: { grupoFamiliarId: true },
      });
      expect(despues?.grupoFamiliarId).not.toBeNull();
      gruposCreados.push(despues!.grupoFamiliarId!);
    });

    it('la segunda vez reutiliza el grupo, no crea otro', async () => {
      const antes = await prisma.grupoFamiliar.count();

      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ hogar: { agua: 'CHORRO_PUBLICO' } })
        .expect(200);

      expect(await prisma.grupoFamiliar.count()).toBe(antes);
    });
  });

  describe('validacion del cuerpo', () => {
    it('rechaza un campo que no existe, en vez de tragarselo', async () => {
      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({ datos: { loQueSea: 'x' } })
        .expect(400);
    });

    it('rechaza un tramo de edad inventado', async () => {
      const cat = await request(http()).get('/v1/carnet/catalogo').set(como(Rol.MEDICO));
      const hierro = cat.body.micronutrientes[2];

      await request(http())
        .patch('/v1/pacientes/' + pacienteId + '/carnet')
        .set(como(Rol.MEDICO))
        .send({
          micronutrientes: [
            { micronutrienteId: hierro.id, tramo: 'A9_A_A9', orden: 1, fecha: '2026-01-01' },
          ],
        })
        .expect(400);
    });

    it('un paciente que no existe lo dice', async () => {
      await request(http())
        .get('/v1/pacientes/00000000-0000-4000-8000-000000000000/carnet')
        .set(como(Rol.MEDICO))
        .expect(404);
    });
  });
});
