import { useEffect, useState } from 'react';
import { Link as EnlaceRuta, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { usarSesion } from '../modulos/sesion/contexto';
import { salir } from '../modulos/sesion/servicio-sesion';
import { menuPara } from '../navegacion/menu';
import { AvatarUsuario } from './AvatarUsuario';
import { LogoCap } from './LogoCap';
import { Reloj } from './Reloj';
import { usarConexion } from './usarConexion';
import { ALTO_BARRA, BARRA, MENU, MENU_ACTIVO } from '../tema';
import { usarSubirAlNavegar } from '../navegacion/usarSubirAlNavegar';

const ANCHO_MENU = 248;
/** Contraido: caben el icono y su area de pulsacion, nada mas. */
const ANCHO_MENU_ESTRECHO = 72;

/**
 * Que el menu quede contraido se recuerda entre sesiones.
 *
 * Es una preferencia de quien usa la maquina, no del sistema: en la
 * computadora de recepcion, con una pantalla pequena, alguien puede querer
 * todo el ancho para la tabla de pacientes y no tener que decirlo cada
 * manana. Se guarda en el navegador porque es de ESE puesto, no de la cuenta:
 * la misma persona en otra maquina puede quererlo distinto.
 */
const CLAVE_CONTRAIDO = 'cap.menu.contraido';

function leerContraido(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_CONTRAIDO) === '1';
  } catch {
    // Modo privado, o almacenamiento bloqueado. No es motivo para romper el
    // panel: se abre desplegado, que es lo mas util por omision.
    return false;
  }
}

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  DIRECTOR: 'Direccion',
  MEDICO: 'Medicina',
  ENFERMERIA: 'Enfermeria',
  FARMACIA: 'Farmacia',
  RECEPCION: 'Recepcion y archivo',
};

/**
 * Marco del panel: barra superior, menu lateral y area de contenido.
 *
 * El menu se arma segun el rol de quien entro. Ver navegacion/menu.ts para el
 * porque de cada permiso.
 *
 * **El menu lateral es oscuro y el contenido claro**, como la referencia que
 * dio el CAP. No es solo estetica: separa de un vistazo el armazon —donde se
 * navega— del trabajo —donde se lee y se escribe—, y con nueve modulos esa
 * separacion es lo que evita perder el hilo de en cual se esta.
 */
