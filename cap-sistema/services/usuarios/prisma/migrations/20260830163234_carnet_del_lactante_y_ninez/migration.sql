-- CreateEnum
CREATE TYPE "TramoEdad" AS ENUM ('M6_A_A1', 'A1_A_A2', 'A2_A_A3', 'A3_A_A4', 'A4_A_A5');

-- CreateEnum
CREATE TYPE "EscolaridadMadre" AS ENUM ('NINGUNO', 'PRIMARIA_1_3', 'PRIMARIA_4_6', 'MEDIA', 'SUPERIOR');

-- CreateEnum
CREATE TYPE "AbastecimientoAgua" AS ENUM ('CHORRO_INTRADOMICILIAR', 'CHORRO_PUBLICO', 'POZO', 'RIO', 'OTRO');

-- CreateEnum
CREATE TYPE "DisposicionExcretas" AS ENUM ('INODORO', 'LETRINA', 'AIRE_LIBRE');

-- CreateTable
CREATE TABLE "catalogo_vacuna" (
    "id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_vacuna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosis_recomendada" (
    "id" TEXT NOT NULL,
    "vacuna_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "edad_recomendada" VARCHAR(40),

    CONSTRAINT "dosis_recomendada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacuna_aplicada" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "vacuna_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacuna_aplicada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_micronutriente" (
    "id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "catalogo_micronutriente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega_esperada" (
    "id" TEXT NOT NULL,
    "micronutriente_id" TEXT NOT NULL,
    "tramo" "TramoEdad" NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "entrega_esperada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micronutriente_entregado" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "micronutriente_id" TEXT NOT NULL,
    "tramo" "TramoEdad" NOT NULL,
    "orden" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micronutriente_entregado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datos_ninez_paciente" (
    "paciente_id" TEXT NOT NULL,
    "lugar_nacimiento" VARCHAR(160),
    "acompanante_nombre_cifrado" BYTEA,
    "madre_nombre_cifrado" BYTEA,
    "madre_edad" INTEGER,
    "madre_ocupacion_cifrado" BYTEA,
    "madre_sabe_leer" BOOLEAN,
    "madre_escolaridad" "EscolaridadMadre",
    "padre_nombre_cifrado" BYTEA,
    "padre_edad" INTEGER,
    "padre_ocupacion_cifrado" BYTEA,
    "padre_sabe_leer" BOOLEAN,
    "hijos_total" INTEGER,
    "hijos_vivos" INTEGER,
    "hijos_muertos" INTEGER,
    "registrado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datos_ninez_paciente_pkey" PRIMARY KEY ("paciente_id")
);

-- CreateTable
CREATE TABLE "datos_del_hogar" (
    "grupo_familiar_id" TEXT NOT NULL,
    "agua" "AbastecimientoAgua",
    "agua_otro" VARCHAR(120),
    "excretas" "DisposicionExcretas",
    "registrado_por" TEXT NOT NULL,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datos_del_hogar_pkey" PRIMARY KEY ("grupo_familiar_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_vacuna_orden_key" ON "catalogo_vacuna"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "dosis_recomendada_vacuna_id_orden_key" ON "dosis_recomendada"("vacuna_id", "orden");

-- CreateIndex
CREATE INDEX "vacuna_aplicada_vacuna_id_fecha_idx" ON "vacuna_aplicada"("vacuna_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "vacuna_aplicada_paciente_id_vacuna_id_orden_key" ON "vacuna_aplicada"("paciente_id", "vacuna_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_micronutriente_orden_key" ON "catalogo_micronutriente"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "entrega_esperada_micronutriente_id_tramo_orden_key" ON "entrega_esperada"("micronutriente_id", "tramo", "orden");

-- CreateIndex
CREATE INDEX "micronutriente_entregado_micronutriente_id_fecha_idx" ON "micronutriente_entregado"("micronutriente_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "micronutriente_entregado_paciente_id_micronutriente_id_tram_key" ON "micronutriente_entregado"("paciente_id", "micronutriente_id", "tramo", "orden");

-- AddForeignKey
ALTER TABLE "dosis_recomendada" ADD CONSTRAINT "dosis_recomendada_vacuna_id_fkey" FOREIGN KEY ("vacuna_id") REFERENCES "catalogo_vacuna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacuna_aplicada" ADD CONSTRAINT "vacuna_aplicada_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacuna_aplicada" ADD CONSTRAINT "vacuna_aplicada_vacuna_id_fkey" FOREIGN KEY ("vacuna_id") REFERENCES "catalogo_vacuna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrega_esperada" ADD CONSTRAINT "entrega_esperada_micronutriente_id_fkey" FOREIGN KEY ("micronutriente_id") REFERENCES "catalogo_micronutriente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micronutriente_entregado" ADD CONSTRAINT "micronutriente_entregado_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micronutriente_entregado" ADD CONSTRAINT "micronutriente_entregado_micronutriente_id_fkey" FOREIGN KEY ("micronutriente_id") REFERENCES "catalogo_micronutriente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_ninez_paciente" ADD CONSTRAINT "datos_ninez_paciente_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datos_del_hogar" ADD CONSTRAINT "datos_del_hogar_grupo_familiar_id_fkey" FOREIGN KEY ("grupo_familiar_id") REFERENCES "grupo_familiar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
