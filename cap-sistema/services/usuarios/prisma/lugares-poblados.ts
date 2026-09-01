/**
 * Barrios y caserios de cada comunidad.
 *
 * **Confirmados por el CAP**, del listado que entrego el personal el 31 de
 * agosto de 2026: siete barrios y cuarenta y seis caserios. Lo que habia antes
 * eran nombres que nos inventamos para que el desplegable tuviera contenido.
 *
 * ⚠️  UNA COSA SIGUE SIN CONFIRMAR: a que aldea pertenece cada caserio.
 *
 * El documento del CAP los lista bajo el encabezado de Purulha Centro, sin
 * decir si son todos suyos o son los del municipio repartidos entre las ocho
 * aldeas. Hay indicios de lo segundo —"Matanzas" y "Los encuentros" aparecen
 * como caserios y tambien suenan a comunidad— pero indicios no son un dato.
 *
 * Estuvieron un tiempo bajo Purulha Centro, que es donde el documento los
 * pone, y eso afirmaba algo falso: obligaba a decir que alguien de Sacsamani
 * vive en el casco urbano. Ahora cuelgan de «Caserios», que no dice de que
 * aldea es cada uno pero tampoco miente. Queda anotado como pregunta para el
 * CAP; corregirlo despues es mover filas de comunidad, no rehacer nada.
 *
 * Es idempotente: cada lugar se identifica por su comunidad y su nombre, asi
 * que volver a ejecutarlo actualiza en vez de duplicar. Y DESACTIVA los que ya
 * no esten en la lista de su comunidad, sin borrarlos: si algun paciente quedo
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
 * Los nombres van SIN la palabra "Barrio" o "Caserio" delante.
 *
 * El tipo ya viaja en su propia columna, asi que repetirlo en el nombre lo
 * duplicaria: la pantalla puede escribir "Barrio El Calvario" cuando haga
 * falta, y un reporte que agrupe por tipo no tiene que adivinarlo del texto.
 * El documento del CAP los escribe con la palabra delante en los barrios y sin
 * ella en los caserios; aqui se unifica.
 */
