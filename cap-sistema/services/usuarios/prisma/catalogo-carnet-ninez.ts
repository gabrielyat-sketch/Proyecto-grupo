/**
 * Catalogo del carnet del lactante y la ninez: vacunas y micronutrientes.
 *
 * Transcrito de las paginas 1 y 2 del formulario oficial del MSPAS
 * (`docs/pdfs/ficha clínica de la lactancia y niñez .pdf`), renderizado a
 * imagen porque el escaneo no tiene capa de texto.
 *
 * **Las celdas sombreadas del papel son informacion, no adorno.** Dicen que
 * casillas se pueden llenar: Hepatitis y BCG solo tienen primera dosis, DPT
 * solo los dos refuerzos, el desparasitante empieza a los DOS anos. Sembrar
 * las cinco dosis para las diez vacunas ofreceria cincuenta casillas donde el
 * papel deja treinta y una, y alguien acabaria anotando una tercera dosis de
 * BCG que no existe.
 *
 * Es idempotente: cada elemento se identifica por su posicion en el
 * formulario, asi que volver a ejecutarlo actualiza en vez de duplicar.
 *
 * Uso:  npm run carnet:ninez -w @cap/usuarios
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient, TramoEdad } from '../generado';

cargarDotenv({ quiet: true });

/**
 * El esquema de vacunacion, tal como lo imprime la tabla.
 *
 * `dosis` lleva las cinco columnas del papel —Primero, Segundo, Tercero,
 * Refuerzo, Refuerzo— y `null` significa **casilla sombreada**: esa dosis no
 * aplica a esa vacuna y la pantalla no la ofrece.
 *
 * Las tres ultimas filas —Neumococo, Hb y Otras— el papel las imprime con las
 * cinco casillas EN BLANCO, sin edades y sin sombrear. Se siembran llenables y
 * sin edad recomendada, que es lo unico honesto: el formulario deja el hueco
 * abierto y nadie del CAP ha dicho todavia con que esquema se llenan.
 */
const VACUNAS: { nombre: string; dosis: (string | null)[] }[] = [
  { nombre: 'Hepatitis', dosis: ['RN', null, null, null, null] },
  { nombre: 'BCG', dosis: ['RN', null, null, null, null] },
  { nombre: 'Rotavirus', dosis: ['2 meses', '4 meses', '6 meses', null, null] },
  { nombre: 'OPV', dosis: ['2 meses', '4 meses', '6 meses', '18 meses', '4 años'] },
  // Solo los dos refuerzos. Las tres primeras casillas estan sombreadas.
  { nombre: 'DPT', dosis: [null, null, null, '18 meses', '4 años'] },
  { nombre: 'Pentavalente', dosis: ['2 meses', '4 meses', '6 meses', null, null] },
  // El papel dice solo "meses", sin numero. Se transcribe tal cual: inventarle
  // una edad a una vacuna es peor que dejar la duda a la vista.
  { nombre: 'SPR', dosis: ['meses', null, null, null, null] },
  { nombre: 'Neumococo', dosis: [null, null, null, null, null] },
  { nombre: 'Hb', dosis: [null, null, null, null, null] },
  { nombre: 'Otras', dosis: [null, null, null, null, null] },
];

/** Las filas que el papel deja llenables pero sin esquema impreso. */
const SIN_ESQUEMA_IMPRESO = new Set(['Neumococo', 'Hb', 'Otras']);

const TRAMOS: TramoEdad[] = [
  TramoEdad.M6_A_A1,
  TramoEdad.A1_A_A2,
  TramoEdad.A2_A_A3,
  TramoEdad.A3_A_A4,
  TramoEdad.A4_A_A5,
];

/**
 * Los micronutrientes, con cuantas entregas van en cada tramo de edad.
 *
 * Son DOS tablas distintas en el papel y ninguna es uniforme:
 *
 *  - **Dosis de** (vitamina A, desparasitante): una entrega en el primer
 *    tramo y dos en los demas. El desparasitante ademas tiene sombreados los
 *    tres primeros huecos: no empieza hasta los dos anos.
 *  - **Entregas de** (sulfato ferroso, acido folico): dos en el primer tramo
 *    y cuatro en los demas.
 *
 * El numero de cada fila es cuantas casillas trae ese tramo. Un 0 es una
 * casilla sombreada: el producto todavia no toca a esa edad.
 */
const MICRONUTRIENTES: { nombre: string; porTramo: number[] }[] = [
  //                                6m-1a  1-2a  2-3a  3-4a  4-5a
  { nombre: 'Vitamina "A"', porTramo: [1, 2, 2, 2, 2] },
  { nombre: 'Desparasitante', porTramo: [0, 0, 2, 2, 2] },
  { nombre: 'Sulfato Ferroso', porTramo: [2, 4, 4, 4, 4] },
  { nombre: 'Ácido Fólico', porTramo: [2, 4, 4, 4, 4] },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  let casillasVacuna = 0;
  let conEdad = 0;
  let entregas = 0;

  await prisma.$transaction(async (tx) => {
    // ── Vacunas ──────────────────────────────────────────────────────────
    for (const [i, v] of VACUNAS.entries()) {
      const vacuna = await tx.catalogoVacuna.upsert({
        where: { orden: i + 1 },
        create: { orden: i + 1, nombre: v.nombre },
        update: { nombre: v.nombre, activo: true },
      });

      // Se borran las dosis que ya no aplican antes de sembrar las que si:
      // si una revision del MSPAS retira una dosis, dejarla aqui la seguiria
      // ofreciendo en la pantalla.
      await tx.dosisRecomendada.deleteMany({ where: { vacunaId: vacuna.id } });

      const abierta = SIN_ESQUEMA_IMPRESO.has(v.nombre);
      for (const [j, edad] of v.dosis.entries()) {
        // Sombreada: no aplica. Salvo en las tres filas que el papel deja
        // abiertas, donde la casilla existe pero sin edad impresa.
        if (edad === null && !abierta) continue;

        await tx.dosisRecomendada.create({
          data: { vacunaId: vacuna.id, orden: j + 1, edadRecomendada: edad },
        });
        casillasVacuna += 1;
        if (edad !== null) conEdad += 1;
      }
    }

    // ── Micronutrientes ──────────────────────────────────────────────────
    for (const [i, m] of MICRONUTRIENTES.entries()) {
      const producto = await tx.catalogoMicronutriente.upsert({
        where: { orden: i + 1 },
        create: { orden: i + 1, nombre: m.nombre },
        update: { nombre: m.nombre, activo: true },
      });

      await tx.entregaEsperada.deleteMany({ where: { micronutrienteId: producto.id } });

      for (const [t, cuantas] of m.porTramo.entries()) {
        for (let orden = 1; orden <= cuantas; orden += 1) {
          await tx.entregaEsperada.create({
            data: { micronutrienteId: producto.id, tramo: TRAMOS[t], orden },
          });
          entregas += 1;
        }
      }
    }
  });

  console.log('Carnet del lactante y ninez:');
  console.log('  ' + VACUNAS.length + ' vacunas');
  console.log('  ' + casillasVacuna + ' casillas de dosis llenables');
  console.log('    de ellas ' + conEdad + ' con edad impresa en el papel');
  console.log(
    '    y ' +
      (casillasVacuna - conEdad) +
      ' de Neumococo, Hb y Otras, que el papel deja sin esquema',
  );
  console.log('  ' + MICRONUTRIENTES.length + ' micronutrientes');
  console.log('  ' + entregas + ' entregas esperadas repartidas en 5 tramos de edad');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo sembrar el carnet:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
