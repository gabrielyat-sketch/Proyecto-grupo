import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as EnlaceRuta } from 'react-router-dom';
import { Badge, Box, Button, Tab, Tabs } from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import { EncabezadoPagina } from '../../componentes/EncabezadoPagina';
import { usarSesion } from '../sesion/contexto';
import { PanelCatalogo } from './PanelCatalogo';
import { PanelBajoMinimo, PanelSemaforo, PanelVencidos } from './PanelAlertas';
import { PanelEntregas } from './PanelEntregas';
import { PuntoSemaforo } from './Semaforo';
import {
  listarBajoMinimo,
  puede,
  PUEDE_ADMINISTRAR,
  PUEDE_VER_LOTES,
  resumenSemaforo,
} from './servicio-farmacia';
import { PUEDE_VER_ENTREGAS } from './servicio-entregas';

/**
 * Farmacia: el inventario del CAP.
 *
 * Varias vistas del MISMO inventario, no flujos distintos. Por eso van en
 * pestañas y no en pantallas separadas: quien busca un medicamento y quien
 * revisa qué se está venciendo están mirando el mismo estante desde dos
 * ángulos, y pasar de uno a otro es parte del mismo trabajo.
 *
 * Las tres pestañas de color son el semáforo del estante tal cual: Rojo,
 * Amarillo y Verde, con el nombre con el que el personal ya llama a esas
 * cajas. Vencidos va aparte del rojo porque lo que se hace con ellos es
 * distinto: dar de baja, no gastar.
 *
 * Los contadores van en la pestaña a propósito. Sin ellos habría que entrar a
 * cada alerta para descubrir que no hay nada, y una alerta que obliga a
 * buscarla deja de avisar. Con el número a la vista, abrir Farmacia responde de
 * una sola mirada "¿hay algo que atender hoy?". Los cuatro números de lote
 * llegan en UNA consulta (`resumen`), no pidiendo la primera página de cada
 * lista para leer su total.
 */
export function PaginaFarmacia() {
  const { usuario } = usarSesion();
  const [pestana, setPestana] = useState(0);

  // El medico y enfermeria consultan existencias —para no recetar lo que no
  // hay— pero las alertas de lote son de farmacia. La pantalla ni siquiera las
  // pide cuando el rol no puede verlas; no es que las pida y esconda la
  // respuesta.
  const veLotes = puede(usuario?.rol, PUEDE_VER_LOTES);
  const veEntregas = puede(usuario?.rol, PUEDE_VER_ENTREGAS);
  const despacha = puede(usuario?.rol, PUEDE_ADMINISTRAR);

  const resumen = useQuery({
    queryKey: ['semaforo', 'resumen'],
    queryFn: resumenSemaforo,
    enabled: veLotes,
  });
  const bajoMinimo = useQuery({ queryKey: ['bajo-minimo'], queryFn: listarBajoMinimo });

  const pestanas = [
    { etiqueta: 'Catalogo', cuenta: 0, color: 'primary' as const },
    ...(veLotes
      ? [
          { etiqueta: 'Rojo', punto: 'ROJO', cuenta: resumen.data?.rojo ?? 0, color: 'error' as const },
          {
            etiqueta: 'Amarillo',
            punto: 'AMARILLO',
            cuenta: resumen.data?.amarillo ?? 0,
            color: 'warning' as const,
          },
          {
            etiqueta: 'Verde',
            punto: 'VERDE',
            cuenta: resumen.data?.verde ?? 0,
            color: 'success' as const,
          },
          { etiqueta: 'Vencidos', cuenta: resumen.data?.vencidos ?? 0, color: 'error' as const },
        ]
      : []),
    { etiqueta: 'Bajo minimo', cuenta: bajoMinimo.data?.length ?? 0, color: 'warning' as const },
    // Sin contador: las entregas del dia no son una alerta, y un numero al lado
    // haria pensar que hay algo que atender.
    ...(veEntregas ? [{ etiqueta: 'Entregas', cuenta: 0, color: 'primary' as const }] : []),
  ];

  const actual = pestanas[pestana]?.etiqueta ?? 'Catalogo';

  return (
    <Box>
      <EncabezadoPagina
        titulo="Farmacia"
        descripcion="Existencias por lote, vencimientos y entrega de medicamentos."
        acciones={
          /*
            El despacho es la accion del dia y va arriba, no escondida en una
            pestana: quien abre Farmacia con un paciente enfrente viene a
            entregar, no a mirar el inventario.
          */
          despacha ? (
            <Button
              component={EnlaceRuta}
              to="/farmacia/entrega"
              variant="contained"
              size="large"
              startIcon={<LocalPharmacyIcon />}
              sx={{ flexShrink: 0 }}
            >
              Registrar entrega
            </Button>
          ) : null
        }
      />

      <Tabs
        value={pestana}
        onChange={(_e, v: number) => setPestana(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {pestanas.map((p) => {
          // La pestana de color lleva su punto delante, como la etiqueta de
          // la caja. Decorativo: la palabra ya dice el color.
          const titulo =
            'punto' in p && p.punto ? (
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <PuntoSemaforo color={p.punto} tamano={12} decorativo />
                {p.etiqueta}
              </Box>
            ) : (
              p.etiqueta
            );
          return (
            <Tab
              key={p.etiqueta}
              label={
                p.cuenta > 0 ? (
                  <Badge badgeContent={p.cuenta} color={p.color} sx={{ pr: 2 }} max={999}>
                    {titulo}
                  </Badge>
                ) : (
                  titulo
                )
              }
            />
          );
        })}
      </Tabs>

      {actual === 'Catalogo' ? <PanelCatalogo /> : null}
      {actual === 'Rojo' ? <PanelSemaforo color="ROJO" /> : null}
      {actual === 'Amarillo' ? <PanelSemaforo color="AMARILLO" /> : null}
      {actual === 'Verde' ? <PanelSemaforo color="VERDE" /> : null}
      {actual === 'Vencidos' ? <PanelVencidos /> : null}
      {actual === 'Bajo minimo' ? <PanelBajoMinimo /> : null}
      {actual === 'Entregas' ? <PanelEntregas /> : null}
    </Box>
  );
}