const POR_COMUNIDAD: Record<string, Lugar[]> = {
  'Purulha Centro': [
    // ── Los siete barrios de la cabecera ────────────────────────────────
    { nombre: 'El Calvario', tipo: 'BARRIO' },
    { nombre: 'El Carpintero', tipo: 'BARRIO' },
    { nombre: 'El Cementerio', tipo: 'BARRIO' },
    { nombre: 'El Centro', tipo: 'BARRIO' },
    { nombre: 'La Cruz I', tipo: 'BARRIO' },
    { nombre: 'La Cruz II', tipo: 'BARRIO' },
    { nombre: 'San Antonio', tipo: 'BARRIO' },
  ],

  /*
    Los caserios, como opcion propia y no dentro de Purulha Centro.

    El documento del CAP los lista bajo el encabezado de la cabecera, y por eso
    estaban ahi: para verlos habia que elegir «Purulha Centro», que es el
    casco urbano. Un caserio no esta dentro del casco urbano, asi que quien
    registraba a alguien de Sacsamani tenia que decir primero que vivia en el
    centro del pueblo para poder decir despues que no.

    Sigue SIN confirmar a que aldea pertenece cada uno. Esto no lo resuelve
    —solo deja de afirmar algo que no sabemos—, y el dia que el CAP lo diga,
    corregirlo es mover filas de comunidad, no rehacer nada.

    En el orden del documento, que es alfabetico. Se respeta la grafia del
    CAP: "Cerrro la Cruz" lleva tres erres en el original y no se corrige por
    nuestra cuenta. Si es una errata, la enmienda quien conoce el sitio.
  */
  Caserios: [
    { nombre: 'Bella Vista Sachut', tipo: 'CASERIO' },
    { nombre: 'Betania', tipo: 'CASERIO' },
    { nombre: 'Cerrro la Cruz', tipo: 'CASERIO' },
    { nombre: 'Chejel', tipo: 'CASERIO' },
    { nombre: 'Chisiguan', tipo: 'CASERIO' },
    { nombre: 'Civija', tipo: 'CASERIO' },
    { nombre: 'Cola del Mico', tipo: 'CASERIO' },
    { nombre: 'Comunal', tipo: 'CASERIO' },
    { nombre: 'Cuchilla del Nogal', tipo: 'CASERIO' },
    { nombre: 'Cumbre Carpintero', tipo: 'CASERIO' },
    { nombre: 'Divina Providencia', tipo: 'CASERIO' },
    { nombre: 'Eben Ezer', tipo: 'CASERIO' },
    { nombre: 'El Chorro', tipo: 'CASERIO' },
    { nombre: 'El Jute', tipo: 'CASERIO' },
    { nombre: 'El Pinal', tipo: 'CASERIO' },
    { nombre: 'Jalaute', tipo: 'CASERIO' },
    { nombre: 'La Pinada', tipo: 'CASERIO' },
    { nombre: 'La Presa', tipo: 'CASERIO' },
    { nombre: 'Los Encuentros (cementerio)', tipo: 'CASERIO' },
    { nombre: 'Los Pinos', tipo: 'CASERIO' },
    { nombre: 'Manantial', tipo: 'CASERIO' },
    { nombre: 'Matanzas', tipo: 'CASERIO' },
    { nombre: 'Mezcal', tipo: 'CASERIO' },
    { nombre: 'Milagro', tipo: 'CASERIO' },
    { nombre: 'Monjas Panimaquito', tipo: 'CASERIO' },
    { nombre: 'Monte Alegre', tipo: 'CASERIO' },
    { nombre: 'Nueva Esperanza', tipo: 'CASERIO' },
    { nombre: 'Orejuela', tipo: 'CASERIO' },
    { nombre: 'Pacayal', tipo: 'CASERIO' },
    { nombre: 'Pampa', tipo: 'CASERIO' },
    { nombre: 'Panimaquito', tipo: 'CASERIO' },
    { nombre: 'Pantin', tipo: 'CASERIO' },
    { nombre: 'Panzal', tipo: 'CASERIO' },
    { nombre: 'Parrachoch', tipo: 'CASERIO' },
    { nombre: 'Patal', tipo: 'CASERIO' },
    { nombre: 'Portezuelo', tipo: 'CASERIO' },
    { nombre: 'Posada del Quetzal', tipo: 'CASERIO' },
    { nombre: 'Repollal', tipo: 'CASERIO' },
    { nombre: 'Rincón el Carpintero', tipo: 'CASERIO' },
    { nombre: 'Rincón el Quetzal', tipo: 'CASERIO' },
    { nombre: 'Rincón Nuevo Jerusalén', tipo: 'CASERIO' },
    { nombre: 'Río Colorado', tipo: 'CASERIO' },
    { nombre: 'San José el Espinero', tipo: 'CASERIO' },
    { nombre: 'Sulin', tipo: 'CASERIO' },
    { nombre: 'Suquinay', tipo: 'CASERIO' },
    { nombre: 'Tres Cruces', tipo: 'CASERIO' },
  ],

  /*
    Las ocho aldeas todavia no tienen lugares poblados propios.

    No es un olvido: el listado del CAP no los detalla. Quedan sin entradas
    hasta que el personal diga que barrios o caserios tiene cada una, y
    mientras tanto recepcion registra a esos pacientes con la comunidad sola,
    que es lo que hoy se puede afirmar de ellos.
  */
};

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  let creados = 0;
  let actualizados = 0;
  let retirados = 0;
  const sinComunidad: string[] = [];

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
      const existe = await prisma.lugarPoblado.findUnique({
        where: { comunidadId_nombre: { comunidadId: comunidad.id, nombre: l.nombre } },
        select: { id: true },
      });

      await prisma.lugarPoblado.upsert({
        where: { comunidadId_nombre: { comunidadId: comunidad.id, nombre: l.nombre } },
        create: { comunidadId: comunidad.id, nombre: l.nombre, tipo: l.tipo },
        update: { tipo: l.tipo, activo: true },
      });

      if (existe) actualizados += 1;
      else creados += 1;
    }

    /*
      Los que ya no estan en la lista se desactivan, no se borran.

      Se desactivan porque si no, un nombre inventado que se corrige aqui
      seguiria ofreciendose en el formulario de alta para siempre. Y no se
      borran porque un paciente pudo quedar registrado en uno de ellos, y su
      direccion tiene que seguir leyendose aunque el lugar ya no se ofrezca.
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

  // Y los que colgaban de comunidades que ya no estan en el catalogo.
  const { count: huerfanos } = await prisma.lugarPoblado.updateMany({
    where: { activo: true, comunidad: { activa: false } },
    data: { activo: false },
  });
  retirados += huerfanos;

  console.log('Lugares poblados del CAP de Purulha:');
  console.log('  ' + creados + ' creados');
  console.log('  ' + actualizados + ' ya existian');
  if (retirados > 0) {
    console.log('  ' + retirados + ' desactivados por no estar en el listado del CAP');
    console.log('    (no se borran: los pacientes registrados en ellos siguen legibles)');
  }
  if (sinComunidad.length > 0) {
    console.log('');
    console.log('  NO se sembraron los de estas comunidades porque no existen:');
    for (const c of sinComunidad) console.log('    - ' + c);
    console.log('  Corre primero:  npm run comunidades -w @cap/usuarios');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudieron sembrar los lugares poblados:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