export function Layout() {
  const { usuario } = usarSesion();
  const navegar = useNavigate();
  const tema = useTheme();
  // En la computadora de recepcion el menu se queda fijo; en un telefono o una
  // pantalla chica se abre solo cuando hace falta.
  const pantallaAncha = useMediaQuery(tema.breakpoints.up('md'));
  const [abierto, setAbierto] = useState(false);
  const [contraido, setContraido] = useState(leerContraido);
  const [menuCuenta, setMenuCuenta] = useState<null | HTMLElement>(null);
  const conectado = usarConexion();

  usarSubirAlNavegar();

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_CONTRAIDO, contraido ? '1' : '0');
    } catch {
      // Si no se puede guardar, la preferencia dura lo que dure la pestana.
      // Peor eso que caerse al pulsar un boton de la barra.
    }
  }, [contraido]);

  const opciones = menuPara(usuario?.rol);
  // En pantalla chica el menu es un cajon que se abre entero: contraerlo ahi
  // no significa nada.
  const estrecho = pantallaAncha && contraido;
  const ancho = estrecho ? ANCHO_MENU_ESTRECHO : ANCHO_MENU;

  async function cerrarSesion() {
    setMenuCuenta(null);
    await salir();
    navegar('/acceso', { replace: true });
  }

  const contenidoMenu = (
    <Box
      sx={{ width: ancho, height: '100%', bgcolor: MENU, color: '#fff' }}
      role="navigation"
      aria-label="Modulos del sistema"
    >
      {/*
        La marca del menu ES el boton de Inicio.

        Hacia falta un camino de vuelta al menu de tarjetas que se ve al
        entrar: elegido un modulo, el unico camino era el menu lateral, y ahi
        no esta Inicio. Va aqui y no en una opcion aparte porque el logo ya
        ocupa este espacio, y en cualquier sitio la marca lleva al principio;
        una fila mas en el menu seria repetir lo que el logo ya puede hacer.
      */}
      <Stack
        component={EnlaceRuta}
        to="/"
        aria-label="Inicio"
        direction="row"
        onClick={() => setAbierto(false)}
        sx={{
          alignItems: 'center',
          gap: 1.25,
          height: 64,
          px: estrecho ? 0 : 2.5,
          justifyContent: estrecho ? 'center' : 'flex-start',
          color: 'inherit',
          textDecoration: 'none',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
        }}
      >
        <LogoCap tamano={32} />
        {!estrecho ? (
          <Stack sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.15 }} noWrap>
              CAP Purulha
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.72 }} noWrap>
              {ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
            </Typography>
          </Stack>
        ) : null}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />

      <List sx={{ py: 1 }}>
        {opciones.map(({ ruta, etiqueta, icono: Icono, pendiente }) => {
          const boton = (
            <ListItemButton
              component={NavLink}
              to={ruta}
              onClick={() => setAbierto(false)}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: 2,
                minHeight: 44,
                justifyContent: estrecho ? 'center' : 'flex-start',
                px: estrecho ? 0 : 2,
                color: 'rgba(255, 255, 255, 0.82)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                '&.active': {
                  bgcolor: MENU_ACTIVO,
                  color: '#fff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: MENU_ACTIVO },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: estrecho ? 0 : 40,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                <Icono />
              </ListItemIcon>
              {!estrecho ? (
                <ListItemText
                  primary={etiqueta}
                  secondary={pendiente ? 'En construccion' : undefined}
                  slotProps={{
                    primary: { sx: { fontWeight: 'inherit' } },
                    secondary: { sx: { fontSize: 12, color: 'inherit', opacity: 0.6 } },
                  }}
                />
              ) : null}
            </ListItemButton>
          );

          /*
            El Tooltip SOLO existe con el menu contraido.

            Envolver las nueve opciones siempre costaba caro: MUI monta un
            portal y sus escuchas por cada una, en cada render del panel, y la
            suite de pruebas paso de dos minutos a mas de cinco por eso. Con el
            menu desplegado no aporta nada —el nombre esta escrito al lado— asi
            que no tiene por que existir.
          */
          return estrecho ? (
            <Tooltip key={ruta} title={etiqueta} placement="right">
              {boton}
            </Tooltip>
          ) : (
            <Box key={ruta}>{boton}</Box>
          );
        })}
      </List>
    </Box>
  );

  return (
    /*
      El fondo de TODA la aplicacion es el oscuro del menu, no el gris claro.

      Es lo que quita la esquina entre los dos paneles: si el menu es una
      columna oscura sobre un fondo claro, su borde derecho existe y se ve. Si
      el oscuro es el suelo y la tarjeta blanca flota encima con margen por los
      cuatro lados, no hay borde que ver — es lo que hace la referencia del CAP.
    */
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: MENU }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: BARRA }}
      >
        <Toolbar sx={{ minHeight: { xs: ALTO_BARRA, sm: ALTO_BARRA } }}>
          <IconButton
            color="inherit"
            edge="start"
            aria-label={
              pantallaAncha
                ? contraido
                  ? 'Desplegar el menu'
                  : 'Contraer el menu'
                : 'Abrir el menu'
            }
            aria-expanded={pantallaAncha ? !contraido : abierto}
            onClick={() => (pantallaAncha ? setContraido((c) => !c) : setAbierto(true))}
            sx={{ mr: 1.5 }}
          >
            {pantallaAncha && !contraido ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>

          {/*
            Titulo llano, no un boton: el camino a Inicio es el logo del menu,
            y dos formas de hacer lo mismo a diez centimetros una de otra solo
            obligan a averiguar si son distintas.
          */}
          {/*
            El nombre en dos alturas, no en una linea corrida.

            «Plataforma del» es andamiaje: nadie lo lee dos veces, y puesto al
            mismo tamano que el resto obliga a recorrerlo entero para llegar a
            lo que nombra. Arriba, pequeno y espaciado, hace de rotulo; debajo
            queda el nombre propio del centro, que es lo unico que hay que
            reconocer de un vistazo. Ademas la barra mide 73 pixeles y una sola
            linea de texto los desaprovecha.

            Se ve distinto desde que la letra del tema se carga de verdad: Inter
            estaba pedida en `tema.ts` desde el principio pero no la instalaba
            nadie, asi que todo salia en Segoe UI. Ver `main.tsx`.
          */}
          <Box sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
            <Typography
              component="div"
              noWrap
              sx={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '.2em',
                textTransform: 'uppercase',
                opacity: 0.66,
                lineHeight: 1.3,
              }}
            >
              Plataforma del
            </Typography>
            <Typography
              component="div"
              noWrap
              sx={{
                fontSize: { xs: 15, sm: 19 },
                fontWeight: 600,
                letterSpacing: '-.015em',
                lineHeight: 1.2,
              }}
            >
              Centro de Atencion Permanente
            </Typography>
          </Box>

          {/*
            El reloj a la par del avatar, no al centro: los dos son informacion
            de "quien y cuando", y juntos ocupan una sola esquina en vez de
            partir la barra en tres.
          */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Reloj conFecha={pantallaAncha} />

            {/*
              Pastilla con el nombre, no un icono suelto: en una computadora
              compartida entre turnos, saber con que cuenta se esta trabajando
              no puede exigir abrir un menu. El nombre a la vista es lo que
              evita que alguien registre media jornada bajo la sesion de otro.
            */}
            <Button
              onClick={(e) => setMenuCuenta(e.currentTarget)}
              aria-label={'Cuenta de ' + (usuario?.usuario ?? '')}
              aria-haspopup="menu"
              aria-expanded={Boolean(menuCuenta)}
              endIcon={pantallaAncha ? <ExpandMoreIcon /> : null}
              sx={{
                color: 'inherit',
                pl: 0.5,
                pr: pantallaAncha ? 1 : 0.5,
                py: 0.5,
                borderRadius: 5,
                textTransform: 'none',
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.22)' },
              }}
            >
              <AvatarUsuario
                usuario={usuario?.usuario ?? '?'}
                conectado={conectado}
                tamano={32}
                descripcion={
                  (usuario?.usuario ?? '') +
                  (conectado ? ' · conectado' : ' · sin conexion de red')
                }
              />
              {pantallaAncha ? (
                <Typography component="span" sx={{ ml: 1, fontWeight: 600 }} noWrap>
                  {usuario?.usuario}
                </Typography>
              ) : null}
            </Button>
          </Stack>

          <Menu
            anchorEl={menuCuenta}
            open={Boolean(menuCuenta)}
            onClose={() => setMenuCuenta(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 268, overflow: 'hidden' } } }}
          >
            {/*
              La cabecera no es un MenuItem deshabilitado: no se puede pulsar,
              no se enfoca con el teclado y no debe anunciarse como opcion. Un
              MenuItem apagado si sale en el recorrido del lector de pantalla.

              En blanco, como el resto del desplegable. Estuvo un tiempo sobre
              el oscuro de la barra, y el resultado era un recuadro de color
              arriba y dos filas blancas debajo dentro de una ventanita de
              cuatro centimetros: el bloque tiraba de la vista hacia el dato
              —el nombre de quien entro, que ya se sabe— y no hacia las dos
              acciones, que es a lo que se abrio. La linea de abajo separa
              igual de bien y no compite con nada.
            */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', px: 2, py: 2 }}
            >
              <AvatarUsuario usuario={usuario?.usuario ?? '?'} tamano={44} />
              <Stack sx={{ minWidth: 0, gap: 0.25 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>
                  {usuario?.usuario}
                </Typography>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary' }}
                >
                  <BadgeOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography variant="caption" noWrap>
                    {ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            <Divider />

            <MenuItem
              onClick={() => {
                setMenuCuenta(null);
                navegar('/contrasena');
              }}
              sx={{ minHeight: 48, gap: 0.5, mt: 0.5 }}
            >
              <ListItemIcon>
                <KeyOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              <ListItemText primary="Cambiar contrasena" />
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            {/*
              En rojo, con su icono y separada por una linea: es la unica
              accion del menu que termina el trabajo en curso, y hay que poder
              distinguirla de un vistazo cuando se busca la de arriba con
              prisa.
            */}
            <MenuItem
              onClick={() => void cerrarSesion()}
              sx={{
                minHeight: 48,
                gap: 0.5,
                color: 'error.main',
                '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.08)' },
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText
                primary="Cerrar sesion"
                slotProps={{ primary: { sx: { fontWeight: 600 } } }}
              />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {pantallaAncha ? (
        <Drawer
          variant="permanent"
          sx={{
            width: ancho,
            flexShrink: 0,
            // La misma duracion que usa MUI para sus cajones: el contenido de
            // la derecha se mueve a la vez y no se ve un salto.
            transition: tema.transitions.create('width', {
              easing: tema.transitions.easing.sharp,
              duration: tema.transitions.duration.enteringScreen,
            }),
            '& .MuiDrawer-paper': {
              width: ancho,
              boxSizing: 'border-box',
              // Transparente: el oscuro ya lo pone el contenedor de arriba, y
              // pintarlo aqui otra vez volveria a dibujar el canto.
              bgcolor: 'transparent',
              borderRight: 'none',
              overflowX: 'hidden',
              transition: tema.transitions.create('width', {
                easing: tema.transitions.easing.sharp,
                duration: tema.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Box sx={{ height: ALTO_BARRA }} />
          {contenidoMenu}
        </Drawer>
      ) : (
        <Drawer
          open={abierto}
          onClose={() => setAbierto(false)}
          slotProps={{ paper: { sx: { bgcolor: MENU } } }}
        >
          {contenidoMenu}
        </Drawer>
      )}

      {/*
        El contenido va dentro de una tarjeta blanca con las esquinas
        redondeadas, no suelto sobre el fondo.

        Es lo que da la referencia del CAP, y hace un trabajo ademas de verse
        mejor: separa el area de trabajo del armazon oscuro con un borde propio,
        asi que la vista sabe donde empieza lo que hay que leer. Suelto sobre el
        fondo gris, el contenido y el marco se leian como una sola superficie
        partida por una linea.
      */}
      <Box
        component="main"
        sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ height: ALTO_BARRA }} />
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3.5 },
            bgcolor: 'background.paper',
            /*
              UNA sola esquina redondeada: la de arriba a la izquierda.

              Es la unica que toca el oscuro. Redondear las cuatro convertia el
              area de trabajo en una tarjeta flotante con aire oscuro alrededor,
              y eso no es lo que da la referencia del CAP: ahi el blanco llega
              hasta el borde derecho y hasta abajo, y lo unico que se curva es
              el encuentro con el menu. Las otras tres esquinas caen contra el
              borde de la ventana, donde no hay nada de que separarse.

              En pantalla chica no hay menu al lado —es un cajon que se abre
              encima— asi que tampoco hay esquina que suavizar.
            */
            borderTopLeftRadius: { xs: 0, md: 24 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
