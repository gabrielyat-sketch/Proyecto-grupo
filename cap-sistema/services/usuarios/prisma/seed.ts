import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Siembra TODOS los datos de referencia de `usuarios`, en orden.
 *
 * **Esto existe porque faltaba y se notó desplegando.** El `package.json` ya
 * declaraba `"seed": "tsx prisma/seed.ts"` pero el archivo no existía, así que
 * el comando fallaba; y los datos de referencia vivían en siete scripts
 * sueltos que había que recordar uno por uno. Al subir el sistema a la nube se
 * sembró la cuenta de administrador y nada más: la nube quedó sin comunidades
 * —no se podía registrar a nadie— y sin los catálogos de las fichas.
 *
 * Que sean siete comandos y no uno no era un detalle de comodidad: era la
 * única manera de olvidar uno, y se olvidaron los siete.
 *
 * **No son datos de prueba, son datos del CAP.** Las comunidades, los lugares
 * poblados, los signos de peligro, los diagnósticos, las vacunas y los
 * micronutrientes salen de los formularios del MSPAS: sin ellos las pantallas
 * existen pero no tienen qué ofrecer. Los datos de prueba son otra cosa y
 * viven en `carga-prueba.ts`, que NO se corre aquí ni contra producción.
 *
 * **Se puede repetir sin miedo.** Cada script usa `upsert`: lo que ya está se
 * actualiza, lo que falta se crea, y lo que el CAP retiró se desactiva en vez
 * de borrarse para que los pacientes registrados en ello sigan legibles.
 *
 * El orden importa en un sitio: los lugares poblados cuelgan de su comunidad,
 * así que las comunidades van primero.
 */
const PASOS = [
  { npm: 'comunidades', que: 'Comunidades del CAP' },
  { npm: 'lugares', que: 'Lugares poblados (cuelgan de las comunidades)' },
  { npm: 'catalogo', que: 'Catalogo de la ficha de adultos' },
  { npm: 'catalogo:neonato', que: 'Catalogo de la ficha de neonatos' },
  { npm: 'catalogo:ninez', que: 'Catalogo de la ficha de lactancia y ninez' },
  { npm: 'catalogo:prenatal', que: 'Catalogo de la ficha prenatal y posparto' },
  { npm: 'carnet:ninez', que: 'Carnet de ninez: vacunas y micronutrientes' },
];

// prisma/ -> usuarios -> services -> cap-sistema, que es donde esta el
// workspace: los scripts se invocan con -w para que npm resuelva las
// dependencias del monorepo igual que en desarrollo.
const RAIZ = resolve(__dirname, '..', '..', '..');

function main() {
  console.log('Sembrando los datos de referencia de usuarios.');
  console.log(PASOS.length + ' pasos. Se puede repetir sin romper nada.\n');

  for (const [i, paso] of PASOS.entries()) {
    console.log('── ' + (i + 1) + '/' + PASOS.length + '  ' + paso.que);

    const r = spawnSync('npm', ['run', paso.npm, '-w', '@cap/usuarios'], {
      cwd: RAIZ,
      stdio: 'inherit',
      // npm es un .cmd en Windows y spawn no lo resuelve solo.
      shell: true,
    });

    if (r.status !== 0) {
      // Se corta en el primero que falla en vez de seguir: si las comunidades
      // no entraron, los lugares poblados tampoco van a entrar, y una lista de
      // siete errores encadenados esconde cual fue el que importo.
      console.error('\nFallo en «' + paso.npm + '». Se detiene aqui.');
      console.error('Corregir la causa y volver a correr: npm run seed -w @cap/usuarios');
      process.exitCode = 1;
      return;
    }
    console.log('');
  }

  console.log('Listo: los ' + PASOS.length + ' pasos entraron.');
  console.log('Los datos de PRUEBA son otra cosa y no se siembran aqui.');
}

main();
