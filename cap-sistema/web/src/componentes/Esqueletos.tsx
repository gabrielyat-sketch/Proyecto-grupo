import { Box, Paper, Skeleton, Stack } from '@mui/material';

/**
 * Las siluetas que ocupan el lugar del contenido mientras llega.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE ESTO Y NO EL CIRCULITO QUE HABIA
 * ─────────────────────────────────────────────────────────────────────────
 * Antes cada pantalla ponia un `CircularProgress` centrado. En la oficina,
 * con la respuesta en 80 ms, no se alcanzaba a ver y daba igual. En Purulha
 * no: con la red del CAP una consulta tarda segundos, y en esos segundos la
 * pantalla era un circulito girando sobre un area vacia.
 *
 * Eso tiene dos problemas, y el segundo es el que de verdad molesta:
 *
 *   1. El circulito dice «espere» pero no dice «que». Quien entra a Farmacia
 *      no sabe si esta cargando el catalogo o si el catalogo esta vacio.
 *   2. **El salto.** El circulito mide 40 px; la tabla que lo sustituye mide
 *      600. Cuando los datos llegan, todo lo que hay debajo brinca. Si al
 *      usuario le dio tiempo de empezar a leer algo, lo pierde.
 *
 * Un esqueleto resuelve los dos: tiene la forma y el alto de lo que viene, asi
 * que cuando el contenido aparece no se mueve nada, y la forma misma ya
 * adelanta si lo que viene es una tabla, una lista o unas fichas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LO QUE NO HACEN
 * ─────────────────────────────────────────────────────────────────────────
 * No se usan para los estados VACIOS. Un esqueleto promete contenido; si la
 * busqueda no devolvio nada, lo que toca es decirlo con palabras. Confundir
 * las dos cosas deja al usuario esperando algo que no va a llegar.
 *
 * `aria-busy` y el texto oculto son lo que hace que un lector de pantalla
 * anuncie la espera: las barras grises, por si solas, para el son nada.
 */

/** Envoltura comun: marca la region como ocupada y la anuncia una sola vez. */
function Cargando({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return (
    <Box aria-busy="true" aria-live="polite">
      {/*
        Oculto a la vista pero no al lector de pantalla.

        `'1px'` y no `1`: en el `sx` de MUI un numero suelto en `width` o
        `height` significa 100 %, no un pixel. Con `width: 1` este span medi­a
        el ancho de la pagina y, al llevar `nowrap`, empujaba el documento
        hacia la derecha: salia una barra de desplazamiento horizontal en cada
        pantalla mientras cargaba.
      */}
      <Box
        component="span"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {etiqueta}
      </Box>
      {children}
    </Box>
  );
}

/**
 * La silueta de una tabla.
 *
 * `columnas` y `filas` deberian ser los de la tabla real: es lo que hace que
 * el contenido caiga en su sitio sin empujar nada.
 */
export function EsqueletoTabla({
  columnas = 5,
  filas = 5,
  etiqueta = 'Cargando la tabla',
}: {
  columnas?: number;
  filas?: number;
  etiqueta?: string;
}) {
  return (
    <Cargando etiqueta={etiqueta}>
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
      >
        {/* La cabecera va en tono de cabecera, no en gris de dato: aunque sea
            una silueta, la jerarquia de la tabla ya se lee. */}
        <Stack
          direction="row"
          sx={{
            gap: 2,
            px: 2,
            py: 1.75,
            bgcolor: 'action.hover',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {Array.from({ length: columnas }).map((_, i) => (
            <Skeleton key={i} variant="text" sx={{ flex: 1, fontSize: 14 }} />
          ))}
        </Stack>

        {Array.from({ length: filas }).map((_, f) => (
          <Stack
            key={f}
            direction="row"
            sx={{
              gap: 2,
              px: 2,
              py: 2,
              alignItems: 'center',
              borderBottom: f === filas - 1 ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            {Array.from({ length: columnas }).map((_, c) => (
              <Skeleton
                key={c}
                variant="text"
                sx={{
                  flex: 1,
                  fontSize: 16,
                  // Anchos desiguales: una columna de barras idénticas se lee
                  // como un patron, no como datos que todavia no llegaron.
                  maxWidth: c === 0 ? '100%' : ['70%', '85%', '55%'][(f + c) % 3],
                }}
              />
            ))}
          </Stack>
        ))}
      </Paper>
    </Cargando>
  );
}

/**
 * La silueta de una lista de filas altas: la cola de la sala de espera, el
 * historial de un expediente, la bitacora.
 */
export function EsqueletoLista({
  filas = 4,
  etiqueta = 'Cargando la lista',
}: {
  filas?: number;
  etiqueta?: string;
}) {
  return (
    <Cargando etiqueta={etiqueta}>
      <Stack sx={{ gap: 1.5 }}>
        {Array.from({ length: filas }).map((_, i) => (
          <Paper
            key={i}
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              px: 2.5,
              py: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Skeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
            <Stack sx={{ gap: 0.75, flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" sx={{ fontSize: 18, maxWidth: 260 }} />
              <Skeleton variant="text" sx={{ fontSize: 13, maxWidth: 380 }} />
            </Stack>
            <Skeleton variant="rounded" width={72} height={28} sx={{ flexShrink: 0 }} />
          </Paper>
        ))}
      </Stack>
    </Cargando>
  );
}

/**
 * La silueta de una rejilla de fichas: las carpetas familiares y el personal.
 *
 * `alto` se pasa para que coincida con la ficha real de cada pantalla; una
 * carpeta y una ficha de personal no miden lo mismo.
 */
export function EsqueletoFichas({
  cantidad = 6,
  alto = 150,
  minimo = 230,
  etiqueta = 'Cargando las fichas',
}: {
  cantidad?: number;
  alto?: number;
  /** Ancho minimo de cada ficha, el mismo de la rejilla real. */
  minimo?: number;
  etiqueta?: string;
}) {
  return (
    <Cargando etiqueta={etiqueta}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: 'repeat(auto-fill, minmax(' + minimo + 'px, 1fr))',
        }}
      >
        {Array.from({ length: cantidad }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={alto} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Cargando>
  );
}

/**
 * La silueta de un bloque de datos sueltos: la cabecera de un medicamento, los
 * datos de un paciente sobre su historial.
 */
export function EsqueletoResumen({
  campos = 4,
  etiqueta = 'Cargando los datos',
}: {
  campos?: number;
  etiqueta?: string;
}) {
  return (
    <Cargando etiqueta={etiqueta}>
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}
      >
        <Skeleton variant="text" sx={{ fontSize: 13, maxWidth: 90 }} />
        <Skeleton variant="text" sx={{ fontSize: 30, maxWidth: 320, mb: 2 }} />
        <Stack direction="row" sx={{ gap: 4, flexWrap: 'wrap' }}>
          {Array.from({ length: campos }).map((_, i) => (
            <Stack key={i} sx={{ gap: 0.5, minWidth: 120 }}>
              <Skeleton variant="text" sx={{ fontSize: 12, maxWidth: 80 }} />
              <Skeleton variant="text" sx={{ fontSize: 18, maxWidth: 110 }} />
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Cargando>
  );
}
