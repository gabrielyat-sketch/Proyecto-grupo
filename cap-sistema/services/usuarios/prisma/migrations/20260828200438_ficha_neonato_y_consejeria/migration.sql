-- CreateEnum
CREATE TYPE "QuienAtendioParto" AS ENUM ('MD', 'EP', 'AE', 'CT', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoParto" AS ENUM ('NORMAL', 'CESAREA', 'FORCEPS', 'PODALICA');

-- CreateTable
CREATE TABLE "tema_consejeria" (
    "id" TEXT NOT NULL,
    "tipo_ficha" "TipoFicha" NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" VARCHAR(300) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tema_consejeria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consejeria_en_atencion" (
    "atencion_id" TEXT NOT NULL,
    "tema_id" TEXT NOT NULL,
    "brindada" BOOLEAN NOT NULL DEFAULT true,
    "fecha_reconsulta" DATE,

    CONSTRAINT "consejeria_en_atencion_pkey" PRIMARY KEY ("atencion_id","tema_id")
);

-- CreateTable
CREATE TABLE "ficha_neonato" (
    "atencion_id" TEXT NOT NULL,
    "nombre_madre_cifrado" BYTEA,
    "peso_libras" INTEGER,
    "peso_onzas" INTEGER,
    "perimetro_braquial_cm" DECIMAL(4,1),
    "circunferencia_cefalica_cm" DECIMAL(4,1),
    "peso_nacer_libras" INTEGER,
    "peso_nacer_onzas" INTEGER,
    "lloro_al_nacer" BOOLEAN,
    "nacio_cianotico" BOOLEAN,
    "horas_trabajo_parto" INTEGER,
    "quien_atendio_parto" "QuienAtendioParto",
    "quien_atendio_parto_otro" VARCHAR(120),
    "ruptura_prematura_membranas" BOOLEAN,
    "trabajo_parto_prematuro" BOOLEAN,
    "parto_prolongado" BOOLEAN,
    "tipo_parto" "TipoParto",
    "bcg" BOOLEAN,
    "td_madre" BOOLEAN,
    "td_madre_dosis" INTEGER,
    "lactancia_materna_exclusiva" BOOLEAN,

    CONSTRAINT "ficha_neonato_pkey" PRIMARY KEY ("atencion_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tema_consejeria_tipo_ficha_orden_key" ON "tema_consejeria"("tipo_ficha", "orden");

-- CreateIndex
CREATE INDEX "consejeria_en_atencion_tema_id_brindada_idx" ON "consejeria_en_atencion"("tema_id", "brindada");

-- AddForeignKey
ALTER TABLE "consejeria_en_atencion" ADD CONSTRAINT "consejeria_en_atencion_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consejeria_en_atencion" ADD CONSTRAINT "consejeria_en_atencion_tema_id_fkey" FOREIGN KEY ("tema_id") REFERENCES "tema_consejeria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_neonato" ADD CONSTRAINT "ficha_neonato_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
