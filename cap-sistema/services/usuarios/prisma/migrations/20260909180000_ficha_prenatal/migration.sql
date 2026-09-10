-- La hoja del posparto es un tipo de ficha propio.
--
-- Al final del enum, y no en una posicion concreta: nadie ordena fichas por su
-- tipo, asi que aqui el orden del tipo no significa nada. (En `Idioma` si
-- importaba: cualquier ORDER BY lo usa y "OTRO" tenia que quedar detras de los
-- idiomas reales.)
--
-- AlterEnum
ALTER TYPE "TipoFicha" ADD VALUE 'POSPARTO';

-- CreateTable
CREATE TABLE "ficha_prenatal" (
    "atencion_id" TEXT NOT NULL,
    "circunferencia_brazo_cm" DECIMAL(4,1),
    "peso_libras" DECIMAL(5,1),
    "examen_general_normal" BOOLEAN,
    "examen_bucodental_cifrado" BYTEA,
    "altura_uterina_cm" DECIMAL(4,1),
    "movimientos_fetales" BOOLEAN,
    "fcf" INTEGER,
    "presentacion_leopold" VARCHAR(60),
    "trazas_sangre" BOOLEAN,
    "trazas_sangre_descripcion_cifrado" BYTEA,
    "lesiones_vulvares" BOOLEAN,
    "lesiones_vulvares_descripcion_cifrado" BYTEA,
    "flujo_vaginal" BOOLEAN,
    "hemoglobina_hematocrito_cifrado" BYTEA,
    "grupo_rh_cifrado" BYTEA,
    "orina_cifrado" BYTEA,
    "glicemia_cifrado" BYTEA,
    "vdrl_cifrado" BYTEA,
    "vih_cifrado" BYTEA,
    "papanicolau_cifrado" BYTEA,
    "infecciones_cifrado" BYTEA,
    "semanas_por_fur_au" INTEGER,
    "problemas_detectados_cifrado" BYTEA,
    "sulfato_ferroso_tabletas" INTEGER,
    "acido_folico_tabletas" INTEGER,
    "td_dosis" INTEGER,

    CONSTRAINT "ficha_prenatal_pkey" PRIMARY KEY ("atencion_id")
);

-- AddForeignKey
ALTER TABLE "ficha_prenatal" ADD CONSTRAINT "ficha_prenatal_atencion_id_fkey" FOREIGN KEY ("atencion_id") REFERENCES "atencion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
