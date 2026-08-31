import { useState } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { AvisoError } from '../../componentes/AvisoError';
import { usarSesion } from '../sesion/contexto';
import { desde } from '../../navegacion/usarVolver';
import { DialogoBaja, type LoteParaBaja } from './DialogoBaja';
import {
  conUnidad,
  faltanPara,
  fechaCorta,
  listarBajoMinimo,
  listarPorVencer,
  listarVencidos,
  puede,
  PUEDE_ADMINISTRAR,
  URGENTE_DIAS,
  vencidoHace,
} from './servicio-farmacia';

function Cargando() {
  return (
    <Stack sx={{ alignItems: 'center', py: 4 }}>
      <CircularProgress />
    </Stack>
  );
}

const marco = {
  border: '1px solid',
  borderColor: 'divider',
  overflowX: 'auto',
} as const;

/**
 * Lotes que vencen dentro de la ventana de alerta (90 días por defecto).
 *
 * Ordenados por vencimiento, primero el que vence antes, que es el orden en
 * que hay que gastarlos. Los que quedan a menos de un mes van marcados: por
 * debajo de treinta días ya no da tiempo a devolverlos al proveedor ni a
 * redistribuirlos a otro servicio de salud, así que o se usan o se pierden.
 */
export function PanelPorVencer() {
  const [pagina, setPagina] = useState(1);
  const lotes = useQuery({
    queryKey: ['por-vencer', pagina],
    queryFn: () => listarPorVencer(pagina),
  });

  if (lotes.isPending) return <Cargando />;
  if (lotes.isError) return <AvisoError error={lotes.error} />;
  if (!lotes.data) return null;

  if (lotes.data.total === 0) {
    return (
      <Alert severity="success">
        Ningun lote vence en los proximos meses. Nada que redistribuir por ahora.
      </Alert>
    );
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {lotes.data.total === 1 ? '1 lote por vencer' : lotes.data.total + ' lotes por vencer'}, del
        que vence antes al que vence despues
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={marco}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Medicamento</TableCell>
              <TableCell>Lote</TableCell>
              <TableCell>Vence</TableCell>
              <TableCell>Cuando</TableCell>
              <TableCell align="right">Existencia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lotes.data.datos.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell>
                  <Stack sx={{ gap: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {l.medicamento.nombreGenerico}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {l.medicamento.codigo}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{l.numeroLote}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fechaCorta(l.fechaVencimiento as unknown as string)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={faltanPara(l.diasParaVencer)}
                    color={l.diasParaVencer <= URGENTE_DIAS ? 'warning' : 'default'}
                    variant={l.diasParaVencer <= URGENTE_DIAS ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {conUnidad(l.cantidadDisponible, l.medicamento.unidad)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {lotes.data.totalPaginas > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={lotes.data.totalPaginas}
            page={lotes.data.pagina}
            onChange={(_e, p) => setPagina(p)}
            color="primary"
          />
        </Box>
      ) : null}
    </Stack>
  );
}

/**
 * Lotes ya vencidos que todavía figuran con existencia.
 *
 * El sistema no los da de baja solo, y es deliberado: destruir medicamento es
 * una decisión con responsable. Lo que sí hace es impedir que se entreguen
 * —la selección FEFO nunca toma de un lote vencido— y listarlos aquí para que
 * alguien actúe.
 */
export function PanelVencidos() {
  const { usuario } = usarSesion();
  const [pagina, setPagina] = useState(1);
  const [bajando, setBajando] = useState<LoteParaBaja | null>(null);

  const lotes = useQuery({
    queryKey: ['vencidos', pagina],
    queryFn: () => listarVencidos(pagina),
  });

  const administra = puede(usuario?.rol, PUEDE_ADMINISTRAR);

  if (lotes.isPending) return <Cargando />;
  if (lotes.isError) return <AvisoError error={lotes.error} />;
  if (!lotes.data) return null;

  if (lotes.data.total === 0) {
    return <Alert severity="success">No hay lotes vencidos en el estante.</Alert>;
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Alert severity="warning">
        Estos lotes ya no se pueden entregar: el sistema no los toma aunque tengan existencia.
        {administra
          ? ' Darlos de baja los saca del inventario y deja constancia de quien lo hizo.'
          : ' Farmacia es quien los da de baja.'}
      </Alert>

      <TableContainer component={Paper} elevation={0} sx={marco}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Medicamento</TableCell>
              <TableCell>Lote</TableCell>
              <TableCell>Vencio</TableCell>
              <TableCell>Hace</TableCell>
              <TableCell align="right">Existencia</TableCell>
              {administra ? <TableCell>Accion</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {lotes.data.datos.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell>
                  <Stack sx={{ gap: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {l.medicamento.nombreGenerico}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {l.medicamento.codigo}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{l.numeroLote}</TableCell>
                <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {fechaCorta(l.fechaVencimiento as unknown as string)}
                </TableCell>
                <TableCell>{vencidoHace(l.diasVencido)}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {conUnidad(l.cantidadDisponible, l.medicamento.unidad)}
                </TableCell>
                {administra ? (
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() =>
                        setBajando({
                          id: l.id,
                          numeroLote: l.numeroLote,
                          fechaVencimiento: l.fechaVencimiento as unknown as string,
                          cantidadDisponible: l.cantidadDisponible,
                          medicamento: {
                            nombreGenerico: l.medicamento.nombreGenerico,
                            unidad: l.medicamento.unidad,
                          },
                        })
                      }
                    >
                      Dar de baja
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {lotes.data.totalPaginas > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={lotes.data.totalPaginas}
            page={lotes.data.pagina}
            onChange={(_e, p) => setPagina(p)}
            color="primary"
          />
        </Box>
      ) : null}

      {/*
        Con key para que el dialogo nazca vacio en cada lote. MUI 9 quito
        TransitionProps de Dialog, que era la otra forma de reiniciarlo.
      */}
      {bajando ? (
        <DialogoBaja key={bajando.id} lote={bajando} onCerrar={() => setBajando(null)} />
      ) : null}
    </Stack>
  );
}

/**
 * Medicamentos por debajo de su existencia mínima.
 *
 * Sin paginar: el catálogo del CAP son cientos de medicamentos, no miles, y el
 * endpoint los devuelve completos. Un mínimo en cero desactiva la alerta, así
 * que lo que aparece aquí es lo que alguien decidió vigilar.
 */
export function PanelBajoMinimo() {
  const bajo = useQuery({ queryKey: ['bajo-minimo'], queryFn: listarBajoMinimo });

  if (bajo.isPending) return <Cargando />;
  if (bajo.isError) return <AvisoError error={bajo.error} />;
  if (!bajo.data) return null;

  if (bajo.data.length === 0) {
    return (
      <Alert severity="success">
        Ningun medicamento esta por debajo de su minimo. Recuerde que un minimo en cero desactiva
        la alerta.
      </Alert>
    );
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Lo que hay que pedir al almacen departamental
      </Typography>

      <TableContainer component={Paper} elevation={0} sx={marco}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Codigo</TableCell>
              <TableCell>Medicamento</TableCell>
              <TableCell align="right">Existencia</TableCell>
              <TableCell align="right">Minimo</TableCell>
              <TableCell align="right">Falta</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bajo.data.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  <Typography
                    component={EnlaceRuta}
                    to={'/farmacia/' + m.id}
                    state={desde('/farmacia', 'Alertas')}
                    variant="body2"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {m.codigo}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{m.nombreGenerico}</TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {conUnidad(m.existencia, m.unidad)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                >
                  {m.stockMinimo}
                </TableCell>
                {/*
                  Cuanto falta para llegar al minimo. Es el numero que se anota
                  en el pedido, y calcularlo de cabeza en cada renglon es
                  justamente lo que un sistema deberia ahorrar.
                */}
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                >
                  {conUnidad(Math.max(0, m.stockMinimo - m.existencia), m.unidad)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
