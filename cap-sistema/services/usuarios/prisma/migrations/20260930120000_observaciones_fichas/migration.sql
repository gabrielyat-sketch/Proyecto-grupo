-- Observaciones del CAP a las fichas (30 sep 2026).
--
-- Solo se AGREGAN columnas, todas nulas: nada de lo que ya existe cambia.
--
-- * `atencion.atendio`: «Nombre y cargo de la persona que atendio», que el
--   papel trae al pie de cada ficha y el sistema dejaba en blanco.
-- * `atencion.tipo_servicio`: la casilla del establecimiento de salud, que
--   ahora se marca a mano en vez de quedar fija en CAP.
-- * `paciente.dpi_madre_cifrado`: el DPI de la madre del recien nacido que
--   aun no tiene CUI. Va fuera de `dpi_indice` para no chocar con la madre.

-- CreateEnum
CREATE TYPE "TipoServicioSalud" AS ENUM ('PS', 'PSF', 'CS_B', 'CENAPA', 'CS_A', 'CAP', 'CAIMI', 'CUM', 'HOSPITAL');

-- AlterTable
ALTER TABLE "atencion" ADD COLUMN     "atendio" VARCHAR(200),
ADD COLUMN     "tipo_servicio" "TipoServicioSalud";

-- AlterTable
ALTER TABLE "paciente" ADD COLUMN     "dpi_madre_cifrado" BYTEA;
