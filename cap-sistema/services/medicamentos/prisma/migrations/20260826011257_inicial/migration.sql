-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('TABLETA', 'CAPSULA', 'JARABE_ML', 'AMPOLLA', 'FRASCO', 'SOBRE', 'UNIDAD', 'GRAMO');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('DISPONIBLE', 'AGOTADO', 'VENCIDO', 'DADO_DE_BAJA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'ENTREGA', 'AJUSTE', 'BAJA', 'DEVOLUCION');

-- CreateTable
CREATE TABLE "medicamento" (
    "id" TEXT NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre_generico" VARCHAR(160) NOT NULL,
    "nombre_comercial" VARCHAR(160),
    "presentacion" VARCHAR(120),
    "concentracion" VARCHAR(60),
    "unidad" "UnidadMedida" NOT NULL,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "requiere_receta" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote" (
    "id" TEXT NOT NULL,
    "medicamento_id" TEXT NOT NULL,
    "numero_lote" VARCHAR(60) NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "fecha_ingreso" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedor" VARCHAR(160),
    "cantidad_inicial" INTEGER NOT NULL,
    "cantidad_disponible" INTEGER NOT NULL,
    "estado" "EstadoLote" NOT NULL DEFAULT 'DISPONIBLE',
    "motivo_baja" VARCHAR(200),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_inventario" (
    "id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad" INTEGER NOT NULL,
    "cantidad_resultante" INTEGER NOT NULL,
    "motivo" VARCHAR(200),
    "registrado_por" TEXT NOT NULL,
    "entrega_id" TEXT,

    CONSTRAINT "movimiento_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrega" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "comunidad_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" TEXT NOT NULL,
    "observaciones" VARCHAR(500),

    CONSTRAINT "entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalle_entrega" (
    "id" TEXT NOT NULL,
    "entrega_id" TEXT NOT NULL,
    "lote_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "detalle_entrega_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "medicamento_codigo_key" ON "medicamento"("codigo");

-- CreateIndex
CREATE INDEX "medicamento_nombre_generico_idx" ON "medicamento"("nombre_generico");

-- CreateIndex
CREATE INDEX "medicamento_activo_idx" ON "medicamento"("activo");

-- CreateIndex
CREATE INDEX "lote_medicamento_id_fecha_vencimiento_idx" ON "lote"("medicamento_id", "fecha_vencimiento");

-- CreateIndex
CREATE INDEX "lote_fecha_vencimiento_idx" ON "lote"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "lote_estado_idx" ON "lote"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "lote_medicamento_id_numero_lote_key" ON "lote"("medicamento_id", "numero_lote");

-- CreateIndex
CREATE INDEX "movimiento_inventario_lote_id_fecha_idx" ON "movimiento_inventario"("lote_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "movimiento_inventario_fecha_idx" ON "movimiento_inventario"("fecha");

-- CreateIndex
CREATE INDEX "movimiento_inventario_entrega_id_idx" ON "movimiento_inventario"("entrega_id");

-- CreateIndex
CREATE INDEX "entrega_paciente_id_fecha_idx" ON "entrega"("paciente_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "entrega_fecha_idx" ON "entrega"("fecha");

-- CreateIndex
CREATE INDEX "entrega_comunidad_id_idx" ON "entrega"("comunidad_id");

-- CreateIndex
CREATE INDEX "detalle_entrega_entrega_id_idx" ON "detalle_entrega"("entrega_id");

-- CreateIndex
CREATE INDEX "detalle_entrega_lote_id_idx" ON "detalle_entrega"("lote_id");

-- CreateIndex
CREATE INDEX "outbox_publicado_en_ocurrido_en_idx" ON "outbox"("publicado_en", "ocurrido_en");

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_inventario" ADD CONSTRAINT "movimiento_inventario_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega" ADD CONSTRAINT "detalle_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entrega"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalle_entrega" ADD CONSTRAINT "detalle_entrega_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
