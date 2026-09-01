import { useState } from 'react';
import { Link as EnlaceRuta, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AvisoError } from '../../componentes/AvisoError';
import { esErrorApi } from '../../api';
import { usarSesion } from '../sesion/contexto';
import { DialogoEditarMedicamento } from './DialogoMedicamento';
import { DialogoIngresarLote } from './DialogoIngresarLote';
import { DialogoBaja, type LoteParaBaja } from './DialogoBaja';
import { DialogoAjuste } from './DialogoAjuste';
import type { LoteDelMedicamento, MedicamentoDetalle } from './servicio-farmacia';
import {
  conUnidad,
  ETIQUETA_ESTADO_LOTE,
  ETIQUETA_UNIDAD,
  fechaCorta,
  obtenerMedicamento,
  puede,
  PUEDE_ADMINISTRAR,
} from './servicio-farmacia';

const COLOR_VENCIMIENTO: Record<string, 'default' | 'warning' | 'error'> = {
  VIGENTE: 'default',
  POR_VENCER: 'warning',
  VENCIDO: 'error',
};

const ETIQUETA_VENCIMIENTO: Record<string, string> = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por vencer',
  VENCIDO: 'Vencido',
};

/**
 * Lo que los diálogos de conteo y de baja necesitan saber del lote.
 *
 * El lote del detalle no trae el nombre del medicamento —está en el encabezado,
 * no repetido en cada fila— así que se compone aquí.
 */
function paraDialogo(
  lote: LoteDelMedicamento,
  medicamento: MedicamentoDetalle,
): LoteParaBaja {
  return {
    id: lote.id,
    numeroLote: lote.numeroLote,
    fechaVencimiento: lote.fechaVencimiento as unknown as string,
    cantidadDisponible: lote.cantidadDisponible,
    medicamento: {
      nombreGenerico: medicamento.nombreGenerico,
      unidad: medicamento.unidad,
    },
  };
}

/** Un dato del encabezado: rótulo arriba, valor abajo. */
function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Stack sx={{ gap: 0.25, minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary">
        {rotulo}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {valor}
      </Typography>
    </Stack>
  );
}

/**
 * Un medicamento y sus lotes.
 *
 * La existencia total no significa nada por sí sola: "320 tabletas" puede ser
 * un lote que vence en dos años o tres que vencen el mes que viene, y lo que se
 * hace con cada caso es distinto. Por eso los lotes van a la vista, ordenados
 * por vencimiento —primero el que vence antes, que es el orden en que se
 * gastan— y no escondidos tras un desplegable.
 */
