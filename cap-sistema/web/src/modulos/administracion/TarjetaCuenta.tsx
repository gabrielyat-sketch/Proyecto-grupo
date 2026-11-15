import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SvgIconProps } from '@mui/material';
import type { ComponentType } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import BlockIcon from '@mui/icons-material/Block';
import LockClockIcon from '@mui/icons-material/LockClock';
import KeyIcon from '@mui/icons-material/Key';
import EventIcon from '@mui/icons-material/Event';
import { AvatarUsuario } from '../../componentes/AvatarUsuario';
import { ACENTOS, type NombreAcento } from '../../tema';
import { ETIQUETA_ROL, EXIGEN_MFA, ultimoAccesoEnPalabras, type Cuenta } from './servicio-cuentas';

/**
 * Una cuenta del personal, como ficha.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE SE FUE LA TABLA
 * ─────────────────────────────────────────────────────────────────────────
 * La tabla tenia seis columnas y dos de ellas —estado y acciones— llevaban
 * dentro varias cosas apiladas. En un CAP con seis u ocho cuentas eso es una
 * rejilla casi vacia a lo ancho y muy apretada a lo largo: el formato pesaba
 * mas que el dato. Y en el telefono se iba en desplazamiento horizontal.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  LA COMPOSICION: UNA SOLA COSA CENTRADA
 * ─────────────────────────────────────────────────────────────────────────
 * Centrar todo el contenido fue el primer intento y se veia desordenado, por
 * una razon concreta: cuando cada linea tiene un largo distinto y todas van
 * centradas, ningun borde coincide con ningun otro y el ojo no encuentra
 * donde empezar a leer. Parece un poema, no una ficha.
 *
 * Aqui solo el retrato y el nombre van centrados —son la identidad, y el
 * centro es donde se mira primero—. Todo lo demas se alinea a la izquierda en
 * una columna: rol, usuario, estado y ultimo acceso comparten margen y se
 * leen de un barrido vertical. Cada linea lleva un icono en la misma
 * posicion, que es lo que hace de guia.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE NO SE PARECE A LAS TARJETAS DE INICIO
 * ─────────────────────────────────────────────────────────────────────────
 * Las tarjetas de los modulos son navegacion: esquinas asimetricas, filo de
 * color arriba y sombra solida que crece al pasar el cursor, todo para decir
 * «esto se pulsa y lleva a otro sitio». Una ficha de personal no lleva a
 * ningun sitio: es un dato con acciones dentro. Si compartieran lenguaje, el
 * usuario esperaria que pulsar la ficha hiciera algo, y no hace nada.
 *
 * Lo que define a esta: el color del rol bana la tarjeta entera en un tinte
 * suave, con un relieve de ondas al fondo; el avatar y el boton llevan ese
 * mismo color en degradado, y el boton ocupa todo el ancho con una flecha que
 * dice hacia donde va. Es un carnet, no un boton.
 */

/**
 * El acento y el simbolo de cada rol.
 *
 * Administrador y Director comparten lavanda, y no es que falte un color: son
 * los dos roles que exigen segundo factor y ven el sistema entero. Que se
 * reconozcan como un grupo frente a los cuatro clinicos es informacion. El
 * icono los separa.
 */
const SELLO_DE_ROL: Record<string, { acento: NombreAcento; icono: ComponentType<SvgIconProps> }> = {
  ADMINISTRADOR: { acento: 'lavanda', icono: AdminPanelSettingsIcon },
  DIRECTOR: { acento: 'lavanda', icono: WorkspacePremiumIcon },
  MEDICO: { acento: 'menta', icono: MedicalServicesIcon },
  ENFERMERIA: { acento: 'cian', icono: VaccinesIcon },
  FARMACIA: { acento: 'naranja', icono: LocalPharmacyIcon },
  RECEPCION: { acento: 'rosa', icono: SupportAgentIcon },
};

