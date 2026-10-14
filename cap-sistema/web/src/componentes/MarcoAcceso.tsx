import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Collapse, Link, Paper, Stack, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import { LogoCap } from './LogoCap';
import { tema } from '../tema';

/** Integrantes del proyecto, en el orden en que los dio el equipo. */
const INTEGRANTES = [
  'Dennis Alessandro Xona Isem',
  'Zulma Romineya López Ac',
  'Ramiro Gabriel Yat Yat',
];

/**
 * Los tres escudos que acreditan el proyecto, en la esquina de arriba.
 *
 * El del Ministerio, el de la carrera y el de la universidad. Van juntos y
 * fuera de la tarjeta porque acreditan la PANTALLA, no el formulario: metidos
 * dentro competian con los dos campos que hay que llenar, que es a lo unico
 * que se viene aqui.
 *
 * Sobre un panel blanco, y no sueltos sobre la fotografia, por un motivo
 * concreto: los tres archivos son JPEG con fondo blanco opaco. Puestos
 * directamente sobre la foto se verian como tres recortes rectangulares
 * pegados encima. Sobre el panel el blanco del archivo y el del panel son el
 * mismo, asi que las siluetas quedan limpias.
 */
const ESCUDOS = [
  { src: '/logo-ministerio.jpg', alto: 'Ministerio de Salud Publica y Asistencia Social' },
  { src: '/logo-sistemas.jpg', alto: 'Ingenieria en Sistemas, UMG Coban' },
  { src: '/logo-umg.png', alto: 'Universidad Mariano Galvez' },
];

/**
 * Un escudo que desaparece solo si falta el archivo.
 *
 * Sin esto saldria el icono de imagen rota, que se ve peor que no poner nada
 * —y en una pantalla de acceso, peor aun: parece que el sistema esta averiado
 * antes de haber entrado—.
 */
function Escudo({ src, alto, altura }: { src: string; alto: string; altura: number }) {
  const [falta, setFalta] = useState(false);
  if (falta) return null;

  return (
    <Box
      component="img"
      src={src}
      alt={alto}
      onError={() => setFalta(true)}
      sx={{ height: altura, width: 'auto', maxWidth: 160, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

function FilaDeEscudos() {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: { xs: 1.25, sm: 2 },
        px: { xs: 1.5, sm: 2 },
        py: { xs: 1, sm: 1.25 },
        borderRadius: 3,
        bgcolor: 'rgba(255, 255, 255, 0.92)',
        border: '1px solid rgba(15, 50, 64, 0.08)',
        boxShadow: '0 6px 20px -10px rgba(12, 45, 58, 0.35)',
        // Si la pantalla es muy angosta, los escudos se reparten en dos
        // renglones antes que salirse del panel.
        flexWrap: 'wrap',
      }}
    >
      {ESCUDOS.map((e) => (
        <Escudo key={e.src} {...e} altura={38} />
      ))}
    </Stack>
  );
}

/**
 * Quienes hicieron el proyecto, abajo a la derecha.
 *
 * Estaban dentro de la tarjeta, bajo el boton de entrar. Ahi los leia todo el
 * personal del CAP cada manana, que no es a quien acreditan: el credito
 * academico interesa a quien revisa el proyecto, una vez. Fuera de la tarjeta
 * sigue estando a la vista y deja de estorbar al trabajo diario.
 *
 * Uno por renglon: en una sola linea los tres nombres completos no caben en un
 * telefono y se cortarian a la mitad de un apellido.
 */
function IntegrantesDelProyecto() {
  return (
    <Stack
      sx={{
        gap: 0.25,
        px: 2,
        py: 1.5,
        borderRadius: 3,
        textAlign: { xs: 'left', sm: 'right' },
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(15, 50, 64, 0.08)',
        boxShadow: '0 6px 20px -10px rgba(12, 45, 58, 0.3)',
      }}
    >
      <Typography
        id="titulo-integrantes"
        component="h2"
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'primary.main',
        }}
      >
        Integrantes del Proyecto
      </Typography>

      {/*
        La lista toma su nombre del titulo de arriba, no de un `aria-label`
        aparte: asi lo que lee un lector de pantalla y lo que se ve escrito son
        la misma cadena, y no pueden separarse al editar una de las dos.
      */}
      <Box
        component="ul"
        aria-labelledby="titulo-integrantes"
        sx={{ m: 0, p: 0, listStyle: 'none' }}
      >
        {INTEGRANTES.map((nombre) => (
          <Typography
            key={nombre}
            component="li"
            variant="caption"
            sx={{ display: 'block', lineHeight: 1.45, color: 'text.primary' }}
          >
            {nombre}
          </Typography>
        ))}
      </Box>

      {/*
        La universidad, escrita. Su escudo esta arriba con los otros dos, pero a
        38 pixeles es un sello ilegible: quien quiera saber de quien es el
        proyecto necesita leerlo, no reconocerlo.
      */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        Universidad Mariano Gálvez
      </Typography>
    </Stack>
  );
}

