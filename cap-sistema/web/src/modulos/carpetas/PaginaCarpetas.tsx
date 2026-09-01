import { useMemo, useState } from 'react';
import { Link as EnlaceRuta } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Chip,
  InputAdornment,
  Link,
  ListSubheader,
  MenuItem,
  Pagination,
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
import SearchIcon from '@mui/icons-material/Search';
import { AvisoError } from '../../componentes/AvisoError';
import { EncabezadoPagina, NotaPagina } from '../../componentes/EncabezadoPagina';
import { MENU_FILTRO } from '../../componentes/menuFiltro';
import { desde } from '../../navegacion/usarVolver';
import { listarComunidades, listarLugares } from '../recepcion/servicio-pacientes';
import { listarCarpetas } from './servicio-carpetas';

/** En plural, porque titula un grupo y no una fila. */
const ETIQUETA_GRUPO_LUGAR: Record<string, string> = {
  ALDEA: 'Aldeas',
  BARRIO: 'Barrios',
  CASERIO: 'Caserios',
  OTRO: 'Otros',
};
const ORDEN_GRUPOS = ['ALDEA', 'BARRIO', 'CASERIO', 'OTRO'];

/**
 * El archivero del CAP, en pantalla.
 *
 * Cada fila es un folder de carton: un numero en la pestana, el apellido de la
 * familia y el lugar donde vive. Se busca como se busca en el archivero de
 * verdad —primero el sitio, despues el numero o el apellido— porque es el
 * orden en que la gente ya piensa el problema.
 */
export function PaginaCarpetas() {
  const [comunidadId, setComunidadId] = useState('');
  const [lugarId, setLugarId] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [numero, setNumero] = useState('');
  const [pagina, setPagina] = useState(1);

  const comunidades = useQuery({
    queryKey: ['comunidades'],
    queryFn: listarComunidades,
    staleTime: 60 * 60_000,
  });

  const lugares = useQuery({
    queryKey: ['lugares', comunidadId],
    queryFn: () => listarLugares(comunidadId),
    enabled: comunidadId !== '',
    staleTime: 30 * 60_000,
  });

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

  const carpetas = useQuery({
    queryKey: ['carpetas-listado', comunidadId, lugarId, apellidos.trim(), numero, pagina],
    queryFn: () =>
      listarCarpetas({
        ...(comunidadId ? { comunidadId } : {}),
        ...(lugarId ? { lugarId } : {}),
        ...(apellidos.trim() ? { apellidos: apellidos.trim() } : {}),
        ...(numero ? { numero: Number(numero) } : {}),
        pagina,
      }),
  });

  /** Cualquier cambio de filtro devuelve a la primera pagina. */
  function filtrar(aplicar: () => void) {
    aplicar();
    setPagina(1);
  }

  const resultados = carpetas.data;

  return (
    <Box>
      <EncabezadoPagina
        titulo="Carpetas familiares"
        descripcion="El archivero del CAP. Cada carpeta es una familia, con su numero y el lugar donde vive."
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Comunidad"
          sx={{ minWidth: 220 }}
          value={comunidadId}
          onChange={(e) =>
            filtrar(() => {
              setComunidadId(e.target.value);
              // El barrio elegido era de la comunidad anterior: dejarlo puesto
              // buscaria un lugar que ya no esta en la lista, y la pantalla
              // devolveria cero sin decir por que.
              setLugarId('');
            })
          }
          slotProps={{ select: { MenuProps: MENU_FILTRO } }}
        >
          <MenuItem value="">Todas</MenuItem>
          {(comunidades.data ?? []).map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.nombre}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Barrio o caserio"
          sx={{ minWidth: 220 }}
          value={lugarId}
          onChange={(e) => filtrar(() => setLugarId(e.target.value))}
          disabled={comunidadId === ''}
          helperText={comunidadId === '' ? 'Elija primero la comunidad' : undefined}
          slotProps={{ select: { MenuProps: MENU_FILTRO } }}
        >
          <MenuItem value="">Todos</MenuItem>
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

        <TextField
          label="Familia"
          fullWidth
          value={apellidos}
          onChange={(e) => filtrar(() => setApellidos(e.target.value))}
          placeholder="Lopez Ac"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          label="No. de carpeta"
          sx={{ minWidth: 160 }}
          value={numero}
          onChange={(e) => filtrar(() => setNumero(e.target.value.replace(/[^0-9]/g, '')))}
        />
      </Stack>

      {/*
        El numero por si solo no identifica una carpeta.

        El CAP numera por barrio y caserio, asi que hay un No. 3 en El Calvario
        y otro en San Jose. Sin decirlo, quien busca «3» ve varias filas y
        piensa que el sistema esta mal.
      */}
      {numero && !lugarId ? (
        <NotaPagina sx={{ mb: 2 }}>
          El mismo numero existe en cada barrio y caserio. Elija el lugar para quedarse con una
          sola carpeta.
        </NotaPagina>
      ) : null}

      {carpetas.isError ? <AvisoError error={carpetas.error} /> : null}

      {resultados && resultados.datos.length === 0 ? (
        <NotaPagina>No hay ninguna carpeta con esos filtros.</NotaPagina>
      ) : null}

      {resultados && resultados.datos.length > 0 ? (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {resultados.total === 1 ? '1 carpeta' : resultados.total + ' carpetas'}
          </Typography>

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="right">No.</TableCell>
                  <TableCell>Familia</TableCell>
                  <TableCell>Barrio o caserio</TableCell>
                  <TableCell>Comunidad</TableCell>
                  <TableCell align="right">Integrantes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resultados.datos.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                      <Link
                        component={EnlaceRuta}
                        to={'/carpetas/' + c.id}
                        state={desde('/carpetas', 'Carpetas')}
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {c.numero}
                      </Link>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Familia {c.apellidos}</TableCell>
                    <TableCell>{c.lugar?.nombre ?? '—'}</TableCell>
                    <TableCell>{c.comunidad.nombre}</TableCell>
                    <TableCell align="right">
                      {/*
                        Una carpeta sin nadie dentro es un numero gastado, y
                        casi siempre un registro que quedo a medias. Se marca
                        para que se pueda corregir en vez de quedar ahi.
                      */}
                      {c.integrantes === 0 ? (
                        <Chip size="small" label="Vacia" color="warning" variant="outlined" />
                      ) : (
                        c.integrantes
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
