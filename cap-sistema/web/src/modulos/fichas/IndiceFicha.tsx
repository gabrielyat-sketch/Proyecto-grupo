import { Box, Stack, Typography } from '@mui/material';
import type { AvanceSeccion } from './borrador';

export interface EntradaIndice {
  clave: string;
  numeral: string;
  titulo: string;
}

/**
 * El indice de secciones, fijo a un lado.
 *
 * No son pestanas. Con pestanas, media hoja sin llenar queda escondida detras
 * de una que nadie abrio, y quien transcribe no tiene forma de notarlo hasta
 * que el expediente ya esta guardado. Aqui la ficha es UNA sola pagina que se
 * recorre de arriba abajo —igual que el papel— y el indice solo lleva el
 * recuento de lo que falta y sirve de atajo.
 *
 * Ocupa lo justo: el sitio que se le quite al indice se lo gana el formulario,
 * que es donde de verdad hace falta el ancho. El aviso de los atajos va una
 * sola vez arriba y no repetido en cada renglon.
 */
export function IndiceFicha({
  entradas,
  avance,
  activa,
  onIr,
}: {
  entradas: readonly EntradaIndice[];
  avance: Record<string, AvanceSeccion>;
  activa: string;
  onIr: (clave: string) => void;
}) {
  return (
    <Stack
      component="nav"
      aria-label="Secciones de la ficha"
      sx={{ position: 'sticky', top: 88, gap: 0.25 }}
    >
      {entradas.map((e) => {
        const cuenta = avance[e.clave];
        const esActiva = e.clave === activa;
        const completa = cuenta && cuenta.respondidas === cuenta.total;

        return (
          <Box
            key={e.clave}
            component="button"
            type="button"
            onClick={() => onIr(e.clave)}
            aria-current={esActiva ? 'true' : undefined}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.75,
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              px: 0.75,
              py: 0.6,
              border: 0,
              borderLeft: '3px solid',
              borderLeftColor: esActiva ? 'primary.main' : 'transparent',
              bgcolor: esActiva ? 'action.selected' : 'transparent',
              color: esActiva ? 'primary.main' : 'text.primary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Typography
              aria-hidden
              sx={{ minWidth: 24, fontSize: 11, fontWeight: 700, color: 'text.secondary' }}
            >
              {e.numeral}
            </Typography>

            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                lineHeight: 1.25,
                fontWeight: esActiva ? 600 : 400,
              }}
            >
              {e.titulo}
            </Typography>

            {cuenta ? (
              <Typography
                sx={{
                  fontSize: 11,
                  fontVariantNumeric: 'tabular-nums',
                  color: completa ? 'success.main' : 'text.secondary',
                  fontWeight: completa ? 700 : 400,
                }}
              >
                {cuenta.respondidas}/{cuenta.total}
              </Typography>
            ) : null}
          </Box>
        );
      })}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 0.75, pt: 1, lineHeight: 1.3 }}
      >
        Alt y el numero de seccion para saltar
      </Typography>
    </Stack>
  );
}
