-- El turno en la sala de espera se puede cambiar.
--
-- Hasta ahora el orden era el de llegada y nada mas. Llega una emergencia y
-- hay que pasarla adelante, y la unica forma habria sido mentir sobre la hora
-- a la que llego. `orden` es la posicion en la sala de hoy: nace como el
-- orden de llegada y se renumera 1..n cada vez que alguien se mueve.
--
-- `motivo_prioridad_cifrado` guarda por que se le paso adelante, cifrado como
-- el motivo de la visita porque dice lo mismo: "dolor de pecho" es un dato de
-- salud y esta lista se ve con la sala llena de gente.

-- AlterTable
ALTER TABLE "visita" ADD COLUMN     "orden" INTEGER,
ADD COLUMN     "motivo_prioridad_cifrado" BYTEA;

-- Las visitas que ya existen reciben su turno por orden de llegada, para que
-- nada cambie de sitio al desplegar. Se numeran por dia y solo las que esperan;
-- a las cerradas les da igual, y se les pone 0 para poder exigir NOT NULL.
UPDATE "visita" v
SET "orden" = n.rn
FROM (
    SELECT id, row_number() OVER (PARTITION BY date("llegada_en") ORDER BY "llegada_en") AS rn
    FROM "visita"
    WHERE "estado" = 'ESPERANDO'
) n
WHERE v.id = n.id;

UPDATE "visita" SET "orden" = 0 WHERE "orden" IS NULL;

ALTER TABLE "visita" ALTER COLUMN "orden" SET NOT NULL;

-- CreateIndex
CREATE INDEX "visita_estado_orden_idx" ON "visita"("estado", "orden");
