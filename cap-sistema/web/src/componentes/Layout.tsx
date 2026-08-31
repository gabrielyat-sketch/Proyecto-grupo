import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
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
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { usarSesion } from '../modulos/sesion/contexto';
import { salir } from '../modulos/sesion/servicio-sesion';
import { menuPara } from '../navegacion/menu';
import { AvatarUsuario } from './AvatarUsuario';
import { LogoCap } from './LogoCap';
import { Reloj } from './Reloj';
import { usarConexion } from './usarConexion';

const ANCHO_MENU = 248;

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
 */
export function Layout() {
  const { usuario } = usarSesion();
  const navegar = useNavigate();
  const tema = useTheme();
  // En la computadora de recepcion el menu se queda fijo; en un telefono o una
  // pantalla chica se abre solo cuando hace falta.
  const pantallaAncha = useMediaQuery(tema.breakpoints.up('md'));
  const [abierto, setAbierto] = useState(false);
  const [menuCuenta, setMenuCuenta] = useState<null | HTMLElement>(null);
  const conectado = usarConexion();

  const opciones = menuPara(usuario?.rol);

  async function cerrarSesion() {
    setMenuCuenta(null);
    await salir();
    navegar('/acceso', { replace: true });
  }

  const contenidoMenu = (
    <Box sx={{ width: ANCHO_MENU }} role="navigation" aria-label="Modulos del sistema">
      <Toolbar sx={{ px: 2.5 }}>
        <Stack spacing={0}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            CAP Purulha
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
          </Typography>
        </Stack>
      </Toolbar>
      <Divider />
      <List sx={{ py: 1 }}>
        {opciones.map(({ ruta, etiqueta, icono: Icono, pendiente, color }) => (
          <ListItemButton
            key={ruta}
            component={NavLink}
            to={ruta}
            onClick={() => setAbierto(false)}
            sx={{
              mx: 1,
              borderRadius: 1,
              '&.active': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'inherit' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
            }}
          >
            {/*
              El color solo cuando la fila NO esta activa: la activa se pinta
              entera de azul, y ahi el icono hereda el blanco de la regla de
              arriba.
            */}
            <ListItemIcon sx={{ minWidth: 40, color }}>
              <Icono />
            </ListItemIcon>
            <ListItemText
              primary={etiqueta}
              secondary={pendiente ? 'En construccion' : undefined}
              slotProps={{ secondary: { sx: { fontSize: 12, color: 'inherit', opacity: 0.7 } } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {!pantallaAncha ? (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Abrir el menu"
              onClick={() => setAbierto(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          ) : null}

          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
            <LogoCap tamano={32} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }} noWrap>
              Plataforma del CAP Purulha
            </Typography>
          </Stack>

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
          >
            {/*
              La cabecera no es un MenuItem deshabilitado: no se puede pulsar,
              no se enfoca con el teclado y no debe anunciarse como opcion. Un
              MenuItem apagado si sale en el recorrido del lector de pantalla.
            */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', px: 2, py: 1.5, minWidth: 232 }}
            >
              <AvatarUsuario usuario={usuario?.usuario ?? '?'} tamano={44} />
              <Stack spacing={0.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>
                  {usuario?.usuario}
                </Typography>
                <Chip
                  size="small"
                  label={ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
                  sx={{ bgcolor: 'rgba(21, 96, 122, 0.10)', color: 'primary.main', fontWeight: 600 }}
                />
              </Stack>
            </Stack>
            <Divider />
            <MenuItem
              onClick={() => {
                setMenuCuenta(null);
                navegar('/contrasena');
              }}
            >
              <ListItemIcon>
                <KeyOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </ListItemIcon>
              Cambiar contrasena
            </MenuItem>
            {/*
              En rojo y con su icono: es la unica accion del menu que termina
              el trabajo en curso, y hay que poder distinguirla de un vistazo
              cuando se busca la de arriba con prisa.
            */}
            <MenuItem onClick={() => void cerrarSesion()} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              Cerrar sesion
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {pantallaAncha ? (
        <Drawer
          variant="permanent"
          sx={{
            width: ANCHO_MENU,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: ANCHO_MENU, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          {contenidoMenu}
        </Drawer>
      ) : (
        <Drawer open={abierto} onClose={() => setAbierto(false)}>
          {contenidoMenu}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
