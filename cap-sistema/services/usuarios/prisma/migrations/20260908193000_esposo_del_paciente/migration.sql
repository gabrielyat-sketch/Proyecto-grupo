-- AlterTable
--
-- Nullable a proposito, y sin valor por defecto: los pacientes ya registrados
-- no tienen el dato y '' seria mentir —no es lo mismo «no esta casado» que «no
-- se pregunto»—. La columna nace vacia y se llena cuando alguien lo pregunta.
ALTER TABLE "paciente" ADD COLUMN     "esposo" VARCHAR(160);
