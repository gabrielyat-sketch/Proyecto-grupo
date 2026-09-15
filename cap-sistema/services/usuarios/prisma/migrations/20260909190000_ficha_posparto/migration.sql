-- La evaluacion del posparto: paginas 3 y 4 de la ficha prenatal.
--
-- El tipo de ficha POSPARTO ya lo anadio la migracion anterior. Aqui va solo la
-- tabla, que es de la hoja y no del enum.
--
-- CreateTable
CREATE TABLE "ficha_posparto" (
    "atencion_id" TEXT NOT NULL,
    "es_primer_control" BOOLEAN NOT NULL DEFAULT false,
    "dias_despues_del_parto" INTEGER,
    "donde_atendio_parto" VARCHAR(120),
    "quien_atendio_parto" "QuienAtendioParto",
    "quien_atendio_parto_otro" VARCHAR(120),
    "involucion_uterina_cifrado" BYTEA,
    "examen_mamas_cifrado" BYTEA,
    "herida_operatoria_cifrado" BYTEA,
    "examen_ginecologico_cifrado" BYTEA,
    "lactancia_materna_exclusiva" BOOLEAN,
    "motivo_sin_lactancia_cifrado" BYTEA,
    "problemas_detectados_cifrado" BYTEA,
    "sulfato_ferroso" BOOLEAN,
    "sulfato_ferroso_tabletas" INTEGER,
    "acido_folico" BOOLEAN,
    "acido_folico_tabletas" INTEGER,
    "td" BOOLEAN,
    "td_dosis" INTEGER,
    "otro_medicamento" BOOLEAN,

    CONSTRAINT "ficha_posparto_pkey" PRIMARY KEY ("atencion_id")
);

-- AddForeignKey
ALTER TABLE "ficha_posparto" ADD CONSTRAINT "ficha_posparto_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
