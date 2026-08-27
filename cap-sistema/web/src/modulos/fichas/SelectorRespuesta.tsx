import { useRef, type KeyboardEvent } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export interface OpcionRespuesta<T> {
  valor: T;
  /** La tecla que la elige. Es la inicial de la palabra impresa en el papel. */
  letra: string;
  etiqueta: string;
}

/**
 * Las casillas SI / NO / NO APLICA del formulario.
 *
 * Todo el grupo es UNA sola parada de tabulador, no tres. Es la diferencia
 * entre 33 pulsaciones de Tab y 99 al recorrer los antecedentes, y con 200
 * campos por hoja esa diferencia decide si el modo de digitalizacion (RF-08) es
 * usable o no. Dentro del grupo se elige con la letra —S, N, A— o con las
 * flechas, que es el comportamiento estandar de un grupo de opciones y lo que
 * un lector de pantalla anuncia.
 *
 * Suprimir borra la respuesta y la deja en "sin preguntar", que es un estado
 * distinto de "no" y hay que poder volver a el tras una tecla mal dada.
 */
export function SelectorRespuesta<T extends string>({
  valor,
  opciones,
  etiqueta,
  onCambio,
  denso = false,
}: {
  valor: T | null;
  opciones: readonly OpcionRespuesta<T>[];
  /** Lo que se anuncia al llegar al grupo: el texto impreso de la pregunta. */
  etiqueta: string;
  onCambio: (valor: T | null) => void;
  denso?: boolean;
}) {
  const grupo = useRef<HTMLDivElement>(null);

  const indiceActual = opciones.findIndex((o) => o.valor === valor);
  // Sin respuesta, el tabulador entra por la primera casilla.
  const indiceFoco = indiceActual === -1 ? 0 : indiceActual;

  function enfocar(indice: number) {
    const botones = grupo.current?.querySelectorAll<HTMLElement>('[role="radio"]');
    botones?.[indice]?.focus();
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const porLetra = opciones.findIndex(
      (o) => o.letra.toLowerCase() === e.key.toLowerCase(),
    );
    if (porLetra !== -1) {
      e.preventDefault();
      onCambio(opciones[porLetra].valor);
      enfocar(porLetra);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onCambio(null);
      return;
    }

    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (paso !== 0) {
      e.preventDefault();
      const siguiente = (indiceFoco + paso + opciones.length) % opciones.length;
      onCambio(opciones[siguiente].valor);
      enfocar(siguiente);
    }
  }

  return (
    <Stack
      ref={grupo}
      direction="row"
      role="radiogroup"
      aria-label={etiqueta}
      onKeyDown={alTeclear}
      sx={{ gap: 0.5, flexShrink: 0 }}
    >
      {opciones.map((o, i) => {
        const elegida = o.valor === valor;
        return (
          <Box
            key={o.valor}
            role="radio"
            aria-checked={elegida}
            aria-label={o.etiqueta}
            tabIndex={i === indiceFoco ? 0 : -1}
            onClick={() => onCambio(o.valor)}
            sx={{
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: denso ? 42 : 56,
              px: denso ? 0.5 : 1,
              py: denso ? 0.25 : 0.5,
              textAlign: 'center',
              // Cuadrado, no pastilla: en el papel estas respuestas son casillas.
              borderRadius: 0.5,
              border: '1px solid',
              borderColor: elegida ? 'primary.main' : 'divider',
              bgcolor: elegida ? 'primary.main' : 'background.paper',
              color: elegida ? 'primary.contrastText' : 'text.secondary',
              fontWeight: elegida ? 700 : 500,
              fontSize: denso ? 13 : 14,
              lineHeight: 1.6,
              transition: 'none',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            {o.etiqueta}
          </Box>
        );
      })}
    </Stack>
  );
}

export const OPCIONES_SI_NO = [
  { valor: 'SI', letra: 's', etiqueta: 'Si' },
  { valor: 'NO', letra: 'n', etiqueta: 'No' },
] as const;

export const OPCIONES_CON_NO_APLICA = [
  { valor: 'SI', letra: 's', etiqueta: 'Si' },
  { valor: 'NO', letra: 'n', etiqueta: 'No' },
  { valor: 'NO_APLICA', letra: 'a', etiqueta: 'N/A' },
] as const;

/** Version booleana, para las casillas que en el papel no ofrecen "no aplica". */
export function SelectorSiNo({
  valor,
  etiqueta,
  onCambio,
  denso = false,
}: {
  valor: boolean | null;
  etiqueta: string;
  onCambio: (valor: boolean | null) => void;
  denso?: boolean;
}) {
  return (
    <SelectorRespuesta
      valor={valor === null ? null : valor ? 'SI' : 'NO'}
      opciones={OPCIONES_SI_NO}
      etiqueta={etiqueta}
      denso={denso}
      onCambio={(v) => onCambio(v === null ? null : v === 'SI')}
    />
  );
}

/** Etiqueta a la izquierda y casillas a la derecha, como una linea del papel. */
export function LineaPregunta({
  texto,
  children,
  sangria = false,
}: {
  texto: string;
  children: React.ReactNode;
  sangria?: boolean;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.75,
        pl: sangria ? 2 : 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
        {texto}
      </Typography>
      {children}
    </Stack>
  );
}