/** Una linea de la columna de datos: icono fijo a la izquierda y texto. */
function Dato({
  icono: Icono,
  children,
  color,
  negrita,
}: {
  icono: ComponentType<SvgIconProps>;
  children: React.ReactNode;
  color?: string;
  negrita?: boolean;
}) {
  return (
    <Stack direction="row" sx={{ gap: 1, alignItems: 'center', minWidth: 0 }}>
      <Icono sx={{ fontSize: 17, flexShrink: 0, color: color ?? 'text.secondary' }} />
      <Typography
        variant="body2"
        noWrap
        sx={{ color: color ?? 'text.secondary', fontWeight: negrita ? 700 : 500, minWidth: 0 }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

export function TarjetaCuenta({
  cuenta,
  esMiCuenta,
  onEditar,
  onRestablecer,
  onReiniciarMfa,
}: {
  cuenta: Cuenta;
  esMiCuenta: boolean;
  onEditar: () => void;
  onRestablecer: () => void;
  onReiniciarMfa: () => void;
}) {
  const tema = useTheme();
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const oscuro = tema.palette.mode === 'dark';

  const sello = SELLO_DE_ROL[cuenta.rol] ?? { acento: 'cian' as NombreAcento, icono: KeyIcon };
  const tonos = ACENTOS[sello.acento];
  const IconoRol = sello.icono;
  const colorRol = oscuro ? tonos.textoOscuro : tonos.texto;

  // El degradado del avatar y del boton. De noche parte del pastel, que sobre
  // el navy si se ve; de dia del tono legible, que sobre blanco tambien.
  const degradado = oscuro
    ? 'linear-gradient(135deg, ' + tonos.pastel + ', ' + alpha(tonos.pastel, 0.72) + ')'
    : 'linear-gradient(135deg, ' + tonos.texto + ', ' + tonos.pastel + ')';

  return (
    <Paper
      elevation={0}
      // `article` y no un `div`: cada ficha es una unidad con nombre propio.
      // Da a los lectores de pantalla una lista de personas navegable en vez
      // de un muro de texto, y es lo que permite a las pruebas apuntar a una
      // ficha concreta ahora que no hay filas de tabla.
      component="article"
      aria-label={cuenta.nombres + ' ' + cuenta.apellidos + ' (' + cuenta.usuario + ')'}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        pt: 2,
        borderRadius: 4,
        border: '1px solid',
        borderColor: oscuro ? alpha(tonos.pastel, 0.28) : alpha(tonos.pastel, 0.55),
        // El tinte del rol sobre el papel. Suave: tiene que leerse el texto
        // encima, no lucirse el color.
        background: oscuro
          ? 'linear-gradient(170deg, ' +
            alpha(tonos.pastel, 0.16) +
            ' 0%, ' +
            alpha(tonos.pastel, 0.05) +
            ' 55%, transparent 100%), ' +
            tema.palette.background.paper
          : 'linear-gradient(170deg, ' +
            alpha(tonos.pastel, 0.3) +
            ' 0%, ' +
            alpha(tonos.pastel, 0.08) +
            ' 48%, #ffffff 100%)',
        transition: 'transform .22s ease, box-shadow .22s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 12px 26px ' + alpha(tonos.pastel, oscuro ? 0.22 : 0.4),
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&:hover': { transform: 'none' },
        },
      }}
    >
      {/*
        El relieve de ondas del fondo. Va en un SVG y no en una imagen para que
        tome el color del rol sin tener cinco archivos, y `aria-hidden` porque
        no dice nada: es textura.
      */}
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 320 120"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 120,
          pointerEvents: 'none',
          opacity: oscuro ? 0.16 : 0.32,
        }}
      >
        <path d="M0 78 Q 80 38 160 72 T 320 56 L320 120 L0 120 Z" fill={tonos.pastel} />
        <path
          d="M0 98 Q 90 62 180 92 T 320 82 L320 120 L0 120 Z"
          fill={tonos.pastel}
          opacity="0.55"
        />
      </Box>

      {/* Todo el contenido por encima del relieve. */}
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* ─── Cinta superior: el sello del rol y las acciones ─── */}
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', minWidth: 0 }}>
            <Box
              aria-hidden
              sx={{
                width: 28,
                height: 28,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                color: colorRol,
                bgcolor: oscuro ? alpha(tonos.pastel, 0.2) : alpha('#ffffff', 0.75),
              }}
            >
              <IconoRol sx={{ fontSize: 17 }} />
            </Box>
            {esMiCuenta ? (
              <Chip
                size="small"
                label="Usted"
                sx={{
                  height: 20,
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  color: colorRol,
                  bgcolor: oscuro ? alpha(tonos.pastel, 0.22) : alpha('#ffffff', 0.8),
                }}
              />
            ) : null}
          </Stack>

          <Tooltip title="Mas acciones">
            <IconButton
              size="small"
              aria-label={'Mas acciones para ' + cuenta.usuario}
              aria-haspopup="menu"
              aria-expanded={Boolean(menu)}
              onClick={(e) => setMenu(e.currentTarget)}
              sx={{ color: colorRol }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* ─── Identidad: lo UNICO centrado ─── */}
        <Stack sx={{ alignItems: 'center', mt: 0.5 }}>
          <AvatarUsuario
            usuario={cuenta.usuario}
            nombres={cuenta.nombres}
            apellidos={cuenta.apellidos}
            tamano={66}
            degradado={degradado}
            colorTexto={oscuro ? '#0b2038' : '#fff'}
            descripcion={cuenta.nombres + ' ' + cuenta.apellidos + ' (' + cuenta.usuario + ')'}
          />
          <Typography
            variant="h6"
            component="h2"
            sx={{
              mt: 1.25,
              fontSize: 16.5,
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: 'center',
              color: 'text.primary',
            }}
          >
            {cuenta.nombres} {cuenta.apellidos}
          </Typography>
        </Stack>

        {/* ─── Los datos: columna alineada a la izquierda ─── */}
        <Stack sx={{ gap: 0.9, mt: 1.75 }}>
          {/* El rol en pildora a todo el ancho: es la categoria, encabeza la lista. */}
          <Stack
            direction="row"
            sx={{
              gap: 1,
              alignItems: 'center',
              px: 1.25,
              py: 0.6,
              borderRadius: 2,
              bgcolor: oscuro ? alpha(tonos.pastel, 0.16) : alpha('#ffffff', 0.72),
            }}
          >
            <IconoRol sx={{ fontSize: 17, color: colorRol, flexShrink: 0 }} />
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 800, color: colorRol, minWidth: 0 }}
            >
              {ETIQUETA_ROL[cuenta.rol] ?? cuenta.rol}
            </Typography>
          </Stack>

          {/*
            El usuario en monoespaciada: es lo que la persona teclea para
            entrar, y asi no se confunden la ele y el uno.
          */}
          <Dato icono={KeyIcon}>
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              {cuenta.usuario}
            </Box>
          </Dato>

          {/*
            Se distingue el segundo factor CONFIGURADO del que solo esta
            exigido por el rol: una cuenta administrativa recien creada exige
            2FA y todavia no lo tiene, y son dos situaciones distintas.
          */}
          {cuenta.mfaActivo ? (
            <Dato icono={VerifiedUserIcon} color={tema.palette.success.main} negrita>
              2FA activo
            </Dato>
          ) : EXIGEN_MFA.includes(cuenta.rol) ? (
            <Dato icono={ShieldOutlinedIcon}>2FA pendiente</Dato>
          ) : null}

          {!cuenta.activo ? (
            <Dato icono={BlockIcon} negrita>
              Desactivada
            </Dato>
          ) : null}
          {cuenta.bloqueada ? (
            <Dato icono={BlockIcon} color={tema.palette.error.main} negrita>
              Bloqueada
            </Dato>
          ) : null}
          {cuenta.debeCambiarContrasena ? (
            <Dato icono={LockClockIcon} color={tema.palette.warning.main} negrita>
              Contrasena sin cambiar
            </Dato>
          ) : null}

          {/*
            Sin punto de presencia, igual que en la tabla que habia antes: el
            servidor no sabe quien esta dentro ahora mismo. `ultimoAcceso` se
            escribe al iniciar sesion, asi que quien entro a las siete y sigue
            trabajando se veria igual que quien se fue a media manana.
          */}
          <Dato icono={EventIcon}>
            {ultimoAccesoEnPalabras(cuenta.ultimoAcceso as unknown as string | null)}
          </Dato>
        </Stack>

        {/*
          `mt: auto` empuja el boton al fondo, asi queda a la misma altura en
          todas las fichas de la fila aunque una lleve tres estados y otra
          ninguno.
        */}
        <Button
          onClick={onEditar}
          endIcon={<ArrowForwardIcon />}
          sx={{
            mt: 'auto',
            pt: 1,
            mb: 0,
            minHeight: 42,
            borderRadius: 999,
            fontWeight: 800,
            color: oscuro ? '#0b2038' : '#fff',
            background: degradado,
            boxShadow: '0 4px 12px ' + alpha(tonos.pastel, oscuro ? 0.25 : 0.5),
            '&:hover': { background: degradado, filter: 'brightness(1.06)' },
          }}
        >
          Editar
        </Button>
      </Box>

      <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setMenu(null);
            onRestablecer();
          }}
        >
          Restablecer contrasena
        </MenuItem>
        {/*
          Solo si de verdad tiene algo que reiniciar. En una cuenta sin segundo
          factor el servidor responde 400, y ofrecer la opcion seria prometer
          una accion que no existe para ese caso.
        */}
        {cuenta.mfaActivo ? (
          <MenuItem
            onClick={() => {
              setMenu(null);
              onReiniciarMfa();
            }}
          >
            Reiniciar 2FA
          </MenuItem>
        ) : null}
      </Menu>
    </Paper>
  );
}
