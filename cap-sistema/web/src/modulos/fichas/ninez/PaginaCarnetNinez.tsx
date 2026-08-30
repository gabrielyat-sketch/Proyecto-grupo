import { useRef, useState } from 'react';
import { Link as EnlaceRuta, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../../componentes/AvisoError';
import { BloqueFicha, Dato, SeccionFicha } from '../SeccionFicha';
import { EncabezadoFicha } from '../EncabezadoFicha';
import { LineaPregunta, SelectorSiNo } from '../SelectorRespuesta';
import { obtenerPaciente } from '../servicio-fichas';
import {
  obtenerCarnet,
  obtenerCatalogoCarnet,
  obtenerCrecimiento,
  guardarCarnet,
  type Carnet,
  type GuardarCarnet,
  type TramoEdad,
} from './servicio-carnet';
import { GraficaPesoEdad } from './GraficaPesoEdad';
import {
  casillasDe,
  COLUMNAS_DOSIS,
  dosisPendientes,
  edadDicha,
  ETIQUETA_TRAMO,
  fechaEntrega,
  tramosAlcanzados,
} from './carnet-ninez';

const ESCOLARIDAD = [
  { valor: 'NINGUNO', texto: 'Ninguno' },
  { valor: 'PRIMARIA_1_3', texto: '1.º a 3.º primaria' },
  { valor: 'PRIMARIA_4_6', texto: '4.º a 6.º primaria' },
  { valor: 'MEDIA', texto: 'Media' },
  { valor: 'SUPERIOR', texto: 'Superior' },
];

const AGUA = [
  { valor: 'CHORRO_INTRADOMICILIAR', texto: 'Chorro intradomiciliario' },
  { valor: 'CHORRO_PUBLICO', texto: 'Chorro público' },
  { valor: 'POZO', texto: 'Pozo' },
  { valor: 'RIO', texto: 'Río' },
  { valor: 'OTRO', texto: 'Otro' },
];

const EXCRETAS = [
  { valor: 'INODORO', texto: 'Inodoro' },
  { valor: 'LETRINA', texto: 'Letrina' },
  { valor: 'AIRE_LIBRE', texto: 'Aire libre' },
];

/**
 * El carnet del lactante y la niñez: páginas 1 y 2 del formulario.
 *
 * **Va aparte de la hoja de consulta a propósito.** Una ficha es una visita;
 * esto es del niño y se llena a lo largo de años. Meterlo dentro de la consulta
 * obligaría a abrir una atención para anotar una vacuna que se puso en otra.
 *
 * Cada casilla se guarda por su cuenta, sin botón de «guardar» al final. En el
 * papel se escribe una fecha en una celda y ya está; obligar a recorrer la hoja
 * entera para grabar una dosis sería peor que el papel.
 *
 * **Lo que la pantalla hace y el papel no puede:** decir qué falta. Saber si a
 * un niño de dos años le falta el refuerzo de OPV exige, en la hoja impresa,
 * leer cien celdas y restar fechas a mano.
 */
export function PaginaCarnetNinez() {
  const { pacienteId = '' } = useParams();
  const cliente = useQueryClient();
  const [guardado, setGuardado] = useState<string | null>(null);
  const temporizador = useRef<number | null>(null);

  const paciente = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => obtenerPaciente(pacienteId),
    enabled: pacienteId !== '',
  });

  const catalogo = useQuery({
    queryKey: ['catalogo-carnet'],
    queryFn: obtenerCatalogoCarnet,
  });

  const carnet = useQuery({
    queryKey: ['carnet', pacienteId],
    queryFn: () => obtenerCarnet(pacienteId),
    enabled: pacienteId !== '',
  });

  // La grafica sale de los pesos que cada atencion ya guardo. No depende de
  // nada de esta pantalla, asi que se pide aparte y no bloquea al carnet.
  const crecimiento = useQuery({
    queryKey: ['crecimiento', pacienteId],
    queryFn: () => obtenerCrecimiento(pacienteId),
    enabled: pacienteId !== '',
  });

  const guardar = useMutation({
    mutationFn: (cambios: GuardarCarnet) => guardarCarnet(pacienteId, cambios),
    onSuccess: (nuevo: Carnet) => {
      cliente.setQueryData(['carnet', pacienteId], nuevo);
      setGuardado('Guardado');
      if (temporizador.current) window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setGuardado(null), 2000);
    },
  });

  if (paciente.isPending || catalogo.isPending || carnet.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (paciente.isError) return <AvisoError error={paciente.error} />;
  if (catalogo.isError) return <AvisoError error={catalogo.error} />;
  if (carnet.isError) return <AvisoError error={carnet.error} />;
  if (!paciente.data || !catalogo.data || !carnet.data) return null;

  const datos = paciente.data;
  const cat = catalogo.data;
  const c = carnet.data;
  const meses = c.edadEnMeses;

  const volverA = '/pacientes/' + pacienteId + '/expediente';
  const pendientes = dosisPendientes(cat, c);
  const tramos = tramosAlcanzados(meses);

  const campoDatos = (campo: string, valor: string | number | boolean | null) =>
    guardar.mutate({ datos: { [campo]: valor } as GuardarCarnet['datos'] });

  const campoHogar = (campo: string, valor: string | null) =>
    guardar.mutate({ hogar: { [campo]: valor } as GuardarCarnet['hogar'] });

  return (
    <Box>
      <EncabezadoFicha
        titulo="Carnet del lactante y niñez · páginas 1 y 2"
        volverA={volverA}
        volverTexto="Expediente"
        nombre={datos.apellidos + ', ' + datos.nombres}
        resumen={
          (meses !== null ? edadDicha(meses) : 'Sin fecha de nacimiento') +
          ' · ' +
          (datos.sexo === 'F' ? 'Femenino' : 'Masculino') +
          ' · ' +
          (datos.comunidad?.nombre ?? 'Sin comunidad')
        }
        expediente={datos.expediente?.numero ?? 'Sin expediente'}
      >
        {guardar.isPending ? <Chip size="small" label="Guardando..." /> : null}
        {guardado ? <Chip size="small" color="success" label={guardado} /> : null}
        <Button
          component={EnlaceRuta}
          to={'/pacientes/' + pacienteId + '/ficha-ninez'}
          variant="outlined"
          size="small"
        >
          Hoja de consulta
        </Button>
      </EncabezadoFicha>

      {guardar.isError ? (
        <Box sx={{ mb: 2 }}>
          <AvisoError error={guardar.error} />
        </Box>
      ) : null}

      <Stack sx={{ gap: 2 }}>
        {/*
          Lo que el papel no puede decir. Va arriba porque es la razon de abrir
          el carnet en una consulta: saber que le falta a este nino hoy.
        */}
        {pendientes.length > 0 ? (
          <Alert severity="warning">
            <AlertTitle>
              {pendientes.length === 1
                ? 'Falta una dosis para su edad'
                : 'Faltan ' + pendientes.length + ' dosis para su edad'}
            </AlertTitle>
            <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2.5 }}>
              {pendientes.map((p) => (
                <li key={p.vacuna + p.dosis}>
                  {p.vacuna} · dosis {p.dosis} · tocaba a los {p.edadRecomendada}
                </li>
              ))}
            </Typography>
          </Alert>
        ) : null}

        {/* ────────── Datos del niño y de los padres ────────── */}
        <SeccionFicha
          numeral="3"
          titulo="Datos generales, padres y casa"
          nota="Se llenan una vez y se corrigen cuando cambian. Cada campo se guarda al salir de él; no hay botón al final."
        >
          <Stack sx={{ gap: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 1.5,
              }}
            >
              <Dato titulo="Nombre" valor={datos.apellidos + ', ' + datos.nombres} />
              <Dato titulo="Edad" valor={meses !== null ? edadDicha(meses) : '—'} />
              <Dato titulo="Sexo" valor={datos.sexo === 'F' ? 'Femenino' : 'Masculino'} />
            </Box>

            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
              <CampoTexto
                etiqueta="Lugar de nacimiento"
                valor={c.datos?.lugarNacimiento ?? ''}
                onGuardar={(v) => campoDatos('lugarNacimiento', v)}
              />
              <CampoTexto
                etiqueta="Persona que acompaña al niño"
                valor={c.datos?.acompananteNombre ?? ''}
                onGuardar={(v) => campoDatos('acompananteNombre', v)}
              />
            </Stack>

            <BloqueFicha titulo="Madre">
              <Stack sx={{ gap: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
                  <CampoTexto
                    etiqueta="Nombre y apellidos de la madre"
                    valor={c.datos?.madreNombre ?? ''}
                    onGuardar={(v) => campoDatos('madreNombre', v)}
                  />
                  <CampoNumero
                    etiqueta="Edad"
                    valor={c.datos?.madreEdad ?? null}
                    onGuardar={(v) => campoDatos('madreEdad', v)}
                  />
                  <CampoTexto
                    etiqueta="Ocupación"
                    valor={c.datos?.madreOcupacion ?? ''}
                    onGuardar={(v) => campoDatos('madreOcupacion', v)}
                  />
                </Stack>

                <LineaPregunta texto="Sabe leer">
                  <SelectorSiNo
                    etiqueta="La madre sabe leer"
                    denso
                    valor={c.datos?.madreSabeLeer ?? null}
                    onCambio={(v) => campoDatos('madreSabeLeer', v)}
                  />
                </LineaPregunta>

                <TextField
                  select
                  label="Nivel de escolaridad de la madre"
                  size="small"
                  sx={{ maxWidth: 320 }}
                  value={c.datos?.madreEscolaridad ?? ''}
                  onChange={(e) => campoDatos('madreEscolaridad', e.target.value)}
                >
                  <MenuItem value="">Sin anotar</MenuItem>
                  {ESCOLARIDAD.map((o) => (
                    <MenuItem key={o.valor} value={o.valor}>
                      {o.texto}
                    </MenuItem>
                  ))}
                </TextField>

                {/*
                  El papel NO le pregunta la escolaridad al padre, solo a la
                  madre. No es un olvido de la transcripcion.
                */}
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
                  <CampoNumero
                    etiqueta="Hijos: total"
                    valor={c.datos?.hijosTotal ?? null}
                    onGuardar={(v) => campoDatos('hijosTotal', v)}
                  />
                  <CampoNumero
                    etiqueta="Vivos"
                    valor={c.datos?.hijosVivos ?? null}
                    onGuardar={(v) => campoDatos('hijosVivos', v)}
                  />
                  <CampoNumero
                    etiqueta="Muertos"
                    valor={c.datos?.hijosMuertos ?? null}
                    onGuardar={(v) => campoDatos('hijosMuertos', v)}
                  />
                </Stack>
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Padre">
              <Stack sx={{ gap: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
                  <CampoTexto
                    etiqueta="Nombre y apellidos del padre"
                    valor={c.datos?.padreNombre ?? ''}
                    onGuardar={(v) => campoDatos('padreNombre', v)}
                  />
                  <CampoNumero
                    etiqueta="Edad del padre"
                    valor={c.datos?.padreEdad ?? null}
                    onGuardar={(v) => campoDatos('padreEdad', v)}
                  />
                  <CampoTexto
                    etiqueta="Ocupación del padre"
                    valor={c.datos?.padreOcupacion ?? ''}
                    onGuardar={(v) => campoDatos('padreOcupacion', v)}
                  />
                </Stack>
                <LineaPregunta texto="Sabe leer">
                  <SelectorSiNo
                    etiqueta="El padre sabe leer"
                    denso
                    valor={c.datos?.padreSabeLeer ?? null}
                    onCambio={(v) => campoDatos('padreSabeLeer', v)}
                  />
                </LineaPregunta>
              </Stack>
            </BloqueFicha>

            <BloqueFicha titulo="Casa">
              <Stack sx={{ gap: 2 }}>
                {/*
                  Estos dos NO son del nino, son de la casa: cuelgan del grupo
                  familiar. Si el nino no tiene uno, el servidor se lo crea al
                  guardar, y asi un hermano registrado despues comparte el dato
                  en vez de repetirlo.
                */}
                <Alert severity="info">
                  El agua y las excretas son de la casa, no del niño: quedan compartidos con sus
                  hermanos cuando recepción los enlace.
                </Alert>

                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2 }}>
                  <TextField
                    select
                    label="Abastecimiento de agua"
                    size="small"
                    sx={{ minWidth: 260 }}
                    value={c.hogar?.agua ?? ''}
                    onChange={(e) => campoHogar('agua', e.target.value)}
                  >
                    <MenuItem value="">Sin anotar</MenuItem>
                    {AGUA.map((o) => (
                      <MenuItem key={o.valor} value={o.valor}>
                        {o.texto}
                      </MenuItem>
                    ))}
                  </TextField>

                  {c.hogar?.agua === 'OTRO' ? (
                    <CampoTexto
                      etiqueta="¿Cuál?"
                      valor={c.hogar?.aguaOtro ?? ''}
                      onGuardar={(v) => campoHogar('aguaOtro', v)}
                    />
                  ) : null}

                  <TextField
                    select
                    label="Disposición de excretas"
                    size="small"
                    sx={{ minWidth: 240 }}
                    value={c.hogar?.excretas ?? ''}
                    onChange={(e) => campoHogar('excretas', e.target.value)}
                  >
                    <MenuItem value="">Sin anotar</MenuItem>
                    {EXCRETAS.map((o) => (
                      <MenuItem key={o.valor} value={o.valor}>
                        {o.texto}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Stack>
            </BloqueFicha>
          </Stack>
        </SeccionFicha>

        {/* ────────── El esquema de vacunación ────────── */}
        <SeccionFicha
          numeral="·"
          titulo="Esquema de vacunación"
          nota="Solo aparecen las casillas que el formulario deja llenar. Las sombreadas del papel no se ofrecen: BCG no tiene tercera dosis."
        >
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Vacuna</TableCell>
                  {COLUMNAS_DOSIS.map((nombre, i) => (
                    <TableCell key={i} sx={{ fontWeight: 700 }}>
                      {nombre}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {cat.vacunas.map((v) => {
                  const casillas = casillasDe(v, c);
                  return (
                    <TableRow key={v.id}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {v.nombre}
                      </TableCell>
                      {[1, 2, 3, 4, 5].map((orden) => {
                        const casilla = casillas.find((x) => x.orden === orden);
                        if (!casilla) {
                          // Sombreada en el papel: esa dosis no existe para
                          // esta vacuna.
                          return (
                            <TableCell
                              key={orden}
                              aria-label="No aplica"
                              sx={{ bgcolor: 'action.hover', textAlign: 'center' }}
                            >
                              —
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={orden}>
                            <Stack sx={{ gap: 0.25 }}>
                              <TextField
                                type="date"
                                size="small"
                                label={v.nombre + ' · dosis ' + orden}
                                value={casilla.fecha}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ width: 160 }}
                                onChange={(e) =>
                                  guardar.mutate({
                                    vacunas: [
                                      {
                                        vacunaId: v.id,
                                        orden,
                                        fecha: e.target.value === '' ? null : e.target.value,
                                      },
                                    ],
                                  })
                                }
                              />
                              <Typography variant="caption" color="text.secondary">
                                {casilla.edadEnMeses !== null
                                  ? 'A los ' + edadDicha(casilla.edadEnMeses)
                                  : (casilla.edadRecomendada ?? 'Sin esquema impreso')}
                              </Typography>
                            </Stack>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </SeccionFicha>

        {/* ────────── La grafica de peso para edad ────────── */}
        <SeccionFicha
          numeral="·"
          titulo="Gráfica de peso para edad"
          nota="No se captura: se dibuja con los pesos que cada consulta ya anotó. Las tres bandas del papel faltan todavía; sus curvas son un escaneo y de una foto no salen valores."
        >
          {crecimiento.isPending ? (
            <Stack sx={{ alignItems: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : crecimiento.isError ? (
            <AvisoError error={crecimiento.error} />
          ) : (
            <GraficaPesoEdad puntos={crecimiento.data?.puntos ?? []} />
          )}
        </SeccionFicha>

        {/* ────────── Micronutrientes ────────── */}
        <SeccionFicha
          numeral="·"
          titulo="Micronutrientes"
          nota="Por tramo de edad, como el papel. Solo se muestran los tramos que el niño ya alcanzó: ofrecer los de cuatro años a uno de dos invita a llenarlos antes de tiempo."
        >
          <Stack sx={{ gap: 2 }}>
            {tramos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Los micronutrientes empiezan a los seis meses. Este niño todavía no llega.
              </Typography>
            ) : (
              cat.micronutrientes.map((m) => {
                const deEsteNino = tramos.filter((t) =>
                  m.esperadas.some((e) => e.tramo === t),
                );
                if (deEsteNino.length === 0) return null;

                return (
                  <BloqueFicha key={m.id} titulo={m.nombre}>
                    <Stack sx={{ gap: 1.5 }}>
                      {deEsteNino.map((tramo) => (
                        <Stack
                          key={tramo}
                          direction={{ xs: 'column', md: 'row' }}
                          sx={{ gap: 1.5, alignItems: { md: 'center' }, flexWrap: 'wrap' }}
                        >
                          <Typography variant="body2" sx={{ minWidth: 120, fontWeight: 600 }}>
                            {ETIQUETA_TRAMO[tramo]}
                          </Typography>
                          {m.esperadas
                            .filter((e) => e.tramo === tramo)
                            .map((e) => (
                              <TextField
                                key={e.orden}
                                type="date"
                                size="small"
                                label={m.nombre + ' · ' + ETIQUETA_TRAMO[tramo] + ' · ' + e.orden}
                                value={fechaEntrega(c, m.id, tramo as TramoEdad, e.orden)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ width: 170 }}
                                onChange={(ev) =>
                                  guardar.mutate({
                                    micronutrientes: [
                                      {
                                        micronutrienteId: m.id,
                                        tramo: e.tramo,
                                        orden: e.orden,
                                        fecha: ev.target.value === '' ? null : ev.target.value,
                                      },
                                    ],
                                  })
                                }
                              />
                            ))}
                        </Stack>
                      ))}
                    </Stack>
                  </BloqueFicha>
                );
              })
            )}
          </Stack>
        </SeccionFicha>

        <Box sx={{ pb: 4 }}>
          <Button component={EnlaceRuta} to={volverA} startIcon={<ArrowBackIcon />}>
            Volver al expediente
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

/**
 * Un campo de texto que se guarda al salir de el, no en cada tecla.
 *
 * Guardar por pulsacion mandaria una peticion por letra; guardar solo con un
 * boton al final obligaria a recorrer la hoja entera para anotar una fecha.
 * Al perder el foco es lo que hace la persona de todos modos: escribe y pasa
 * al siguiente.
 */
function CampoTexto({
  etiqueta,
  valor,
  onGuardar,
}: {
  etiqueta: string;
  valor: string;
  onGuardar: (valor: string) => void;
}) {
  const [borrador, setBorrador] = useState(valor);
  const original = useRef(valor);

  // Si el servidor devuelve otra cosa —otra pestana, otra persona— se adopta.
  if (original.current !== valor) {
    original.current = valor;
    setBorrador(valor);
  }

  return (
    <TextField
      label={etiqueta}
      size="small"
      fullWidth
      value={borrador}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={() => {
        if (borrador !== valor) onGuardar(borrador);
      }}
    />
  );
}

/** Lo mismo, para las cuentas: edades y numero de hijos. */
function CampoNumero({
  etiqueta,
  valor,
  onGuardar,
}: {
  etiqueta: string;
  valor: number | null;
  onGuardar: (valor: number | null) => void;
}) {
  const texto = valor === null ? '' : String(valor);
  const [borrador, setBorrador] = useState(texto);
  const original = useRef(texto);

  if (original.current !== texto) {
    original.current = texto;
    setBorrador(texto);
  }

  return (
    <TextField
      label={etiqueta}
      size="small"
      type="number"
      sx={{ width: 150 }}
      value={borrador}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={() => {
        if (borrador === texto) return;
        const n = Number(borrador);
        onGuardar(borrador.trim() === '' || !Number.isFinite(n) ? null : n);
      }}
    />
  );
}
