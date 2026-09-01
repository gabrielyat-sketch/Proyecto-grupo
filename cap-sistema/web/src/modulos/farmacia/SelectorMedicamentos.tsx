import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Autocomplete,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  conUnidad,
  ETIQUETA_UNIDAD,
  listarCatalogo,
  obtenerMedicamento,
  type MedicamentoConExistencia,
} from './servicio-farmacia';
import { existenciaEntregable, type LineaDespacho } from './servicio-entregas';

/**
 * Añadir un medicamento al despacho.
 *
 * Dos cosas que la pantalla resuelve antes de que el servidor tenga que decir
 * que no:
 *
 * **No deja repetir un medicamento.** El servidor devuelve 400 si el mismo
 * aparece en dos líneas —hay que sumar las cantidades en una— y descubrirlo al
 * final, con la receta ya escrita, es peor que impedirlo al añadirlo.
 *
 * **Comprueba la existencia que de verdad se puede entregar**, no la del
 * catálogo. El campo `existencia` suma todos los lotes DISPONIBLES incluidos
 * los vencidos, y la selección FEFO nunca toma de un lote vencido: un
 * medicamento con 45 tabletas vencidas figura con existencia 45 y no se puede
 * entregar ni una. Por eso al elegirlo se pide su detalle y se suman solo los
 * lotes vigentes.
 */
export function SelectorMedicamentos({
  yaEnLaReceta,
  onAgregar,
}: {
  yaEnLaReceta: readonly string[];
  onAgregar: (linea: LineaDespacho) => void;
}) {
  const consultas = useQueryClient();
  const [texto, setTexto] = useState('');
  const [elegido, setElegido] = useState<MedicamentoConExistencia | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [disponible, setDisponible] = useState<number | null>(null);
  const [consultando, setConsultando] = useState(false);

  const catalogo = useQuery({
    queryKey: ['catalogo', texto, 1, false],
    queryFn: () => listarCatalogo(texto, 1),
    enabled: texto.length >= 2,
    placeholderData: keepPreviousData,
  });

  const opciones = (catalogo.data?.datos ?? []).filter(
    (m) => m.activo && !yaEnLaReceta.includes(m.id),
  );

  async function elegir(medicamento: MedicamentoConExistencia | null) {
    setElegido(medicamento);
    setDisponible(null);
    if (!medicamento) return;

    setConsultando(true);
    try {
      const detalle = await consultas.fetchQuery({
        queryKey: ['medicamento', medicamento.id],
        queryFn: () => obtenerMedicamento(medicamento.id),
      });
      setDisponible(existenciaEntregable(detalle));
    } finally {
      setConsultando(false);
    }
  }

  const pedido = cantidad.trim() === '' ? null : Number(cantidad);
  const noAlcanza = pedido !== null && disponible !== null && pedido > disponible;
  const puedeAgregar =
    elegido !== null &&
    pedido !== null &&
    Number.isInteger(pedido) &&
    pedido > 0 &&
    !noAlcanza &&
    !consultando;

  function agregar() {
    if (!elegido || pedido === null) return;
    onAgregar({
      medicamentoId: elegido.id,
      codigo: elegido.codigo,
      nombre: elegido.nombreGenerico + (elegido.concentracion ? ' ' + elegido.concentracion : ''),
      unidad: elegido.unidad,
      cantidad: pedido,
      disponible: disponible ?? 0,
    });
    setElegido(null);
    setTexto('');
    setCantidad('');
    setDisponible(null);
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: 'flex-start' }}>
        <Autocomplete
          sx={{ flex: 1, minWidth: 260 }}
          options={opciones}
          value={elegido}
          onChange={(_e, valor) => void elegir(valor)}
          inputValue={texto}
          onInputChange={(_e, valor) => setTexto(valor)}
          getOptionLabel={(m) =>
            m.nombreGenerico + (m.concentracion ? ' ' + m.concentracion : '') + ' · ' + m.codigo
          }
          isOptionEqualToValue={(a, b) => a.id === b.id}
          loading={catalogo.isFetching}
          noOptionsText={
            texto.length < 2 ? 'Escriba al menos dos letras' : 'Ningun medicamento coincide'
          }
          renderInput={(params) => (
            <TextField {...params} label="Medicamento" placeholder="Amoxicilina" />
          )}
        />

        <TextField
          label="Cantidad"
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          disabled={!elegido}
          sx={{ width: { xs: '100%', sm: 200 } }}
          slotProps={{
            htmlInput: { min: 1, step: 1 },
            input: elegido
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      {ETIQUETA_UNIDAD[elegido.unidad] ?? elegido.unidad}
                    </InputAdornment>
                  ),
                }
              : undefined,
          }}
          helperText={
            consultando
              ? 'Consultando existencia...'
              : elegido && disponible !== null
                ? 'Disponible: ' + conUnidad(disponible, elegido.unidad)
                : ' '
          }
        />

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={agregar}
          disabled={!puedeAgregar}
          sx={{ mt: { sm: 1 }, minWidth: 130 }}
        >
          Agregar
        </Button>
      </Stack>

      {elegido && disponible === 0 && !consultando ? (
        <Alert severity="warning">
          No hay existencia vigente de {elegido.nombreGenerico}. Si el catalogo muestra unidades,
          estan en lotes vencidos y el sistema no las va a entregar.
        </Alert>
      ) : noAlcanza && elegido ? (
        <Alert severity="warning">
          Solo hay {conUnidad(disponible ?? 0, elegido.unidad)}. Reduzca la cantidad: una entrega
          incompleta no se registra a medias, se rechaza entera.
        </Alert>
      ) : null}

      {elegido?.requiereReceta ? (
        <Typography variant="caption" color="text.secondary">
          {elegido.nombreGenerico} esta marcado como &quot;requiere receta&quot;.
        </Typography>
      ) : null}
    </Stack>
  );
}
