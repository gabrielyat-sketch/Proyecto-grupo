-- CreateEnum
CREATE TYPE "accion" AS ENUM ('CONSULTA', 'CREACION', 'MODIFICACION', 'ELIMINACION', 'IMPRESION', 'EXPORTACION');

-- CreateTable
CREATE TABLE "registro" (
    "numero" BIGSERIAL NOT NULL,
    "hash_previo" CHAR(64) NOT NULL,
    "hash" CHAR(64) NOT NULL,
    "servicio" VARCHAR(40) NOT NULL,
    "accion" "accion" NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidad_id" VARCHAR(64) NOT NULL,
    "usuario_id" VARCHAR(64) NOT NULL,
    "usuario_rol" VARCHAR(30) NOT NULL,
    "motivo" VARCHAR(300),
    "valor_anterior" BYTEA,
    "valor_nuevo" BYTEA,
    "traza_id" VARCHAR(64) NOT NULL,
    "ip" VARCHAR(45),
    "ocurrido_en" TIMESTAMP(3) NOT NULL,
    "registrado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registro_pkey" PRIMARY KEY ("numero")
);

-- CreateTable
CREATE TABLE "raiz_diaria" (
    "dia" DATE NOT NULL,
    "numero_desde" BIGINT NOT NULL,
    "numero_hasta" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "hash_final" CHAR(64) NOT NULL,
    "firma" CHAR(64) NOT NULL,
    "generada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raiz_diaria_pkey" PRIMARY KEY ("dia")
);

-- CreateIndex
CREATE UNIQUE INDEX "registro_hash_previo_key" ON "registro"("hash_previo");

-- CreateIndex
CREATE UNIQUE INDEX "registro_hash_key" ON "registro"("hash");

-- CreateIndex
CREATE INDEX "registro_entidad_entidad_id_idx" ON "registro"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "registro_usuario_id_registrado_en_idx" ON "registro"("usuario_id", "registrado_en");

-- CreateIndex
CREATE INDEX "registro_accion_registrado_en_idx" ON "registro"("accion", "registrado_en");

-- CreateIndex
CREATE INDEX "registro_registrado_en_idx" ON "registro"("registrado_en");
