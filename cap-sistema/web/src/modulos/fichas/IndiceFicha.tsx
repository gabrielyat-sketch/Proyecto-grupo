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
 * Alt+1 a Alt+9 saltan a cada seccion sin tocar el raton.
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
      {entradas.map((e, i) => {
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
              gap: 1,
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              font: 'inherit',
              px: 1,
              py: 0.75,
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
              sx={{
                minWidth: 26,
                fontSize: 12,
                fontWeight: 700,
                color: 'text.secondary',
              }}
            >
              {e.numeral}
            </Typography>

            <Typography sx={{ flex: 1, fontSize: 14, fontWeight: esActiva ? 600 : 400 }}>
              {e.titulo}
            </Typography>

            {cuenta ? (
              <Typography
                sx={{
                  fontSize: 12,
                  fontVariantNumeric: 'tabular-nums',
                  color: completa ? 'success.main' : 'text.secondary',
                  fontWeight: completa ? 700 : 400,
                }}
              >
                {cuenta.respondidas}/{cuenta.total}
              </Typography>
            ) : null}

            {i < 9 ? (
              <Typography
                aria-hidden
                sx={{ fontSize: 11, color: 'text.disabled', minWidth: 30, textAlign: 'right' }}
              >
                alt+{i + 1}
              </Typography>
            ) : null}
          </Box>
        );
      })}
    </Stack>
  );
}
