import { Box, Stack, TextField, Typography } from '@mui/material';
import type { CampoExamen, ExamenFisico } from './borrador';
import { RANGOS_EXAMEN, clasificacionImc, fueraDeRango, imcDe } from './borrador';

/**
 * La hoja impresa pide el peso en LIBRAS y la talla en METROS; el sistema los
 * guarda en kilogramos y centimetros, que es como los piden los indicadores del
 * MSPAS. Para que nadie tenga que hacer la cuenta a mano —que es justo donde se
 * cuelan los errores— el equivalente aparece debajo del campo mientras se
 * escribe.
 */
const equivalencia: Partial<Record<CampoExamen, (n: number) => string>> = {
  pesoKg: (n) => 'equivale a ' + (n * 2.20462).toFixed(1) + ' lb',
  tallaCm: (n) => 'equivale a ' + (n / 100).toFixed(2) + ' mt',
};

const CAMPOS: { campo: CampoExamen; etiqueta: string; unidad: string }[] = [
  { campo: 'pesoKg', etiqueta: 'Peso', unidad: 'kg' },
  { campo: 'tallaCm', etiqueta: 'Talla', unidad: 'cm' },
  { campo: 'presionSistolica', etiqueta: 'Presion sistolica', unidad: 'mmHg' },
  { campo: 'presionDiastolica', etiqueta: 'Presion diastolica', unidad: 'mmHg' },
  { campo: 'temperaturaC', etiqueta: 'Temperatura', unidad: 'C' },
  { campo: 'pulso', etiqueta: 'Pulso', unidad: '/min' },
  { campo: 'respiraciones', etiqueta: 'Respiraciones', unidad: '/min' },
  { campo: 'circunferenciaCinturaCm', etiqueta: 'Circunferencia de cintura', unidad: 'cm' },
];

/**
 * Seccion VIII. Signos vitales y medidas.
 *
 * El IMC aparece calculado en cuanto hay peso y talla, y no es un campo que se
 * escriba: en el papel es el numero que mas se equivoca al sacarse a mano. Aqui
 * tampoco se guarda —el servidor lo vuelve a calcular al leer la ficha—, con lo
 * que nunca puede quedar desfasado del peso del que dice venir.
 */
export function SeccionExamenFisico({
  valores,
  onCambio,
  campos,
}: {
  valores: ExamenFisico;
  onCambio: (campo: CampoExamen, valor: string) => void;
  /**
   * Que casillas dibujar, cuando la hoja no las pide todas.
   *
   * Por defecto, las ocho de la ficha de adultos. La hoja prenatal pide cinco y
   * ninguna es la circunferencia de cintura: en un embarazo esa medida no
   * significa lo que significa fuera de el, y ofrecerla seria invitar a
   * capturar un dato que despues nadie sabria como leer.
   */
  campos?: readonly CampoExamen[];
}) {
  const visibles = campos ? CAMPOS.filter((c) => campos.includes(c.campo)) : CAMPOS;
  const imc = imcDe(valores.pesoKg, valores.tallaCm);

  // El IMC solo se ensena si la hoja pide sus dos ingredientes. En la prenatal
  // no se pide la talla, y ademas el indice deja de significar lo mismo segun
  // avanza el embarazo: un recuadro fijo diciendo "se calcula con el peso y la
  // talla" seria una casilla vacia invitando a llenar algo que esa hoja no
  // pregunta.
  const conImc = visibles.some((c) => c.campo === 'pesoKg') && visibles.some((c) => c.campo === 'tallaCm');

  return (
    <Stack sx={{ gap: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {visibles.map(({ campo, etiqueta, unidad }) => {
          const malo = fueraDeRango(campo, valores[campo]);
          const rango = RANGOS_EXAMEN[campo];
          const n = Number(valores[campo]);
          const equivale =
            !malo && valores[campo] !== '' && Number.isFinite(n)
              ? equivalencia[campo]?.(n)
              : undefined;
          return (
            <TextField
              key={campo}
              label={etiqueta}
              size="small"
              inputMode="decimal"
              value={valores[campo]}
              onChange={(e) => onCambio(campo, e.target.value)}
              error={malo}
              helperText={malo ? 'Entre ' + rango.min + ' y ' + rango.max : (equivale ?? unidad)}
              slotProps={{
                input: {
                  endAdornment: (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                      {unidad}
                    </Typography>
                  ),
                },
              }}
            />
          );
        })}
      </Box>

      {conImc ? (
      <Stack
        direction="row"
        aria-live="polite"
        sx={{
          alignItems: 'baseline',
          gap: 1.5,
          px: 2,
          py: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.5,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Indice de masa corporal
        </Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {imc === null ? '—' : imc.toFixed(2)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {imc === null ? 'Se calcula con el peso y la talla' : clasificacionImc(imc)}
        </Typography>
      </Stack>
      ) : null}
    </Stack>
  );
}
