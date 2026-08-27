-- CreateEnum
CREATE TYPE "TipoFicha" AS ENUM ('ADULTO', 'NEONATO', 'NINEZ', 'PRENATAL');

-- CreateEnum
CREATE TYPE "GrupoAntecedente" AS ENUM ('MEDICO', 'FAMILIAR', 'HABITO');

-- CreateEnum
CREATE TYPE "RespuestaAntecedente" AS ENUM ('SI', 'NO', 'NO_APLICA');

-- AlterTable
ALTER TABLE "atencion" ADD COLUMN     "circunferencia_cintura_cm" DECIMAL(5,1),
ADD COLUMN     "consejeria_cifrado" BYTEA,
ADD COLUMN     "fecha_proxima_visita" DATE,
ADD COLUMN     "historia_enfermedad_cifrado" BYTEA,
ADD COLUMN     "manejo_estabilizacion_cifrado" BYTEA,
ADD COLUMN     "pulso" INTEGER,
ADD COLUMN     "referencia_cifrado" BYTEA,
ADD COLUMN     "respiraciones" INTEGER,
ADD COLUMN     "tipo_ficha" "TipoFicha",
ADD COLUMN     "vacuna_administrada_cifrado" BYTEA;

-- AlterTable
ALTER TABLE "paciente" ADD COLUMN     "direccion" VARCHAR(200),
ADD COLUMN     "lugar_origen" VARCHAR(160),
ADD COLUMN     "migrante" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocupacion" VARCHAR(120),
ADD COLUMN     "responsable" VARCHAR(160);

