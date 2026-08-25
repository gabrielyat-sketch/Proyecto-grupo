/**
 * Exporta el contrato OpenAPI del servicio a docs/openapi/<servicio>.yaml
 *
 * El contrato se genera desde los mismos decoradores que validan la entrada,
 * asi que no puede desincronizarse del codigo: si alguien agrega un endpoint y
 * olvida documentarlo, aparece igual; y si cambia un DTO, el contrato cambia
 * con el.
 *
 * Uso:  npm run contrato -w @cap/<servicio>
 */
import { config as cargarDotenv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { stringify } from 'yaml';
import { AppModule } from '../src/app.module';
import { leerEntorno } from '../src/config/entorno';

cargarDotenv({ quiet: true });

async function main(): Promise<void> {
  const env = leerEntorno();

    // abortOnError: false es importante. Con el valor por defecto, NestFactory
  // mata el proceso en silencio ante un fallo de inyeccion y el script termina
  // con codigo 1 sin imprimir una sola linea.
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('v1');

  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Servicio ' + env.NOMBRE_SERVICIO + ' - CAP Purulha')
      .setDescription(
        'Contrato del servicio ' + env.NOMBRE_SERVICIO + '.\n\n' +
          'Generado desde el codigo. No editar a mano: los cambios se pierden en la ' +
          'siguiente exportacion. Fuente de verdad: arquitectura-cap-purulha.md',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('http://localhost:' + env.PUERTO, 'Desarrollo local')
      .build(),
  );

  const destino = resolve(__dirname, '..', '..', '..', 'docs', 'openapi', env.NOMBRE_SERVICIO + '.yaml');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, stringify(documento), 'utf8');

  const rutas = Object.keys(documento.paths ?? {}).length;
  const operaciones = Object.values(documento.paths ?? {}).reduce(
    (n, p) => n + Object.keys(p as object).length,
    0,
  );

  console.log('Contrato de ' + env.NOMBRE_SERVICIO + ': ' + rutas + ' rutas, ' + operaciones + ' operaciones');
  console.log('  -> ' + destino);

  await app.close();
}

main().catch((e) => {
  // process.exitCode y no process.exit(): exit() corta las escrituras
  // pendientes de stdout y el mensaje de error se pierde.
  console.error('No se pudo exportar el contrato:');
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exitCode = 1;
});
