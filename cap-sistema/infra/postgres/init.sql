-- ══════════════════════════════════════════════════════════════════════════
--  Aislamiento de datos por microservicio  (arquitectura §9.1)
--
--  Un esquema por servicio dentro de una sola instancia. Cumple el principio
--  de independencia de datos de los microservicios sin pagar siete bases
--  administradas.
--
--  ─── DOS ROLES POR SERVICIO, NO UNO ───────────────────────────────────
--
--  cap_migrador  : DUENO de todos los esquemas. Crea y altera tablas.
--                  Lo usa UNICAMENTE 'prisma migrate' (variable DIRECT_URL_*).
--  cap_<servicio>: usuario de EJECUCION. Solo lee y escribe datos.
--                  Lo usa la aplicacion (variable DATABASE_URL_*).
--
--  Motivo: en PostgreSQL el DUENO de una tabla tiene todos los privilegios
--  sobre ella, sin importar los GRANT. Si el servicio creara sus propias
--  tablas, seria su dueno y podria hacer UPDATE y DELETE aunque nunca se le
--  hubieran otorgado. Para 'trazabilidad' eso anularia por completo la
--  garantia append-only. Separar dueno y ejecutor es lo que la sostiene.
--
--  ATENCION: las contrasenas de este archivo son SOLO PARA DESARROLLO LOCAL.
--  En produccion los roles se crean a mano con contrasenas generadas y se
--  guardan en el gestor de secretos. Este archivo NUNCA se ejecuta contra la
--  instancia administrada de DigitalOcean.
-- ══════════════════════════════════════════════════════════════════════════

-- ─── Rol dueno de los esquemas y de las migraciones ───────────────────────
CREATE ROLE cap_migrador WITH LOGIN PASSWORD 'dev_migrador';

-- SOLO DESARROLLO: `prisma migrate dev` necesita crear una base sombra para
-- comparar el esquema esperado contra el real, y para eso el rol requiere
-- CREATEDB.
--
-- En PRODUCCION esto NO se otorga. Alli se ejecuta `prisma migrate deploy`,
-- que aplica migraciones ya generadas y revisadas, sin base sombra y sin
-- necesidad de crear bases de datos. Un rol con CREATEDB en produccion es
-- privilegio de mas sin ninguna ganancia.
ALTER ROLE cap_migrador CREATEDB;

-- ─── auth ─────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION cap_migrador;
CREATE USER cap_auth WITH PASSWORD 'dev_auth';

-- Puede entrar al esquema, pero NO crear objetos en el.
GRANT USAGE ON SCHEMA auth TO cap_auth;
REVOKE CREATE ON SCHEMA auth FROM cap_auth;

-- Privilegios sobre lo que cap_migrador cree de aqui en adelante.
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_auth;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA auth
  GRANT USAGE, SELECT ON SEQUENCES TO cap_auth;

-- ─── usuarios ─────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS usuarios AUTHORIZATION cap_migrador;
CREATE USER cap_usuarios WITH PASSWORD 'dev_usuarios';

-- Puede entrar al esquema, pero NO crear objetos en el.
GRANT USAGE ON SCHEMA usuarios TO cap_usuarios;
REVOKE CREATE ON SCHEMA usuarios FROM cap_usuarios;

-- Privilegios sobre lo que cap_migrador cree de aqui en adelante.
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA usuarios
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_usuarios;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA usuarios
  GRANT USAGE, SELECT ON SEQUENCES TO cap_usuarios;

-- ─── programas ─────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS programas AUTHORIZATION cap_migrador;
CREATE USER cap_programas WITH PASSWORD 'dev_programas';

-- Puede entrar al esquema, pero NO crear objetos en el.
GRANT USAGE ON SCHEMA programas TO cap_programas;
REVOKE CREATE ON SCHEMA programas FROM cap_programas;

-- Privilegios sobre lo que cap_migrador cree de aqui en adelante.
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA programas
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_programas;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA programas
  GRANT USAGE, SELECT ON SEQUENCES TO cap_programas;

