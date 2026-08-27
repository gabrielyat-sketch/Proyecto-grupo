import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { usarSesion } from '../modulos/sesion/contexto';
import { salir } from '../modulos/sesion/servicio-sesion';
import { menuPara } from '../navegacion/menu';

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
        {opciones.map(({ ruta, etiqueta, icono: Icono, pendiente }) => (
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
            <ListItemIcon sx={{ minWidth: 40 }}>
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

          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Plataforma del CAP Purulha
          </Typography>

          <IconButton
            color="inherit"
            onClick={(e) => setMenuCuenta(e.currentTarget)}
            aria-label={'Cuenta de ' + (usuario?.usuario ?? '')}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            anchorEl={menuCuenta}
            open={Boolean(menuCuenta)}
            onClose={() => setMenuCuenta(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <Stack spacing={0}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {usuario?.usuario}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
                </Typography>
              </Stack>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setMenuCuenta(null);
                navegar('/contrasena');
              }}
            >
              Cambiar contrasena
            </MenuItem>
            <MenuItem onClick={() => void cerrarSesion()}>Cerrar sesion</MenuItem>
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
