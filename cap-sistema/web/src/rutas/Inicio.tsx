import { Box, Stack, Typography } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { EncabezadoPagina } from '../componentes/EncabezadoPagina';
import { TarjetaModulo } from '../componentes/TarjetaModulo';
import { usarConexion } from '../componentes/usarConexion';
import { usarSesion } from '../modulos/sesion/contexto';
import { menuPara } from '../navegacion/menu';

const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administracion',
  DIRECTOR: 'Direccion',
  MEDICO: 'Medicina',
  ENFERMERIA: 'Enfermeria',
  FARMACIA: 'Farmacia',
  RECEPCION: 'Recepcion',
};

/**
 * Pantalla de entrada del panel.
 *
 * Muestra unicamente los modulos que el rol puede abrir. Es deliberado que no
 * haya nada mas: quien llega aqui viene a hacer una tarea concreta, y una
 * pantalla llena de tarjetas y cifras obliga a buscar antes de empezar.
 */
export function Inicio() {
  const { usuario } = usarSesion();
  const opciones = menuPara(usuario?.rol);
  const conectado = usarConexion();

  return (
    <Box>
      {/*
        El rotulo pequeno sobre el saludo, como en el diseno del CAP: dice en
        que centro y con que rol se esta trabajando. En una computadora
        compartida entre turnos eso no es decoracion.
      */}
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: 'primary.main',
          mb: 0.5,
        }}
      >
        CAP Purulha · {ETIQUETA_ROL[usuario?.rol ?? ''] ?? usuario?.rol}
      </Typography>

      <EncabezadoPagina
        titulo="Centro de Atención Permanente"
        descripcion="Estos son los modulos disponibles para su rol."
        acciones={<EstadoPlataforma conectado={conectado} />}
      />

      {/*
        Tres columnas, dos por debajo de 900 y una por debajo de 600: los
        mismos cortes que el CSS que entrego el CAP, y `minmax(0, 1fr)` para
        que un nombre largo no estire su columna por encima de las otras.
      */}
      <Box
        sx={{
          display: 'grid',
          gap: '18px',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {opciones.map(({ ruta, etiqueta, resumen, acento, icono, pendiente }) => (
          <TarjetaModulo
            key={ruta}
            ruta={ruta}
            etiqueta={etiqueta}
            resumen={resumen}
            acento={acento}
            icono={icono}
            estado={pendiente ? 'En construccion' : undefined}
          />
        ))}
      </Box>
    </Box>
  );
}

/**
 * Si el panel llega al servidor o no.
 *
 * Estaba solo como un punto en el avatar de la barra superior, y la barra ya
 * no existe. Aqui lo dice con palabras: en el CAP la red se cae, y alguien que
 * lleva diez minutos tecleando una ficha necesita saberlo ANTES de pulsar
 * guardar, no despues.
 */
function EstadoPlataforma({ conectado }: { conectado: boolean }) {
  return (
    <Stack
      sx={{
        px: 2,
        py: 1.25,
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        gap: 0.25,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        Estado de la plataforma
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
        {/*
          El punto NO dice el estado por si solo: va siempre con su palabra.
          Es la misma regla que el resto del panel —un estado nunca se dice
          solo con color— y aqui importa doble, porque verde y rojo son
          justamente los dos que se confunden en deuteranopia.
        */}
        <CircleIcon
          sx={{ fontSize: 10, color: conectado ? 'success.main' : 'error.main' }}
        />
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
          {conectado ? 'Todos los servicios disponibles' : 'Sin conexion de red'}
        </Typography>
      </Stack>
    </Stack>
  );
}
