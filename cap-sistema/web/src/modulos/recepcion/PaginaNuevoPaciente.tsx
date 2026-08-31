import { useState } from 'react';
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
  Divider,
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
  ETIQUETA_TIPO_LUGAR,
  listarComunidades,
  listarLugares,
  type PacienteCreado,
} from './servicio-pacientes';
import { MENU_AZUL } from '../../componentes/menuAzul';

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
    },
  });

  function enviar(campos: Campos) {
    setCreado(null);
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
        sx={{ p: { xs: 2.5, md: 4 }, border: '1px solid', borderColor: 'divider' }}
      >
        <Stack spacing={3}>
          {alta.isError ? <AvisoError error={alta.error} /> : null}

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
              slotProps={{ select: { MenuProps: MENU_AZUL } }}
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
              {(lugares.data ?? []).map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {(ETIQUETA_TIPO_LUGAR[l.tipo] ?? l.tipo) + ': ' + l.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Divider />

          {/*
            Población migrante. Las cuatro fichas oficiales lo preguntan: al CAP
            llega gente que no es de Purulhá, y saber de dónde viene importa
            para el seguimiento y para lo que el CAP reporta al MSPAS.
          */}
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Procedencia
            </Typography>
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

          <Divider />

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
            <Typography variant="subtitle2" color="text.secondary">
              Alergias a medicamentos
            </Typography>
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

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Expediente de papel
            </Typography>
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
