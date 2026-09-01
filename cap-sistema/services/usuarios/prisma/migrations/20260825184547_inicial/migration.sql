-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('ESPANOL', 'POQOMCHI', 'QEQCHI', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoDigitalizacion" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETO', 'NO_LOCALIZADO');

-- CreateTable
CREATE TABLE "comunidad" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "codigo" VARCHAR(20),
    "distante" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "comunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_familiar" (
    "id" TEXT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "direccion" VARCHAR(255),
    "telefono" VARCHAR(20),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_familiar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paciente" (
    "id" TEXT NOT NULL,
    "dpi_cifrado" BYTEA,
    "dpi_indice" BYTEA,
    "nombres" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(120) NOT NULL,
    "fecha_nacimiento" DATE NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "idioma" "Idioma" NOT NULL DEFAULT 'ESPANOL',
    "comunidad_id" TEXT NOT NULL,
    "grupo_familiar_id" TEXT,
    "telefono" VARCHAR(20),
    "fallecido" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expediente" (
    "id" TEXT NOT NULL,
    "numero_cifrado" BYTEA NOT NULL,
    "numero_indice" BYTEA NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "apertura_en" DATE,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atencion" (
    "id" TEXT NOT NULL,
    "expediente_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrada_por" TEXT NOT NULL,
    "motivo_cifrado" BYTEA NOT NULL,
    "diagnostico_cifrado" BYTEA,
    "tratamiento_cifrado" BYTEA,
    "notas_cifrado" BYTEA,
    "peso_kg" DECIMAL(5,2),
    "talla_cm" DECIMAL(5,1),
    "presion_sistolica" INTEGER,
    "presion_diastolica" INTEGER,
    "temperatura_c" DECIMAL(4,1),
    "digitalizada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "atencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_digitalizacion" (
    "expediente_id" TEXT NOT NULL,
    "estado" "EstadoDigitalizacion" NOT NULL DEFAULT 'PENDIENTE',
    "digitalizado_por" TEXT,
    "iniciado_en" TIMESTAMP(3),
    "completado_en" TIMESTAMP(3),
    "atenciones_transcritas" INTEGER NOT NULL DEFAULT 0,
    "observaciones" VARCHAR(500),

    CONSTRAINT "registro_digitalizacion_pkey" PRIMARY KEY ("expediente_id")
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
CREATE UNIQUE INDEX "comunidad_nombre_key" ON "comunidad"("nombre");

-- CreateIndex
CREATE INDEX "comunidad_activa_idx" ON "comunidad"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_familiar_codigo_key" ON "grupo_familiar"("codigo");

-- CreateIndex
CREATE INDEX "grupo_familiar_comunidad_id_idx" ON "grupo_familiar"("comunidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "paciente_dpi_indice_key" ON "paciente"("dpi_indice");

-- CreateIndex
CREATE INDEX "paciente_apellidos_nombres_idx" ON "paciente"("apellidos", "nombres");

-- CreateIndex
CREATE INDEX "paciente_comunidad_id_idx" ON "paciente"("comunidad_id");

-- CreateIndex
CREATE INDEX "paciente_grupo_familiar_id_idx" ON "paciente"("grupo_familiar_id");

-- CreateIndex
CREATE INDEX "paciente_fecha_nacimiento_idx" ON "paciente"("fecha_nacimiento");

-- CreateIndex
CREATE UNIQUE INDEX "expediente_numero_indice_key" ON "expediente"("numero_indice");

-- CreateIndex
CREATE UNIQUE INDEX "expediente_paciente_id_key" ON "expediente"("paciente_id");

-- CreateIndex
CREATE INDEX "atencion_expediente_id_fecha_idx" ON "atencion"("expediente_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "atencion_fecha_idx" ON "atencion"("fecha");

-- CreateIndex
CREATE INDEX "registro_digitalizacion_estado_idx" ON "registro_digitalizacion"("estado");

-- CreateIndex
CREATE INDEX "outbox_publicado_en_ocurrido_en_idx" ON "outbox"("publicado_en", "ocurrido_en");

-- AddForeignKey
ALTER TABLE "grupo_familiar" ADD CONSTRAINT "grupo_familiar_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "comunidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_comunidad_id_fkey" FOREIGN KEY ("comunidad_id") REFERENCES "comunidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paciente" ADD CONSTRAINT "paciente_grupo_familiar_id_fkey" FOREIGN KEY ("grupo_familiar_id") REFERENCES "grupo_familiar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expediente" ADD CONSTRAINT "expediente_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atencion" ADD CONSTRAINT "atencion_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_digitalizacion" ADD CONSTRAINT "registro_digitalizacion_expediente_id_fkey" FOREIGN KEY ("expediente_id") REFERENCES "expediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
