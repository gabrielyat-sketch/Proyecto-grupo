import { useRef, useState } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Link,
  Pagination,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { AvisoError } from '../../componentes/AvisoError';
import { usarAtajo } from '../../navegacion/usarAtajo';
import { usarSesion } from '../sesion/contexto';
import { DialogoNuevoMedicamento } from './DialogoMedicamento';
import {
  conUnidad,
  listarCatalogo,
  puede,
  PUEDE_ADMINISTRAR,
} from './servicio-farmacia';

/**
 * El catálogo, que es la pregunta de todos los días: "¿hay de esto?".
 *
 * Aquí sí se busca mientras se escribe, al revés que en el expediente. El
 * nombre de un medicamento viaja en claro —no es un dato personal— y el
 * servidor lo resuelve por índice, así que cada tecla es una consulta barata.
 * El expediente no puede hacerlo porque su número está cifrado.
 *
 * La tabla conserva las filas anteriores mientras llegan las nuevas
 * (`keepPreviousData`): sin eso, la lista desaparece y vuelve en cada letra, y
 * el salto se siente como un tirón bajo la mano que escribe.
 */
export function PanelCatalogo() {
  const { usuario } = usarSesion();
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [alta, setAlta] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  usarAtajo('k', () => {
    campo.current?.focus();
    campo.current?.select();
  });

  const catalogo = useQuery({
    queryKey: ['catalogo', buscar, pagina, incluirInactivos],
    queryFn: () => listarCatalogo(buscar, pagina, incluirInactivos),
    placeholderData: keepPreviousData,
  });

  const administra = puede(usuario?.rol, PUEDE_ADMINISTRAR);

  function cambiarBusqueda(valor: string) {
    setBuscar(valor);
    // Volver a la primera pagina: la nueva busqueda no tiene por que llegar a
    // la pagina en la que uno estaba.
    setPagina(1);
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, alignItems: { sm: 'flex-start' } }}
      >
        <TextField
          inputRef={campo}
          label="Buscar medicamento"
          value={buscar}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          fullWidth
          placeholder="Amoxicilina o AMOX500"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
          helperText="Por nombre generico o por codigo, desde dos letras"
        />
        {administra ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAlta(true)}
            sx={{ mt: { sm: 1 }, minWidth: 210, flexShrink: 0 }}
          >
            Nuevo medicamento
          </Button>
        ) : null}
      </Stack>

      <FormControlLabel
        control={
          <Switch
            checked={incluirInactivos}
            onChange={(e) => {
              setIncluirInactivos(e.target.checked);
              setPagina(1);
            }}
            size="small"
          />
        }
        label={
          <Typography variant="body2" color="text.secondary">
            Incluir los desactivados
          </Typography>
        }
      />

      {catalogo.isError ? <AvisoError error={catalogo.error} /> : null}

      {catalogo.isPending ? (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {catalogo.data ? (
        catalogo.data.total === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            {buscar.length >= 2
              ? 'Ningun medicamento coincide con "' + buscar + '".'
              : 'El catalogo esta vacio. Comience dando de alta los medicamentos del CAP.'}
          </Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              {catalogo.data.total === 1
                ? '1 medicamento'
                : catalogo.data.total + ' medicamentos'}
            </Typography>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}
            >
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Codigo</TableCell>
                    <TableCell>Medicamento</TableCell>
                    <TableCell>Presentacion</TableCell>
                    <TableCell align="right">Existencia</TableCell>
                    <TableCell align="right">Minimo</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catalogo.data.datos.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {/*
                          El codigo es el enlace al detalle. Es lo que la mano
                          busca: quien quiere ver los lotes de algo mira su
                          codigo, no una columna de botones al final.
                        */}
                        <Link
                          component={EnlaceRuta}
                          to={'/farmacia/' + m.id}
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {m.codigo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Stack sx={{ gap: 0.25 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {m.nombreGenerico}
                            {m.concentracion ? ' ' + m.concentracion : ''}
                          </Typography>
                          {m.nombreComercial ? (
                            <Typography variant="caption" color="text.secondary">
                              {m.nombreComercial}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>{m.presentacion ?? '—'}</TableCell>
                      {/*
                        La existencia va con tabular-nums para que las columnas
                        se lean en vertical y se note de un vistazo cual esta
                        bajo, sin comparar cifra por cifra.
                      */}
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {conUnidad(m.existencia, m.unidad)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                      >
                        {m.stockMinimo === 0 ? '—' : m.stockMinimo}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                          {m.bajoMinimo ? (
                            <Chip size="small" color="warning" label="Bajo minimo" />
                          ) : null}
                          {m.requiereReceta ? (
                            <Chip size="small" variant="outlined" label="Con receta" />
                          ) : null}
                          {!m.activo ? (
                            <Chip size="small" variant="outlined" label="Desactivado" />
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {catalogo.data.totalPaginas > 1 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={catalogo.data.totalPaginas}
                  page={catalogo.data.pagina}
                  onChange={(_e, p) => setPagina(p)}
                  color="primary"
                />
              </Box>
            ) : null}
          </>
        )
      ) : null}

      {alta ? <DialogoNuevoMedicamento abierto onCerrar={() => setAlta(false)} /> : null}
    </Stack>
  );
}
