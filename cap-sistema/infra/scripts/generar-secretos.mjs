#!/usr/bin/env node
/**
 * Crea la carpeta secretos/ que lee docker-compose.prod.yml.
 *
 *   node infra/scripts/generar-secretos.mjs --local      # ensayo en la maquina de uno
 *   node infra/scripts/generar-secretos.mjs              # produccion
 *
 * Genera las llaves al azar (JWT_SECRET, JWT_SECRET_MFA, LLAVE_DATOS,
 * LLAVE_INDICE, LLAVE_RAIZ_TRAZA) y deja los archivos con permisos solo para
 * el dueno. Con --local, las URL de base de datos y Redis apuntan a los
 * contenedores de docker-compose.local.yml; sin el, quedan con CAMBIAR para
 * pegar las de DigitalOcean.
 *
 * Nunca sobreescribe: si ya hay un secretos/comun.env, se detiene. Perder LLAVE_DATOS
 * es perder los expedientes, asi que regenerar por accidente no puede ser
 * facil. Para empezar de cero hay que borrar los .env a mano.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const local = process.argv.includes('--local');
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const carpeta = join(raiz, 'secretos');

// La carpeta existe siempre (lleva su README); lo que no se pisa son los .env.
if (existsSync(join(carpeta, 'comun.env'))) {
  console.error('Ya hay secretos en ' + carpeta + '. No se tocan: si de verdad hay que regenerar, borrar los .env a mano primero.');
  process.exit(1);
}

const hex = () => randomBytes(32).toString('hex');
const secreto = () => randomBytes(48).toString('base64url');

// En local, las contrasenas son las de infra/postgres/init.sql; en produccion
// se cambian en el SQL antes de correrlo contra la base administrada.
const bd = (rol, esquema) =>
  local
    ? `postgresql://cap_${rol}:dev_${rol}@postgres:5432/cap?schema=${esquema}`
    : `postgresql://cap_${rol}:CAMBIAR@CAMBIAR-host.db.ondigitalocean.com:25060/cap?schema=${esquema}&sslmode=require`;
const bdMigrador = (esquema) =>
  local
    ? `postgresql://cap_migrador:dev_migrador@postgres:5432/cap?schema=${esquema}`
    : `postgresql://cap_migrador:CAMBIAR@CAMBIAR-host.db.ondigitalocean.com:25060/cap?schema=${esquema}&sslmode=require`;
const redis = local
  ? 'redis://:ensayo_local@redis:6379'
  : 'rediss://default:CAMBIAR@CAMBIAR-host.db.ondigitalocean.com:25061';

const llaveDatos = hex();
const llaveIndice = hex();

const archivos = {
  // Lo que comparten los cinco servicios. JWT_SECRET tiene que ser EL MISMO
  // en todos: cada uno valida por su cuenta los tokens que emite auth.
  'comun.env': [
    'LOG_LEVEL=info',
    'JWT_SECRET=' + secreto(),
    'JWT_EXPIRACION=15m',
    '# Cifrado de datos clinicos. Si se pierden, los expedientes son irrecuperables:',
    '# guardar copia FUERA del servidor.',
    'LLAVE_DATOS=' + llaveDatos,
    'LLAVE_INDICE=' + llaveIndice,
    'REDIS_URL=' + redis,
  ],
  'auth.env': [
    'DATABASE_URL=' + bd('auth', 'auth'),
    '# Distinto de JWT_SECRET a la fuerza: el servicio no arranca si son iguales.',
    'JWT_SECRET_MFA=' + secreto(),
  ],
  'usuarios.env': ['DATABASE_URL=' + bd('usuarios', 'usuarios')],
  'programas.env': ['DATABASE_URL=' + bd('programas', 'programas')],
  'medicamentos.env': ['DATABASE_URL=' + bd('medicamentos', 'medicamentos')],
  'trazabilidad.env': [
    'DATABASE_URL=' + bd('trazabilidad', 'trazabilidad'),
    '# Firma del hash raiz diario. Distinta de las otras dos llaves a proposito.',
    'LLAVE_RAIZ_TRAZA=' + hex(),
  ],
  // Solo lo ven los contenedores de migracion (perfil `migrar`).
  'migrador.env': [
    'DIRECT_URL_AUTH=' + bdMigrador('auth'),
    'DIRECT_URL_USUARIOS=' + bdMigrador('usuarios'),
    'DIRECT_URL_PROGRAMAS=' + bdMigrador('programas'),
    'DIRECT_URL_MEDICAMENTOS=' + bdMigrador('medicamentos'),
    'DIRECT_URL_TRAZABILIDAD=' + bdMigrador('trazabilidad'),
  ],
};

mkdirSync(carpeta, { mode: 0o700, recursive: true });
for (const [nombre, lineas] of Object.entries(archivos)) {
  const ruta = join(carpeta, nombre);
  writeFileSync(ruta, lineas.join('\n') + '\n', { mode: 0o600 });
  chmodSync(ruta, 0o600);
}

// El .env de compose: solo el dominio (no es secreto, pero va junto). Si ya
// hay un .env (el de desarrollo), solo se le anade la linea.
const envCompose = join(raiz, '.env');
const lineaDominio = 'DOMINIO=' + (local ? 'localhost' : 'CAMBIAR.tu-dominio.gt') + '\n';
if (!existsSync(envCompose)) {
  writeFileSync(envCompose, lineaDominio);
  console.log('Creado ' + envCompose + ' con DOMINIO');
} else if (!/^DOMINIO=/m.test(readFileSync(envCompose, 'utf8'))) {
  appendFileSync(envCompose, '\n# Dominio del gateway (docker-compose.prod.yml)\n' + lineaDominio);
  console.log('Anadido DOMINIO a ' + envCompose);
}

console.log('Creada ' + carpeta + ' (' + Object.keys(archivos).length + ' archivos, modo ' + (local ? 'LOCAL' : 'PRODUCCION') + ').');
if (!local) {
  console.log('Falta pegar a mano: las DATABASE_URL/DIRECT_URL_* y REDIS_URL de DigitalOcean (buscar CAMBIAR), y DOMINIO en .env.');
}
