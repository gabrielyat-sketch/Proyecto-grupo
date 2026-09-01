import { Link as EnlaceRuta, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { usarSesion } from '../modulos/sesion/contexto';
import { PRIMARIO } from '../tema';

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  DIRECTOR: 'Direccion',
  MEDICO: 'Medico',
  ENFERMERIA: 'Enfermeria',
  FARMACIA: 'Farmacia',
  RECEPCION: 'Recepcion',
};

/**
 * La pantalla de «aqui no hay nada», en sus dos formas.
 *
 * Antes las dos situaciones —una direccion que no existe y una a la que el rol
 * no puede entrar— hacian lo mismo: `Navigate to="/"`, sin una palabra. Quien
 * escribia mal una direccion, o seguia un enlace viejo, aparecia de golpe en el
 * menu de inicio y no tenia forma de saber si habia pulsado donde no era, si el
 * sistema se habia caido o si la pantalla ya no existia. La consecuencia
 * practica es que se vuelve a intentar lo mismo dos o tres veces.
 *
 * Decir cual de las dos cosas paso importa, y no es un detalle de cortesia: si
 * la direccion no existe, el camino es corregirla; si es el rol, el camino es
 * pedirle a Administracion el permiso o que lo haga quien si lo tiene. Son dos
 * acciones distintas y el mensaje tiene que llevar a la que toca.
 */
function Aviso({
  icono,
  titulo,
  explicacion,
  detalle,
}: {
  icono: React.ReactNode;
  titulo: string;
  explicacion: string;
  detalle?: React.ReactNode;
}) {
  const navegar = useNavigate();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 4, md: 8 } }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 560,
          width: '100%',
          p: { xs: 3, md: 5 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        <Stack sx={{ alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'rgba(11, 107, 181, 0.08)',
              color: PRIMARIO,
            }}
          >
            {icono}
          </Box>

          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {titulo}
          </Typography>

          <Typography color="text.secondary">{explicacion}</Typography>

          {detalle}

          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, mt: 1 }}>
            {/*
              Volver atras primero: casi siempre lo que se quiere es deshacer el
              paso que trajo aqui, no empezar de cero desde el inicio.
            */}
            <Button startIcon={<ArrowBackIcon />} onClick={() => navegar(-1)}>
              Volver atras
            </Button>
            <Button
              component={EnlaceRuta}
              to="/"
              variant="contained"
              startIcon={<HomeOutlinedIcon />}
            >
              Ir al inicio
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

/** La direccion no corresponde a ninguna pantalla del sistema. */
export function PaginaNoEncontrada() {
  const { pathname } = useLocation();

  return (
    <Aviso
      icono={<SearchOffOutlinedIcon sx={{ fontSize: 36 }} />}
      titulo="Esta pantalla no existe"
      explicacion="La direccion no corresponde a ninguna pantalla del sistema. Puede estar mal escrita, o ser un enlace de una version anterior."
      detalle={
        /*
          Se muestra la direccion que se intento abrir. Sin ella, avisar de que
          "no existe" no deja hacer nada: con ella se ve la letra de mas o el
          numero cambiado, y quien reporta el problema puede decir exactamente
          que escribio.
        */
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            bgcolor: 'action.hover',
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
            wordBreak: 'break-all',
          }}
        >
          {pathname}
        </Typography>
      }
    />
  );
}

/** La pantalla existe, pero no para este rol. */
export function PaginaSinAcceso() {
  const { usuario } = usarSesion();
  const rol = ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol;

  return (
    <Aviso
      icono={<LockOutlinedIcon sx={{ fontSize: 36 }} />}
      titulo="Esta pantalla no es de su perfil"
      explicacion={
        'La pantalla existe, pero el perfil de ' +
        (rol ?? 'su cuenta') +
        ' no tiene acceso. Si necesita entrar, pidaselo a Administracion; si es algo puntual, puede hacerlo quien si tenga el permiso.'
      }
    />
  );
}
