-- Programas empieza a ESCUCHAR el bus (etapa D del diseno de la ficha prenatal).
--
-- Dos cosas que hacen falta para consumir un evento que llega "al menos una
-- vez" sin registrar el mismo control dos veces:
--
--  1. `evento_procesado`: el id de cada evento que ya se atendio, escrito en la
--     misma transaccion que el cambio que provoco, y con que se hizo con el.
--     Los descartados —una hoja prenatal de una paciente sin seguimiento
--     activo— quedan aqui con su motivo: "Programas decide, y hoy lo descarta
--     y lo deja anotado".
--
--  2. `control_prenatal.atencion_id`: de que ficha de `usuarios` salio el
--     control, cuando vino por el bus y no de la pantalla. Unico, para que la
--     misma hoja no pueda ser dos controles ni aunque el evento se repita por
--     otro camino.

-- CreateEnum
CREATE TYPE "ResultadoEvento" AS ENUM ('APLICADO', 'DESCARTADO');

-- AlterTable
ALTER TABLE "control_prenatal" ADD COLUMN "atencion_id" TEXT;

-- CreateTable
CREATE TABLE "evento_procesado" (
    "id" TEXT NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "origen" VARCHAR(30) NOT NULL,
    "procesado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" "ResultadoEvento" NOT NULL,
    "detalle" VARCHAR(300),

    CONSTRAINT "evento_procesado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "control_prenatal_atencion_id_key" ON "control_prenatal"("atencion_id");

-- CreateIndex
CREATE INDEX "evento_procesado_tipo_procesado_en_idx" ON "evento_procesado"("tipo", "procesado_en");
