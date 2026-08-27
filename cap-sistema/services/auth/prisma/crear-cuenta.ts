/**
 * Crea una cuenta del personal desde la terminal.
 *
 * Es una herramienta de DESARROLLO. El sitio donde se crean las cuentas de
 * verdad es el panel de administracion, que registra quien las creo; este
 * script escribe directo en la base y por tanto no deja esa huella. Sirve
 * mientras esa pantalla no existe, y para levantar un entorno de pruebas con
 * una cuenta de cada rol sin tener que ir sacando tokens a mano.
 *
 * Sigue las mismas reglas que el seed:
 *
 * - La contrasena se genera al azar y se imprime UNA sola vez.
 * - La cuenta nace con debeCambiarContrasena en true.
 * - Si el usuario ya existe, NO lo toca: ejecutarlo dos veces por error no
 *   puede restablecerle la contrasena a nadie.
 *
 * Uso:
 *   npm run cuenta -w @cap/auth -- jperez MEDICO "Juana" "Perez Caal"
 *   npm run cuenta -w @cap/auth -- --demo
 *
 * Con --demo crea una cuenta por cada rol que no exista todavia.
 */
import { config as cargarDotenv } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { hashContrasena, Rol } from '@cap/shared';
import { PrismaClient } from '../generado';

cargarDotenv({ quiet: true });

const prisma = new PrismaClient();

const ROLES = Object.values(Rol);

/** Sin caracteres ambiguos: esta contrasena se transcribe a mano. */
function generarContrasena(): string {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(randomBytes(16), (b) => alfabeto[b % alfabeto.length]).join('');
}

/** Las cuentas del entorno de pruebas, una por rol. */
const DEMO: { usuario: string; rol: Rol; nombres: string; apellidos: string }[] = [
  { usuario: 'jperez', rol: Rol.MEDICO, nombres: 'Juana', apellidos: 'Perez Caal' },
  { usuario: 'mcaal', rol: Rol.ENFERMERIA, nombres: 'Marta', apellidos: 'Caal Xol' },
  { usuario: 'rlopez', rol: Rol.RECEPCION, nombres: 'Rosa', apellidos: 'Lopez Tzul' },
  { usuario: 'sgomez', rol: Rol.FARMACIA, nombres: 'Sergio', apellidos: 'Gomez Ical' },
  { usuario: 'ddirector', rol: Rol.DIRECTOR, nombres: 'Delia', apellidos: 'Sis Chen' },
];

interface Cuenta {
  usuario: string;
  rol: Rol;
  nombres: string;
  apellidos: string;
}

async function crear(cuenta: Cuenta): Promise<void> {
  const nombre = cuenta.usuario.toLowerCase();

  const yaExiste = await prisma.usuario.findUnique({ where: { usuario: nombre } });
  if (yaExiste) {
    console.log('  ' + nombre.padEnd(14) + 'ya existe (' + yaExiste.rol + '), no se toca.');
    return;
  }

  const contrasena = generarContrasena();
  await prisma.usuario.create({
    data: {
      usuario: nombre,
      nombres: cuenta.nombres,
      apellidos: cuenta.apellidos,
      rol: cuenta.rol,
      contrasenaHash: await hashContrasena(contrasena),
      debeCambiarContrasena: true,
    },
  });

  console.log(
    '  ' + nombre.padEnd(14) + cuenta.rol.padEnd(14) + 'contrasena: ' + contrasena,
  );
}

function ayuda(): void {
  console.log('');
  console.log('  Crear una cuenta:');
  console.log('    npm run cuenta -w @cap/auth -- <usuario> <rol> "<nombres>" "<apellidos>"');
  console.log('');
  console.log('  Crear una cuenta de cada rol para probar:');
  console.log('    npm run cuenta -w @cap/auth -- --demo');
  console.log('');
  console.log('  Roles: ' + ROLES.join(' · '));
  console.log('');
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Este script no corre en produccion. Alli las cuentas se crean desde el panel, ' +
        'que registra quien las creo.',
    );
  }

  const argumentos = process.argv.slice(2);

  if (argumentos.length === 0 || argumentos[0] === '--ayuda' || argumentos[0] === '-h') {
    ayuda();
    return;
  }

  const cuentas: Cuenta[] = [];

  if (argumentos[0] === '--demo') {
    cuentas.push(...DEMO);
  } else {
    const [usuario, rol, nombres, apellidos] = argumentos;

    if (!usuario || !rol) {
      ayuda();
      throw new Error('Faltan el usuario o el rol.');
    }
    if (!/^[a-z0-9._-]+$/i.test(usuario) || usuario.length < 3 || usuario.length > 60) {
      throw new Error(
        'El usuario debe tener entre 3 y 60 caracteres: letras, numeros, punto, guion y guion bajo.',
      );
    }

    const rolNormalizado = rol.toUpperCase() as Rol;
    if (!ROLES.includes(rolNormalizado)) {
      throw new Error('Rol desconocido: "' + rol + '". Los roles son ' + ROLES.join(', ') + '.');
    }

    cuentas.push({
      usuario,
      rol: rolNormalizado,
      nombres: nombres ?? 'Sin',
      apellidos: apellidos ?? 'nombre',
    });
  }

  console.log('');
  console.log('  Cuentas');
  console.log('  -------');
  for (const cuenta of cuentas) await crear(cuenta);

  console.log('');
  console.log('  Anote las contrasenas ahora: no se vuelven a mostrar.');
  console.log('  Todas piden cambiarse en el primer inicio de sesion.');
  console.log('');
  console.log('  Administrador y Director necesitan ademas configurar el segundo');
  console.log('  factor (TOTP). Los demas roles entran directo tras cambiar la');
  console.log('  contrasena.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('');
    console.error('  ' + (e instanceof Error ? e.message : String(e)));
    console.error('');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
