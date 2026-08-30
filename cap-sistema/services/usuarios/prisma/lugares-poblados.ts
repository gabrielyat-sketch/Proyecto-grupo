/**
 * Barrios, caserios y aldeas de cada comunidad.
 *
 * ⚠️  LOS NOMBRES DE ESTA LISTA NO ESTAN CONFIRMADOS POR EL CAP.
 *
 * Son un punto de partida para que la pantalla tenga algo que mostrar. Los
 * nombres reales los tiene que dar el personal del CAP, que es quien conoce el
 * municipio: inventarlos y darlos por buenos produciria estadisticas de
 * cobertura por lugares que no existen.
 *
 * Editar este archivo y volver a correrlo es la forma de corregirlos mientras
 * no exista la pantalla de administracion del catalogo. Es idempotente: cada
 * lugar se identifica por su comunidad y su nombre, asi que volver a
 * ejecutarlo actualiza en vez de duplicar.
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
  'Purulha Centro': [
    { nombre: 'Barrio El Centro', tipo: 'BARRIO' },
    { nombre: 'Barrio La Esperanza', tipo: 'BARRIO' },
    { nombre: 'Barrio San Antonio', tipo: 'BARRIO' },
    { nombre: 'Barrio El Calvario', tipo: 'BARRIO' },
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
  }

  console.log('Lugares poblados: ' + creados + ' en ' + Object.keys(POR_COMUNIDAD).length + ' comunidades.');
  if (sinComunidad.length > 0) {
    console.log('  No existe la comunidad: ' + sinComunidad.join(', '));
  }
  console.log('');
  console.log('  Estos nombres NO estan confirmados por el CAP.');
  console.log('  Edite prisma/lugares-poblados.ts y vuelva a correrlo.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudieron sembrar los lugares:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
