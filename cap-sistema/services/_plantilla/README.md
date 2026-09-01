# _plantilla — Servicio de referencia

**No se despliega.** Es el molde del que salen los otros siete servicios.

## Por qué existe

Es la mitigación del riesgo central del proyecto: 8 microservicios con 3 personas. Si cada servicio
resolviera por su cuenta el Dockerfile, el logging, la validación de JWT y el manejo de errores,
serían ocho implementaciones distintas de lo mismo, cada una con sus propios errores.

**Esta es la etapa de la ruta crítica.** Si la plantilla no queda terminada, todo lo demás se detiene.

## Qué trae resuelto

- [x] `Dockerfile` multi-etapa, ejecutando como usuario `node` (no root)
- [x] Healthcheck en `GET /v1/salud` y `GET /v1/salud/listo`
- [x] Configuración validada al arrancar — el servicio muere de inmediato si falta una variable
- [x] Validación de JWT y RBAC vía `@cap/shared`, aplicados **globalmente**
- [x] Filtro global de excepciones con el formato de error único
- [x] Identificador de correlación `X-Traza-Id` en toda petición
- [x] Conexión a PostgreSQL con Prisma sobre su propio esquema
- [x] Paginación con tope de 100 en los listados
- [x] Swagger en `/docs`, deshabilitado en producción
- [x] Cabeceras de seguridad con helmet
- [x] Pruebas unitarias (6) y e2e contra PostgreSQL real (14)

## Cómo correrlo

Desde `cap-sistema/`:

```bash
npm run infra:up                      # PostgreSQL 16 + Redis 7
cd services/_plantilla
cp .env.example .env
npx prisma migrate dev
npm run build -w @cap/plantilla
node dist/main.js                     # http://localhost:3100/docs
```

```bash
npm test -w @cap/plantilla            # unitarias
npm run test:e2e -w @cap/plantilla    # e2e, requiere PostgreSQL levantado
```

## Dos usuarios de base de datos, no uno

```
DATABASE_URL  -> cap_<servicio>   la aplicación. Solo lee y escribe datos
DIRECT_URL    -> cap_migrador     solo `prisma migrate`. Dueño de las tablas
```

En PostgreSQL el **dueño** de una tabla tiene todos los privilegios sobre ella, sin importar los
`GRANT`. Si el servicio creara sus propias tablas, sería su dueño y podría hacer `UPDATE` y `DELETE`
aunque nunca se le hubieran otorgado. Para `trazabilidad` eso anularía por completo la garantía
append-only del RF-09.

**No unifiques estas dos variables.** Parece una simplificación inofensiva y no lo es.

## Todo endpoint es privado por defecto

`GuardJwt` y `GuardRoles` están registrados como `APP_GUARD` globales. Un controlador nuevo queda
protegido aunque su autor no haga nada. Para abrir un endpoint hay que marcarlo explícitamente con
`@Publico()` — que es exactamente donde debe estar la decisión consciente.

```ts
@Get('abierto')  @Publico()                  // sin autenticación
@Get('privado')                              // basta con estar autenticado
@Post()          @Roles(Rol.ADMINISTRADOR)   // solo ese rol
```

Los roles con MFA obligatorio (Administrador, Director) además necesitan `mfaVerificado` en el token:
un token emitido a mitad del login no alcanza endpoints administrativos.

## Criterio de terminado

> Un integrante **distinto al autor** logra crear un servicio nuevo copiando la plantilla
> **en menos de una hora**, sin preguntar nada.

Si eso no se cumple, la plantilla no está lista — por más que el código funcione.

## Cómo se genera un servicio nuevo

1. Copiar la carpeta y renombrarla (`services/auth`, por ejemplo).
2. En `package.json`: cambiar `name` a `@cap/<servicio>`.
3. En `.env`: cambiar `PUERTO` (3001–3008), `NOMBRE_SERVICIO` y el `schema=` de ambas URL.
4. En `prisma/schema.prisma`: reemplazar el modelo `Ejemplo` por el dominio real.
5. Borrar `prisma/migrations/` y correr `npx prisma migrate dev --name inicial`.
6. Reemplazar `src/ejemplo/` por los módulos del dominio.
7. Agregarlo al `docker-compose.yml` y a la matriz de CI.
8. Escribir su contrato en `docs/openapi/<servicio>.yaml`.

## Notas del entorno local

- **Puerto 3100.** El 3000 colisiona con demasiadas herramientas y 3001–3008 están reservados para
  los servicios reales.
- **Esquema `plantilla`.** Existe solo en `infra/postgres/init.sql` para desarrollo; no se crea en
  producción.
- **`prisma migrate dev` necesita `CREATEDB`** para su base sombra. En producción se usa
  `prisma migrate deploy`, que no la necesita, y el rol no lleva ese privilegio.
- **Se compila con `tsc`, no con `nest build`.** Se descartó `@nestjs/cli` porque arrastra webpack
  y todo su árbol de dependencias sin aportar nada que el proyecto necesite.
