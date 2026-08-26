import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  getSchemaPath,
  type OpenAPIObject,
  type OperationObject,
} from '@nestjs/swagger';
import { PaginaDto } from './pagina.dto';
import { RespuestaErrorDto } from './respuesta-error.dto';

const METODOS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export interface OpcionesDocumento {
  /** Nombre corto del servicio: auth, usuarios, programas, medicamentos... */
  nombreServicio: string;
  descripcion?: string;
  /** Si se indica, se agrega como servidor de desarrollo local. */
  puerto?: number;
}

function respuestaDeError(descripcion: string) {
  return {
    description: descripcion,
    content: {
      'application/json': { schema: { $ref: getSchemaPath(RespuestaErrorDto) } },
    },
  };
}

/**
 * Agrega al contrato las respuestas de error que el servicio devuelve siempre,
 * pero que ningun decorador declara.
 *
 * El filtro global de excepciones responde con el mismo formato en los ocho
 * servicios (§8.1). Declararlo endpoint por endpoint serian cientos de lineas
 * repetidas que envejecen mal; deducirlo del documento ya construido no puede
 * desfasarse.
 *
 * Las respuestas declaradas a mano tienen prioridad: esto solo rellena huecos.
 */
export function agregarErroresEstandar(documento: OpenAPIObject): OpenAPIObject {
  for (const [ruta, operaciones] of Object.entries(documento.paths ?? {})) {
    for (const metodo of METODOS) {
      const op = (operaciones as Record<string, OperationObject | undefined>)[metodo];
      if (!op) continue;

      const estandar: Record<string, unknown> = {
        500: respuestaDeError('Error inesperado. El mensaje real queda en los logs, no se expone.'),
      };

      // El ValidationPipe rechaza cualquier cuerpo o parametro que no cumpla el DTO.
      if (op.requestBody || (op.parameters?.length ?? 0) > 0) {
        estandar['400'] = respuestaDeError('La informacion enviada no es valida.');
      }

      // security aparece solo donde hay @ApiBearerAuth: son los endpoints protegidos.
      if ((op.security?.length ?? 0) > 0) {
        estandar['401'] = respuestaDeError('Falta el token, expiro o no es valido.');
        estandar['403'] = respuestaDeError('El rol de la cuenta no tiene permiso sobre este recurso.');
      }

      // Una ruta con parametro puede recibir un identificador que no existe.
      if (ruta.includes('{')) {
        estandar['404'] = respuestaDeError('El recurso solicitado no existe.');
      }

      op.responses = { ...estandar, ...op.responses } as OperationObject['responses'];
    }
  }
  return documento;
}

/**
 * Construye el contrato OpenAPI de un servicio.
 *
 * Existe para que main.ts y el script de exportacion no repitan la misma
 * configuracion: si divergen, el contrato publicado en /docs deja de ser el
 * mismo que consume el frontend, y esa diferencia no la detecta nadie hasta
 * que algo falla en produccion.
 */
export function construirDocumentoOpenApi(
  app: INestApplication,
  opciones: OpcionesDocumento,
): OpenAPIObject {
  const constructor = new DocumentBuilder()
    .setTitle('Servicio ' + opciones.nombreServicio + ' - CAP Purulha')
    .setDescription(
      opciones.descripcion ??
        'Contrato del servicio ' +
          opciones.nombreServicio +
          '.\n\nGenerado desde el codigo. No editar a mano: los cambios se pierden en la ' +
          'siguiente exportacion. Fuente de verdad: arquitectura-cap-purulha.md',
    )
    .setVersion('1.0')
    .addBearerAuth();

  if (opciones.puerto !== undefined) {
    constructor.addServer('http://localhost:' + opciones.puerto, 'Desarrollo local');
  }

  const documento = SwaggerModule.createDocument(app, constructor.build(), {
    // Ninguna firma de controlador los menciona, asi que Swagger no los
    // descubre solo; sin esto, los $ref del post-procesado apuntarian a nada.
    extraModels: [RespuestaErrorDto, PaginaDto],
  });

  return agregarErroresEstandar(documento);
}
