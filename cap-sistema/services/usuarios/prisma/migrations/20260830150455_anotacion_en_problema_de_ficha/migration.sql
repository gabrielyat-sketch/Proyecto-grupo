-- AlterTable
ALTER TABLE "problema_atencion" ADD COLUMN     "anotacion_cifrado" BYTEA;

-- AlterTable
ALTER TABLE "problema_ficha" ADD COLUMN     "etiqueta_anotacion" VARCHAR(80);
