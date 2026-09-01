-- CreateEnum
CREATE TYPE "EstadoPrograma" AS ENUM ('ACTIVO', 'EGRESADO', 'ABANDONO', 'FALLECIDO', 'TRASLADADO');

-- CreateEnum
CREATE TYPE "ClasificacionPresion" AS ENUM ('NORMAL', 'ELEVADA', 'ESTADIO_1', 'ESTADIO_2', 'CRISIS');

-- CreateEnum
CREATE TYPE "RiesgoEmbarazo" AS ENUM ('BAJO', 'ALTO');

-- CreateEnum
CREATE TYPE "ResultadoEmbarazo" AS ENUM ('PARTO_NORMAL', 'CESAREA', 'ABORTO', 'OBITO', 'TRASLADO', 'OTRO');

-- CreateTable
CREATE TABLE "programa_hipertension" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "fecha_ingreso" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPrograma" NOT NULL DEFAULT 'ACTIVO',
    "fecha_egreso" DATE,
    "motivo_egreso" VARCHAR(200),
    "meta_sistolica" INTEGER NOT NULL DEFAULT 140,
    "meta_diastolica" INTEGER NOT NULL DEFAULT 90,
    "inscrito_por" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_hipertension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_hipertension" (
    "id" TEXT NOT NULL,
    "programa_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sistolica" INTEGER NOT NULL,
    "diastolica" INTEGER NOT NULL,
    "clasificacion" "ClasificacionPresion" NOT NULL,
    "enMeta" BOOLEAN NOT NULL,
    "peso_kg" DECIMAL(5,2),
    "adherencia" BOOLEAN,
    "observaciones_cifrado" BYTEA,
    "proximo_control" DATE,
    "registrado_por" TEXT NOT NULL,

    CONSTRAINT "control_hipertension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programa_embarazo" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "fum" DATE NOT NULL,
    "fpp" DATE NOT NULL,
    "numero_gestacion" INTEGER NOT NULL DEFAULT 1,
    "partos_previos" INTEGER NOT NULL DEFAULT 0,
    "riesgo" "RiesgoEmbarazo" NOT NULL DEFAULT 'BAJO',
    "motivo_riesgo" VARCHAR(300),
    "estado" "EstadoPrograma" NOT NULL DEFAULT 'ACTIVO',
    "resultado" "ResultadoEmbarazo",
    "fecha_cierre" DATE,
    "inscrito_por" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programa_embarazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_prenatal" (
    "id" TEXT NOT NULL,
    "programa_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "semanas_gestacion" INTEGER NOT NULL,
    "peso_kg" DECIMAL(5,2),
    "sistolica" INTEGER,
    "diastolica" INTEGER,
    "altura_uterina_cm" DECIMAL(4,1),
    "fcf" INTEGER,
    "edema" BOOLEAN,
    "observaciones_cifrado" BYTEA,
    "alertas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proximo_control" DATE,
    "registrado_por" TEXT NOT NULL,

    CONSTRAINT "control_prenatal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" TEXT NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "datos" JSONB NOT NULL,
    "traza_id" VARCHAR(64),
    "ocurrido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicado_en" TIMESTAMP(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "programa_hipertension_paciente_id_idx" ON "programa_hipertension"("paciente_id");

-- CreateIndex
CREATE INDEX "programa_hipertension_estado_idx" ON "programa_hipertension"("estado");

-- CreateIndex
CREATE INDEX "programa_hipertension_comunidad_id_idx" ON "programa_hipertension"("comunidad_id");

-- CreateIndex
CREATE INDEX "control_hipertension_programa_id_fecha_idx" ON "control_hipertension"("programa_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "control_hipertension_fecha_idx" ON "control_hipertension"("fecha");

-- CreateIndex
CREATE INDEX "programa_embarazo_paciente_id_idx" ON "programa_embarazo"("paciente_id");

-- CreateIndex
CREATE INDEX "programa_embarazo_estado_idx" ON "programa_embarazo"("estado");

-- CreateIndex
CREATE INDEX "programa_embarazo_riesgo_idx" ON "programa_embarazo"("riesgo");

-- CreateIndex
CREATE INDEX "programa_embarazo_fpp_idx" ON "programa_embarazo"("fpp");

-- CreateIndex
CREATE INDEX "control_prenatal_programa_id_fecha_idx" ON "control_prenatal"("programa_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "control_prenatal_fecha_idx" ON "control_prenatal"("fecha");

-- CreateIndex
CREATE INDEX "outbox_publicado_en_ocurrido_en_idx" ON "outbox"("publicado_en", "ocurrido_en");

-- AddForeignKey
ALTER TABLE "control_hipertension" ADD CONSTRAINT "control_hipertension_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa_hipertension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_prenatal" ADD CONSTRAINT "control_prenatal_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programa_embarazo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
