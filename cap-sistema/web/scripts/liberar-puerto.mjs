/**
 * Mata lo que este escuchando en un puerto antes de levantar el servidor.
 *
 * Existe por un problema real y repetido: los procesos de Vite sobreviven a los
 * reinicios y se quedan pegados al puerto con estado viejo. Cuando eso pasa, el
 * servidor nuevo se va a otro puerto y el navegador sigue hablando con el
 * viejo. Los sintomas no apuntan a la causa —pantalla en blanco, o "no se puede
 * contactar al servidor" con el backend perfectamente vivo— y se pierde un buen
 * rato buscando en el lugar equivocado.
 *
 * Uso:  node scripts/liberar-puerto.mjs 5173
 */
import { execSync } from 'node:child_process';

const puerto = Number(process.argv[2]);
if (!Number.isInteger(puerto) || puerto <= 0) {
  console.error('Indique un puerto. Ejemplo: node scripts/liberar-puerto.mjs 5173');
  process.exit(1);
}

/** Devuelve los PID que escuchan en el puerto. Vacio si no hay ninguno. */
function procesosEnEscucha() {
  try {
    if (process.platform === 'win32') {
      const salida = execSync('netstat -ano -p TCP', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return [
        ...new Set(
          salida
            .split('\n')
            .filter((l) => l.includes('LISTENING') && l.includes(':' + puerto + ' '))
            .map((l) => l.trim().split(/\s+/).pop())
            .filter((pid) => pid && pid !== '0'),
        ),
      ];
    }
    const salida = execSync('lsof -ti tcp:' + puerto, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return salida.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch {
    // Ni netstat ni lsof encontraron nada: el puerto esta libre.
    return [];
  }
}

const pids = procesosEnEscucha();

if (pids.length === 0) {
  console.log('El puerto ' + puerto + ' esta libre.');
  process.exit(0);
}

for (const pid of pids) {
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /PID ' + pid + ' /T /F', { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGKILL');
    }
    console.log('Liberado el puerto ' + puerto + ': proceso ' + pid + ' terminado.');
  } catch {
    // Puede haber muerto solo entre la consulta y el intento. No es un fallo:
    // el objetivo —que el puerto quede libre— se cumplio igual.
    console.log('El proceso ' + pid + ' ya no estaba.');
  }
}
