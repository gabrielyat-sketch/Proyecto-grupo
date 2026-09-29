-- CreateTable
CREATE TABLE "dispositivo_confiable" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "descripcion" VARCHAR(120),
    "ip" VARCHAR(45),
    "expira_en" TIMESTAMP(3) NOT NULL,
    "ultimo_uso_en" TIMESTAMP(3),
    "revocado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_confiable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dispositivo_confiable_usuario_id_idx" ON "dispositivo_confiable"("usuario_id");

-- CreateIndex
CREATE INDEX "dispositivo_confiable_expira_en_idx" ON "dispositivo_confiable"("expira_en");

-- AddForeignKey
ALTER TABLE "dispositivo_confiable" ADD CONSTRAINT "dispositivo_confiable_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
