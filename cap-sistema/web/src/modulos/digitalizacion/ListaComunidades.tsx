import { Box, Chip, Stack, Typography } from '@mui/material';
import { BarraAvance } from './BarraAvance';
import type { AvanceComunidad } from './servicio-digitalizacion';

/**
 * El archivo, comunidad por comunidad.
 *
 * Es la unidad en que el CAP recorre las carpetas, y por eso es tambien la
 * unidad en que se ve el avance: terminar una comunidad entera es una meta
 * alcanzable en unos dias, mientras que "100,000 expedientes" no lo es en
 * ningun plazo que alguien pueda imaginar.
 *
 * El orden es alfabetico y no por lo que falta. Reordenarlas segun el avance
 * las movería de sitio cada dia, y buscar donde quedo la de ayer costaria mas
 * que el supuesto atajo.
 */
export function ListaComunidades({
  comunidades,
  elegida,
  onElegir,
}: {
  comunidades: readonly AvanceComunidad[];
  elegida: string;
  onElegir: (comunidadId: string) => void;
}) {
  return (
    <Stack component="nav" aria-label="Comunidades" sx={{ gap: 0.25 }}>
      <Fila
        activa={elegida === ''}
        onClick={() => onElegir('')}
        nombre="Todas las comunidades"
        avance={resumir(comunidades)}
      />

      {comunidades.map((c) => (
        <Fila
          key={c.comunidadId}
          activa={elegida === c.comunidadId}
          onClick={() => onElegir(c.comunidadId)}
          nombre={c.nombre}
          distante={c.distante}
          avance={c}
        />
      ))}

      {comunidades.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
          Todavia no hay expedientes registrados.
        </Typography>
      ) : null}
    </Stack>
  );
}

type Avance = Pick<
  AvanceComunidad,
  'total' | 'completos' | 'faltantes' | 'noLocalizados' | 'porcentajeCompleto'
>;

function resumir(comunidades: readonly AvanceComunidad[]): Avance {
  const suma = (campo: keyof Avance) =>
    comunidades.reduce((a, c) => a + (c[campo] as number), 0);
  const total = suma('total');
  const completos = suma('completos');
  return {
    total,
    completos,
    faltantes: suma('faltantes'),
    noLocalizados: suma('noLocalizados'),
    porcentajeCompleto: total === 0 ? 0 : Math.round((completos / total) * 1000) / 10,
  };
}

function Fila({
  nombre,
  avance,
  activa,
  distante,
  onClick,
}: {
  nombre: string;
  avance: Avance;
  activa: boolean;
  distante?: boolean;
  onClick: () => void;
}) {
  const terminada = avance.total > 0 && avance.faltantes === 0;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-current={activa ? 'true' : undefined}
      sx={{
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        cursor: 'pointer',
        border: 0,
        borderLeft: '3px solid',
        borderLeftColor: activa ? 'primary.main' : 'transparent',
        bgcolor: activa ? 'action.selected' : 'transparent',
        px: 1,
        py: 0.75,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 0.5 }}>
        <Typography
          sx={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: activa ? 700 : 500 }}
          noWrap
        >
          {nombre}
        </Typography>

        {distante ? (
          <Chip
            label="Distante"
            size="small"
            sx={{ height: 18, fontSize: 10 }}
            title="Comunidad lejana al CAP"
          />
        ) : null}

        <Typography
          sx={{
            fontSize: 12,
            fontVariantNumeric: 'tabular-nums',
            color: terminada ? 'success.main' : 'text.secondary',
            fontWeight: terminada ? 700 : 400,
          }}
        >
          {avance.porcentajeCompleto}%
        </Typography>
      </Stack>

      <BarraAvance
        total={avance.total}
        completos={avance.completos}
        noLocalizados={avance.noLocalizados}
        alto={5}
      />

      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
        {avance.faltantes === 0
          ? avance.total + ' expedientes, sin pendientes'
          : avance.faltantes + ' por transcribir de ' + avance.total}
      </Typography>
    </Box>
  );
}
