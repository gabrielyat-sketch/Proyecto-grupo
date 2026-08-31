/**
 * Diagnostico del segundo factor de UNA cuenta.
 *
 * Responde a la pregunta que ninguna pantalla puede responder: cuando el
 * servidor dice "codigo invalido" y el telefono muestra un codigo, ¿estan los
 * dos mirando el MISMO secreto?
 *
 * Imprime el codigo que el servidor espera AHORA MISMO. Si no coincide con el
 * del telefono, el secreto de la base y el del telefono son distintos, y
 * ningun codigo va a validar nunca por mucho que se espere o se ajuste la hora.
 *
 * NO imprime el secreto: con el, cualquiera que vea la pantalla podria generar
 * codigos de esa cuenta para siempre. El codigo de seis digitos caduca en
 * treinta segundos y no sirve de nada despues.
 *
 * Uso:  npm run diagnostico:mfa -w @cap/auth -- admin
 */
import { config as cargarDotenv } from 'dotenv';
import { generateSync, verifySync } from 'otplib';
import { ServicioCifrado } from '@cap/shared';
import { PrismaClient } from '../generado';

cargarDotenv({ quiet: true });

async function main(): Promise<void> {
  const usuario = process.argv[2];
  if (!usuario) {
    console.error('Falta el usuario. Ejemplo: npm run diagnostico:mfa -w @cap/auth -- admin');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  const cifrado = new ServicioCifrado(process.env.LLAVE_DATOS!, process.env.LLAVE_INDICE!);

  const cuenta = await prisma.usuario.findUnique({
    where: { usuario },
    select: { id: true, usuario: true, rol: true, activo: true, debeCambiarContrasena: true },
  });

  if (!cuenta) {
    console.log('No existe la cuenta ' + usuario + '.');
    await prisma.$disconnect();
    return;
  }

  console.log('Cuenta:  ' + cuenta.usuario + '  (' + cuenta.rol + ')');
  console.log('Activa:  ' + (cuenta.activo ? 'si' : 'NO'));
  console.log('Debe cambiar contrasena: ' + (cuenta.debeCambiarContrasena ? 'si' : 'no'));

  const mfa = await prisma.configuracionMfa.findUnique({ where: { usuarioId: cuenta.id } });

  if (!mfa) {
    console.log('');
    console.log('No tiene segundo factor configurado.');
    console.log('Al entrar, el sistema le pedira configurarlo y le mostrara el QR.');
    await prisma.$disconnect();
    return;
  }

  console.log('Segundo factor: ' + (mfa.activo ? 'ACTIVO' : 'configurado pero SIN activar'));

  const secreto = cifrado.descifrar(Buffer.from(mfa.secretoCifrado));
  const ahora = generateSync({ strategy: 'totp', secret: secreto });

  console.log('');
  console.log('  El servidor espera ahora mismo:  ' + ahora);
  console.log('');
  console.log('Compara ese numero con el que muestra tu aplicacion.');
  console.log('');
  console.log('  IGUAL     -> los dos comparten el secreto. Si aun asi falla, el');
  console.log('               problema es otro: mira el reloj o los intentos fallidos.');
  console.log('  DISTINTO  -> el telefono guarda un secreto viejo. Ningun codigo va a');
  console.log('               validar. Hay que reiniciar el segundo factor y volver a');
  console.log('               escanear:  npm run reiniciar:mfa -w @cap/auth -- ' + usuario);

  // Y de paso, cuantos codigos de respaldo le quedan vivos.
  const respaldo = await prisma.codigoRespaldo.count({ where: { usuarioId: cuenta.id } });
  console.log('');
  console.log('Codigos de respaldo vivos: ' + respaldo);
  if (respaldo > 8) {
    console.log('  OJO: son mas de ocho. Es el defecto que corrigio el PR #16;');
    console.log('  esta cuenta los genero antes. Conviene regenerarlos.');
  }

  // Comprobacion silenciosa de que el propio codigo generado valida contra el
  // secreto: si esto fallara, el problema estaria en la libreria, no en nadie.
  if (!verifySync({ strategy: 'totp', secret: secreto, token: ahora })) {
    console.log('');
    console.log('AVISO: el codigo generado no valida contra su propio secreto.');
    console.log('Eso apunta a la libreria o a la hora del servidor, no a la cuenta.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo diagnosticar:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
