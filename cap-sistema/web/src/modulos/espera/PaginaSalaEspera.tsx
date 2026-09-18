import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { EncabezadoPagina } from '../../componentes/EncabezadoPagina';
import { usarSesion } from '../sesion/contexto';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { desde } from '../../navegacion/usarVolver';
import { fichaParaPaciente } from '../fichas/ficha-por-edad';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { PRIMARIO } from '../../tema';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import StethoscopeIcon from '@mui/icons-material/MonitorHeartOutlined';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { alpha } from '@mui/material/styles';
import { ARMAZON, ERROR } from '../../tema';
import {
  ESPERA_LARGA_MINUTOS,
  cambiarOrden,
  esperaEnPalabras,
  obtenerSalaDeEspera,
  retirarVisita,
  type VisitaEnEspera,
} from './servicio-espera';

const ATIENDEN = ['MEDICO', 'ENFERMERIA'];
const CIERRAN = ['RECEPCION', 'ADMINISTRADOR', 'ENFERMERIA'];
/** Quien ve llegar la emergencia o quien la va a atender. El director mira, no mueve. */
const MUEVEN = ['RECEPCION', 'ADMINISTRADOR', 'ENFERMERIA', 'MEDICO'];

/** Cada cuanto se vuelve a preguntar quien espera. */
const REFRESCO_MS = 30_000;

/**
 * Sala de espera: quien esta AHORA en el CAP.
 *
 * Es la pieza que faltaba, y la que separa dos trabajos que se estaban
 * confundiendo. Aqui hay cinco o diez personas sentadas y si no se atienden hoy
 * alguien se va sin consulta; en digitalizacion hay miles de carpetas que
 * pueden esperar meses. Mezclarlas haria que lo urgente se perdiera entre lo
 * que no lo es.
 *
 * Por eso esta pantalla no tiene filtros ni buscador: si hay ocho personas
 * esperando, se ven ocho renglones. Buscar en una lista de ocho es mas trabajo
 * que leerla.
 */
/**
 * Como se pinta cada opcion del menu.
 *
 * Un fondo tenue del color de la accion, no el color entero: el menu se abre
 * sobre la lista y tres bloques saturados se llevarian la atencion de lo que
 * hay debajo. Al 8 % se distinguen de un vistazo y siguen siendo fondo.
 *
 * Los colores son los del panel, no unos nuevos: el azul de las acciones
 * principales, el rojo de lo urgente y el verde azulado del armazon para lo
 * que solo cierra algo. Asi «al frente» se lee igual aqui que en el resto del
 * sistema.
 *
 * El texto va en el mismo color y con mas peso —no en gris— porque sobre un
 * fondo tenido el negro corriente se ve sucio.
 */
const opcion = (color: string) => ({
  mx: 0.75,
  my: 0.25,
  borderRadius: 2,
  bgcolor: alpha(color, 0.08),
  '&:hover': { bgcolor: alpha(color, 0.16) },
  '& .MuiListItemText-primary': { color, fontWeight: 600 },
});

/**
 * La canaleta de orden: subir, agarrar y bajar.
 *
 * Vive FUERA de la tarjeta. Dentro competia por el mismo renglon con el
 * nombre, la familia, la espera y los tres botones de accion, y eran las dos
 * cosas que menos se usan ocupando el centro de lo que mas se lee.
 *
 * Las tres piezas van juntas en una pastilla porque son la misma idea —cambiar
 * el turno— y separadas se leerian como tres controles sueltos. La pastilla se
 * apaga hasta que el raton entra en la fila: quien solo viene a mirar quien
 * sigue no necesita verlas.
 */
