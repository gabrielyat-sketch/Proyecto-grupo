/**
 * Genera docs/endpoints.md a partir de los contratos OpenAPI.
 *
 * Es un indice legible de toda la API del sistema, pensado para el equipo
 * (sobre todo para quien construya el frontend). Se regenera; no se edita a
 * mano.
 *
 * Uso:  npm run endpoints
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const DIR_OPENAPI = resolve(__dirname, '..', 'docs', 'openapi');
const DESTINO = resolve(__dirname, '..', 'docs', 'endpoints.md');

const METODOS = ['get', 'post', 'put', 'patch', 'delete'] as const;

interface Operacion {
  summary?: string;
  tags?: string[];
  security?: unknown[];
}

const lineas: string[] = [
  '# Índice de endpoints',
  '',
  '> Generado con `npm run endpoints` a partir de `docs/openapi/*.yaml`.',
  '> **No editar a mano:** los cambios se pierden en la siguiente ejecución.',
  '',
  'Todas las rutas llevan el prefijo `/v1`. La columna *Auth* indica si el',
  'endpoint exige token: los marcados con `—` son públicos (healthchecks y el',
  'gateway público).',
  '',
];

const archivos = readdirSync(DIR_OPENAPI)
  .filter((f) => f.endsWith('.yaml'))
  .sort();

if (archivos.length === 0) {
  console.error('No hay contratos en docs/openapi. Ejecute primero: npm run contrato -w @cap/<servicio>');
  process.exitCode = 1;
} else {
  let totalOperaciones = 0;

  for (const archivo of archivos) {
    const doc = parse(readFileSync(resolve(DIR_OPENAPI, archivo), 'utf8')) as {
      info?: { title?: string };
      paths?: Record<string, Record<string, Operacion>>;
    };

    const servicio = archivo.replace('.yaml', '');
    lineas.push('## ' + servicio, '');
    lineas.push('| Método | Ruta | Qué hace | Auth |');
    lineas.push('|---|---|---|---|');

    const rutas = Object.keys(doc.paths ?? {}).sort();
    for (const ruta of rutas) {
      for (const metodo of METODOS) {
        const op = doc.paths?.[ruta]?.[metodo];
        if (!op) continue;
        totalOperaciones++;
        const auth = op.security && op.security.length > 0 ? 'Bearer' : '—';
        lineas.push(
          '| `' + metodo.toUpperCase() + '` | `' + ruta + '` | ' +
            (op.summary ?? '') + ' | ' + auth + ' |',
        );
      }
    }
    lineas.push('');
  }

  lineas.push('---', '');
  lineas.push(
    '**Total: ' + totalOperaciones + ' operaciones en ' + archivos.length + ' servicios.**',
    '',
  );

  writeFileSync(DESTINO, lineas.join('\n'), 'utf8');
  console.log('Indice generado: ' + totalOperaciones + ' operaciones de ' + archivos.length + ' servicios');
  console.log('  -> ' + DESTINO);
}
