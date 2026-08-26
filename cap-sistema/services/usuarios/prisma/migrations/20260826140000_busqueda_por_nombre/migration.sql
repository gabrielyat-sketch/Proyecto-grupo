-- Busqueda de pacientes por nombre completo, sin tildes y en cualquier orden.
--
-- Antes se buscaba con LIKE 'texto%' sobre `apellidos` y sobre `nombres` por
-- separado. Eso dejaba fuera tres casos que el personal usa a diario:
--   * el segundo apellido      "Isem"                  no encontraba "Xona Isem"
--   * el nombre completo       "Yat Yat Ramiro"        no encontraba nada
--   * cualquier tilde          "Xona"                  no encontraba "Xona"
--
-- Requiere la extension pg_trgm, que instala infra/postgres/init.sql como
-- administrador: cap_migrador no tiene CREATE sobre la base, a proposito.

-- 1. La columna normalizada. Con DEFAULT '' no reescribe la tabla.
ALTER TABLE "paciente" ADD COLUMN "nombre_busqueda" TEXT NOT NULL DEFAULT '';

-- 2. Relleno de los pacientes que ya existen.
--
-- Se usa translate() y no unaccent() porque cap_migrador tampoco puede
-- instalar esa extension. translate() cubre las letras acentuadas del espanol
-- y produce el MISMO resultado que normalizarTexto() de @cap/shared, que es la
-- funcion que mantiene la columna de aqui en adelante.
UPDATE "paciente"
SET "nombre_busqueda" = lower(
  btrim(
    regexp_replace(
      translate(
        "apellidos" || ' ' || "nombres",
        'ÁÀÄÂÃáàäâãÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÑñÇç',
        'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'
      ),
      '\s+', ' ', 'g'
    )
  )
);

-- 3. El indice, al final: crearlo antes obligaria a mantenerlo durante el
--    relleno de las 100,000 filas.
--
-- GIN de trigramas y no B-tree: la busqueda ya no es solo por el inicio del
-- campo, y un B-tree no puede resolver un patron que empieza con comodin.
CREATE INDEX "paciente_nombre_busqueda_idx"
  ON "paciente" USING GIN ("nombre_busqueda" public.gin_trgm_ops);