function ControlesDeOrden({
  nombre,
  primero,
  ultimo,
  ocupado,
  onSubir,
  onBajar,
  onTomar,
  onSoltar,
}: {
  nombre: string;
  primero: boolean;
  ultimo: boolean;
  ocupado: boolean;
  onSubir: () => void;
  onBajar: () => void;
  onTomar: () => void;
  onSoltar: () => void;
}) {
  return (
    <Stack
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        px: 0.25,
        borderRadius: 2,
        bgcolor: 'action.hover',
        // Se atenua hasta que el raton entra en la fila. La fila entera es el
        // disparador, no la pastilla: apuntar a algo que esta casi invisible
        // para que aparezca es un juego, no una interfaz.
        opacity: 0.45,
        transition: 'opacity .15s ease',
        '.MuiStack-root:hover > &': { opacity: 1 },
        '&:focus-within': { opacity: 1 },
      }}
    >
      <Tooltip title="Subir un puesto" placement="left">
        <span>
          <IconButton
            size="small"
            aria-label={'Subir un puesto a ' + nombre}
            disabled={primero || ocupado}
            onClick={onSubir}
            sx={{ p: 0.25, borderRadius: 1 }}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/*
        El asa: lo unico arrastrable de la fila.

        Arrastrar desde cualquier sitio chocaria con los botones —empezar un
        arrastre sobre «Atender» es como se pulsa sin querer— y ademas no
        habria nada que dijera que la fila se puede mover. El asa lo dice con
        su forma, y el cursor lo confirma antes de tocar nada.
      */}
      <Tooltip title="Arrastrar para cambiar el turno" placement="left">
        <Box
          draggable={!ocupado}
          onDragStart={onTomar}
          onDragEnd={onSoltar}
          data-asa
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            py: 0.25,
            color: 'text.disabled',
            cursor: ocupado ? 'default' : 'grab',
            '&:active': { cursor: 'grabbing' },
            '&:hover': { color: 'text.secondary' },
          }}
        >
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </Box>
      </Tooltip>

      <Tooltip title="Bajar un puesto" placement="left">
        <span>
          <IconButton
            size="small"
            aria-label={'Bajar un puesto a ' + nombre}
            disabled={ultimo || ocupado}
            onClick={onBajar}
            sx={{ p: 0.25, borderRadius: 1 }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

export function PaginaSalaEspera() {
  const { usuario } = usarSesion();
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  const [retirando, setRetirando] = useState<VisitaEnEspera | null>(null);
  const [motivo, setMotivo] = useState('');
  /*
    A donde se manda a alguien, y por que se esta preguntando.

    Antes esto era solo «adelantando»: un paciente que se pasaba al frente.
    Ahora hay dos caminos que cambian el turno y piden explicacion —el boton de
    «Al frente» y el arrastre— y los dos acaban en el mismo cuadro. Guardar el
    DESTINO, y no solo a quien se mueve, es lo que permite que sea uno solo:
    «al frente» es la posicion 1 y el arrastre es la que se solto.
  */
  const [justificando, setJustificando] = useState<{
    visita: VisitaEnEspera;
    posicion: number;
    origen: 'frente' | 'arrastre';
  } | null>(null);
  const [motivoPrioridad, setMotivoPrioridad] = useState('');

  /** De quien esta abierto el menu de acciones, y desde que boton. */
  const [menuDe, setMenuDe] = useState<{
    visita: VisitaEnEspera;
    indice: number;
    ancla: HTMLElement;
  } | null>(null);

  /** Quien se esta arrastrando y sobre quien esta, para dibujar donde va a caer. */
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const lista = useRef<HTMLDivElement>(null);

  const puedeAtender = ATIENDEN.includes(usuario?.rol ?? '');
  const puedeCerrar = CIERRAN.includes(usuario?.rol ?? '');
  const puedeMover = MUEVEN.includes(usuario?.rol ?? '');

  const espera = useQuery({
    queryKey: ['sala-espera'],
    queryFn: obtenerSalaDeEspera,
    // La sala cambia sola: llega gente mientras la enfermera atiende. Sin
    // refresco habria que recordar recargar, y nadie recuerda recargar.
    refetchInterval: REFRESCO_MS,
    refetchOnWindowFocus: true,
  });

  const retirar = useMutation({
    mutationFn: (datos: { id: string; motivo: string }) => retirarVisita(datos.id, datos.motivo),
    onSuccess: () => {
      setRetirando(null);
      setMotivo('');
      void clienteConsultas.invalidateQueries({ queryKey: ['sala-espera'] });
    },
  });

  /*
    Cambiar el turno. Llega una emergencia y hay que pasarla adelante; sin
    esto la unica forma seria que la enfermera la atendiera "por fuera" y la
    numeracion de la sala dejaria de decir la verdad.

    El servidor devuelve la sala ya renumerada, y se pone tal cual en la
    cache: pedirla otra vez seria una peticion mas para recibir lo mismo.
  */
  const mover = useMutation({
    mutationFn: (datos: { id: string; posicion: number; motivo?: string }) =>
      cambiarOrden(datos.id, datos.posicion, datos.motivo),
    onSuccess: (sala) => {
      setJustificando(null);
      setMotivoPrioridad('');
      clienteConsultas.setQueryData(['sala-espera'], sala);
    },
  });

  /*
    Abre la hoja que le toca por edad, no siempre la de adultos.

    Estaba escrita a mano: `/ficha` para todo el mundo, asi que a un recien
    nacido se le abria la de adolescente, adulto y adulto mayor. Cada hoja del
    MSPAS pregunta cosas distintas, y lo que se capture en la que no toca no
    tiene respaldo en ningun papel firmado.

    Se lleva ademas el origen: quien atiende desde la sala vuelve a la sala, no
    a recepcion, que es otro modulo y otra cola.
  */
  const atender = (v: VisitaEnEspera) => {
    const ficha = fichaParaPaciente(v.fechaNacimiento, v.pacienteId);
    // Sin pantalla todavia —la prenatal— queda el expediente, que es de donde
    // se puede seguir. Mandar a una ruta que no existe seria peor.
    navegar(ficha.ruta ?? '/pacientes/' + v.pacienteId + '/expediente', {
      state: desde('/espera', 'Sala de espera'),
    });
  };

  /*
    Arrastrar cerca del borde empuja la pagina.

    El navegador NO desplaza la pagina durante un arrastre propio: el puntero
    llega al filo de la ventana y ahi se acaba el viaje. Con ocho personas en la
    sala eso ya se nota —el ultimo no pasaba del tercer puesto— y con veinte
    haria el arrastre inservible justo cuando mas falta hace, que es el dia que
    la sala esta llena.

    Se empuja mientras el puntero se queda en la franja del borde, no solo
    cuando se mueve: sostenerlo arriba tiene que seguir subiendo. Por eso es un
    bucle de animacion y no algo colgado del propio evento, que deja de
    dispararse en cuanto la mano se detiene.

    La velocidad crece segun lo cerca del filo que este el puntero: rozar la
    franja desplaza despacio y pegarse al borde desplaza rapido, que es como se
    controla sin pasarse de largo.
  */
  const velocidad = useRef(0);

  useEffect(() => {
    if (arrastrando === null) return;

    const FRANJA = 90;
    const MAXIMO = 18;

    const alMover = (e: DragEvent) => {
      const alto = window.innerHeight;
      if (e.clientY < FRANJA) {
        velocidad.current = -Math.ceil(((FRANJA - e.clientY) / FRANJA) * MAXIMO);
      } else if (e.clientY > alto - FRANJA) {
        velocidad.current = Math.ceil(((e.clientY - (alto - FRANJA)) / FRANJA) * MAXIMO);
      } else {
        velocidad.current = 0;
      }
    };

    let cuadro = 0;
    const empujar = () => {
      if (velocidad.current !== 0) window.scrollBy(0, velocidad.current);
      cuadro = requestAnimationFrame(empujar);
    };
    cuadro = requestAnimationFrame(empujar);
    document.addEventListener('dragover', alMover);

    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener('dragover', alMover);
      velocidad.current = 0;
    };
  }, [arrastrando]);

  /*
    Soltar a alguien en otra posicion SIEMPRE pide explicacion.

    Con las flechas no: mover un puesto es un ajuste menudo —alguien salio al
    bano y se deja pasar al de atras— y pedir un motivo por cada toque acabaria
    en «ok» escrito cien veces, que es no pedir nada.

    Arrastrar es otra cosa: se usa para saltarse varios puestos de una vez, y
    ahi hay gente que llevaba rato esperando y pierde su turno. Preguntarlo en
    el momento es lo unico que hace que quede escrito: confiar en que la
    enfermera vuelva luego a anotarlo es confiar en que se acuerde en el unico
    rato del dia en que la sala esta llena.
  */
  function soltarEn(destino: number) {
    const origen = arrastrando;
    setArrastrando(null);
    setSobre(null);
    if (origen === null || origen === destino) return;

    setMotivoPrioridad('');
    setJustificando({ visita: gente[origen], posicion: destino + 1, origen: 'arrastre' });
  }

  // Ctrl+J lleva el foco a la lista, igual que en digitalizacion.
  usarAtajo('j', () => {
    lista.current?.querySelector<HTMLElement>('[data-fila]')?.focus();
  });

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const filas = Array.from(lista.current?.querySelectorAll<HTMLElement>('[data-fila]') ?? []);
    const actual = filas.indexOf(document.activeElement as HTMLElement);
    if (actual === -1) return;

    const paso = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (paso !== 0) {
      e.preventDefault();
      filas[Math.min(Math.max(actual + paso, 0), filas.length - 1)]?.focus();
      return;
    }
    if (e.key === 'Enter' && puedeAtender) {
      e.preventDefault();
      atender(espera.data![actual]);
    }
  }

  const gente = espera.data ?? [];

  return (
    <Box>
      <EncabezadoPagina
        titulo="Sala de espera"
        descripcion={
          puedeAtender
            ? 'Quienes llegaron hoy y todavia no tienen ficha. En orden de llegada.'
            : 'Quienes llegaron hoy y esperan ser atendidos.'
        }
        acciones={
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
            {espera.isFetching ? (
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Actualizando...
              </Typography>
            ) : null}
            {puedeAtender ? (
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Flechas y Enter para atender
              </Typography>
            ) : null}
          </Stack>
        }
      />

      {espera.isError ? <AvisoError error={espera.error} /> : null}
      {retirar.isError ? (
        <Box sx={{ mb: 2 }}>
          <AvisoError error={retirar.error} />
        </Box>
      ) : null}
      {mover.isError ? (
        <Box sx={{ mb: 2 }}>
          <AvisoError error={mover.error} />
        </Box>
      ) : null}

      {espera.isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : gente.length === 0 ? (
        <Alert severity="info">
          No hay nadie esperando. Recepcion marca la llegada de cada paciente al entrar.
        </Alert>
      ) : (
        <Stack ref={lista} onKeyDown={alTeclear} sx={{ gap: 1 }}>
          {gente.map((v, i) => {
            const mucho = v.esperandoMinutos >= ESPERA_LARGA_MINUTOS;
            const urgente = Boolean(v.motivoPrioridad);
            const seArrastra = arrastrando === i;
            const caeAqui = sobre === i && arrastrando !== null && arrastrando !== i;

            return (
              <Stack
                key={v.id}
                direction="row"
                sx={{ gap: 1, alignItems: 'stretch' }}
                onDragOver={(e) => {
                  if (arrastrando === null) return;
                  // Sin esto el navegador no considera la fila un destino
                  // valido y no llega a dispararse el soltar.
                  e.preventDefault();
                  setSobre(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  soltarEn(i);
                }}
              >
                {/*
                  Las flechas van FUERA de la tarjeta.

                  Dentro competian por el mismo renglon con el nombre, el
                  numero de familia, la espera, «Al frente», «Se fue» y
                  «Atender»: siete cosas en una fila, y las dos que menos se
                  usan ocupando el centro. Aqui al margen siguen a mano y dejan
                  la tarjeta para lo que se lee.

                  Son ademas el camino accesible: arrastrar con el raton no
                  sirve con teclado ni con lector de pantalla, asi que las
                  flechas no son un adorno que se pueda quitar cuando el
                  arrastre funcione.
                */}
                {puedeMover && gente.length > 1 ? (
                  <ControlesDeOrden
                    nombre={v.nombres + ' ' + v.apellidos}
                    primero={i === 0}
                    ultimo={i === gente.length - 1}
                    ocupado={mover.isPending}
                    onSubir={() => mover.mutate({ id: v.id, posicion: i })}
                    onBajar={() => mover.mutate({ id: v.id, posicion: i + 2 })}
                    onTomar={() => setArrastrando(i)}
                    onSoltar={() => {
                      setArrastrando(null);
                      setSobre(null);
                    }}
                  />
                ) : null}

                <Paper
                  data-fila
                  tabIndex={0}
                  elevation={0}
                  onDoubleClick={() => (puedeAtender ? atender(v) : undefined)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid',
                    // Adelantado con motivo manda sobre la espera larga: es lo
                    // que hay que ver primero al entrar.
                    borderColor: urgente ? 'error.main' : mucho ? 'warning.main' : 'divider',
                    borderRadius: 0,
                    p: 1.5,
                    cursor: puedeAtender ? 'pointer' : 'default',
                    // Lo que se arrastra se apaga; donde va a caer se marca con
                    // una linea arriba. Sin esas dos senales, soltar es a ciegas.
                    opacity: seArrastra ? 0.4 : 1,
                    boxShadow: caeAqui ? 'inset 0 3px 0 0 ' + PRIMARIO : 'none',
                    transition: 'opacity .12s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  sx={{ gap: 1.5, alignItems: { md: 'center' } }}
                >
                  {/* El turno: es lo que la gente cuenta desde la silla. */}
                  <Typography
                    aria-hidden
                    sx={{
                      minWidth: 32,
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {i + 1}
                  </Typography>

                  <Stack sx={{ flex: 1, minWidth: 0, gap: 0.25 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {v.apellidos}, {v.nombres}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {v.edad} anos · {v.sexo === 'F' ? 'Femenino' : 'Masculino'} · {v.comunidad}
                      {v.numeroExpediente ? (
                        <>
                          {' · '}
                          <Box component="span" sx={{ fontFamily: 'monospace' }}>
                            {v.numeroExpediente}
                          </Box>
                        </>
                      ) : null}
                    </Typography>
                    {v.motivo ? (
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {v.motivo}
                      </Typography>
                    ) : null}
                  </Stack>

                  {/*
                    Por que se le paso adelante, a la vista de todos los que
                    miran la lista: quien lleva una hora sentado merece saber
                    por que alguien paso antes.
                  */}
                  {urgente ? (
                    <Chip size="small" color="error" label={'Urgente · ' + v.motivoPrioridad} />
                  ) : null}

                  {/*
                    El numero de la carpeta familiar, junto al tiempo de
                    espera.

                    Es con lo que se pide el expediente en el archivo, asi que
                    va donde ya se mira la fila —a la derecha, con el turno y
                    la espera— y no enterrado en la linea de datos: quien
                    atiende lo lee de un vistazo y manda a buscar el folder
                    antes de que le toque el turno.

                    Quien no tiene carpeta no muestra nada. Un "No. -" ocuparia
                    el mismo sitio para decir que no hay dato.
                  */}
                  {v.familiaNumero !== null ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                    >
                      Familia No. {v.familiaNumero}
                    </Typography>
                  ) : null}

                  <Chip
                    size="small"
                    label={esperaEnPalabras(v.esperandoMinutos)}
                    color={mucho ? 'warning' : 'default'}
                    variant={mucho ? 'filled' : 'outlined'}
                  />

                {/*
                      Un solo boton por fila, y dentro las tres acciones.

                    Con los tres a la vista cada fila era una barra de
                    herramientas: ocupaban mas que el nombre del paciente y, al
                    variar cuales aparecen segun el rol y la posicion, las
                    tarjetas quedaban de anchos distintos y la lista se veia
                    torcida. Uno solo, del mismo tamano en todas las filas, las
                    alinea.

                    Y por eso vuelve DENTRO de la tarjeta: sacar tres botones
                    fuera era lo que descargaba la fila, pero uno solo no la
                    satura, y afuera dejaba a la tarjeta con un hueco a la
                    derecha que no decia nada.

                    «Atender» pierde un clic, y por eso siguen los dos atajos
                    que ya existian: doble clic en la tarjeta, y Enter con la
                    fila enfocada. Quien atiende todo el dia usa esos.
                  */}
                  {puedeAtender || puedeCerrar || (puedeMover && gente.length > 1 && i > 0) ? (
                    <Stack sx={{ justifyContent: 'center', flexShrink: 0 }}>
                      <Tooltip title="Acciones" describeChild>
                        <IconButton
                          size="small"
                          aria-label={'Acciones para ' + v.nombres + ' ' + v.apellidos}
                          onClick={(e) => setMenuDe({ visita: v, indice: i, ancla: e.currentTarget })}
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: 2,
                            color: PRIMARIO,
                            bgcolor: alpha(PRIMARIO, 0.08),
                            border: '1px solid',
                            borderColor: alpha(PRIMARIO, 0.22),
                            transition: 'background-color .15s ease, transform .15s ease',
                            '&:hover': { bgcolor: alpha(PRIMARIO, 0.16) },
                            // El galon se da la vuelta con el menu abierto: dice
                            // que lo que se despliega sale de aqui, y que
                            // volver a pulsar lo cierra.
                            '& svg': {
                              transition: 'transform .18s ease',
                              transform: menuDe?.visita.id === v.id ? 'rotate(180deg)' : 'none',
                            },
                          }}
                        >
                          <ExpandMoreRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : null}

                  </Stack>
                </Paper>
              </Stack>
            );
          })}
        </Stack>
      )}

      {/*
        El menu de acciones, uno solo para toda la lista.

        Dibujar un menu por fila costaria tantos portales como pacientes haya
        en la sala, y solo uno puede estar abierto a la vez. Se guarda de quien
        es y desde que boton se abrio.
      */}
      <Menu
        anchorEl={menuDe?.ancla ?? null}
        open={Boolean(menuDe)}
        onClose={() => setMenuDe(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 232, py: 0.5 } } }}
      >
        {menuDe && puedeAtender ? (
          <MenuItem
            onClick={() => {
              const v = menuDe.visita;
              setMenuDe(null);
              atender(v);
            }}
          
            sx={opcion(PRIMARIO)}
          >
            <ListItemIcon sx={{ color: PRIMARIO }}>
              <StethoscopeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Atender" secondary="Abre su ficha" />
          </MenuItem>
        ) : null}

        {menuDe && puedeMover && gente.length > 1 && menuDe.indice > 0 ? (
          <MenuItem
            disabled={mover.isPending}
            onClick={() => {
              const v = menuDe.visita;
              setMenuDe(null);
              setMotivoPrioridad('');
              setJustificando({ visita: v, posicion: 1, origen: 'frente' });
            }}
          
            sx={opcion(ERROR)}
          >
            <ListItemIcon sx={{ color: ERROR }}>
              <KeyboardDoubleArrowUpIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Al frente" secondary="Pide el motivo" />
          </MenuItem>
        ) : null}

        {menuDe && puedeCerrar ? [
          <Divider key="sep" />,
          <MenuItem
            key="se-fue"
            sx={opcion(ARMAZON)}
            onClick={() => {
              const v = menuDe.visita;
              setMenuDe(null);
              setMotivo('');
              setRetirando(v);
            }}
          >
            <ListItemIcon sx={{ color: ARMAZON }}>
              <PersonOffOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Se fue" secondary="Sin ser atendido" />
          </MenuItem>,
        ] : null}
      </Menu>

      {/*
        Un solo cuadro para los dos caminos que cambian el turno.

        Dice a donde va la persona, porque al arrastrar no siempre es al frente
        y «se adelanta» a secas no describiria lo que se acaba de hacer. Al
        cancelar no se mueve nada: la lista se queda como estaba, que es lo que
        espera quien solto sin querer.
      */}
      {justificando ? (
        <Dialog open onClose={() => setJustificando(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {justificando.visita.apellidos}, {justificando.visita.nombres}
          </DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {justificando.posicion === 1
                  ? 'Pasa al frente de la sala.'
                  : 'Pasa al puesto ' + justificando.posicion + ' de la sala.'}{' '}
                El motivo se ve en la lista, para que quien lleva rato esperando sepa por que.
              </Typography>
              <TextField
                label="Por que cambia de turno *"
                autoFocus
                value={motivoPrioridad}
                onChange={(e) => setMotivoPrioridad(e.target.value)}
                placeholder="Dolor de pecho, sangrado, fiebre alta en un bebe..."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setJustificando(null)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={motivoPrioridad.trim().length < 3 || mover.isPending}
              onClick={() =>
                mover.mutate({
                  id: justificando.visita.id,
                  posicion: justificando.posicion,
                  motivo: motivoPrioridad.trim(),
                })
              }
            >
              {mover.isPending
                ? 'Guardando...'
                : justificando.posicion === 1
                  ? 'Pasar al frente'
                  : 'Cambiar el turno'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {retirando ? (
        <Dialog open onClose={() => setRetirando(null)} fullWidth maxWidth="sm">
          <DialogTitle>
            {retirando.apellidos}, {retirando.nombres}
          </DialogTitle>
          <DialogContent>
            <Stack sx={{ gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Sale de la sala sin ficha. Queda registrado, con el motivo.
              </Typography>
              <TextField
                label="Que paso *"
                autoFocus
                multiline
                minRows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                helperText='"Se fue" no le sirve a nadie dentro de un mes: diga si se canso de esperar o si lo mandaron a otro lado'
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setRetirando(null)}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={motivo.trim().length < 3 || retirar.isPending}
              onClick={() => retirar.mutate({ id: retirando.id, motivo: motivo.trim() })}
            >
              {retirar.isPending ? 'Guardando...' : 'Sacar de la lista'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Box>
  );
}
