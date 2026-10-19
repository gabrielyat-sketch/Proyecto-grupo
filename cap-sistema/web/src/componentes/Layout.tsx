import { useEffect, useState } from 'react';
import { Link as EnlaceRuta, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
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
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { usarSesion } from '../modulos/sesion/contexto';
import { salir } from '../modulos/sesion/servicio-sesion';
import { menuPara } from '../navegacion/menu';
import { AvatarUsuario } from './AvatarUsuario';
import { LogoCap } from './LogoCap';
import { Reloj } from './Reloj';
import { usarConexion } from './usarConexion';
import { usarModoColor } from '../modo-color';
import {
  MENU_ACTIVO_CLARO,
  MENU_ACTIVO_OSCURO,
  MENU_ACTIVO_TEXTO_CLARO,
  MENU_CLARO,
  MENU_OSCURO,
  MENU_REALCE,
  type ModoColor,
} from '../tema';
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

const APARIENCIA: { modo: ModoColor; etiqueta: string; icono: typeof LightModeOutlinedIcon }[] = [
  { modo: 'claro', etiqueta: 'Modo claro', icono: LightModeOutlinedIcon },
  { modo: 'oscuro', etiqueta: 'Modo oscuro', icono: DarkModeOutlinedIcon },
  { modo: 'sistema', etiqueta: 'El del sistema', icono: SettingsBrightnessOutlinedIcon },
];

/**
 * Marco del panel: menu lateral y area de trabajo. Ya no hay barra superior.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  POR QUE SE FUE LA BARRA
 * ─────────────────────────────────────────────────────────────────────────
 * Lo pidio el CAP y el diseno que dieron no la tiene. Ocupaba 76 pixeles de
 * alto en todas las pantallas para sostener tres cosas —el nombre del centro,
 * el reloj y la cuenta— que no se consultan cada minuto. En una ficha clinica,
 * que es la pantalla mas larga del sistema, esos 76 pixeles son una fila de
 * campos.
 *
 * Nada de lo que llevaba se perdio: el nombre del centro ya estaba en la
 * cabecera del menu, y el reloj y la cuenta bajaron al pie del mismo menu. El
 * estado de la conexion —que era un punto en el avatar— paso a la pantalla de
 * inicio, dicho con palabras.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  EL MENU SE DESPLIEGA AL PASAR EL CURSOR
 * ─────────────────────────────────────────────────────────────────────────
 * Contraido se ven solo los iconos, y un icono sin su nombre se adivina. Antes
 * eso se resolvia con un globo de ayuda por fila: nueve globos para leer nueve
 * nombres, de uno en uno.
 *
 * Ahora basta acercar el cursor y el menu entero se desliza encima del
 * contenido. **Encima, no empujandolo**: si el area de trabajo se corriera 176
 * pixeles cada vez que el cursor roza el borde, la tabla que se esta leyendo
 * saltaria sola. Por eso el hueco que el menu ocupa en la pagina sigue siendo
 * el estrecho y lo unico que crece es el panel.
 */
export function Layout() {
  const { usuario } = usarSesion();
  const navegar = useNavigate();
  const tema = useTheme();
  const oscuro = tema.palette.mode === 'dark';
  const { modo, cambiar } = usarModoColor();
  // En la computadora de recepcion el menu se queda fijo; en un telefono o una
  // pantalla chica se abre solo cuando hace falta.
  const pantallaAncha = useMediaQuery(tema.breakpoints.up('md'));
  const [abierto, setAbierto] = useState(false);
  const [contraido, setContraido] = useState(leerContraido);
  const [sobrevolado, setSobrevolado] = useState(false);
  const [menuCuenta, setMenuCuenta] = useState<null | HTMLElement>(null);
  const [menuTema, setMenuTema] = useState<null | HTMLElement>(null);
  const conectado = usarConexion();

  usarSubirAlNavegar();

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_CONTRAIDO, contraido ? '1' : '0');
    } catch {
      // Si no se puede guardar, la preferencia dura lo que dure la pestana.
      // Peor eso que caerse al pulsar el boton del menu.
    }
  }, [contraido]);

  const opciones = menuPara(usuario?.rol);
  // En pantalla chica el menu es un cajon que se abre entero: contraerlo ahi
  // no significa nada.
  const contraidoDeVerdad = pantallaAncha && contraido;
  /** Lo que el menu OCUPA en la pagina. No cambia al pasar el cursor. */
  const anchoHueco = contraidoDeVerdad ? ANCHO_MENU_ESTRECHO : ANCHO_MENU;
  /** Lo que el menu MIDE en pantalla. Crece al pasar el cursor. */
  const desplegado = !contraidoDeVerdad || sobrevolado;
  const anchoVisible = desplegado ? ANCHO_MENU : ANCHO_MENU_ESTRECHO;
  /** Contraido y sin cursor encima: el unico estado en que se ocultan los textos. */
  const estrecho = !desplegado;

  const fondoMenu = oscuro ? MENU_OSCURO : MENU_CLARO;
  // El azul vivo de la imagen, donde no hay texto que leer encima.
  const realce = oscuro ? 'rgba(255, 255, 255, 0.12)' : MENU_REALCE;
  const activoFondo = oscuro ? MENU_ACTIVO_OSCURO : MENU_ACTIVO_CLARO;
  const activoTexto = oscuro ? '#fff' : MENU_ACTIVO_TEXTO_CLARO;

  /*
    Como se esconde el texto del menu al contraerse: se OCULTA, no se desmonta.

    Desmontarlo era la causa del salto. «Sala de espera» no cabe en una linea
    mientras el panel se estrecha, asi que al reaparecer envolvia en dos
    renglones, la fila crecia de 46 a 66 pixeles y la lista entera daba un
    tiron a mitad de la animacion. Montado siempre y con `nowrap`, la altura de
    cada fila es la misma en los dos extremos y lo unico que pasa es que el
    panel recorta el texto al encogerse —que es justo lo que parece que hace
    un cajon que se cierra—.

    `visibility` ademas de `opacity` porque un texto transparente sigue
    saliendo en el recorrido del lector de pantalla y se puede enfocar con el
    tabulador: estaria leyendo etiquetas que nadie ve.
  */
  const textoDelMenu = {
    opacity: estrecho ? 0 : 1,
    visibility: (estrecho ? 'hidden' : 'visible') as 'hidden' | 'visible',
    transition: tema.transitions.create(['opacity', 'visibility'], {
      duration: estrecho ? 120 : 200,
      // Al desplegar el texto entra con un poco de retraso: primero se ve el
      // hueco y despues lo que lo llena. Al reves parece que el texto empuja
      // el panel.
      delay: estrecho ? 0 : 90,
    }),
  };

  /*
    El deslizamiento. 260 ms con una curva que frena al final, no la lineal:
    el CAP pidio que la animacion fuera «suave y no brusca», y lo que se nota
    de brusco en un panel que se abre no es la duracion sino el frenazo.
  */
  const deslizar = tema.transitions.create('width', {
    duration: 260,
    easing: 'cubic-bezier(.22,.61,.36,1)',
  });

  async function cerrarSesion() {
    setMenuCuenta(null);
    await salir();
    navegar('/acceso', { replace: true });
  }

  const contenidoMenu = (
    <Stack
      sx={{ width: '100%', height: '100%', bgcolor: fondoMenu, color: '#fff' }}
      role="navigation"
      aria-label="Modulos del sistema"
    >
      {/*
        La marca del menu ES el boton de Inicio.

        Hace falta un camino de vuelta al menu de tarjetas que se ve al entrar:
        elegido un modulo, el unico camino es el menu lateral, y ahi no esta
        Inicio. Va aqui y no en una opcion aparte porque el logo ya ocupa este
        espacio, y en cualquier sitio la marca lleva al principio.
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
          minHeight: 72,
          // El logo NO se recentra al contraer: moverlo horizontalmente
          // mientras el panel cambia de ancho es un segundo movimiento encima
          // del primero, y es parte de lo que se veia a saltos.
          pl: '19px',
          pr: 2.5,
          color: 'inherit',
          textDecoration: 'none',
          flexShrink: 0,
          '&:hover': { bgcolor: realce },
        }}
      >
        <LogoCap tamano={34} />
        <Stack sx={{ minWidth: 0, ...textoDelMenu }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: 17 }} noWrap>
            CAP Purulha
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.78 }} noWrap>
            {ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.16)' }} />

      {/*
        La lista se desplaza sola si no caben las diez opciones; el pie se
        queda abajo. Sin esto, en una pantalla de portatil la cuenta quedaba
        fuera de la vista y no habia como cerrar sesion.
      */}
      <List sx={{ py: 1, flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {opciones.map(({ ruta, etiqueta, icono: Icono, pendiente }) => {
          const boton = (
            <ListItemButton
              component={NavLink}
              to={ruta}
              onClick={() => setAbierto(false)}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: 2.5,
                // Alto FIJO. Con la altura libre, la fila de dos renglones
                // —«Sala de espera», o cualquiera con «En construccion»
                // debajo— cambiaba de tamano durante el deslizamiento.
                height: 48,
                justifyContent: 'flex-start',
                // El icono cae exactamente en el centro de la columna
                // estrecha: 8 del margen + 8 de este relleno + 20 de media
                // caja = 36, que es la mitad de 72. Asi no se mueve ni un
                // pixel al desplegar, y lo unico que viaja es el panel.
                px: 1,
                color: '#fff',
                '&:hover': { bgcolor: realce },
                '&.active': {
                  bgcolor: activoFondo,
                  color: activoTexto,
                  fontWeight: 800,
                  '&:hover': { bgcolor: activoFondo },
                },
              }}
            >
              <ListItemIcon
                sx={{ minWidth: 40, flexShrink: 0, color: 'inherit', justifyContent: 'center' }}
              >
                {/* Un poco mas grandes que los 24 de serie, como pidio el CAP. */}
                <Icono sx={{ fontSize: 26 }} />
              </ListItemIcon>
              <ListItemText
                primary={etiqueta}
                secondary={pendiente ? 'En construccion' : undefined}
                sx={{ my: 0, ...textoDelMenu }}
                slotProps={{
                  // `noWrap` en los dos: es lo que impide que «Sala de espera»
                  // se parta en dos renglones mientras el panel es estrecho.
                  primary: { noWrap: true, sx: { fontWeight: 'inherit' } },
                  secondary: {
                    noWrap: true,
                    sx: { fontSize: 12, color: 'inherit', opacity: 0.65 },
                  },
                }}
              />
            </ListItemButton>
          );

          /*
            El globo de ayuda SOLO existe con el menu encogido de verdad.

            Envolver las diez opciones siempre costaba caro: MUI monta un portal
            y sus escuchas por cada una, en cada render del panel, y la suite de
            pruebas paso de dos minutos a mas de cinco por eso. Desplegado no
            aporta nada —el nombre esta escrito al lado— asi que no tiene por
            que existir.
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

      {/*
        Los escudos de la universidad y de la carrera, al pie del menu.

        El CAP los pidio dentro del sistema y no solo en la entrada. Van aqui
        por descarte razonado: en el area de trabajo estorbarian —es donde se
        leen tablas y se llenan fichas— y en una sola pantalla no cumplirian el
        encargo, porque en cuanto se abre un modulo desaparecen. Al pie del
        menu estan en TODAS las pantallas y en la unica franja que no compite
        con nada: debajo de la ultima opcion y encima del borde.

        Sobre una pastilla blanca por lo mismo que en la entrada: los archivos
        traen fondo blanco opaco y sueltos sobre el azul se verian como dos
        recortes. Y pequenos —22 pixeles— porque esto es un credito, no una
        marca: si pesaran mas que el nombre del centro que esta arriba, la
        jerarquia del panel quedaria al reves. El de la universidad va algo mas
        alto que el de la carrera —28 contra 16— porque es un sello cuadrado y
        el otro un lockup apaisado: a la misma altura, el apaisado ocupa el
        triple de ancho y se come la fila.

        Con el menu encogido no se dibujan. En 72 pixeles de ancho los dos no
        caben, y partirlos en dos renglones convertiria el pie en un bloque mas
        alto que las propias opciones.
      */}
      <Stack sx={{ p: 1.5, pt: 0, flexShrink: 0, ...textoDelMenu }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.25,
            px: 1.25,
            py: 0.75,
            borderRadius: 2,
            bgcolor: '#fff',
          }}
        >
          <Box
            component="img"
            src="/logo-umg.png"
            alt="Universidad Mariano Galvez"
            sx={{ height: 28, width: 'auto', flexShrink: 0 }}
          />
          {/*
            El de la carrera, mas bajo: es apaisado y el otro casi cuadrado, asi
            que a la misma altura ocuparia el doble y se leeria como el
            principal. Es el mismo ajuste que en la pantalla de entrada.
          */}
          <Box
            component="img"
            src="/logo-sistemas.jpg"
            alt="Ingenieria en Sistemas, UMG Coban"
            sx={{ height: 16, width: 'auto', maxWidth: 110, objectFit: 'contain', flexShrink: 1 }}
          />
        </Stack>
      </Stack>
    </Stack>
  );

  return (
    /*
      El suelo de TODA la aplicacion es el color del menu.

      Es lo que quita la esquina entre los dos paneles: si el menu es una
      columna de color sobre un fondo claro, su borde derecho existe y se ve. Si
      ese color es el suelo y el area de trabajo se apoya encima, no hay borde
      que ver.
    */
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: fondoMenu }}>
      {pantallaAncha ? (
        <Drawer
          variant="permanent"
          /*
            El cursor entra y sale del PANEL, no de cada fila. Puesto en las
            filas, el hueco entre dos de ellas contaria como salir y el menu
            parpadearia al recorrerlo de arriba abajo.
          */
          onMouseEnter={() => setSobrevolado(true)}
          onMouseLeave={() => setSobrevolado(false)}
          sx={{
            width: anchoHueco,
            flexShrink: 0,
            transition: deslizar,
            '& .MuiDrawer-paper': {
              width: anchoVisible,
              boxSizing: 'border-box',
              bgcolor: 'transparent',
              borderRight: 'none',
              overflowX: 'hidden',
              transition: deslizar,
              // Desplegado por encima del contenido necesita sombra, o se lee
              // como si el area de trabajo se hubiera encogido sola.
              boxShadow:
                contraidoDeVerdad && sobrevolado ? '12px 0 28px rgba(0, 0, 0, .22)' : 'none',
            },
          }}
        >
          {contenidoMenu}
        </Drawer>
      ) : (
        <Drawer
          open={abierto}
          onClose={() => setAbierto(false)}
          slotProps={{ paper: { sx: { width: ANCHO_MENU, bgcolor: fondoMenu } } }}
        >
          {contenidoMenu}
        </Drawer>
      )}

      {/*
        El boton que contrae el menu vive FUERA del panel, a caballo sobre su
        borde. Lo pidio el CAP, y ademas resuelve algo: dentro, al contraerse,
        se iba con el panel y quedaba en una columna de 72 pixeles compitiendo
        con los iconos de los modulos. Aqui se queda siempre en el mismo sitio
        relativo al borde, y acompana al panel cuando se desliza.
      */}
      <Tooltip
        title={pantallaAncha ? (contraido ? 'Desplegar el menu' : 'Contraer el menu') : 'Abrir el menu'}
        placement="right"
      >
        <IconButton
          aria-label={
            pantallaAncha
              ? contraido
                ? 'Desplegar el menu'
                : 'Contraer el menu'
              : 'Abrir el menu'
          }
          aria-expanded={pantallaAncha ? !contraido : abierto}
          onClick={() => (pantallaAncha ? setContraido((c) => !c) : setAbierto(true))}
          sx={{
            position: 'fixed',
            top: 18,
            left: pantallaAncha ? anchoVisible - 18 : 12,
            zIndex: (t) => t.zIndex.drawer + 2,
            width: 36,
            height: 36,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 8px rgba(0, 0, 0, .18)',
            transition: tema.transitions.create(['left', 'background-color'], {
              duration: 260,
              easing: 'cubic-bezier(.22,.61,.36,1)',
            }),
            '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main' },
          }}
        >
          {pantallaAncha && !contraido ? (
            <MenuOpenIcon sx={{ fontSize: 20 }} />
          ) : (
            <MenuIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      </Tooltip>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          // Espacio a la izquierda para que el boton del menu no se pose
          // encima del primer titulo de cada pantalla.
          pl: { xs: 2, md: 4.5 },
          pr: { xs: 2, md: 3.5 },
          pt: { xs: 1.5, md: 2 },
          pb: { xs: 2, md: 3.5 },
        }}
      >
        {/*
          El reloj y la cuenta, arriba a la derecha.

          Estuvieron un rato al pie del menu lateral y el CAP lo rechazo: ahi
          compiten con la navegacion, que es lo unico que ese panel deberia
          contener. Aqui vuelven donde estaban —la esquina de «quien y
          cuando»— pero sin la banda de 76 pixeles que los sostenia: es una
          fila suelta sobre el area de trabajo, no una barra.
        */}
        <Stack
          direction="row"
          sx={{ alignItems: 'center', gap: 1, justifyContent: 'flex-end', mb: 1.5 }}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}>
            <Reloj conFecha={pantallaAncha} />
          </Box>

          <Tooltip title="Apariencia">
            <IconButton
              onClick={(e) => setMenuTema(e.currentTarget)}
              aria-label={
                'Apariencia: ' + (APARIENCIA.find((a) => a.modo === modo)?.etiqueta ?? '')
              }
              aria-haspopup="menu"
              sx={{ color: 'text.secondary' }}
            >
              {modo === 'claro' ? (
                <LightModeOutlinedIcon />
              ) : modo === 'oscuro' ? (
                <DarkModeOutlinedIcon />
              ) : (
                <SettingsBrightnessOutlinedIcon />
              )}
            </IconButton>
          </Tooltip>

          {/*
            La cuenta con el nombre a la vista, no un icono suelto: en una
            computadora compartida entre turnos, saber con que cuenta se esta
            trabajando no puede exigir abrir un menu. El nombre a la vista es
            lo que evita que alguien registre media jornada bajo la sesion de
            otro.
          */}
          <Stack
            component="button"
            type="button"
            direction="row"
            onClick={(e) => setMenuCuenta(e.currentTarget)}
            aria-label={'Cuenta de ' + (usuario?.usuario ?? '')}
            aria-haspopup="menu"
            aria-expanded={Boolean(menuCuenta)}
            sx={{
              alignItems: 'center',
              gap: 1,
              minWidth: 0,
              pl: 0.5,
              pr: { xs: 0.5, sm: 1.5 },
              py: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 999,
              cursor: 'pointer',
              font: 'inherit',
              color: 'text.primary',
              bgcolor: 'background.paper',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <AvatarUsuario
              usuario={usuario?.usuario ?? '?'}
              conectado={conectado}
              tamano={30}
              descripcion={
                (usuario?.usuario ?? '') +
                (conectado ? ' · conectado' : ' · sin conexion de red')
              }
            />
            <Typography
              component="span"
              sx={{ fontWeight: 700, minWidth: 0, display: { xs: 'none', sm: 'block' } }}
              noWrap
            >
              {usuario?.usuario}
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>

      {/* ─── Los dos menus emergentes del pie ─── */}
      <Menu
        anchorEl={menuTema}
        open={Boolean(menuTema)}
        onClose={() => setMenuTema(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        {APARIENCIA.map(({ modo: m, etiqueta, icono: Icono }) => (
          <MenuItem
            key={m}
            selected={modo === m}
            onClick={() => {
              cambiar(m);
              setMenuTema(null);
            }}
            sx={{ minHeight: 48, gap: 0.5 }}
          >
            <ListItemIcon>
              <Icono fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={etiqueta} />
            {modo === m ? <CheckIcon fontSize="small" sx={{ ml: 1 }} /> : null}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={menuCuenta}
        open={Boolean(menuCuenta)}
        onClose={() => setMenuCuenta(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 268, overflow: 'hidden' } } }}
      >
        {/*
          La cabecera no es un MenuItem deshabilitado: no se puede pulsar, no
          se enfoca con el teclado y no debe anunciarse como opcion. Un MenuItem
          apagado si sale en el recorrido del lector de pantalla.
        */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 2 }}>
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
          En rojo, con su icono y separada por una linea: es la unica accion
          del menu que termina el trabajo en curso, y hay que poder
          distinguirla de un vistazo cuando se busca la de arriba con prisa.
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
    </Box>
  );
}
