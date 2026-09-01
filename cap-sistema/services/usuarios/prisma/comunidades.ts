/**
 * Las comunidades que atiende el CAP de Purulha.
 *
 * **Confirmadas por el CAP**, del listado que entrego el personal el 31 de
 * agosto de 2026. Antes de esto habia doce comunidades inventadas por nosotros
 * para poder cargar pacientes de prueba, y ninguna coincidia con la realidad
 * salvo Panima y Ribaco.
 *
 * En la estructura administrativa del municipio, una ALDEA es una comunidad: el
 * CAP las nombra asi y su listado las agrupa bajo ese titulo. Purulha Centro no
 * es una aldea sino la cabecera, pero es una comunidad igual —de hecho es donde
 * viven los siete barrios— y por eso encabeza la lista.
 *
 * Es idempotente: se identifica cada comunidad por su nombre, asi que volver a
 * ejecutarlo actualiza en vez de duplicar. Y **desactiva** las que ya no esten
 * en la lista, sin borrarlas: si algun paciente quedo registrado en una, su
 * direccion tiene que seguir leyendose.
 *
 * Uso:  npm run comunidades -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient } from '../generado';

cargarDotenv({ quiet: true });

/**
 * `distante` marca las que quedan lejos del centro.
 *
 * No es un adorno geografico: la usan los programas de seguimiento para saber
 * a quien cuesta mas traer a un control, y el CAP todavia no ha confirmado
 * cuales lo son. Va en `false` hasta que lo diga: marcar al azar produciria
 * listas de prioridad basadas en nada.
 */
const COMUNIDADES: string[] = [
  // La cabecera. Es donde estan los siete barrios.
  'Purulha Centro',
  /*
    No es una comunidad, es donde se listan los caserios.

    Los cuarenta y seis caserios del municipio estaban colgando de la cabecera
    porque es donde el documento del CAP los escribe, y eso obligaba a elegir
    «Purulha Centro» —el casco urbano— para poder registrar a alguien que vive
    en un caserio. Hasta que el CAP diga a que aldea pertenece cada uno, esta
    entrada los deja alcanzables sin afirmar de donde son.
  */
  'Caserios',
  // Las ocho aldeas, en el orden en que las entrego el CAP.
  'El Durazno',
  'Mocohan',
  'Monte Blanco',
  'Panchisivic',
  'Panima',
  'Peña del Angel',
  'Ribaco',
  'Sacsamani',
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  let creadas = 0;
  let actualizadas = 0;

  for (const nombre of COMUNIDADES) {
    const existe = await prisma.comunidad.findUnique({ where: { nombre } });
    await prisma.comunidad.upsert({
      where: { nombre },
      create: { nombre },
      update: { activa: true },
    });
    if (existe) actualizadas += 1;
    else creadas += 1;
  }

  /*
    Las que ya no estan en la lista se desactivan, no se borran.

    Borrarlas exigiria mover o eliminar a cada paciente registrado en ellas, y
    eso es perder informacion clinica por un cambio de catalogo. Desactivadas
    dejan de ofrecerse en recepcion pero siguen leyendose en los expedientes
    viejos, que es exactamente lo que hace falta.
  */
  const { count: retiradas } = await prisma.comunidad.updateMany({
    where: { activa: true, nombre: { notIn: COMUNIDADES } },
    data: { activa: false },
  });

  console.log('Comunidades del CAP de Purulha:');
  console.log('  ' + creadas + ' creadas');
  console.log('  ' + actualizadas + ' ya existian');
  if (retiradas > 0) {
    console.log('  ' + retiradas + ' desactivadas por no estar en el listado del CAP');
    console.log('    (no se borran: los pacientes registrados en ellas siguen legibles)');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudieron sembrar las comunidades:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