export function PaginaMedicamento() {
  const { medicamentoId = '' } = useParams();
  const { usuario } = usarSesion();
  const [editando, setEditando] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  const [bajando, setBajando] = useState<LoteParaBaja | null>(null);
  const [contando, setContando] = useState<LoteParaBaja | null>(null);

  const medicamento = useQuery({
    queryKey: ['medicamento', medicamentoId],
    queryFn: () => obtenerMedicamento(medicamentoId),
    enabled: medicamentoId !== '',
    retry: false,
  });

  const administra = puede(usuario?.rol, PUEDE_ADMINISTRAR);

  const volver = (
    <Button
      component={EnlaceRuta}
      to="/farmacia"
      startIcon={<ArrowBackIcon />}
      sx={{ alignSelf: 'flex-start', mb: 2 }}
    >
      Farmacia
    </Button>
  );

  if (medicamento.isPending) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (medicamento.isError) {
    const noExiste = esErrorApi(medicamento.error) && medicamento.error.estado === 404;
    return (
      <Box>
        {volver}
        {noExiste ? (
          <Alert severity="info">Ese medicamento no existe en el catalogo.</Alert>
        ) : (
          <AvisoError error={medicamento.error} />
        )}
      </Box>
    );
  }

  const m = medicamento.data;
  const conExistencia = m.lotes.filter((l) => l.cantidadDisponible > 0);

  return (
    <Box sx={{ maxWidth: 1000 }}>
      {volver}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Stack sx={{ p: 2.5, gap: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ gap: 1.5, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
          >
            <Stack sx={{ gap: 0.25 }}>
              <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {m.codigo}
              </Typography>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
                {m.nombreGenerico}
                {m.concentracion ? ' ' + m.concentracion : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {[m.nombreComercial, m.presentacion].filter(Boolean).join(' · ') || '—'}
              </Typography>
            </Stack>

            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {m.bajoMinimo ? <Chip size="small" color="warning" label="Bajo minimo" /> : null}
              {m.requiereReceta ? (
                <Chip size="small" variant="outlined" label="Con receta" />
              ) : null}
              {!m.activo ? <Chip size="small" variant="outlined" label="Desactivado" /> : null}
            </Stack>
          </Stack>

          <Divider />

          <Stack direction="row" sx={{ gap: 4, flexWrap: 'wrap' }}>
            <Dato rotulo="Existencia" valor={conUnidad(m.existencia, m.unidad)} />
            <Dato
              rotulo="Existencia minima"
              valor={m.stockMinimo === 0 ? 'Sin alerta' : conUnidad(m.stockMinimo, m.unidad)}
            />
            <Dato rotulo="Se entrega en" valor={ETIQUETA_UNIDAD[m.unidad] ?? m.unidad} />
            <Dato
              rotulo="Lotes con existencia"
              valor={String(conExistencia.length)}
            />
          </Stack>

          {administra ? (
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => setIngresando(true)}
                disabled={!m.activo}
              >
                Ingresar lote
              </Button>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditando(true)}>
                Editar
              </Button>
            </Stack>
          ) : null}

          {administra && !m.activo ? (
            <Typography variant="caption" color="text.secondary">
              Un medicamento desactivado no admite lotes nuevos. Activelo desde Editar.
            </Typography>
          ) : null}
        </Stack>
      </Paper>

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Lotes
      </Typography>

      {m.lotes.length === 0 ? (
        <Alert severity="info">
          Este medicamento no tiene lotes registrados, asi que no hay existencia que entregar.
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
        >
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Lote</TableCell>
                <TableCell>Vence</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Existencia</TableCell>
                {administra ? <TableCell>Accion</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {m.lotes.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{l.numeroLote}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fechaCorta(l.fechaVencimiento as unknown as string)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={ETIQUETA_VENCIMIENTO[l.vencimiento] ?? l.vencimiento}
                        color={COLOR_VENCIMIENTO[l.vencimiento] ?? 'default'}
                        variant={l.vencimiento === 'VIGENTE' ? 'outlined' : 'filled'}
                      />
                      {l.estado !== 'DISPONIBLE' ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={ETIQUETA_ESTADO_LOTE[l.estado] ?? l.estado}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {conUnidad(l.cantidadDisponible, m.unidad)}
                  </TableCell>
                  {administra ? (
                    <TableCell>
                      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                        {/*
                          El ajuste se ofrece tambien en un lote agotado: si
                          aparece una caja que se creia gastada, hay que poder
                          devolverla al inventario. Lo unico que queda fuera es
                          un lote dado de baja, que ya no es inventario.
                        */}
                        {l.estado !== 'DADO_DE_BAJA' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setContando(paraDialogo(l, m))}
                          >
                            Contar
                          </Button>
                        ) : null}
                        {l.cantidadDisponible > 0 && l.estado === 'DISPONIBLE' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => setBajando(paraDialogo(l, m))}
                          >
                            Dar de baja
                          </Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Con key para que el estado del dialogo nazca con el registro que se abre. */}
      {editando ? (
        <DialogoEditarMedicamento key={m.id} medicamento={m} onCerrar={() => setEditando(false)} />
      ) : null}
      {ingresando ? (
        <DialogoIngresarLote medicamento={m} onCerrar={() => setIngresando(false)} />
      ) : null}
      {bajando ? (
        <DialogoBaja key={bajando.id} lote={bajando} onCerrar={() => setBajando(null)} />
      ) : null}
      {contando ? (
        <DialogoAjuste key={contando.id} lote={contando} onCerrar={() => setContando(null)} />
      ) : null}
    </Box>
  );
}
