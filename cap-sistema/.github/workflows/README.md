# CI/CD

**Un solo pipeline con matriz de servicios**, no ocho pipelines independientes (arquitectura §3.2).

## `ci.yml` — en cada Pull Request

1. Detecta qué servicios cambiaron.
2. Matriz sobre esos servicios: `lint` → `test` → `build`.
3. **SAST** (análisis estático) y **SCA** (dependencias vulnerables).
4. Falla el PR si hay hallazgos críticos.

## `deploy.yml` — al integrar a `main`

1. Construye las imágenes de los servicios modificados.
2. Las publica en el registro de contenedores.
3. Actualiza el Droplet vía `docker compose pull && up -d`.

## Definición de Hecho (no se mueve a Hecho sin esto)

- [ ] Pull Request aprobado por al menos un compañero
- [ ] Pruebas unitarias sobre la lógica principal, CI en verde
- [ ] SAST y SCA sin hallazgos críticos
- [ ] Endpoints nuevos documentados en el contrato OpenAPI
- [ ] Si maneja datos sensibles: valida rol **y** registra en trazabilidad
- [ ] Desplegado y verificado en el ambiente de pruebas

## Estado

Los workflows se escriben en la **Etapa 2**, junto con el servicio plantilla.
Escribirlos antes no serviría: no hay nada que construir todavía.
