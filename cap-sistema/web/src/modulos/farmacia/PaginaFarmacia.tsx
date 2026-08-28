import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as EnlaceRuta } from 'react-router-dom';
import { Badge, Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import { usarSesion } from '../sesion/contexto';
import { PanelCatalogo } from './PanelCatalogo';
import { PanelBajoMinimo, PanelPorVencer, PanelVencidos } from './PanelAlertas';
import { PanelEntregas } from './PanelEntregas';
import {
  listarBajoMinimo,
  listarPorVencer,
  listarVencidos,
  puede,
  PUEDE_ADMINISTRAR,
  PUEDE_VER_LOTES,
} from './servicio-farmacia';
import { PUEDE_VER_ENTREGAS } from './servicio-entregas';

/**
 * Farmacia: el inventario del CAP.
 *
 * Cuatro vistas del MISMO inventario, no cuatro flujos distintos. Por eso van
 * en pestañas y no en pantallas separadas: quien busca un medicamento y quien
 * revisa qué se está venciendo están mirando el mismo estante desde dos
 * ángulos, y pasar de uno a otro es parte del mismo trabajo.
 *
 * Los contadores van en la pestaña a propósito. Sin ellos habría que entrar a
 * cada alerta para descubrir que no hay nada, y una alerta que obliga a
 * buscarla deja de avisar. Con el número a la vista, abrir Farmacia responde de
 * una sola mirada "¿hay algo que atender hoy?".
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

  const porVencer = useQuery({
    queryKey: ['por-vencer', 1],
    queryFn: () => listarPorVencer(1),
    enabled: veLotes,
  });
  const vencidos = useQuery({
    queryKey: ['vencidos', 1],
    queryFn: () => listarVencidos(1),
    enabled: veLotes,
  });
  const bajoMinimo = useQuery({ queryKey: ['bajo-minimo'], queryFn: listarBajoMinimo });

  const pestanas = [
    { etiqueta: 'Catalogo', cuenta: 0, color: 'primary' as const },
    ...(veLotes
      ? [
          {
            etiqueta: 'Por vencer',
            cuenta: porVencer.data?.total ?? 0,
            color: 'warning' as const,
          },
          { etiqueta: 'Vencidos', cuenta: vencidos.data?.total ?? 0, color: 'error' as const },
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, mb: 2, justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
      >
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Farmacia
          </Typography>
          <Typography color="text.secondary">
            Existencias por lote, vencimientos y entrega de medicamentos.
          </Typography>
        </Stack>

        {/*
          El despacho es la accion del dia y va arriba, no escondida en una
          pestana: quien abre Farmacia con un paciente enfrente viene a
          entregar, no a mirar el inventario.
        */}
        {despacha ? (
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
        ) : null}
      </Stack>

      <Tabs
        value={pestana}
        onChange={(_e, v: number) => setPestana(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {pestanas.map((p) => (
          <Tab
            key={p.etiqueta}
            label={
              p.cuenta > 0 ? (
                <Badge badgeContent={p.cuenta} color={p.color} sx={{ pr: 2 }} max={999}>
                  {p.etiqueta}
                </Badge>
              ) : (
                p.etiqueta
              )
            }
          />
        ))}
      </Tabs>

      {actual === 'Catalogo' ? <PanelCatalogo /> : null}
      {actual === 'Por vencer' ? <PanelPorVencer /> : null}
      {actual === 'Vencidos' ? <PanelVencidos /> : null}
      {actual === 'Bajo minimo' ? <PanelBajoMinimo /> : null}
      {actual === 'Entregas' ? <PanelEntregas /> : null}
    </Box>
  );
}
