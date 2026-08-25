-- Correlativo del codigo de grupo familiar.
--
-- Mismo razonamiento que el correlativo de expedientes: dos altas simultaneas
-- en recepcion darian el mismo codigo si se calculara con MAX()+1. Una
-- secuencia es atomica por definicion.
CREATE SEQUENCE IF NOT EXISTS usuarios.grupo_correlativo
  AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;

GRANT USAGE, SELECT ON SEQUENCE usuarios.grupo_correlativo TO cap_usuarios;
