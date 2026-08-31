/**
 * Reinicia el segundo factor de una cuenta desde la terminal.
 *
 * Existe por un circulo vicioso que el panel no puede romper: reiniciar el
 * segundo factor de alguien es cosa del Administrador, y **el Administrador no
 * puede reiniciar el suyo** —para entrar al panel necesita justo el factor que
 * ha perdido—. Con una sola cuenta administrativa, que es como esta hoy el
 * sistema, perder el telefono deja el CAP sin nadie que pueda crear cuentas.
 *
 * Es una herramienta de DESARROLLO y de emergencia. La forma normal sigue
 * siendo la pantalla de administracion, que registra quien lo hizo; esto
 * escribe directo en la base y no deja esa huella, asi que se usa cuando no
 * queda otra.
 *
 * Hace exactamente lo mismo que `UsuariosService.reiniciarMfa`: borra la
 * configuracion y sus codigos de respaldo, y revoca las sesiones abiertas. En
 * el proximo acceso el sistema pedira configurarlo de nuevo y mostrara un QR
 * nuevo.
 *
 * Uso:  npm run reiniciar:mfa -w @cap/auth -- admin
 */
import { config as cargarDotenv } from 'dotenv';
import { PrismaClient } from '../generado';

cargarDotenv({ quiet: true });

async function main(): Promise<void> {
  const usuario = process.argv[2];
  if (!usuario) {
    console.error('Falta el usuario. Ejemplo: npm run reiniciar:mfa -w @cap/auth -- admin');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  const cuenta = await prisma.usuario.findUnique({
    where: { usuario },
    select: { id: true, usuario: true, rol: true },
  });

  if (!cuenta) {
    console.log('No existe la cuenta ' + usuario + '.');
    await prisma.$disconnect();
    return;
  }

  const config = await prisma.configuracionMfa.findUnique({
    where: { usuarioId: cuenta.id },
  });

  if (!config) {
    console.log(cuenta.usuario + ' no tiene segundo factor configurado. No hay nada que reiniciar.');
    await prisma.$disconnect();
    return;
  }

  // Todo junto: una cuenta con la configuracion borrada pero los codigos de
  // respaldo vivos seguiria siendo accesible con ellos, que es lo contrario de
  // lo que se pretende al reiniciar.
  const [, respaldo, sesiones] = await prisma.$transaction([
    prisma.configuracionMfa.delete({ where: { usuarioId: cuenta.id } }),
    prisma.codigoRespaldo.deleteMany({ where: { usuarioId: cuenta.id } }),
    prisma.sesionRefresh.updateMany({
      where: { usuarioId: cuenta.id, revocadaEn: null },
      data: { revocadaEn: new Date(), motivoRevocacion: 'reinicio_mfa' },
    }),
  ]);

  console.log('Segundo factor reiniciado: ' + cuenta.usuario + '  (' + cuenta.rol + ')');
  console.log('  codigos de respaldo borrados: ' + respaldo.count);
  console.log('  sesiones revocadas:           ' + sesiones.count);
  console.log('');
  console.log('Ahora, al entrar:');
  console.log('  1. usuario y contrasena de siempre');
  console.log('  2. el sistema mostrara un QR NUEVO');
  console.log('  3. BORRA de tu aplicacion la entrada vieja del CAP antes de escanear,');
  console.log('     o vas a tener dos que se parecen y ninguna forma de saber cual es');
  console.log('  4. escanea, escribe el codigo y guarda los nuevos codigos de respaldo');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('No se pudo reiniciar:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
