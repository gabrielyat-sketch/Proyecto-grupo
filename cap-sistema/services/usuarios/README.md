# usuarios — Servicio de Información de Usuarios

**Puerto:** 3002 · **Requerimientos:** RF-01, RF-08 · **Esquema:** `usuarios`

Aquí viven los datos clínicos de los pacientes del CAP. Es el servicio con el requisito de
protección más alto del sistema.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/v1/pacientes?dpi=&nombre=&comunidadId=` | Todos los roles |
| `GET` `POST` | `/v1/pacientes` · `/v1/pacientes/:id` | Alta: Recepción, Administrador |
| `PATCH` | `/v1/pacientes/:id` | Recepción, Administrador |
| `GET` | `/v1/expedientes/buscar?numero=` | Todos los roles |
| `GET` `POST` | `/v1/expedientes/:id/atenciones` | **Solo personal clínico** |
| `GET` | `/v1/digitalizacion/resumen` | Administrador, Director, Recepción |
| `PATCH` | `/v1/digitalizacion/:expedienteId` | Administrador, Recepción |
| `GET` `POST` | `/v1/comunidades` | Lectura: todos · Alta: Administrador |

## Decisiones que conviene no deshacer

### La unicidad vive en el índice ciego, no en la columna cifrada

Un `@unique` sobre `dpi_cifrado` **no serviría de nada**. AES-GCM produce un resultado distinto cada
vez que cifra el mismo valor, así que el mismo DPI insertado dos veces pasaría la restricción y el
paciente quedaría duplicado — con dos expedientes, dos historiales y ninguna forma sencilla de
juntarlos después.

Por eso `dpi_indice` (el HMAC) lleva el `@unique`. Hay una prueba que lo demuestra: tres cifrados del
mismo DPI dan tres valores distintos, y dos índices ciegos dan siempre el mismo.

Lo mismo aplica al número de expediente.

### El DPI es opcional

Los niños del programa de desnutrición no tienen DPI, y en el área rural hay adultos que tampoco. El
identificador que **siempre** existe es el número de expediente que asigna el CAP.

Que la columna sea nullable con `@unique` es correcto en PostgreSQL: varios `NULL` no chocan entre
sí. Hay una prueba que registra tres pacientes sin DPI seguidos.

### Recepción encuentra al paciente pero no lee sus diagnósticos

`/v1/pacientes` lo alcanzan los seis roles: recepción y farmacia necesitan identificar a la persona
para atenderla. `/v1/expedientes/:id/atenciones` está restringido a **Médico, Enfermería y
Dirección**.

No es desconfianza: es minimización de datos. Menos gente con acceso a un diagnóstico es menos
superficie de fuga, y el Código de Salud limita el expediente clínico al personal con rol clínico
autorizado.

### Los signos vitales NO se cifran, los diagnósticos sí

Peso, talla, presión y temperatura alimentan los indicadores de hipertensión y desnutrición.
Cifrarlos obligaría a descifrar miles de filas para calcular un promedio.

Motivo, diagnóstico, tratamiento y notas van cifrados sin índice: nunca se buscan por contenido, se
leen dentro del expediente ya abierto.

### La búsqueda por nombre es por INICIO, no por texto contenido

`LIKE '%texto%'` no puede usar índice y obliga a recorrer la tabla entera. Además el personal de
archivo busca por el principio del apellido, que es como están ordenadas las carpetas de papel.

### El correlativo del expediente usa una secuencia de PostgreSQL

No `MAX(numero) + 1`, por dos motivos: el número está **cifrado**, así que no se puede calcular un
máximo sobre él; y dos altas simultáneas en recepción darían el mismo número.

> Antes de la puesta en marcha hay que ajustar la secuencia con `setval()` si el CAP ya tiene
> expedientes numerados en papel, o se reutilizarían números existentes.

### Los eventos del outbox no llevan datos clínicos

El bus no es un canal cifrado por campo. `paciente.creado` lleva comunidad, sexo y año de nacimiento;
`atencion.registrada` lleva signos vitales. **Nunca** DPI, nombre ni diagnóstico. Hay pruebas que lo
verifican.

El outbox se escribe en la **misma transacción** que el cambio de negocio. El publicador que lo lleva
al bus llega en la Etapa 10, pero la tabla existe desde ahora: agregarla después obligaría a tocar
todas las rutas de escritura.

## Rendimiento medido con 100,000 pacientes

`npm run carga` genera 100,000 pacientes sintéticos con su expediente (27 s).

| Consulta | Tiempo | Plan de PostgreSQL |
|---|---|---|
| DPI exacto (índice ciego) | **43 ms** | `Index Scan` sobre `paciente_dpi_indice_key` |
| Expediente por número | **37 ms** | `Index Scan` sobre `expediente_numero_indice_key` |
| Apellido frecuente (`Caal`) | **113 ms** | `Index Scan` sobre `paciente_apellidos_nombres_idx` |
| Listado por comunidad | **11 ms** | Índice + paginación |
| Resumen de digitalización | **14 ms** | `GROUP BY` en la base, no en memoria |

Todo muy por debajo del requisito de 2 segundos.

### Lo que sí conviene vigilar

La búsqueda por apellido **al final del alfabeto** es el peor caso. Medido con `EXPLAIN ANALYZE`:

```
apellidos ILIKE 'Yat%'  →  Index Scan ... Rows Removed by Filter: 96379  →  54 ms
apellidos ILIKE 'Zzz%'  →  Seq Scan     ... Rows Removed by Filter: 100000 →  29 ms
```

El planificador recorre el índice ordenado y descarta casi toda la tabla. A 100,000 registros son
54 ms y no molesta a nadie, pero **el costo crece de forma lineal con la tabla**.

Se probó agregar un índice funcional sobre `lower(apellidos)` con `text_pattern_ops`. **El
planificador no lo elige** para este tipo de consulta (prefiere el índice de ordenamiento por el
`LIMIT`), así que se descartó: un índice que nadie usa solo cuesta escrituras y espacio.

**Punto de disparo:** si `paciente` supera el millón de filas o la búsqueda por apellido pasa de
~500 ms, corresponde revisarlo con `pg_trgm` y un índice GIN. No antes.

## Poner en marcha

```bash
cp .env.example .env
npx prisma migrate dev
npm run carga -- 2000        # datos ficticios para desarrollo
npm run build -w @cap/usuarios
node dist/main.js            # http://localhost:3002/docs
```

`npm run carga` se conecta con `DIRECT_URL` (el usuario dueño). No es un atajo: el usuario de
ejecución solo tiene `USAGE` sobre la secuencia, que permite `nextval()` pero **no** `setval()` — y
está bien que así sea, la aplicación nunca debe poder reposicionar el correlativo de expedientes.

## Pruebas

```bash
npm test -w @cap/usuarios              # 3 unitarias
npm run test:e2e -w @cap/usuarios      # 36 e2e contra PostgreSQL real
```

## Pendiente

- Registrar en trazabilidad toda consulta y modificación de expediente (RF-09). Depende de la
  Etapa 9.
- Grupos familiares: el modelo existe, faltan los endpoints de alta y asignación.
- Contrato `docs/openapi/usuarios.yaml`.
