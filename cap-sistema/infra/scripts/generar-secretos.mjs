#!/usr/bin/env node
/**
 * Crea la carpeta secretos/ que lee docker-compose.prod.yml.
 *
 *   node infra/scripts/generar-secretos.mjs --local                        # ensayo en la maquina de uno
 *   node infra/scripts/generar-secretos.mjs --droplet --dominio X.com      # produccion: base y Redis en el mismo droplet
 *   node infra/scripts/generar-secretos.mjs                                # produccion: base y Redis administrados
 *
 * Genera las llaves al azar (JWT_SECRET, JWT_SECRET_MFA, LLAVE_DATOS,
 * LLAVE_INDICE, LLAVE_RAIZ_TRAZA) y deja los archivos con permisos solo para
 * el dueno.
 *
 *   --local    las URL apuntan a los contenedores de docker-compose.local.yml
 *              con las contrasenas de desarrollo de infra/postgres/init.sql.
 *   --droplet  las URL apuntan a los contenedores de docker-compose.droplet.yml
 *              y las contrasenas de la base se generan aqui: se escribe
 *              secretos/init.sql (copia de infra/postgres/init.sql con ellas,
 *              sin CREATEDB y sin el esquema plantilla), secretos/postgres.env
 *              y secretos/redis.conf, que esos contenedores montan.
 *   (nada)     las URL quedan con CAMBIAR para pegar las de DigitalOcean.
 *
 * Nunca sobreescribe: si ya hay un secretos/comun.env, se detiene. Perder LLAVE_DATOS
 * es perder los expedientes, asi que regenerar por accidente no puede ser
 * facil. Para empezar de cero hay que borrar los .env a mano.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const argumentos = process.argv.slice(2);
const local = argumentos.includes('--local');
const droplet = argumentos.includes('--droplet');
const posicionDominio = argumentos.indexOf('--dominio');
const dominio = posicionDominio >= 0 ? argumentos[posicionDominio + 1] : undefined;
if (local && droplet) {
  console.error('--local y --droplet se excluyen.');
  process.exit(1);
}
if (posicionDominio >= 0 && !dominio) {
  console.error('--dominio necesita un valor, por ejemplo --dominio sicapguate.com');
  process.exit(1);
}
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const carpeta = join(raiz, 'secretos');

// La carpeta existe siempre (lleva su README); lo que no se pisa son los .env.
if (existsSync(join(carpeta, 'comun.env'))) {
  console.error('Ya hay secretos en ' + carpeta + '. No se tocan: si de verdad hay que regenerar, borrar los .env a mano primero.');
  process.exit(1);
}

const hex = () => randomBytes(32).toString('hex');
const secreto = () => randomBytes(48).toString('base64url');
// Contrasenas de la base: solo letras y numeros para no tener que escaparlas
// en las URL de conexion.
const contrasena = () => randomBytes(24).toString('base64url').replace(/[-_]/g, 'x');

// Roles de la base que llevan contrasena propia. reportes y cms existen en el
// SQL aunque todavia no se desplieguen; plantilla no, porque no se despliega.
const roles = ['migrador', 'auth', 'usuarios', 'programas', 'medicamentos', 'reportes', 'cms', 'trazabilidad'];
const contrasenas = Object.fromEntries(roles.map((rol) => [rol, droplet ? contrasena() : 'dev_' + rol]));
const contrasenaRedis = droplet ? contrasena() : 'ensayo_local';

// En local y droplet la base es un contenedor de la misma red; con DigitalOcean
// administrado, la URL se pega a mano.
const enContenedor = local || droplet;
const bd = (rol, esquema) =>
  enContenedor
    ? `postgresql://cap_${rol}:${contrasenas[rol]}@postgres:5432/cap?schema=${esquema}`
    : `postgresql://cap_${rol}:CAMBIAR@CAMBIAR-host.db.ondigitalocean.com:25060/cap?schema=${esquema}&sslmode=require`;
const bdMigrador = (esquema) =>
  enContenedor
    ? `postgresql://cap_migrador:${contrasenas.migrador}@postgres:5432/cap?schema=${esquema}`
    : `postgresql://cap_migrador:CAMBIAR@CAMBIAR-host.db.ondigitalocean.com:25060/cap?schema=${esquema}&sslmode=require`;
const redis = enContenedor
  ? `redis://:${contrasenaRedis}@redis:6379`
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

if (droplet) {
  // El superusuario del contenedor de Postgres. Solo lo usan el propio
  // contenedor (al crear la base) y el script de respaldo.
  archivos['postgres.env'] = ['POSTGRES_DB=cap', 'POSTGRES_USER=postgres', 'POSTGRES_PASSWORD=' + contrasena()];
  archivos['redis.conf'] = [
    'requirepass ' + contrasenaRedis,
    'appendonly yes',
    '# Solo se le habla por la red interna de Docker.',
    'protected-mode no',
  ];

  // El init.sql de produccion: el de desarrollo con contrasenas reales, sin
  // CREATEDB (migrate deploy no lo necesita) y sin el esquema plantilla.
  let sql = readFileSync(join(raiz, 'infra', 'postgres', 'init.sql'), 'utf8');
  sql = sql.replace(/PASSWORD 'dev_(\w+)'/g, (todo, rol) => {
    if (!contrasenas[rol]) return todo; // plantilla: se recorta abajo
    return `PASSWORD '${contrasenas[rol]}'`;
  });
  sql = sql.replace(/^ALTER ROLE cap_migrador CREATEDB;\n/m, '');
  const inicioPlantilla = sql.indexOf('-- ─── plantilla');
  const inicioBloqueo = sql.indexOf('-- ─── Bloqueo del esquema public');
  if (inicioPlantilla < 0 || inicioBloqueo < inicioPlantilla) {
    console.error('infra/postgres/init.sql cambio de forma: no encuentro el bloque de plantilla para recortarlo.');
    process.exit(1);
  }
  sql = sql.slice(0, inicioPlantilla) + sql.slice(inicioBloqueo);
  if (/dev_\w+/.test(sql)) {
    console.error('Quedo una contrasena de desarrollo en el init.sql generado; revisar infra/postgres/init.sql.');
    process.exit(1);
  }
  archivos['init.sql'] = [
    '-- GENERADO por generar-secretos.mjs --droplet. Contrasenas reales: no versionar.',
    sql.trimEnd(),
  ];
}

mkdirSync(carpeta, { mode: 0o700, recursive: true });
for (const [nombre, lineas] of Object.entries(archivos)) {
  const ruta = join(carpeta, nombre);
  writeFileSync(ruta, lineas.join('\n') + '\n', { mode: 0o600 });
  chmodSync(ruta, 0o600);
}

// El .env de compose: solo el dominio (no es secreto, pero va junto). Si ya
// hay un .env (el de desarrollo), solo se le anade la linea.
const envCompose = join(raiz, '.env');
const lineaDominio = 'DOMINIO=' + (local ? 'localhost' : dominio || 'CAMBIAR.tu-dominio.gt') + '\n';
if (!existsSync(envCompose)) {
  writeFileSync(envCompose, lineaDominio);
  console.log('Creado ' + envCompose + ' con DOMINIO');
} else if (!/^DOMINIO=/m.test(readFileSync(envCompose, 'utf8'))) {
  appendFileSync(envCompose, '\n# Dominio del gateway (docker-compose.prod.yml)\n' + lineaDominio);
  console.log('Anadido DOMINIO a ' + envCompose);
}

const modo = local ? 'LOCAL' : droplet ? 'DROPLET' : 'PRODUCCION (bases administradas)';
console.log('Creada ' + carpeta + ' (' + Object.keys(archivos).length + ' archivos, modo ' + modo + ').');
if (!local && !droplet) {
  console.log('Falta pegar a mano: las DATABASE_URL/DIRECT_URL_* y REDIS_URL de DigitalOcean (buscar CAMBIAR), y DOMINIO en .env.');
}
if (droplet && !dominio) {
  console.log('Falta poner DOMINIO en .env (o volver a correr con --dominio).');
}
if (!local) {
  console.log('Copiar FUERA del servidor: LLAVE_DATOS, LLAVE_INDICE (comun.env) y LLAVE_RAIZ_TRAZA (trazabilidad.env).');
}
