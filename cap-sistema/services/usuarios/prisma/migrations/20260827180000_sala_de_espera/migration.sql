-- CreateEnum
CREATE TYPE "EstadoVisita" AS ENUM ('ESPERANDO', 'ATENDIDA', 'RETIRADA');

-- CreateTable
CREATE TABLE "visita" (
    "id" TEXT NOT NULL,
    "paciente_id" TEXT NOT NULL,
    "estado" "EstadoVisita" NOT NULL DEFAULT 'ESPERANDO',
    "llegada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrada_por" TEXT NOT NULL,
    "motivo_cifrado" BYTEA,
    "cerrada_en" TIMESTAMP(3),
    "cerrada_por" TEXT,
    "atencion_id" TEXT,
    "motivo_retiro" VARCHAR(200),

    CONSTRAINT "visita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visita_atencion_id_key" ON "visita"("atencion_id");

-- CreateIndex
CREATE INDEX "visita_estado_llegada_en_idx" ON "visita"("estado", "llegada_en");

-- CreateIndex
CREATE INDEX "visita_paciente_id_idx" ON "visita"("paciente_id");

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita" ADD CONSTRAINT "visita_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Una sola visita EN ESPERA por paciente.
--
-- Escrito a mano porque Prisma no sabe expresar un indice unico parcial. Sin
-- el, pulsar "marcar llegada" dos veces —o que lo hagan dos personas a la vez,
-- que en una recepcion con fila pasa— dejaria al mismo paciente dos veces en la
-- sala de espera, y la enfermera lo llamaria dos veces.
--
-- Es parcial a proposito: las visitas ya cerradas se repiten cuantas veces haga
-- falta, porque un paciente vuelve al CAP muchas veces en su vida. Lo que no
-- puede haber es dos esperas abiertas del mismo paciente al mismo tiempo.
CREATE UNIQUE INDEX "visita_una_espera_por_paciente"
    ON "visita" ("paciente_id")
    WHERE "estado" = 'ESPERANDO';
