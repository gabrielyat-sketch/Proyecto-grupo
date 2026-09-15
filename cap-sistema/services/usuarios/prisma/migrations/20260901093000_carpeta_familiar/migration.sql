-- La carpeta familiar del archivero del CAP.
--
-- El CAP no organiza el archivo por persona sino por FAMILIA: cada una tiene
-- un folder de carton con un numero escrito en la pestana, rotulado con el
-- apellido y guardado por el lugar donde vive. La tabla `grupo_familiar` ya
-- existia para esa idea, pero le faltaba todo lo que hace que una carpeta se
-- pueda encontrar: el numero, el apellido y el barrio.
--
-- Las tres columnas entran como NOT NULL SIN valor por defecto. Es a
-- proposito: la tabla esta vacia, y si no lo estuviera esta migracion debe
-- fallar en vez de rellenar carpetas reales con datos inventados.

-- AlterTable
ALTER TABLE "grupo_familiar" ADD COLUMN     "numero" INTEGER NOT NULL,
ADD COLUMN     "apellidos" VARCHAR(120) NOT NULL,
ADD COLUMN     "serie_id" TEXT NOT NULL,
ADD COLUMN     "lugar_id" TEXT;

-- El codigo `GF-2026-000045` se va, y con el su secuencia.
--
-- Lo generaba el sistema, y el CAP nunca lo escribio en ningun folder. Con el
-- numero de la pestana ya dentro, mantener los dos serian dos identificadores
-- para la misma carpeta: uno que la gente usa y otro que solo existe en la
-- pantalla, y basta que alguien busque por el equivocado para no encontrar
-- nada. La tabla esta vacia, asi que no se pierde ningun dato.
DROP INDEX "grupo_familiar_codigo_key";
ALTER TABLE "grupo_familiar" DROP COLUMN "codigo";
DROP SEQUENCE IF EXISTS usuarios.grupo_correlativo;

-- CreateIndex
--
-- Dos carpetas no pueden llevar el mismo numero en la misma serie. La serie es
-- el barrio o caserio, y la comunidad cuando no hay barrio; el porque de que
-- sea una columna propia y no `COALESCE(lugar_id, comunidad_id)` esta en
-- schema.prisma.
CREATE UNIQUE INDEX "grupo_familiar_serie_id_numero_key" ON "grupo_familiar"("serie_id", "numero");

-- CreateIndex
--
-- La busqueda de «¿existe ya la carpeta?»: el apellido dentro de un lugar. Sin
-- este indice esa consulta recorre la tabla entera, y el CAP va a tener miles
-- de carpetas.
CREATE INDEX "grupo_familiar_serie_id_apellidos_idx" ON "grupo_familiar"("serie_id", "apellidos");

-- AddForeignKey
ALTER TABLE "grupo_familiar" ADD CONSTRAINT "grupo_familiar_lugar_id_fkey" FOREIGN KEY ("lugar_id") REFERENCES "lugar_poblado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
