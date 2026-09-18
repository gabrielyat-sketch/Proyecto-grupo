import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import GppMaybeOutlinedIcon from '@mui/icons-material/GppMaybeOutlined';
import { AvisoError } from '../../componentes/AvisoError';
import { EncabezadoPagina, NotaPagina } from '../../componentes/EncabezadoPagina';
import { MENU_FILTRO } from '../../componentes/menuFiltro';
import { ARMAZON, ERROR, EXITO, PRIMARIO } from '../../tema';
import {
  consultarBitacora,
  ETIQUETA_ACCION,
  ETIQUETA_SERVICIO,
  verificarCadena,
  type Registro,
} from './servicio-auditoria';

/** El color con que se lee cada accion, del mismo juego que el resto del panel. */
const COLOR_ACCION: Record<string, string> = {
  CONSULTA: ARMAZON,
  CREACION: EXITO,
  MODIFICACION: PRIMARIO,
  ELIMINACION: ERROR,
  IMPRESION: ARMAZON,
  EXPORTACION: ERROR,
};

const hoy = () => new Date().toISOString().slice(0, 10);

/** «17/09/2026, 8:42» — la hora importa tanto como el dia al auditar. */
function cuando(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Lo que cambio, en una linea.
 *
 * Los valores vienen descifrados y pueden ser largos. Se recortan porque esta
 * es la vista de barrido —se busca QUE paso y CUANDO— y un JSON entero por
 * fila taparia las demas.
 */
function Cambio({ r }: { r: Registro }) {
  if (!r.valorAnterior && !r.valorNuevo) return <>—</>;
  const corto = (v: string | null) => (v && v.length > 60 ? v.slice(0, 60) + '…' : (v ?? '—'));
  return (
    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
      {corto(r.valorAnterior)} → {corto(r.valorNuevo)}
    </Typography>
  );
}

/**
 * La bitacora de auditoria.
 *
 * Responde dos preguntas que un expediente clinico tiene que poder responder:
 * **quien vio o cambio cada dato**, y **si alguien altero el registro despues**.
 *
 * Lo segundo es lo que la distingue de un log corriente. Cada entrada lleva el
 * hash de la anterior, asi que borrar o modificar una rompe la cadena y se
 * nota. El boton de verificar la recorre entera y dice en que numero se rompio,
 * si es que se rompio — y lo hace SIN las llaves de descifrado, porque el hash
 * cubre el texto cifrado: se puede probar que nadie toco nada sin llegar a leer
 * ningun diagnostico.
 */
export function PaginaAuditoria() {
  const [servicio, setServicio] = useState('');
  const [accion, setAccion] = useState('');
  const [entidadId, setEntidadId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [verificando, setVerificando] = useState(false);

  const bitacora = useQuery({
    queryKey: ['bitacora', servicio, accion, entidadId.trim(), desde, hasta, pagina],
    queryFn: () =>
      consultarBitacora({
        ...(servicio ? { servicio } : {}),
        ...(accion ? { accion } : {}),
        ...(entidadId.trim() ? { entidadId: entidadId.trim() } : {}),
        // El dia entero: de su medianoche a su ultimo segundo.
        ...(desde ? { desde: desde + 'T00:00:00.000Z' } : {}),
        ...(hasta ? { hasta: hasta + 'T23:59:59.999Z' } : {}),
        pagina,
      }),
  });

  /*
    La verificacion se pide a mano, no al abrir la pantalla.

    Recorre la cadena entera: con el tiempo son cientos de miles de entradas, y
    pagarlas cada vez que alguien entra a mirar quien consulto un expediente
    seria cobrar el trabajo caro a quien viene a hacer el barato.
  */
  const verificacion = useQuery({
    queryKey: ['bitacora-verificacion'],
    queryFn: verificarCadena,
    enabled: verificando,
    staleTime: 0,
  });

  function filtrar(aplicar: () => void) {
    aplicar();
    setPagina(1);
  }

  const resultados = bitacora.data;

  return (
    <Box>
      <EncabezadoPagina
        titulo="Auditoria"
        descripcion="Quien vio o modifico cada dato clinico, y si alguien altero el registro despues."
        acciones={
          <Button
            variant="contained"
            startIcon={<VerifiedOutlinedIcon />}
            disabled={verificacion.isFetching}
            onClick={() => {
              setVerificando(true);
              void verificacion.refetch();
            }}
          >
            {verificacion.isFetching ? 'Recorriendo la cadena...' : 'Verificar la cadena'}
          </Button>
        }
      />

      {/*
        El resultado de la verificacion manda sobre todo lo demas: si la cadena
        esta rota, lo que haya en la tabla deja de ser de fiar.
      */}
      {verificando && verificacion.data ? (
        verificacion.data.intacta ? (
          <Alert severity="success" icon={<VerifiedOutlinedIcon />} sx={{ mb: 3 }}>
            <AlertTitle>La cadena esta intacta</AlertTitle>
            Se recorrieron {verificacion.data.revisados.toLocaleString('es-GT')} entradas y todas
            encajan con la anterior. Nadie ha borrado ni modificado la bitacora.
          </Alert>
        ) : (
          <Alert severity="error" icon={<GppMaybeOutlinedIcon />} sx={{ mb: 3 }}>
            <AlertTitle>La cadena esta rota</AlertTitle>
            La entrada numero <strong>{verificacion.data.rotoEn}</strong> no encaja con la anterior.
            Desde ahi, la bitacora no prueba nada: alguien con acceso a la base la altero. Avise a
            Direccion antes de seguir usando el sistema.
          </Alert>
        )
      ) : null}

      {verificacion.isError ? <AvisoError error={verificacion.error} /> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Modulo"
          sx={{ minWidth: 200 }}
          value={servicio}
          onChange={(e) => filtrar(() => setServicio(e.target.value))}
          slotProps={{ select: { MenuProps: MENU_FILTRO } }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(ETIQUETA_SERVICIO).map(([clave, nombre]) => (
            <MenuItem key={clave} value={clave}>
              {nombre}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Accion"
          sx={{ minWidth: 180 }}
          value={accion}
          onChange={(e) => filtrar(() => setAccion(e.target.value))}
          slotProps={{ select: { MenuProps: MENU_FILTRO } }}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(ETIQUETA_ACCION).map(([clave, nombre]) => (
            <MenuItem key={clave} value={clave}>
              {nombre}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Expediente o identificador"
          fullWidth
          value={entidadId}
          onChange={(e) => filtrar(() => setEntidadId(e.target.value))}
          placeholder="EXP-2026-000123"
          helperText="Para seguir todo lo que se hizo con un dato concreto"
        />

        <TextField
          label="Desde"
          type="date"
          sx={{ minWidth: 165 }}
          value={desde}
          onChange={(e) => filtrar(() => setDesde(e.target.value))}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hasta || hoy() } }}
        />
        <TextField
          label="Hasta"
          type="date"
          sx={{ minWidth: 165 }}
          value={hasta}
          onChange={(e) => filtrar(() => setHasta(e.target.value))}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: desde, max: hoy() } }}
        />
      </Stack>

      {bitacora.isError ? <AvisoError error={bitacora.error} /> : null}

      {bitacora.isPending ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {resultados && resultados.datos.length === 0 ? (
        <NotaPagina>No hay ninguna entrada con esos filtros.</NotaPagina>
      ) : null}

      {resultados && resultados.datos.length > 0 ? (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {resultados.total === 1
              ? '1 entrada'
              : resultados.total.toLocaleString('es-GT') + ' entradas'}
          </Typography>

          <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">No.</TableCell>
                  <TableCell>Cuando</TableCell>
                  <TableCell>Accion</TableCell>
                  <TableCell>Sobre que</TableCell>
                  <TableCell>Quien</TableCell>
                  <TableCell>Cambio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultados.datos.map((r) => {
                  const color = COLOR_ACCION[r.accion] ?? ARMAZON;
                  return (
                    <TableRow key={r.numero} hover>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {r.numero}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{cuando(r.registradoEn)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ETIQUETA_ACCION[r.accion] ?? r.accion}
                          sx={{
                            bgcolor: alpha(color, 0.1),
                            color,
                            fontWeight: 600,
                            border: '1px solid',
                            borderColor: alpha(color, 0.25),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack sx={{ gap: 0.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.entidad}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {r.entidadId}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack sx={{ gap: 0.25 }}>
                          <Typography variant="body2">{r.usuarioRol}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ETIQUETA_SERVICIO[r.servicio] ?? r.servicio}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Cambio r={r} />
                        {r.motivo ? (
                          <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                            {r.motivo}
                          </Typography>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {resultados.totalPaginas > 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={resultados.totalPaginas}
                page={resultados.pagina}
                onChange={(_e, p) => setPagina(p)}
                color="primary"
              />
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