/**
 * Fondo de las pantallas de acceso: la sala de espera del CAP.
 *
 * Las capas van de arriba hacia abajo, que es el orden en que CSS las pinta.
 * Sobre la fotografia hay dos tintes —la luz calida del ventanal y el teal del
 * mobiliario— y un velo claro. Hacen dos trabajos: unen la foto con la paleta
 * del panel, y le bajan el contraste para que la tarjeta y los dos paneles
 * blancos se lean encima sin esfuerzo.
 *
 * El velo es mas denso que con la foto anterior, y a proposito: esta tiene
 * paredes naranjas, carteles y un zocalo oscuro, asi que sin el las esquinas
 * blancas caerian sobre manchas de todos los tonos.
 *
 * El degradado del final es el respaldo: es lo que se ve mientras el JPEG
 * carga, y lo que queda si el archivo faltara. La pantalla nunca aparece en
 * blanco.
 */
const FONDO_ACCESO = [
  'radial-gradient(1100px 520px at 50% -10%, rgba(255, 206, 148, 0.22), rgba(255, 206, 148, 0) 70%)',
  'radial-gradient(900px 720px at 97% 82%, rgba(21, 96, 122, 0.18), rgba(21, 96, 122, 0) 70%)',
  'linear-gradient(180deg, rgba(240, 245, 246, 0.52) 0%, rgba(219, 230, 233, 0.6) 100%)',
  'url("/fondo-login.jpg")',
  'linear-gradient(180deg, #eef3f4 0%, #dde7ea 100%)',
].join(', ');

/**
 * La franja curva del costado, tal como la trae la referencia del CAP.
 *
 * Son dos ondas de la misma familia de verdes azulados: una clara detras y una
 * oscura delante, con el borde derecho curvado hacia dentro. Va dibujada en
 * SVG y no como imagen porque tiene que estirarse a lo alto de la tarjeta sea
 * cual sea el contenido —el formulario de acceso y el de cambiar contrasena no
 * miden lo mismo— y un PNG se deformaria.
 *
 * `preserveAspectRatio="none"` es justo lo que permite ese estirado: la curva
 * se alarga con la tarjeta en vez de recortarse.
 *
 * Es decorativa. Se oculta a los lectores de pantalla: no dice nada que no
 * este ya en el titulo, y anunciarla solo alargaria el recorrido de quien
 * navega a ciegas hasta el campo de usuario.
 */
