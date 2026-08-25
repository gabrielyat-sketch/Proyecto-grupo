/**
 * Carga de prueba: 100,000 pacientes sinteticos.
 *
 * Es el criterio de terminado de la Etapa 4 (arquitectura §9.7 y §15.2):
 * la busqueda de expediente debe responder en menos de 2 segundos con ese
 * volumen. Se corre AHORA y no al final, que es cuando todavia se puede
 * corregir un indice sin rehacer pantallas.
 *
 * Los datos son ficticios. Este script NUNCA se ejecuta contra produccion.
 *
 * Uso:  npm run carga            (100,000 por defecto)
 *       npm run carga -- 5000
 */
import { config as cargarDotenv } from 'dotenv';
import { randomInt } from 'node:crypto';
import { ServicioCifrado } from '@cap/shared';
import { PrismaClient, Sexo, Idioma } from './generado';

cargarDotenv({ quiet: true });

/**
 * Se conecta con DIRECT_URL, es decir como cap_migrador.
 *
 * No es un atajo: el usuario de EJECUCION solo tiene USAGE sobre la secuencia
 * del correlativo, que permite nextval() pero no setval(). Y esta bien que asi
 * sea — la aplicacion nunca debe poder reposicionar el correlativo de
 * expedientes. Este script es herramienta de administracion, no aplicacion.
 */
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});
const cifrado = new ServicioCifrado(process.env.LLAVE_DATOS!, process.env.LLAVE_INDICE!);

const TOTAL = Number(process.argv[2] ?? 100_000);
const LOTE = 2_000;

const APELLIDOS = [
  'Caal', 'Coc', 'Choc', 'Cucul', 'Chub', 'Ical', 'Ixim', 'Macz', 'Pop', 'Quej',
  'Sacul', 'Tiul', 'Tzalam', 'Xol', 'Yat', 'Perez', 'Lopez', 'Garcia', 'Morales',
  'Hernandez', 'Ramirez', 'Sanchez', 'Cojoc', 'Bol', 'Che', 'Tot', 'Rax', 'Sam',
];
const NOMBRES = [
  'Juana', 'Maria', 'Ana', 'Rosa', 'Carmen', 'Elena', 'Petrona', 'Marta',
  'Juan', 'Pedro', 'Carlos', 'Jose', 'Manuel', 'Miguel', 'Santiago', 'Domingo',
  'Isabel', 'Lucia', 'Teresa', 'Francisco', 'Antonio', 'Rafael', 'Sebastian',
];
const COMUNIDADES = [
  'Purulha Centro', 'Chilasco', 'El Zapote', 'Matanzas', 'San Rafael Chilasco',
  'Ribacó', 'Los Encuentros', 'Panima', 'La Union Barrios', 'Chilasco Bajo',
  'Santa Elena', 'El Rejon',
];

function elemento<T>(a: readonly T[]): T {
  return a[randomInt(a.length)];
}

/** DPI sintetico de 13 digitos, unico por indice. */
function dpiSintetico(i: number): string {
  return String(1000000000000 + i);
}

function fechaNacimiento(): Date {
  const anio = 1930 + randomInt(95);
  return new Date(Date.UTC(anio, randomInt(12), 1 + randomInt(28)));
}

async function main(): Promise<void> {
  console.log('Cargando ' + TOTAL.toLocaleString('es-GT') + ' pacientes sinteticos...');
  const inicio = Date.now();

  // ─── comunidades ───────────────────────────────────────────────────────
  const comunidades: string[] = [];
  for (const nombre of COMUNIDADES) {
    const c = await prisma.comunidad.upsert({
      where: { nombre },
      update: {},
      create: { nombre, distante: Math.random() < 0.3 },
    });
    comunidades.push(c.id);
  }
  console.log('  ' + comunidades.length + ' comunidades listas');

  // ─── pacientes y expedientes ───────────────────────────────────────────
  const yaHay = await prisma.paciente.count();
  const desde = yaHay;

  for (let base = 0; base < TOTAL; base += LOTE) {
    const cantidad = Math.min(LOTE, TOTAL - base);

    const pacientes = [];
    const expedientes = [];
    const digitalizaciones = [];

    for (let k = 0; k < cantidad; k++) {
      const i = desde + base + k;
      const pacienteId = crypto.randomUUID();
      const expedienteId = crypto.randomUUID();
      const dpi = dpiSintetico(i);
      const numero = 'EXP-2026-' + String(i + 1).padStart(6, '0');

      pacientes.push({
        id: pacienteId,
        dpiCifrado: new Uint8Array(cifrado.cifrar(dpi)),
        dpiIndice: new Uint8Array(cifrado.indiceCiego(dpi)),
        nombres: elemento(NOMBRES) + ' ' + elemento(NOMBRES),
        apellidos: elemento(APELLIDOS) + ' ' + elemento(APELLIDOS),
        fechaNacimiento: fechaNacimiento(),
        sexo: randomInt(2) === 0 ? Sexo.F : Sexo.M,
        idioma: elemento([Idioma.ESPANOL, Idioma.POQOMCHI, Idioma.QEQCHI]),
        comunidadId: elemento(comunidades),
      });

      expedientes.push({
        id: expedienteId,
        pacienteId,
        numeroCifrado: new Uint8Array(cifrado.cifrar(numero)),
        numeroIndice: new Uint8Array(cifrado.indiceCiego(numero)),
      });

      digitalizaciones.push({
        expedienteId,
        estado: randomInt(10) < 3 ? ('PENDIENTE' as const) : ('COMPLETO' as const),
      });
    }

    await prisma.paciente.createMany({ data: pacientes, skipDuplicates: true });
    await prisma.expediente.createMany({ data: expedientes, skipDuplicates: true });
    await prisma.registroDigitalizacion.createMany({
      data: digitalizaciones,
      skipDuplicates: true,
    });

    const hechos = base + cantidad;
    if (hechos % 20_000 === 0 || hechos === TOTAL) {
      const seg = ((Date.now() - inicio) / 1000).toFixed(0);
      console.log('  ' + hechos.toLocaleString('es-GT') + ' / ' + TOTAL.toLocaleString('es-GT') + '  (' + seg + ' s)');
    }
  }

  // La secuencia debe quedar por delante de lo insertado, o el proximo alta
  // real chocaria con un numero ya usado.
  await prisma.$executeRawUnsafe(
    "SELECT setval('usuarios.expediente_correlativo', " + (desde + TOTAL + 1) + ', false)',
  );

  const total = await prisma.paciente.count();
  console.log('');
  console.log('Listo en ' + ((Date.now() - inicio) / 1000).toFixed(1) + ' s.');
  console.log('Pacientes en la base: ' + total.toLocaleString('es-GT'));
}

main()
  .catch((e) => {
    console.error('Fallo la carga:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
