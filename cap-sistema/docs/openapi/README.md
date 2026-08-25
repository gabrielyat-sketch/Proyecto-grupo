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
