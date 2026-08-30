-- CreateEnum
CREATE TYPE "TipoLugar" AS ENUM ('BARRIO', 'CASERIO', 'ALDEA', 'OTRO');

-- AlterTable
ALTER TABLE "paciente" ADD COLUMN     "alergias_cifrado" BYTEA,
ADD COLUMN     "lugar_id" TEXT,
ADD COLUMN     "tiene_alergias" BOOLEAN;

-- CreateTable
CREATE TABLE "lugar_poblado" (
    "id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" "TipoLugar" NOT NULL DEFAULT 'BARRIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lugar_poblado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lugar_poblado_comunidad_id_activo_idx" ON "lugar_poblado"("comunidad_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "lugar_poblado_comunidad_id_nombre_key" ON "lugar_poblado"("comunidad_id", "nombre");

-- AddForeignKey
ALTER TABLE "lugar_poblado" ADD CONSTRAINT "lugar_poblado_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "comunidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_lugar_id_fkey" FOREIGN KEY ("lugar_id") REFERENCES "lugar_poblado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
