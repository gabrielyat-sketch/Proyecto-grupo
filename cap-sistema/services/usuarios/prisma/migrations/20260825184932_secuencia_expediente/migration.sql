-- Correlativo del numero de expediente.
--
-- Se usa una secuencia de PostgreSQL y no MAX(numero) + 1 por dos motivos:
--
--   1. El numero de expediente esta CIFRADO. No se puede calcular un maximo
--      sobre una columna cuyo contenido es texto cifrado distinto cada vez.
--   2. Dos altas simultaneas en recepcion darian el mismo numero. Una
--      secuencia es atomica por definicion.
--
-- Empieza en 1. Si el CAP ya tiene expedientes numerados en papel, hay que
-- ajustar el valor inicial con setval() antes de la puesta en marcha para no
-- reutilizar numeros existentes.
CREATE SEQUENCE IF NOT EXISTS usuarios.expediente_correlativo
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO CYCLE;

-- El usuario de ejecucion solo necesita avanzarla y leerla.
GRANT USAGE, SELECT ON SEQUENCE usuarios.expediente_correlativo TO cap_usuarios;