-- ─── medicamentos ─────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS medicamentos AUTHORIZATION cap_migrador;
CREATE USER cap_medicamentos WITH PASSWORD 'dev_medicamentos';

-- Puede entrar al esquema, pero NO crear objetos en el.
GRANT USAGE ON SCHEMA medicamentos TO cap_medicamentos;
REVOKE CREATE ON SCHEMA medicamentos FROM cap_medicamentos;

-- Privilegios sobre lo que cap_migrador cree de aqui en adelante.
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA medicamentos
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_medicamentos;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA medicamentos
  GRANT USAGE, SELECT ON SEQUENCES TO cap_medicamentos;

-- ─── reportes ─────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS reportes AUTHORIZATION cap_migrador;
CREATE USER cap_reportes WITH PASSWORD 'dev_reportes';

-- Puede entrar al esquema, pero NO crear objetos en el.
GRANT USAGE ON SCHEMA reportes TO cap_reportes;
REVOKE CREATE ON SCHEMA reportes FROM cap_reportes;

-- Privilegios sobre lo que cap_migrador cree de aqui en adelante.
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA reportes
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_reportes;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA reportes
  GRANT USAGE, SELECT ON SEQUENCES TO cap_reportes;

-- ─── cms ─────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS cms AUTHORIZATION cap_migrador;
CREATE USER cap_cms WITH PASSWORD 'dev_cms';

-- Puede entrar al esquema, pero NO crear objetos en el.
GRANT USAGE ON SCHEMA cms TO cap_cms;
REVOKE CREATE ON SCHEMA cms FROM cap_cms;

-- Privilegios sobre lo que cap_migrador cree de aqui en adelante.
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA cms
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_cms;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA cms
  GRANT USAGE, SELECT ON SEQUENCES TO cap_cms;

-- ─── trazabilidad ─────────────────────────────────────────────────────
--
--  EXCEPCION DELIBERADA: append-only.
--
--  Se otorgan SELECT e INSERT, pero NO UPDATE ni DELETE. Ni la propia
--  aplicacion puede alterar la cadena de auditoria.
--
--  Si alguien "corrige" esto agregando UPDATE, o deja que el servicio sea
--  dueno de sus tablas, la trazabilidad pierde todo valor probatorio y el
--  requerimiento RF-09 deja de cumplirse. No es una restriccion incomoda:
--  es el mecanismo completo.
CREATE SCHEMA IF NOT EXISTS trazabilidad AUTHORIZATION cap_migrador;
CREATE USER cap_trazabilidad WITH PASSWORD 'dev_trazabilidad';

GRANT USAGE ON SCHEMA trazabilidad TO cap_trazabilidad;
REVOKE CREATE ON SCHEMA trazabilidad FROM cap_trazabilidad;

ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA trazabilidad
  GRANT SELECT, INSERT ON TABLES TO cap_trazabilidad;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA trazabilidad
  GRANT USAGE, SELECT ON SEQUENCES TO cap_trazabilidad;

-- ─── plantilla (SOLO DESARROLLO) ──────────────────────────────────────
--
--  Esquema de trabajo del servicio de referencia services/_plantilla.
--  Existe unicamente para que la plantilla y sus pruebas e2e puedan correr
--  contra una base real. NO se crea en produccion: la plantilla no se
--  despliega, es un molde.
CREATE SCHEMA IF NOT EXISTS plantilla AUTHORIZATION cap_migrador;
CREATE USER cap_plantilla WITH PASSWORD 'dev_plantilla';

GRANT USAGE ON SCHEMA plantilla TO cap_plantilla;
REVOKE CREATE ON SCHEMA plantilla FROM cap_plantilla;

ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA plantilla
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cap_plantilla;
ALTER DEFAULT PRIVILEGES FOR ROLE cap_migrador IN SCHEMA plantilla
  GRANT USAGE, SELECT ON SEQUENCES TO cap_plantilla;

-- ─── Bloqueo del esquema public ───────────────────────────────────────────
-- Evita que cualquier rol cree tablas fuera de su esquema por accidente.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
