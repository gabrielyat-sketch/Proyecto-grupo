import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ALTO_BARRA } from '../../tema';

/**
 * El encabezado que las cuatro fichas del MSPAS traen impreso arriba.
 *
 * En el papel es siempre el mismo bloque: el nombre de la hoja, el recuadro de
 * **No. Expediente** y el de **Fecha**. Aquí se le añade de quién es la ficha,
 * que en el papel no hace falta porque quien la sostiene ya lo sabe.
 *
 * Vive aparte y no dentro de cada pantalla porque el personal salta entre
 * hojas: si la de adultos y la de neonato dijeran lo mismo en sitios
 * distintos, cada salto costaría una búsqueda. Las dos que faltan —niñez y
 * prenatal— entran por aquí sin volver a decidir nada.
 *
 * Es pegajoso: en una hoja de doscientos campos, saber de quién es lo que se
 * está escribiendo no puede depender de subir hasta arriba.
 */
export function EncabezadoFicha({
  titulo,
  volverA,
  volverTexto,
  nombre,
  resumen,
  expediente,
  fecha,
  children,
}: {
  /** El nombre de la hoja, tal como está impreso. */
  titulo: string;
  volverA: string;
  volverTexto: string;
  /** «Apellidos, Nombres». */
  nombre: string;
  /** La línea de debajo: edad, sexo, comunidad. */
  resumen: string;
  /** El recuadro «No. Expediente» del papel. */
  expediente: string;
  /** El recuadro «Fecha». Se omite en las fichas que la piden en otro sitio. */
  fecha?: { valor: string; onCambio: (valor: string) => void };
  /** Lo que cada ficha pone a la derecha: guardar, avisos, atajos. */
  children?: ReactNode;
}) {
  /*
    Pegado, el bloque se encoge.

    Entero mide unos cien pixeles, y sumados a los setenta y tres de la barra
    se comian una cuarta parte de la pantalla de forma permanente sobre una
    hoja de doscientos campos. Quieto arriba tiene que estar completo, porque
    ahi es donde se comprueba de quien es la ficha antes de empezar; pegado
    basta con el nombre, el expediente y el boton de guardar, que es lo unico
    que se necesita a media hoja.

    Se detecta con un centinela de un pixel puesto ENCIMA del bloque: cuando se
    va por debajo de la barra, el bloque esta pegado. La alternativa era
    escuchar el desplazamiento, que dispara en cada pixel de una pagina muy
    larga. Si el navegador no trae `IntersectionObserver` —o jsdom, en las
    pruebas— se queda entero, que es el estado util de los dos.
  */
  const centinela = useRef<HTMLDivElement>(null);
  const [pegado, setPegado] = useState(false);

  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo || typeof IntersectionObserver === 'undefined') return;

    const observador = new IntersectionObserver(
      ([entrada]) => setPegado(!entrada.isIntersecting),
      { rootMargin: '-' + (ALTO_BARRA + 1) + 'px 0px 0px 0px' },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <>
      <Box ref={centinela} aria-hidden sx={{ height: 1 }} />
      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          /*
            Se pega JUSTO debajo de la barra, no en el borde de la ventana.

            Con `top: 0` se pegaba detras de la barra fija, que es opaca y va por
            encima: al bajar, el bloque se metia debajo de ella y solo asomaba la
            ultima franja, que quedaba flotando sobre los campos tapandolos a
            medias. El numero sale de `ALTO_BARRA` y no escrito a mano justamente
            por eso: era un 0 calculado para una barra que despues crecio, y lo
            mismo puede volver a pasar.
          */
          top: ALTO_BARRA,
          zIndex: 3,
          // La sombra solo cuando esta pegado: quieto en su sitio es una fila mas
          // de la hoja, y una sombra ahi seria un relieve que no significa nada.
          boxShadow: pegado ? '0 6px 16px -12px rgba(5, 65, 75, .45)' : 'none',
          mb: 2,
          px: { xs: 1.5, md: 2 },
          py: pegado ? 0.75 : 1.25,
          transition: 'padding .15s ease',
          border: '1px solid',
          borderColor: 'divider',
          // Sin redondeo: la hoja del MSPAS es una retícula de recuadros rectos.
          borderRadius: 0,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: 1.5, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', minWidth: 0 }}>
            <Button
              component={EnlaceRuta}
              to={volverA}
              startIcon={<ArrowBackIcon />}
              size="small"
              color="inherit"
            >
              {volverTexto}
            </Button>

            <Box sx={{ minWidth: 0 }}>
              {/*
                El nombre de la hoja NO es un encabezado de nivel: los de nivel
                dos son las secciones numeradas del formulario, y el uno es de
                quién es la ficha. Meterlo en la jerarquía haría que un lector de
                pantalla anunciara una sección que en el papel no existe.
              */}
              {!pegado ? (
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                  noWrap
                >
                  {titulo}
                </Typography>
              ) : null}
              <Typography component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                {nombre}
              </Typography>
              {!pegado ? (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {resumen}
                </Typography>
              ) : null}
            </Box>
          </Stack>

          {/*
            Los dos recuadros del papel, uno encima del otro y en el mismo orden
            que la hoja: primero el expediente, después la fecha.
          */}
          <Stack
            direction={pegado ? 'row' : 'column'}
            sx={{
              gap: pegado ? 1.5 : 1,
              alignItems: pegado ? 'center' : { md: 'flex-end' },
              flexShrink: 0,
            }}
          >
            <Box sx={pegado ? { display: 'flex', gap: 0.75, alignItems: 'baseline' } : undefined}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                No. de expediente
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                {expediente}
              </Typography>
            </Box>

            <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {fecha ? (
                <TextField
                  label="Fecha"
                  type="date"
                  size="small"
                  value={fecha.valor}
                  onChange={(e) => fecha.onCambio(e.target.value)}
                  sx={{ width: 180 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              ) : null}
              {children}
            </Stack>
          </Stack>
          </Stack>
      </Paper>
    </>
  );
}
