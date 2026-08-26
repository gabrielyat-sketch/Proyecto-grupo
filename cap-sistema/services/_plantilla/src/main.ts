import 'reflect-metadata';
import { config as cargarDotenv } from 'dotenv';

// Carga el .env local si existe. En produccion no hay archivo .env: las
// variables las inyecta Docker Compose desde el gestor de secretos, y esas
// tienen prioridad sobre cualquier archivo.
cargarDotenv({ quiet: true });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { construirDocumentoOpenApi, FiltroExcepciones } from '@cap/shared';
import { AppModule } from './app.module';
import { leerEntorno } from './config/entorno';

async function arrancar(): Promise<void> {
  // Se lee la configuracion ANTES de levantar nada: si falta una variable, el
  // servicio muere aqui con un mensaje claro, en vez de fallar mas adelante
  // en medio de una operacion con datos de un paciente.
  const env = leerEntorno();
  const logger = new Logger(env.NOMBRE_SERVICIO);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.use(helmet());
  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos no declarados en el DTO
      forbidNonWhitelisted: true, // y ademas rechaza la peticion que los envia
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useGlobalFilters(new FiltroExcepciones());
  app.enableShutdownHooks();

  // Swagger solo fuera de produccion: en produccion publicar el contrato
  // completo le entrega a un atacante el mapa de la API.
  //
  // El documento se construye con el mismo helper que usa el script de
  // exportacion. Si cada uno armara el suyo, lo publicado en /docs podria
  // dejar de coincidir con el .yaml que consume el frontend, y esa diferencia
  // no la detecta nadie hasta que algo falla.
  if (env.NODE_ENV !== 'production') {
    const documento = construirDocumentoOpenApi(app, {
      nombreServicio: env.NOMBRE_SERVICIO,
      puerto: env.PUERTO,
    });
    SwaggerModule.setup('docs', app, documento);
    logger.log('Documentacion disponible en /docs');
  }

  await app.listen(env.PUERTO);
  logger.log('Servicio escuchando en el puerto ' + env.PUERTO);
}

arrancar().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('El servicio no pudo arrancar:', error instanceof Error ? error.message : error);
  process.exit(1);
});