-- CreateTable
CREATE TABLE "problema_ficha" (
    "id" TEXT NOT NULL,
    "tipo_ficha" "TipoFicha" NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "problema_ficha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signo_problema" (
    "id" TEXT NOT NULL,
    "problema_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" VARCHAR(300) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "signo_problema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostico_problema" (
    "id" TEXT NOT NULL,
    "problema_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" VARCHAR(300) NOT NULL,
    "pide_texto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "diagnostico_problema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signo_peligro" (
    "id" TEXT NOT NULL,
    "tipo_ficha" "TipoFicha" NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" VARCHAR(300) NOT NULL,
    "pide_texto" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "signo_peligro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_antecedente" (
    "id" TEXT NOT NULL,
    "grupo" "GrupoAntecedente" NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "texto" VARCHAR(200) NOT NULL,
    "pide_detalle" BOOLEAN NOT NULL DEFAULT false,
    "pide_fecha" BOOLEAN NOT NULL DEFAULT false,
    "pide_numero" BOOLEAN NOT NULL DEFAULT false,
    "permite_no_aplica" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_antecedente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antecedente_en_ficha" (
    "antecedente_id" TEXT NOT NULL,
    "tipo_ficha" "TipoFicha" NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "antecedente_en_ficha_pkey" PRIMARY KEY ("antecedente_id","tipo_ficha")
);

-- CreateTable
CREATE TABLE "antecedente_paciente" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "antecedente_id" TEXT NOT NULL,
    "respuesta" "RespuestaAntecedente" NOT NULL,
    "detalle_cifrado" BYTEA,
    "fecha" DATE,
    "numero" INTEGER,
    "registrado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antecedente_paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antecedentes_obstetricos" (
    "paciente_id" TEXT NOT NULL,
    "fur" DATE,
    "gestas" INTEGER,
    "partos" INTEGER,
    "abortos" INTEGER,
    "abortos_consecutivos" BOOLEAN,
    "legrados_liu" INTEGER,
    "cesareas" INTEGER,
    "nacidos_vivos" INTEGER,
    "nacidos_muertos" INTEGER,
    "hijos_vivos" INTEGER,
    "hijos_muertos" INTEGER,
    "embarazos_multiples" BOOLEAN,
    "fecha_ultimo_parto" DATE,
    "prematuros_antes_8_meses" INTEGER,
    "preeclampsia" BOOLEAN,
    "tamizaje_cervix" VARCHAR(20),
    "tamizaje_fecha" DATE,
    "tamizaje_normal" BOOLEAN,
    "usa_planificacion" BOOLEAN,
    "metodo_planificacion" VARCHAR(40),
    "tipo_sangre" VARCHAR(3),
    "rh_positivo" BOOLEAN,
    "registrado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antecedentes_obstetricos_pkey" PRIMARY KEY ("paciente_id")
);

-- CreateTable
CREATE TABLE "signo_peligro_atencion" (
    "atencion_id" TEXT NOT NULL,
    "signo_id" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "detalle_cifrado" BYTEA,

    CONSTRAINT "signo_peligro_atencion_pkey" PRIMARY KEY ("atencion_id","signo_id")
);

-- CreateTable
CREATE TABLE "problema_atencion" (
    "id" TEXT NOT NULL,
    "atencion_id" TEXT NOT NULL,
    "problema_id" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "otro_diagnostico_cifrado" BYTEA,
    "conducta_cifrado" BYTEA,

    CONSTRAINT "problema_atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signo_marcado" (
    "problema_atencion_id" TEXT NOT NULL,
    "signo_id" TEXT NOT NULL,

    CONSTRAINT "signo_marcado_pkey" PRIMARY KEY ("problema_atencion_id","signo_id")
);

-- CreateTable
CREATE TABLE "diagnostico_marcado" (
    "problema_atencion_id" TEXT NOT NULL,
    "diagnostico_id" TEXT NOT NULL,

    CONSTRAINT "diagnostico_marcado_pkey" PRIMARY KEY ("problema_atencion_id","diagnostico_id")
);

-- CreateTable
CREATE TABLE "medicamento_indicado" (
    "id" TEXT NOT NULL,
    "atencion_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre_cifrado" BYTEA NOT NULL,
    "dosis_cifrado" BYTEA,
    "dias" INTEGER,

    CONSTRAINT "medicamento_indicado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problema_ficha_tipo_ficha_activo_idx" ON "problema_ficha"("tipo_ficha", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "problema_ficha_tipo_ficha_orden_key" ON "problema_ficha"("tipo_ficha", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "signo_problema_problema_id_orden_key" ON "signo_problema"("problema_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostico_problema_problema_id_orden_key" ON "diagnostico_problema"("problema_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "signo_peligro_tipo_ficha_orden_key" ON "signo_peligro"("tipo_ficha", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_antecedente_codigo_key" ON "catalogo_antecedente"("codigo");

-- CreateIndex
CREATE INDEX "catalogo_antecedente_grupo_activo_idx" ON "catalogo_antecedente"("grupo", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "antecedente_en_ficha_tipo_ficha_orden_key" ON "antecedente_en_ficha"("tipo_ficha", "orden");

-- CreateIndex
CREATE INDEX "antecedente_paciente_antecedente_id_respuesta_idx" ON "antecedente_paciente"("antecedente_id", "respuesta");

-- CreateIndex
CREATE UNIQUE INDEX "antecedente_paciente_paciente_id_antecedente_id_key" ON "antecedente_paciente"("paciente_id", "antecedente_id");

-- CreateIndex
CREATE INDEX "signo_peligro_atencion_signo_id_presente_idx" ON "signo_peligro_atencion"("signo_id", "presente");

-- CreateIndex
CREATE INDEX "problema_atencion_problema_id_presente_idx" ON "problema_atencion"("problema_id", "presente");

-- CreateIndex
CREATE UNIQUE INDEX "problema_atencion_atencion_id_problema_id_key" ON "problema_atencion"("atencion_id", "problema_id");

-- CreateIndex
CREATE INDEX "diagnostico_marcado_diagnostico_id_idx" ON "diagnostico_marcado"("diagnostico_id");

-- CreateIndex
CREATE UNIQUE INDEX "medicamento_indicado_atencion_id_orden_key" ON "medicamento_indicado"("atencion_id", "orden");

-- AddForeignKey
ALTER TABLE "signo_problema" ADD CONSTRAINT "signo_problema_problema_id_fkey" FOREIGN KEY ("problema_id") REFERENCES "problema_ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico_problema" ADD CONSTRAINT "diagnostico_problema_problema_id_fkey" FOREIGN KEY ("problema_id") REFERENCES "problema_ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedente_en_ficha" ADD CONSTRAINT "antecedente_en_ficha_antecedente_id_fkey" FOREIGN KEY ("antecedente_id") REFERENCES "catalogo_antecedente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedente_paciente" ADD CONSTRAINT "antecedente_paciente_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedente_paciente" ADD CONSTRAINT "antecedente_paciente_antecedente_id_fkey" FOREIGN KEY ("antecedente_id") REFERENCES "catalogo_antecedente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antecedentes_obstetricos" ADD CONSTRAINT "antecedentes_obstetricos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signo_peligro_atencion" ADD CONSTRAINT "signo_peligro_atencion_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signo_peligro_atencion" ADD CONSTRAINT "signo_peligro_atencion_signo_id_fkey" FOREIGN KEY ("signo_id") REFERENCES "signo_peligro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problema_atencion" ADD CONSTRAINT "problema_atencion_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problema_atencion" ADD CONSTRAINT "problema_atencion_problema_id_fkey" FOREIGN KEY ("problema_id") REFERENCES "problema_ficha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signo_marcado" ADD CONSTRAINT "signo_marcado_problema_atencion_id_fkey" FOREIGN KEY ("problema_atencion_id") REFERENCES "problema_atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signo_marcado" ADD CONSTRAINT "signo_marcado_signo_id_fkey" FOREIGN KEY ("signo_id") REFERENCES "signo_problema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico_marcado" ADD CONSTRAINT "diagnostico_marcado_problema_atencion_id_fkey" FOREIGN KEY ("problema_atencion_id") REFERENCES "problema_atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostico_marcado" ADD CONSTRAINT "diagnostico_marcado_diagnostico_id_fkey" FOREIGN KEY ("diagnostico_id") REFERENCES "diagnostico_problema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicamento_indicado" ADD CONSTRAINT "medicamento_indicado_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

