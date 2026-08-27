/**
 * Cuenta administradora inicial.
 *
 * Sin esto el sistema queda inutilizable: no hay forma de crear la primera
 * cuenta, porque crear cuentas exige ser Administrador.
 *
 * Reglas que sigue este script:
 *
 * - Si ya existe algun Administrador, NO hace nada. Ejecutarlo dos veces por
 *   error no puede crear una puerta trasera ni restablecer una contrasena.
 * - La contrasena se genera al azar y se imprime UNA sola vez. No queda
 *   escrita en el codigo ni en ningun archivo.
 * - La cuenta nace con debeCambiarContrasena en true.
 *
 * Uso:  npx tsx prisma/seed.ts      (o el comando `npm run seed`)
 */
import { config as cargarDotenv } from 'dotenv';
import { randomBytes } from 'node:crypto';
import { hashContrasena } from '@cap/shared';
import { PrismaClient } from '../generado';

cargarDotenv({ quiet: true });

const prisma = new PrismaClient();

/** Sin caracteres ambiguos: esta contrasena se transcribe a mano. */
function generarContrasena(): string {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(randomBytes(16), (b) => alfabeto[b % alfabeto.length]).join('');
}

async function main(): Promise<void> {
  const yaExiste = await prisma.usuario.findFirst({ where: { rol: 'ADMINISTRADOR' } });

  if (yaExiste) {
    console.log('Ya existe una cuenta administradora ("' + yaExiste.usuario + '"). No se hace nada.');
    console.log('Para restablecer su contrasena use el panel de administracion,');
    console.log('o cree otra cuenta administradora desde una sesion existente.');
    return;
  }

  const usuario = process.env.ADMIN_INICIAL ?? 'admin';
  const contrasena = generarContrasena();

  await prisma.usuario.create({
    data: {
      usuario,
      nombres: 'Administrador',
      apellidos: 'del Sistema',
      rol: 'ADMINISTRADOR',
      contrasenaHash: await hashContrasena(contrasena),
      debeCambiarContrasena: true,
    },
  });

  console.log('');
  console.log('  Cuenta administradora creada');
  console.log('  ----------------------------');
  console.log('  usuario:    ' + usuario);
  console.log('  contrasena: ' + contrasena);
  console.log('');
  console.log('  Anotela ahora: no se vuelve a mostrar.');
  console.log('  Debe cambiarse en el primer inicio de sesion.');
  console.log('  Al ser rol ADMINISTRADOR, el sistema exigira configurar el');
  console.log('  segundo factor (TOTP) antes de dar acceso.');
  console.log('');
}

main()
  .catch((e) => {
    console.error('No se pudo crear la cuenta inicial:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
