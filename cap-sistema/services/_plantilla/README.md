# _plantilla — Servicio de referencia

**No se despliega.** Es el molde del que salen los otros siete servicios.

## Por qué existe

Es la mitigación del riesgo central del proyecto: 8 microservicios con 3 personas. Si cada servicio
resolviera por su cuenta el Dockerfile, el logging, la validación de JWT y el manejo de errores,
serían ocho implementaciones distintas de lo mismo, cada una con sus propios errores.

**Esta es la etapa de la ruta crítica.** Si la plantilla no queda terminada, todo lo demás se detiene.

## Qué debe traer resuelto

- [ ] `Dockerfile` multi-etapa (build + runtime mínimo)
- [ ] Healthcheck en `GET /salud` y `GET /salud/listo`
- [ ] Logging estructurado con redacción de campos sensibles
- [ ] Validación de JWT y RBAC vía `@cap/shared`
- [ ] Filtro global de excepciones con el formato de error único
- [ ] Conexión a PostgreSQL con Prisma sobre su propio esquema
- [ ] Configuración por entorno **validada al arrancar** (que falle rápido si falta una variable)
- [ ] Paginación por defecto en los listados
- [ ] Swagger habilitado en desarrollo y **deshabilitado en producción**
- [ ] Una prueba unitaria y una e2e de ejemplo, ambas en verde

## Criterio de terminado

> Un integrante **distinto al autor** logra crear un servicio nuevo copiando la plantilla
> **en menos de una hora**, sin preguntar nada.

Si eso no se cumple, la plantilla no está lista — por más que el código funcione.

## Cómo se genera un servicio nuevo

1. Copiar la carpeta y renombrarla.
2. Cambiar `name` en `package.json` y el puerto.
3. Apuntar `schema.prisma` al esquema propio del servicio.
4. Reemplazar el módulo de ejemplo por el dominio real.
5. Agregarlo al `docker-compose.yml` y a la matriz de CI.
