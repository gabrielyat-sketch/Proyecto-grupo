-- Los nombres del esposo y la esposa en la tapa del folder.
--
-- El CAP rotula la carpeta con el apellido y, debajo, los dos nombres:
-- «Familia Lopez Ac — Juan Lopez Tzul y Maria Ac Caal». Son texto libre, tal
-- como se escriben en la tapa, y no una relacion con `paciente`: el esposo
-- puede no estar registrado nunca porque no se atiende aqui.
--
-- Las dos columnas entran NULAS a proposito. Hay madres solas, viudas y
-- abuelas a cargo de nietos, y las carpetas ya abiertas no tienen estos
-- datos: no se toca ninguna fila.

-- AlterTable
ALTER TABLE "grupo_familiar" ADD COLUMN     "esposo" VARCHAR(120),
ADD COLUMN     "esposa" VARCHAR(120);
