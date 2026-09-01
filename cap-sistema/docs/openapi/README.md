# Contratos OpenAPI

Un archivo `.yaml` por microservicio. **Se escriben en la Etapa 1, antes de la lógica de negocio.**

## Por qué van primero

Dev B (web) y Dev C (móvil) no pueden esperar a que el backend exista. Con los contratos definidos
se levanta un servidor simulado y ambos construyen contra él desde el primer día:

```bash
npx @stoplight/prism-cli mock docs/openapi/usuarios.yaml
```

Sin esto, dos de las tres personas del equipo quedarían ociosas hasta que el backend responda.

## Archivos esperados

`auth.yaml` · `usuarios.yaml` · `programas.yaml` · `medicamentos.yaml` · `reportes.yaml` ·
`cms.yaml` · `trazabilidad.yaml` · `ml.yaml`

## Regla de cambio

Todo cambio de contrato **se actualiza en el `.yaml` y se avisa en la reunión de sprint**.
Un contrato que cambia en silencio rompe el trabajo de otra persona sin que se entere.

## Generación automática

Una vez implementado cada servicio, `@nestjs/swagger` genera el contrato desde los mismos
decoradores que validan la entrada. Los `.yaml` escritos a mano en la Etapa 1 son el acuerdo
inicial; después la fuente de verdad es el código.

```bash
npm run contratos                      # los cuatro
npm run contrato -w @cap/usuarios      # uno solo
```

## Las respuestas también van declaradas

Durante un tiempo los contratos describían **solo lo que el cliente envía**. Las respuestas decían
`description: ""`, así que el cliente generado tipaba el envío y dejaba lo recibido como `unknown`
— justo donde se rompen las cosas: alguien renombra un campo en el backend, el frontend compila
igual, y el error aparece con el paciente enfrente.

Hoy cada endpoint declara su respuesta con `@ApiOkResponse({ type: XDto })`, y el método del
controlador anota ese mismo tipo. Eso hace que **el compilador verifique** que el servicio devuelve
lo que el contrato promete: si el servicio cambia de forma, la compilación falla antes de generar
nada.

Al conectar los tipos aparecieron tres desajustes reales que nadie había visto:

- `aperturaEn` del expediente es opcional (los expedientes viejos de papel no siempre traen fecha).
- Los campos `Decimal` de Prisma —peso, talla, temperatura— **viajan como texto** en JSON, no como
  número. Documentarlos como número habría reventado en el primer `toFixed()`.
- `GET /v1/entregas` omitía `fechaVencimiento` mientras `GET /v1/entregas/:id` sí lo devolvía.

## Errores: se agregan solos

`construirDocumentoOpenApi` (en `@cap/shared`) recorre el documento ya construido y agrega a cada
operación las respuestas de error que el filtro global produce siempre: `500` en todas, `400` donde
hay cuerpo o parámetros, `401` y `403` donde hay `@ApiBearerAuth`, `404` donde la ruta tiene
parámetro.

Declararlas endpoint por endpoint serían cientos de líneas repetidas que envejecen mal. Una
respuesta declarada a mano tiene prioridad: el post-procesado solo rellena huecos.
