-- CreateTable
CREATE TABLE "ejemplo" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ejemplo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ejemplo_creado_en_idx" ON "ejemplo"("creado_en");
