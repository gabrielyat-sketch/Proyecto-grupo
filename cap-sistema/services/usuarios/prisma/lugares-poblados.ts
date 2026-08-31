/**
 * Barrios, caserios y aldeas de cada comunidad.
 *
 * Los siete barrios de PURULHA CENTRO estan CONFIRMADOS por el CAP.
 *
 * ⚠️  Los de las demas comunidades NO. Siguen siendo un punto de partida para
 * que la pantalla tenga algo que mostrar, y los nombres reales los tiene que
 * dar el personal del CAP, que es quien conoce el municipio: inventarlos y
 * darlos por buenos produciria estadisticas de cobertura por lugares que no
 * existen.
 *
 * Editar este archivo y volver a correrlo es la forma de corregirlos mientras
 * no exista la pantalla de administracion del catalogo. Es idempotente: cada
 * lugar se identifica por su comunidad y su nombre, asi que volver a
 * ejecutarlo actualiza en vez de duplicar.
 *
 * Ademas DESACTIVA los lugares de esas comunidades que ya no esten en la lista.
 * Sin eso, un nombre inventado que se corrige aqui seguiria ofreciendose en el
 * formulario de alta para siempre. No se borran: si algun paciente quedo
 * registrado en uno, su direccion tiene que seguir leyendose.
 *
 * Uso:  npm run lugares -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient, type TipoLugar } from '../generado';

cargarDotenv({ quiet: true });

interface Lugar {
  nombre: string;
  tipo: TipoLugar;
}

/**
 * Por comunidad, tal como estan registradas en la base.
 *
 * Una comunidad que no aparezca aqui simplemente no tendra lugares que ofrecer,
 * y el campo quedara vacio en la pantalla. No es un error: es que todavia nadie
 * dijo cuales son.
 */
const POR_COMUNIDAD: Record<string, Lugar[]> = {
  // Confirmados por el CAP. Van en el orden en que los entrego el personal,
  // que ademas coincide con el alfabetico: el endpoint ordena por nombre.
  'Purulha Centro': [
    { nombre: 'Barrio El Calvario', tipo: 'BARRIO' },
    { nombre: 'Barrio El Carpintero', tipo: 'BARRIO' },
    { nombre: 'Barrio El Cementerio', tipo: 'BARRIO' },
    { nombre: 'Barrio El Centro', tipo: 'BARRIO' },
    { nombre: 'Barrio La Cruz I', tipo: 'BARRIO' },
    { nombre: 'Barrio La Cruz II', tipo: 'BARRIO' },
    { nombre: 'Barrio San Antonio', tipo: 'BARRIO' },
  ],
  Chilasco: [
    { nombre: 'Chilasco Centro', tipo: 'BARRIO' },
    { nombre: 'El Mirador', tipo: 'CASERIO' },
  ],
  Matanzas: [{ nombre: 'Matanzas Centro', tipo: 'BARRIO' }],
  Panima: [{ nombre: 'Panima Centro', tipo: 'BARRIO' }],
};

async function main(): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

  let creados = 0;
  let retirados = 0;
  let sinComunidad: string[] = [];

  for (const [nombreComunidad, lugares] of Object.entries(POR_COMUNIDAD)) {
    const comunidad = await prisma.comunidad.findUnique({
      where: { nombre: nombreComunidad },
      select: { id: true },
    });

    if (!comunidad) {
      sinComunidad.push(nombreComunidad);
      continue;
    }

    for (const l of lugares) {
      await prisma.lugarPoblado.upsert({
        where: { comunidadId_nombre: { comunidadId: comunidad.id, nombre: l.nombre } },
        create: { comunidadId: comunidad.id, nombre: l.nombre, tipo: l.tipo },
        update: { tipo: l.tipo, activo: true },
      });
      creados += 1;
    }

    /*
      Los que ya no estan en la lista se desactivan, no se borran.

      Se desactivan porque si no, un nombre inventado que se corrige aqui
      seguiria ofreciendose en el formulario de alta para siempre: el script
      solo sabia crear y actualizar. Y no se borran porque un paciente pudo
      quedar registrado en uno de ellos, y su direccion tiene que seguir
      leyendose aunque el lugar ya no se ofrezca a nadie mas.
    */
    const { count } = await prisma.lugarPoblado.updateMany({
      where: {
        comunidadId: comunidad.id,
        activo: true,
        nombre: { notIn: lugares.map((l) => l.nombre) },
      },
      data: { activo: false },
    });
    retirados += count;
  }

  console.log('Lugares poblados: ' + creados + ' en ' + Object.keys(POR_COMUNIDAD).length + ' comunidades.');
  if (retirados > 0) {
    console.log('  ' + retirados + ' lugar(es) que ya no estan en la lista quedaron desactivados.');
  }
  if (sinComunidad.length > 0) {
    console.log('  No existe la comunidad: ' + sinComunidad.join(', '));
  }
  console.log('');
  console.log('  Los siete barrios de Purulha Centro estan confirmados por el CAP.');
  console.log('  Los de las demas comunidades NO. Edite prisma/lugares-poblados.ts');
  console.log('  y vuelva a correrlo cuando el personal los confirme.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudieron sembrar los lugares:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
