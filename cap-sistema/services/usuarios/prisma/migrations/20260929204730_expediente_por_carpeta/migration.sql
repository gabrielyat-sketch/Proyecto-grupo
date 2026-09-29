-- El numero de expediente pasa a ser de la FAMILIA, no del paciente.
--
-- La carpeta de carton del CAP lleva un numero y las fichas de todos los que
-- viven en esa casa van dentro, asi que todos comparten numero de expediente.
-- Y ese numero se repite entre lugares, igual que el de la carpeta: hay un
-- expediente No.1 en El Calvario y otro en El Carpintero.
--
-- La unicidad no desaparece: se apoya en `grupo_familiar_serie_id_numero_key`,
-- que ya garantiza un solo numero por serie. Mantenerla tambien aqui
-- prohibiria justo los dos casos que el CAP necesita.
DROP INDEX "expediente_numero_indice_key";

-- El indice sigue siendo el camino de la busqueda «de quien es esta carpeta»,
-- solo que ahora devuelve varias filas.
CREATE INDEX "expediente_numero_indice_idx" ON "expediente"("numero_indice");