function FranjaLateral() {
  return (
    <Box
      aria-hidden
      sx={{
        // Solo cuando hay ancho de sobra. En un telefono la tarjeta ya va
        // justa, y quitarle setenta pixeles al formulario por una decoracion
        // seria cambiar lo util por lo bonito.
        display: { xs: 'none', sm: 'block' },
        position: 'absolute',
        insetBlock: 0,
        left: 0,
        width: 78,
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox="0 0 78 460"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        focusable="false"
      >
        <path d="M0 0 H62 C36 118 78 220 46 330 C26 398 54 430 40 460 H0 Z" fill="#80a8b2" />
        <path d="M0 0 H44 C22 130 58 232 26 344 C10 404 32 434 22 460 H0 Z" fill="#105864" />
      </svg>
    </Box>
  );
}

/**
 * Marco de las pantallas previas a la sesion.
 *
 * Centrado y sin menu: antes de entrar no hay nada mas que hacer en esta
 * pantalla, y cualquier elemento adicional solo compite por la atencion de
 * alguien que quiza no usa una computadora todos los dias.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ESTA PANTALLA ES SIEMPRE CLARA
 * ─────────────────────────────────────────────────────────────────────────
 * El resto del sistema sigue a la eleccion de apariencia —claro, oscuro o la
 * del sistema—, pero el acceso no, y lo pidio el CAP. Tiene sentido: el modo
 * de color se guarda POR PUESTO en el navegador, y aqui todavia no se sabe
 * quien va a entrar. Ademas el fondo es una fotografia con sus propios colores
 * y una tarjeta oscura encima no se lleva con ella.
 *
 * Se envuelve con el tema claro ya construido en vez de forzar colores a mano:
 * asi los campos, los botones y los mensajes de error nacen del mismo sitio que
 * en el resto del panel. `colorScheme` ademas evita que el navegador pinte de
 * oscuro lo que dibuja el: el autorrelleno y la barra de desplazamiento.
 */
export function MarcoAcceso({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  return (
    <ThemeProvider theme={tema}>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          colorScheme: 'light',
          backgroundColor: '#eef3f4',
          backgroundImage: FONDO_ACCESO,
          // La foto es vertical (1200x1600) y `cover` la recorta por arriba y
          // por abajo en pantallas apaisadas. Centrada, lo que sobrevive al
          // recorte es el mostrador y las sillas, que es lo que la hace
          // reconocible como el CAP.
          //
          // Nada de `background-attachment: fixed`, que Safari de iOS dibuja
          // mal y hace tironear el desplazamiento.
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/*
          Los tres en fila, arriba a la izquierda. En flujo normal y no
          posicionados en absoluto: asi en un telefono empujan la tarjeta hacia
          abajo en vez de taparla.
        */}
        <Box sx={{ alignSelf: 'flex-start' }}>
          <FilaDeEscudos />
        </Box>

        <Box sx={{ flexGrow: 1, display: 'grid', placeItems: 'center', py: { xs: 3, md: 4 } }}>
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: 460,
              // El relleno vive en las secciones y no en el Paper: asi la franja
              // del pie llega hasta los bordes, como en el diseno de referencia.
              p: 0,
              overflow: 'hidden',
              // Para que la franja se posicione contra la tarjeta y no contra la
              // pantalla entera.
              position: 'relative',
              border: '1px solid',
              borderColor: 'rgba(15, 50, 64, 0.09)',
              // Dos sombras: una larga que despega la tarjeta del fondo, y una
              // corta que le da el borde apoyado. Con una sola, o flota sin peso
              // o se ve pegada.
              boxShadow:
                '0 24px 60px -26px rgba(12, 45, 58, 0.38), 0 2px 6px rgba(12, 45, 58, 0.06)',
            }}
          >
            <FranjaLateral />

            {/* El relleno izquierdo deja sitio a la franja en las pantallas
                donde se dibuja; en las estrechas vuelve al relleno normal. */}
            <Stack spacing={3} sx={{ p: { xs: 3, sm: 4.5 }, pl: { sm: 13 } }}>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <LogoCap tamano={30} />
                  <Typography
                    variant="overline"
                    color="primary"
                    sx={{ letterSpacing: '0.14em', fontWeight: 700, lineHeight: 1.2 }}
                  >
                    CAP Purulha
                  </Typography>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                    {titulo}
                  </Typography>
                  {descripcion ? (
                    <Typography variant="body2" color="text.secondary">
                      {descripcion}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
              {children}
            </Stack>

            <Box
              component="footer"
              sx={{
                px: { xs: 2, sm: 3 },
                pl: { sm: 12 },
                py: 1.25,
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(21, 96, 122, 0.035)',
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
              >
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<HelpOutlinedIcon />}
                  onClick={() => setAyudaAbierta((abierta) => !abierta)}
                  aria-expanded={ayudaAbierta}
                  aria-controls="ayuda-acceso"
                  sx={{ color: 'text.secondary', fontWeight: 500, minHeight: 36, px: 1 }}
                >
                  ¿Ayuda?
                </Button>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: 'center', color: 'primary.main' }}
                >
                  <LogoCap tamano={18} />
                  <Typography variant="caption" color="text.secondary">
                    Salud Comunitaria para Todos
                  </Typography>
                </Stack>
              </Stack>

              {/* El texto de ayuda no es decorativo: sin el, quien no puede
                  entrar no tiene a quien acudir y termina agotando los intentos
                  hasta que la cuenta se bloquea. */}
              <Collapse in={ayudaAbierta} id="ayuda-acceso">
                <Typography variant="body2" color="text.secondary" sx={{ pt: 1, pb: 0.5, px: 1 }}>
                  Si olvido su contrasena o no puede entrar, pida al administrador del CAP que la
                  restablezca. Nunca comparta su contrasena con otra persona.
                </Typography>
              </Collapse>

              {/*
                Las politicas se quedan en la tarjeta aunque los nombres se
                hayan ido: es un enlace legal sobre lo que se hace con los datos
                que esta pantalla pide, y tiene que estar donde se piden.
              */}
              <Box sx={{ textAlign: 'center', pt: 0.5 }}>
                <Link
                  component={RouterLink}
                  to="/privacidad"
                  variant="caption"
                  color="text.secondary"
                  underline="always"
                >
                  Políticas de privacidad
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ alignSelf: { xs: 'stretch', sm: 'flex-end' } }}>
          <IntegrantesDelProyecto />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
