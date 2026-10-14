import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Collapse, Link, Paper, Stack, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import { LogoCap } from './LogoCap';
import { ENTRAR, tema } from '../tema';

/** Integrantes del proyecto, en el orden en que los dio el equipo. */
const INTEGRANTES = [
  'Dennis Alessandro Xona Isem',
  'Zulma Romineya López Ac',
  'Ramiro Gabriel Yat Yat',
];

/**
 * Los tres escudos que acreditan el proyecto, arriba a la izquierda.
 *
 * El de la universidad, el del Ministerio y el de la carrera. Van juntos y
 * fuera de la tarjeta porque acreditan la PANTALLA, no el formulario: metidos
 * dentro competian con los dos campos que hay que llenar, que es a lo unico
 * que se viene aqui.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE `mixBlendMode: multiply` Y NO UN PANEL BLANCO DETRAS
 * ─────────────────────────────────────────────────────────────────────────
 * Los tres archivos son JPEG con fondo blanco OPACO. Puestos tal cual sobre la
 * fotografia se ven como tres recortes rectangulares pegados encima; metidos
 * en un panel blanco dejan de recortarse pero aparece una caja que el diseno
 * del CAP no tiene.
 *
 * `multiply` resuelve las dos cosas: multiplicar por blanco deja el fondo
 * intacto —el blanco del JPEG desaparece— y oscurece solo donde el escudo
 * tiene tinta. Funciona porque el fondo de esta pantalla es claro; sobre uno
 * oscuro el truco se invierte y habria que recortar los PNG de verdad.
 */
const ESCUDOS = [
  { src: '/logo-umg.png', alto: 'Universidad Mariano Galvez' },
  { src: '/logo-ministerio.jpg', alto: 'Ministerio de Salud Publica y Asistencia Social' },
  { src: '/logo-sistemas.jpg', alto: 'Ingenieria en Sistemas, UMG Coban' },
];

/**
 * Un escudo que desaparece solo si falta el archivo.
 *
 * Sin esto saldria el icono de imagen rota, que se ve peor que no poner nada
 * —y en una pantalla de acceso, peor aun: parece que el sistema esta averiado
 * antes de haber entrado—.
 */
function Escudo({ src, alto }: { src: string; alto: string }) {
  const [falta, setFalta] = useState(false);
  if (falta) return null;

  return (
    <Box
      component="img"
      src={src}
      alt={alto}
      onError={() => setFalta(true)}
      sx={{
        height: { xs: 34, md: 44 },
        width: 'auto',
        maxWidth: 190,
        objectFit: 'contain',
        flexShrink: 0,
        mixBlendMode: 'multiply',
      }}
    />
  );
}

function FilaDeEscudos() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 1.5, md: 2.5 }, flexWrap: 'wrap' }}>
      {ESCUDOS.map((e) => (
        <Escudo key={e.src} {...e} />
      ))}
    </Stack>
  );
}

/**
 * Quienes hicieron el proyecto, a la derecha.
 *
 * Estaban dentro de la tarjeta, bajo el boton de entrar. Ahi los leia todo el
 * personal del CAP cada manana, que no es a quien acreditan: el credito
 * academico interesa a quien revisa el proyecto, una vez. Fuera de la tarjeta
 * sigue estando a la vista y deja de estorbar al trabajo diario.
 *
 * Sin recuadro y con una barra de color al costado, como el ejemplo que dio el
 * CAP. La barra hace el trabajo que haria una caja —decir donde empieza y
 * termina el bloque— sin tapar un palmo de la fotografia.
 */
function IntegrantesDelProyecto() {
  return (
    <Box sx={{ borderLeft: '3px solid', borderColor: ENTRAR, pl: 1.75 }}>
      <Typography
        id="titulo-integrantes"
        component="h2"
        sx={{ fontSize: 15, fontWeight: 700, color: ENTRAR, mb: 0.75 }}
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
        sx={{ m: 0, pl: 2.5, listStyle: 'disc', color: '#17333d' }}
      >
        {INTEGRANTES.map((nombre) => (
          <Typography
            key={nombre}
            component="li"
            sx={{ fontSize: 14, lineHeight: 1.75, color: 'inherit' }}
          >
            {nombre}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Fondo de las pantallas de acceso: la sala de espera del CAP.
 *
 * Va en una capa propia —un `::before` que cubre la pantalla— y no como
 * `background-image` del contenedor, por una razon: necesita `filter`, y un
 * filtro aplicado al contenedor se heredaria a la tarjeta, a los escudos y al
 * texto. En su propia capa afecta solo a la fotografia.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE TAN LAVADA
 * ─────────────────────────────────────────────────────────────────────────
 * La foto tiene paredes naranjas, carteles de colores y un zocalo casi negro.
 * Encima van tres cosas claras —los escudos, la tarjeta y los nombres— y dos de
 * ellas sin recuadro que las despegue. Sobre la foto cruda, los escudos caerian
 * mitad sobre pared naranja y mitad sobre un televisor.
 *
 * `saturate(.38)` le quita el naranja sin volverla gris del todo, `brightness`
 * la sube, y la opacidad la deja en un recuerdo de la sala: se reconoce el
 * sitio, y nada de lo que hay encima pelea con ella. Es el mismo grado de
 * lavado que el ejemplo que dio el CAP, con los tonos del sistema en vez de los
 * suyos.
 *
 * El color de fondo del contenedor es el respaldo: es lo que se ve mientras el
 * JPEG carga y lo que queda si el archivo faltara. La pantalla nunca aparece en
 * blanco.
 */
const CAPA_FOTO = {
  content: '""',
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  backgroundImage: 'url("/fondo-login.jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  filter: 'saturate(.38) brightness(1.2)',
  opacity: 0.5,
  pointerEvents: 'none',
} as const;

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
          position: 'relative',
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          gap: 3,
          px: { xs: 2, md: 3 },
          py: { xs: 3, md: 3 },
          colorScheme: 'light',
          backgroundColor: '#eef2f2',
          overflow: 'hidden',
          '&::before': CAPA_FOTO,
          // Todo lo que va dentro, por encima de la capa de la foto.
          '& > *': { position: 'relative', zIndex: 1 },
        }}
      >
        {/*
          Los tres en fila, arriba a la izquierda. En flujo normal y no
          posicionados en absoluto: asi en un telefono empujan la tarjeta hacia
          abajo en vez de taparla.
        */}
        {/*
          Fuera del flujo en pantalla ancha, en flujo en una angosta.

          Es lo que quita la barra de desplazamiento que habia: con los escudos
          arriba y los nombres abajo apilados con la tarjeta, los tres juntos
          pasaban del alto de la ventana y la pantalla de acceso se volvia una
          pagina que hay que recorrer. Posicionados, lo unico que ocupa alto es
          la tarjeta, que es lo que tiene que caber.

          En un telefono vuelven al flujo: ahi no hay sitio a los costados y
          taparian el formulario.
        */}
        <Box
          sx={{
            position: { xs: 'static', md: 'absolute' },
            top: { md: 26 },
            left: { md: 32 },
            justifySelf: { xs: 'center', md: 'start' },
          }}
        >
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

        <Box
          sx={{
            position: { xs: 'static', md: 'absolute' },
            right: { md: 44 },
            top: { md: '58%' },
            justifySelf: { xs: 'start', md: 'end' },
          }}
        >
          <IntegrantesDelProyecto />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
