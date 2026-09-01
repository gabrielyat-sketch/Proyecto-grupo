import { useMemo, useState, type ReactNode } from 'react';
import { Link as EnlaceRuta, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  ListSubheader,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { usarAtajo } from '../../navegacion/usarAtajo';
import {
  crearPaciente,
  listarComunidades,
  listarLugares,
  type PacienteCreado,
} from './servicio-pacientes';
import { MENU_FILTRO } from '../../componentes/menuFiltro';
import { PRIMARIO } from '../../tema';
import { NotaPagina } from '../../componentes/EncabezadoPagina';
import {
  buscarCarpetas,
  rotuloDeCarpeta,
  siguienteNumeroDeCarpeta,
} from './servicio-carpetas';

const IDIOMAS = [
  { valor: 'ESPANOL', etiqueta: 'Espanol' },
  { valor: 'POQOMCHI', etiqueta: 'Poqomchi' },
  { valor: 'QEQCHI', etiqueta: 'Qeqchi' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

const hoy = () => new Date().toISOString().slice(0, 10);


/**
 * Reglas identicas a CrearPacienteDto del backend.
 *
 * El DPI es OPCIONAL a proposito: los ninos y buena parte de la poblacion rural
 * de Purulha no lo tienen. Exigirlo dejaria fuera del sistema justo a quienes
 * mas atiende el CAP.
 */
const esquema = z.object({
  dpi: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[0-9]{13}$/.test(v), 'El DPI debe tener exactamente 13 digitos'),
  nombres: z.string().trim().min(1, 'Escriba los nombres').max(120),
  apellidos: z.string().trim().min(1, 'Escriba los apellidos').max(120),
  fechaNacimiento: z
    .string()
    .min(1, 'Indique la fecha de nacimiento')
    .refine((v) => v <= hoy(), 'La fecha no puede estar en el futuro'),
  sexo: z.enum(['M', 'F']),
  idioma: z.enum(['ESPANOL', 'POQOMCHI', 'QEQCHI', 'OTRO']),
  comunidadId: z.string().min(1, 'Elija la comunidad'),
  telefono: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (v.length >= 8 && v.length <= 20),
      'El telefono debe tener 8 digitos o mas',
    ),
  numeroExpediente: z.string().trim().max(40),
  digitalizado: z.boolean(),

  /**
   * El barrio, caserío o aldea. Opcional porque hay comunidades cuyos lugares
   * el CAP todavía no ha declarado, y exigirlo impediría registrar a alguien
   * por un catálogo incompleto.
   */
  lugarId: z.string(),

  /**
   * La carpeta familiar del archivero.
   *
   * '' es "no se dijo", y se acepta: hay altas —una digitalizacion de
   * expedientes viejos— donde todavia no se sabe en que folder va la persona,
   * y bloquear el registro por eso dejaria al paciente fuera del sistema.
   */
  carpetaExiste: z.enum(['', 'SI', 'NO']),
  /** El apellido con que se rotula el folder: «Familia Lopez Ac». */
  familia: z.string().trim().max(120),
  /** El numero de la pestana. Texto en el formulario, entero al enviar. */
  carpetaNumero: z.string().trim(),
  /** La carpeta elegida cuando ya existe. */
  grupoFamiliarId: z.string(),

  migrante: z.boolean(),
  lugarOrigen: z.string().trim().max(160),

  /**
   * Tres estados, no dos. '' es "no se preguntó", que NO es lo mismo que "no
   * tiene": a quien no se le preguntó hay que preguntarle antes de recetar.
   */
  tieneAlergias: z.enum(['', 'SI', 'NO']),
  alergias: z.string().trim().max(500),
});

type Campos = z.infer<typeof esquema>;

/** El orden en que la gente nombra los lugares, de lo grande a lo pequeno. */
const ORDEN_GRUPOS = ['ALDEA', 'BARRIO', 'CASERIO', 'OTRO'];

/** En plural, porque titula un grupo y no una fila. */
const ETIQUETA_GRUPO_LUGAR: Record<string, string> = {
  ALDEA: 'Aldeas',
  BARRIO: 'Barrios',
  CASERIO: 'Caserios',
  OTRO: 'Otros',
};

/**
 * Titulo de un bloque del formulario.
 *
 * Antes eran una linea separadora y un texto gris del mismo tamano que las
 * etiquetas de los campos: separaba, pero no agrupaba, y el formulario se leia
 * como veinte cajas seguidas. La barra de color es lo que deja ver donde
 * empieza cada bloque sin leerlos.
 *
 * Es un `h2` de verdad y no un texto en negrita: quien usa lector de pantalla
 * puede saltar de bloque en bloque en vez de recorrer los veinte campos.
 */
function TituloSeccion({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mt: 1 }}>
      <Box sx={{ width: 4, height: 20, borderRadius: 4, bgcolor: PRIMARIO, flexShrink: 0 }} />
      <Typography
        component="h2"
        sx={{
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

export function PaginaNuevoPaciente() {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const [creado, setCreado] = useState<PacienteCreado | null>(null);

  const comunidades = useQuery({
    queryKey: ['comunidades'],
    queryFn: listarComunidades,
    staleTime: 30 * 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    setFocus,
    formState: { errors },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      dpi: '',
      nombres: '',
      apellidos: '',
      fechaNacimiento: '',
      sexo: 'F',
      idioma: 'ESPANOL',
      comunidadId: '',
      telefono: '',
      numeroExpediente: '',
      digitalizado: false,
      lugarId: '',
      carpetaExiste: '',
      familia: '',
      carpetaNumero: '',
      grupoFamiliarId: '',
      migrante: false,
      lugarOrigen: '',
      tieneAlergias: '',
      alergias: '',
    },
  });

  // La comunidad manda sobre los lugares: no tiene sentido ofrecer los barrios
  // de Purulha Centro a alguien que vive en Chilasco.
  const comunidadId = watch('comunidadId');
  const migrante = watch('migrante');
  const tieneAlergias = watch('tieneAlergias');

  const lugares = useQuery({
    queryKey: ['lugares', comunidadId],
    queryFn: () => listarLugares(comunidadId),
    enabled: comunidadId !== '',
    staleTime: 30 * 60_000,
  });

  const carpetaExiste = watch('carpetaExiste');
  const familia = watch('familia');
  const lugarId = watch('lugarId');

  /*
    El siguiente numero libre, para no tener que ir al archivero a mirarlo.

    Depende del lugar y no solo de la comunidad: el CAP numera por barrio y
    caserio, asi que el «siguiente» de El Calvario no es el de San Jose. Solo
    se pide cuando hace falta —al abrir una carpeta nueva—, porque en el otro
    camino nadie lo va a leer.
  */
  const siguienteNumero = useQuery({
    queryKey: ['siguiente-numero-carpeta', comunidadId, lugarId],
    queryFn: () => siguienteNumeroDeCarpeta(comunidadId, lugarId || undefined),
    enabled: comunidadId !== '' && carpetaExiste === 'NO',
    staleTime: 0,
  });

  /*
    Las carpetas que coinciden, cuando la familia ya tiene una.

    Se piden desde dos letras: con una sola, en un caserio entero, la lista
    seria casi todo el archivero y no ayudaria a elegir.
  */
  const carpetas = useQuery({
    queryKey: ['carpetas', comunidadId, lugarId, familia.trim()],
    queryFn: () => buscarCarpetas(comunidadId, familia.trim(), lugarId || undefined),
    enabled: comunidadId !== '' && carpetaExiste === 'SI' && familia.trim().length >= 2,
  });

  /*
    Los lugares, repartidos por tipo y en el orden en que la gente los nombra.

    Un tipo que no este en la lista de orden no se pierde: cae al final con su
    propio titulo. Perder un lugar del listado significaria que a alguien no se
    le puede registrar donde vive.
  */
  const gruposDeLugares = useMemo(() => {
    const lista = lugares.data ?? [];
    const posicion = (t: string) => {
      const i = ORDEN_GRUPOS.indexOf(t);
      return i === -1 ? ORDEN_GRUPOS.length : i;
    };
    return [...new Set(lista.map((l) => l.tipo))]
      .sort((a, b) => posicion(a) - posicion(b))
      .map((tipo) => ({ tipo, lugares: lista.filter((l) => l.tipo === tipo) }));
  }, [lugares.data]);

  const alta = useMutation({
    mutationFn: crearPaciente,
    onSuccess: (r) => {
      setCreado(r);
      // Los resultados de busqueda guardados quedaron obsoletos: acaba de haber
      // un paciente mas. Sin esto, buscar un nombre que se consulto ANTES de
      // registrarlo devuelve el resultado vacio guardado, y el paciente parece
      // no existir aunque si se creo.
      void clienteConsultas.invalidateQueries({ queryKey: ['pacientes'] });
      // Se limpia para el siguiente: al digitalizar se cargan expedientes uno
      // tras otro, y volver a la lista entre cada uno partiria el ritmo.
      reset();
      setFocus('nombres');
      /*
        Y sube al aviso, deslizandose.

        El formulario es largo: el boton de registrar esta al final y el aviso
        con el numero de expediente sale arriba del todo. Sin esto se quedaba
        abajo, mirando un formulario ya vacio, sin senal de que hubiera pasado
        nada —y el numero de expediente, que hay que anotar en la carpeta de
        papel, fuera de la pantalla.

        Deslizandose y no de golpe: aqui la pantalla NO cambia, y ver el
        recorrido es lo que explica que el aviso estaba arriba.
      */
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  function enviar(campos: Campos) {
    setCreado(null);

    /*
      O la carpeta ya existe y se dice cual, o no existe y se dice como
      llamarla. Nunca las dos: el servidor tomaria una y la otra quedaria
      escrita sin efecto, que es peor que un error.

      La carpeta nueva se abre en la MISMA transaccion del alta. Hacerlo en dos
      llamadas dejaria, si el alta falla, un folder vacio ocupando un numero
      del archivero.
    */
    const carpeta =
      campos.carpetaExiste === 'SI' && campos.grupoFamiliarId
        ? { grupoFamiliarId: campos.grupoFamiliarId }
        : campos.carpetaExiste === 'NO' && campos.familia
          ? {
              carpetaNueva: {
                apellidos: campos.familia,
                ...(campos.carpetaNumero ? { numero: Number(campos.carpetaNumero) } : {}),
              },
            }
          : {};
    alta.mutate({
      ...(campos.dpi ? { dpi: campos.dpi } : {}),
      nombres: campos.nombres,
      apellidos: campos.apellidos,
      // El campo de fecha entrega 'aaaa-mm-dd' y se manda tal cual. Construir un
      // Date aqui le sumaria la zona horaria del navegador, y en Guatemala
      // (UTC-6) eso mueve la fecha al dia anterior.
      fechaNacimiento: campos.fechaNacimiento,
      sexo: campos.sexo,
      idioma: campos.idioma,
      comunidadId: campos.comunidadId,
      ...(campos.telefono ? { telefono: campos.telefono } : {}),
      ...(campos.numeroExpediente ? { numeroExpediente: campos.numeroExpediente } : {}),
      digitalizado: campos.digitalizado,
      ...(campos.lugarId ? { lugarId: campos.lugarId } : {}),
      migrante: campos.migrante,
      ...(campos.lugarOrigen ? { lugarOrigen: campos.lugarOrigen } : {}),
      // Sin respuesta no viaja el campo: en el servidor queda como "no se
      // pregunto", que no es lo mismo que "no tiene".
      ...(campos.tieneAlergias ? { tieneAlergias: campos.tieneAlergias === 'SI' } : {}),
      ...(campos.tieneAlergias === 'SI' && campos.alergias
        ? { alergias: campos.alergias }
        : {}),
      ...carpeta,
    } as never);
  }

  // Ctrl+Enter guarda sin ir al boton (arquitectura 7.2).
  usarAtajo('Enter', () => void handleSubmit(enviar)());

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Registrar paciente
        </Typography>
        <Typography color="text.secondary">
          Se abre su expediente automaticamente. Los campos sin asterisco pueden quedar vacios.
        </Typography>
      </Stack>

      {creado ? (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          action={
            <Button component={EnlaceRuta} to="/recepcion" size="small">
              Ir a buscar
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Paciente registrado. Numero de expediente:{' '}
            <Box component="span" sx={{ fontFamily: 'monospace' }}>
              {creado.numeroExpediente}
            </Box>
          </Typography>
          <Typography variant="caption">
            Anotelo en la carpeta de papel. El formulario quedo listo para el siguiente.
          </Typography>
        </Alert>
      ) : null}

      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit(enviar)}
        onChange={() => {
          clearErrors();
          alta.reset();
        }}
        noValidate
        sx={{
          p: { xs: 2.5, md: 4 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Stack spacing={3}>
          {alta.isError ? <AvisoError error={alta.error} /> : null}

          <TituloSeccion>Datos de la persona</TituloSeccion>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Nombres *"
              autoFocus
              fullWidth
              error={Boolean(errors.nombres)}
              helperText={errors.nombres?.message}
              {...register('nombres')}
            />
            <TextField
              label="Apellidos *"
              fullWidth
              error={Boolean(errors.apellidos)}
              helperText={errors.apellidos?.message}
              {...register('apellidos')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="DPI"
              fullWidth
              inputMode="numeric"
              error={Boolean(errors.dpi)}
              helperText={
                errors.dpi?.message ?? 'Opcional: ninos y parte de la poblacion no lo tienen'
              }
              {...register('dpi')}
            />
            <TextField
              label="Telefono"
              fullWidth
              inputMode="tel"
              error={Boolean(errors.telefono)}
              helperText={errors.telefono?.message ?? 'Opcional'}
              {...register('telefono')}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Fecha de nacimiento *"
              type="date"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy() } }}
              error={Boolean(errors.fechaNacimiento)}
              helperText={errors.fechaNacimiento?.message}
              {...register('fechaNacimiento')}
            />
            <TextField
              select
              label="Sexo *"
              fullWidth
              defaultValue="F"
              error={Boolean(errors.sexo)}
              helperText={errors.sexo?.message}
              {...register('sexo')}
            >
              <MenuItem value="F">Femenino</MenuItem>
              <MenuItem value="M">Masculino</MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Comunidad *"
              fullWidth
              defaultValue=""
              error={Boolean(errors.comunidadId)}
              helperText={errors.comunidadId?.message}
              slotProps={{ select: { MenuProps: MENU_FILTRO } }}
              {...register('comunidadId')}
            >
              {(comunidades.data ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Idioma de atencion *"
              fullWidth
              defaultValue="ESPANOL"
              {...register('idioma')}
            >
              {IDIOMAS.map((i) => (
                <MenuItem key={i.valor} value={i.valor}>
                  {i.etiqueta}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {/*
            El barrio, caserío o aldea. La comunidad sola no basta para
            encontrar a nadie: "Purulhá Centro" son varios barrios, y quien va
            a buscar a un paciente a su casa necesita saber cuál.

            La lista depende de la comunidad elegida: no tiene sentido ofrecer
            los barrios de Purulhá Centro a alguien que vive en Chilasco.
          */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Barrio, caserío o aldea"
              fullWidth
              value={watch('lugarId')}
              onChange={(e) => setValue('lugarId', e.target.value)}
              disabled={comunidadId === '' || lugares.isPending}
              helperText={
                comunidadId === ''
                  ? 'Elija primero la comunidad'
                  : lugares.isPending
                    ? 'Consultando...'
                    : (lugares.data ?? []).length === 0
                      ? 'Esa comunidad todavía no tiene lugares registrados en el sistema'
                      : 'Opcional'
              }
            >
              <MenuItem value="">Sin especificar</MenuItem>
              {/*
                Agrupados por tipo, con su titulo.

                Purulha Centro son siete barrios y cuarenta y seis caserios en
                una sola lista. Escribir el tipo delante de cada nombre
                —«Caserio: Sacsamani»— lo decia, pero habia que leer renglon
                por renglon para ver donde terminaba una cosa y empezaba la
                otra, y esa palabra repetida cuarenta y seis veces es lo
                primero que lee el ojo en cada linea, antes que el nombre, que
                es lo que se venia a buscar. Dicho una vez arriba, el nombre
                queda solo.
              */}
              {gruposDeLugares.flatMap((grupo) => [
                <ListSubheader
                  key={'grupo-' + grupo.tipo}
                  sx={{
                    fontWeight: 700,
                    color: 'text.primary',
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                    lineHeight: 2.6,
                  }}
                >
                  {ETIQUETA_GRUPO_LUGAR[grupo.tipo] ?? grupo.tipo}
                </ListSubheader>,
                ...grupo.lugares.map((l) => (
                  <MenuItem key={l.id} value={l.id} sx={{ pl: 3 }}>
                    {l.nombre}
                  </MenuItem>
                )),
              ])}
            </TextField>
          </Stack>

          <TituloSeccion>Carpeta familiar</TituloSeccion>

          {/*
            El CAP no archiva por persona sino por FAMILIA: un folder de carton
            con un numero en la pestana, rotulado con el apellido y guardado
            por el lugar donde vive. Registrar a alguien es meterlo en su
            carpeta, y el sistema no lo recogia.

            Va DESPUES de la comunidad y el barrio a proposito: la carpeta se
            guarda donde vive la familia, asi que esos dos datos tienen que
            estar puestos antes de poder decir cual carpeta es o que numero le
            toca.
          */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="¿Existe la carpeta?"
              sx={{ minWidth: 240 }}
              value={carpetaExiste}
              onChange={(e) => {
                setValue('carpetaExiste', e.target.value as '' | 'SI' | 'NO');
                // Lo elegido en el otro camino deja de valer: la carpeta
                // marcada no es la que se va a crear, ni al reves.
                setValue('grupoFamiliarId', '');
                setValue('carpetaNumero', '');
              }}
              disabled={comunidadId === ''}
              helperText={
                comunidadId === ''
                  ? 'Elija primero la comunidad'
                  : 'Dejarlo sin responder registra al paciente sin carpeta'
              }
            >
              <MenuItem value="">No se preguntó</MenuItem>
              <MenuItem value="SI">Sí, ya existe</MenuItem>
              <MenuItem value="NO">No, hay que abrirla</MenuItem>
            </TextField>

            {carpetaExiste !== '' ? (
              <TextField
                label="Familia"
                fullWidth
                value={familia}
                onChange={(e) => setValue('familia', e.target.value)}
                error={Boolean(errors.familia)}
                helperText={
                  errors.familia?.message ??
                  (carpetaExiste === 'SI'
                    ? 'Escriba el apellido para buscar la carpeta'
                    : 'El apellido con que se rotula: «Familia López Ac»')
                }
              />
            ) : null}

            {carpetaExiste === 'NO' ? (
              <TextField
                label="No. de carpeta"
                sx={{ minWidth: 200 }}
                value={watch('carpetaNumero')}
                onChange={(e) =>
                  setValue('carpetaNumero', e.target.value.replace(/[^0-9]/g, ''))
                }
                placeholder={
                  siguienteNumero.data !== undefined ? String(siguienteNumero.data) : ''
                }
                helperText={
                  siguienteNumero.isPending
                    ? 'Consultando...'
                    : siguienteNumero.data !== undefined
                      ? 'Siguiente libre aquí: ' + siguienteNumero.data
                      : 'El número escrito en la pestaña del folder'
                }
              />
            ) : null}
          </Stack>

          {/*
            Cuando la carpeta ya existe hay que ELEGIRLA, no adivinarla.

            Dos familias del mismo apellido pueden vivir en el mismo caserio
            sin ser parientes. Meter a alguien en la carpeta equivocada mezcla
            dos historias clinicas, y eso no se nota hasta que alguien lee un
            antecedente que no es de quien tiene delante.
          */}
          {carpetaExiste === 'SI' ? (
            <Stack spacing={1}>
              {familia.trim().length < 2 ? (
                <NotaPagina>Escriba al menos dos letras del apellido para buscar.</NotaPagina>
              ) : carpetas.isPending ? (
                <NotaPagina>Buscando carpetas...</NotaPagina>
              ) : (carpetas.data ?? []).length === 0 ? (
                <Alert severity="warning">
                  No hay ninguna carpeta de «{familia.trim()}» en ese lugar. Si es la primera vez
                  que viene esta familia, marque «No, hay que abrirla».
                </Alert>
              ) : (
                <TextField
                  select
                  label="¿Cuál carpeta?"
                  fullWidth
                  value={watch('grupoFamiliarId')}
                  onChange={(e) => setValue('grupoFamiliarId', e.target.value)}
                  error={Boolean(errors.grupoFamiliarId)}
                  helperText={errors.grupoFamiliarId?.message ?? 'Elija el folder donde va la ficha'}
                >
                  {(carpetas.data ?? []).map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {rotuloDeCarpeta(c) +
                        ' · ' +
                        (c.integrantes === 1 ? '1 integrante' : c.integrantes + ' integrantes')}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          ) : null}

          <TituloSeccion>Procedencia</TituloSeccion>

          {/*
            Población migrante. Las cuatro fichas oficiales lo preguntan: al CAP
            llega gente que no es de Purulhá, y saber de dónde viene importa
            para el seguimiento y para lo que el CAP reporta al MSPAS.
          */}
          <Stack spacing={1}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { md: 'center' } }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={migrante}
                    onChange={(e) => setValue('migrante', e.target.checked)}
                  />
                }
                label="No es de Purulhá (población migrante)"
              />
              {migrante ? (
                <TextField
                  label="Lugar de origen"
                  fullWidth
                  error={Boolean(errors.lugarOrigen)}
                  helperText={errors.lugarOrigen?.message ?? 'De dónde viene'}
                  {...register('lugarOrigen')}
                />
              ) : null}
            </Stack>
          </Stack>

          <TituloSeccion>Alergias a medicamentos</TituloSeccion>

          {/*
            Alergias a medicamentos.

            Se pregunta en RECEPCIÓN y no dentro de la ficha clínica: es el dato
            que evita recetar algo que puede matar a alguien, y para entonces la
            receta ya está escrita.

            Son TRES estados, no dos. "No se preguntó" NO es lo mismo que "no
            tiene": a quien no se le preguntó hay que preguntarle antes de
            recetar, y a quien dijo que no, no. Un simple sí/no perdería esa
            diferencia, que es justo la que importa.
          */}
          <Stack spacing={1}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { md: 'flex-start' } }}
            >
              <TextField
                select
                label="¿Es alérgico a algún medicamento?"
                sx={{ minWidth: 280 }}
                value={tieneAlergias}
                onChange={(e) => setValue('tieneAlergias', e.target.value as '' | 'SI' | 'NO')}
                helperText="Dejarlo sin responder queda como «no se preguntó»"
              >
                <MenuItem value="">No se preguntó</MenuItem>
                <MenuItem value="NO">No</MenuItem>
                <MenuItem value="SI">Sí</MenuItem>
              </TextField>
              {tieneAlergias === 'SI' ? (
                <TextField
                  label="¿A cuáles?"
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(errors.alergias)}
                  helperText={
                    errors.alergias?.message ?? 'Se muestra al recetar y al entregar medicamentos'
                  }
                  {...register('alergias')}
                />
              ) : null}
            </Stack>
            {tieneAlergias === 'SI' ? (
              <Alert severity="warning">
                Esta información aparecerá cada vez que se le recete o entregue un medicamento.
              </Alert>
            ) : null}
          </Stack>

          <TituloSeccion>Expediente de papel</TituloSeccion>

          <Stack spacing={1}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { md: 'center' } }}
            >
              <TextField
                label="Numero de expediente"
                fullWidth
                error={Boolean(errors.numeroExpediente)}
                helperText={
                  errors.numeroExpediente?.message ?? 'Si se deja vacio, el sistema genera uno'
                }
                {...register('numeroExpediente')}
              />
              <FormControlLabel
                control={<Checkbox {...register('digitalizado')} />}
                label="Viene de un expediente en papel"
                sx={{ minWidth: { md: 300 } }}
              />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => navegar('/recepcion')}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              size="large"
              disabled={alta.isPending}
            >
              {alta.isPending ? 'Guardando...' : 'Registrar paciente'}
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            Ctrl+Enter guarda sin usar el raton
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
