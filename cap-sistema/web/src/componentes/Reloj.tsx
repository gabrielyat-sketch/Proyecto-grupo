import { useEffect, useState } from 'react';
import { Box, Divider, Stack, Typography } from '@mui/material';

/**
 * La hora y la fecha, en la barra superior.
 *
 * No es adorno. En el CAP se registra a que hora llego cada paciente y a que
 * hora se le atendio, y ese dato se copia despues a los informes del MSPAS.
 * Quien digitaliza necesita la hora a la vista, sin salir del sistema a mirar
 * el reloj de la pared —que en el area de recepcion no siempre esta— ni la
 * esquina de la pantalla, tapada por el navegador en pantalla completa.
 *
 * El dia de la semana va con la fecha a proposito: en una jornada larga de
 * transcripcion se pierde, y equivocarlo al fechar una hoja obliga a corregir
 * el expediente despues.
 */

/**
 * Se actualiza al cambiar el minuto, no cada segundo.
 *
 * Un temporizador de un segundo re-renderiza la barra sesenta veces por minuto
 * para pintar exactamente el mismo texto. Aqui se programa hasta el proximo
 * cambio de minuto y se vuelve a programar solo, asi que ocurre un render por
 * minuto y ademas el salto coincide con el reloj real en vez de irse corriendo.
 */
function usarMinutoActual(): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    let temporizador: number;

    const programar = () => {
      // Los 200 ms de margen evitan despertar justo en el borde y volver a
      // leer el minuto anterior por unos milisegundos de desfase.
      const hastaElProximoMinuto = 60_000 - (Date.now() % 60_000) + 200;
      temporizador = window.setTimeout(() => {
        setAhora(new Date());
        programar();
      }, hastaElProximoMinuto);
    };

    programar();
    return () => window.clearTimeout(temporizador);
  }, []);

  return ahora;
}

export function Reloj({ conFecha = true }: { conFecha?: boolean }) {
  const ahora = usarMinutoActual();

  const hora = ahora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const fecha = ahora.toLocaleDateString('es-GT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const completa = ahora.toLocaleString('es-GT', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <Box
      component="time"
      dateTime={ahora.toISOString()}
      title={completa}
      sx={{
        // Blanco con el texto en el azul institucional, al reves que el resto
        // de la barra: sobre el teal, un bloque claro es lo unico que se lee de
        // un vistazo desde lejos, que es como se mira un reloj.
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#fff',
        color: 'primary.main',
        borderRadius: 1.5,
        px: 1.5,
        py: 0.5,
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Typography
          component="span"
          sx={{
            fontSize: 17,
            fontWeight: 700,
            // Sin esto los digitos cambian de ancho y la banda se mueve al
            // cambiar la hora.
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {hora}
        </Typography>
        {conFecha ? (
          <>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(21,96,122,0.25)' }} />
            <Typography
              component="span"
              // Las fechas de es-GT llegan en minuscula ("domingo, 30 de
              // agosto"); la capital inicial la pone el CSS y no un slice, que
              // se rompe con nombres acentuados.
              sx={{ fontSize: 13, fontWeight: 600, '&::first-letter': { textTransform: 'uppercase' } }}
            >
              {fecha}
            </Typography>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
