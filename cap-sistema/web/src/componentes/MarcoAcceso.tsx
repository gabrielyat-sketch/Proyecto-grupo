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
 *  POR QUE VAN SOBRE UN PANEL BLANCO
 * ─────────────────────────────────────────────────────────────────────────
 * Los tres archivos son JPEG con fondo blanco OPACO. Sueltos sobre la
 * fotografia se ven como tres recortes rectangulares pegados encima.
 *
 * Se probo `mixBlendMode: multiply`, que borra el blanco del archivo dejando
 * solo la tinta, y el CAP lo rechazo: en los bordes de cada escudo el blanco no
 * es blanco puro —es un JPEG, y la compresion deja un halo gris— asi que el
 * recorte seguia viendose, ahora sucio.
 *
 * El panel lo resuelve de la forma aburrida y segura: el blanco del archivo y
 * el del panel son el mismo color, asi que no hay borde que ver.
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
        // En telefono bajan a 38: tres escudos de 58 no caben en 390 pixeles
        // de ancho y se repartirian en dos renglones, que es mas alto que la
        // tarjeta que viene debajo.
        height: { xs: 38, sm: 50, md: 58 },
        width: 'auto',
        maxWidth: { xs: 120, md: 240 },
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  );
}

function FilaDeEscudos() {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: { xs: 1.5, md: 2.5 },
        px: { xs: 1.5, md: 2.5 },
        py: { xs: 1, md: 1.5 },
        borderRadius: 3,
        // Blanco entero, no translucido: con transparencia la fotografia se
        // cuela por detras y vuelve el borde que el panel viene a quitar.
        bgcolor: '#fff',
        boxShadow: '0 8px 24px -12px rgba(12, 45, 58, 0.45)',
        flexWrap: 'nowrap',
      }}
    >
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
    <Box
      sx={{
        borderLeft: '4px solid',
        borderColor: ENTRAR,
        pl: 2,
        /*
          El halo blanco detras de la letra, no un recuadro.

          Se veian «transparentes» y no lo eran: era texto fino sobre una
          fotografia con manchas de todos los tonos, y ahi el ojo lee cualquier
          cosa como desvaida. Esto lo despega sin encajonarlo, que es lo que el
          ejemplo del CAP pide.
        */
        textShadow:
          '0 1px 2px rgba(255,255,255,.95), 0 0 10px rgba(255,255,255,.75)',
      }}
    >
      {/*
        Tres renglones y no uno, de mayor a menor: la institucion, la carrera y
        lo que el equipo hizo. Puestos en una sola linea habria que leerla
        entera para llegar a lo ultimo, que es lo que presenta a los nombres de
        abajo.
      */}
      <Typography
        component="h2"
        sx={{ fontSize: { xs: 15, md: 17 }, fontWeight: 800, color: ENTRAR, lineHeight: 1.3 }}
      >
        Universidad Mariano Gálvez de Guatemala
      </Typography>
      <Typography
        sx={{ fontSize: { xs: 13.5, md: 15 }, fontWeight: 700, color: ENTRAR, lineHeight: 1.35 }}
      >
        Ingeniería en Sistemas
      </Typography>
      <Typography
        id="titulo-integrantes"
        sx={{
          fontSize: { xs: 13, md: 14 },
          fontWeight: 700,
          color: '#0e2b36',
          mb: 0.75,
          mt: 0.25,
        }}
      >
        Desarrolladores e Investigadores
      </Typography>

      {/*
        La lista toma su nombre del renglon de arriba, no de un `aria-label`
        aparte: asi lo que lee un lector de pantalla y lo que se ve escrito son
        la misma cadena, y no pueden separarse al editar una de las dos. De los
        tres renglones el que la nombra es el tercero, que es el que dice QUE
        son las personas de la lista.
      */}
      <Box
        component="ul"
        aria-labelledby="titulo-integrantes"
        sx={{ m: 0, pl: 2.5, listStyle: 'disc', color: '#0e2b36' }}
      >
        {INTEGRANTES.map((nombre) => (
          <Typography
            key={nombre}
            component="li"
            sx={{ fontSize: { xs: 14, md: 15 }, fontWeight: 600, lineHeight: 1.8, color: 'inherit' }}
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
 * `cover`, centrada y lavada. Nada mas: se probaron un encuadre desplazado, dos
 * capas apiladas —una desenfocada de relleno y otra con la foto entera— y una
 * fotografia distinta, y el CAP volvio a esta. Es la version que aprobo.
 *
 * Va en una capa propia —un `::before` que cubre la pantalla— y no como
 * `background-image` del contenedor por una razon concreta: necesita `filter`,
 * y un filtro aplicado al contenedor se heredaria a la tarjeta, a los escudos y
 * al texto. En su propia capa afecta solo a la foto.
 *
 * El lavado no es timidez. Encima van tres cosas, y dos de ellas sin recuadro
 * que las despegue: sobre la foto cruda los nombres caerian sobre el piso y las
 * sillas. `saturate(.38)` le quita el naranja de las paredes y la opacidad la
 * deja en un fondo, no en una imagen que mirar.
 *
 * El color del contenedor es el respaldo: es lo que se ve mientras el JPEG
 * carga y lo que queda si el archivo faltara. La pantalla nunca sale en blanco.
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
          '&::before': CAPA_FOTO,
        }}
      >
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
            position: { xs: 'relative', md: 'absolute' },
            zIndex: 1,
            top: { md: 16 },
            left: { md: 20 },
            justifySelf: { xs: 'center', md: 'start' },
          }}
        >
          <FilaDeEscudos />
        </Box>

        {/*
          El UNICO elemento en flujo. Los otros dos estan posicionados, asi que
          la reticula centra esto y nada mas: la tarjeta queda en el medio de la
          pantalla, no en el medio de una pila de tres cosas.
        */}
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%', display: 'grid', placeItems: 'center' }}>
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
            position: { xs: 'relative', md: 'absolute' },
            zIndex: 1,
            right: { md: 44 },
            // Anclados ABAJO y no a media altura: a media altura quedaban a la
            // par de la tarjeta, compitiendo con el formulario.
            bottom: { md: 36 },
            justifySelf: { xs: 'start', md: 'end' },
          }}
        >
          <IntegrantesDelProyecto />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
