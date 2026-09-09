-- El achi' se anade a los idiomas de atencion.
--
-- Va BEFORE 'OTRO' y no al final, que es donde PostgreSQL lo pondria por
-- defecto: el orden del tipo es el que usa cualquier ORDER BY sobre la columna,
-- y 'OTRO' —la salida para lo que no esta en la lista— tiene que quedar detras
-- de los idiomas reales, igual que en schema.prisma.
--
-- ALTER TYPE ... ADD VALUE no admite ejecutarse y usarse en la misma
-- transaccion, pero aqui solo se anade: ninguna fila lo estrena todavia.
ALTER TYPE "Idioma" ADD VALUE 'ACHI' BEFORE 'OTRO';
